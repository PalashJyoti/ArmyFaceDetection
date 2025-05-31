import logging
import os
import threading
import time
from datetime import datetime
from zoneinfo import ZoneInfo
from collections import deque

import cv2
import numpy as np

from app.camera.routes import thickness
import emotion_detection_service.globals as globals_module
from emotion_detection_service.predict import predict_emotion
from extensions import db
from models import DetectionLog, Camera, CameraStatus


# Configure logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.WARN)

if not logger.handlers:  # Avoid duplicate logs
    ch = logging.StreamHandler()
    ch.setLevel(logging.DEBUG)
    formatter = logging.Formatter('[%(asctime)s] [%(levelname)s] [%(filename)s:%(lineno)d] %(message)s')
    ch.setFormatter(formatter)
    logger.addHandler(ch)

FACE_DETECTOR_PROTO = "emotion_detection_service/deploy.prototxt"
FACE_DETECTOR_MODEL = "emotion_detection_service/res10_300x300_ssd_iter_140000.caffemodel"


IST = ZoneInfo("Asia/Kolkata")  # Indian Standard Time


class EmotionDetectorThread(threading.Thread):
    def __init__(self, cam_id, src, model_path, app):
        super().__init__()
        self.cam_id = cam_id
        self.src = src
        self.running = True
        self.last_negative_emotion = None
        self.app = app
        self.raw_frame = None
        self.processed_frame = None
        self.no_face_counter = 0
        self.no_face_threshold = 5  # You can tune this threshold
        self.emotion_buffer = deque(maxlen=10)  # last 10 frames
        self.negative_emotions = {'fear', 'anger', 'sadness', 'disgust'}
        self.sustain_threshold = 0.7  # 70% of last 10 frames

        # Load face detector
        self.face_net = cv2.dnn.readNetFromCaffe(FACE_DETECTOR_PROTO, FACE_DETECTOR_MODEL)
        logger.debug("face detector loaded.")

        if self.src.startswith("rtsp://") and "rtsp_transport=tcp" not in self.src:
            self.src += "?rtsp_transport=tcp"

        self.capture = cv2.VideoCapture(self.src, cv2.CAP_FFMPEG)
        self.capture.set(cv2.CAP_PROP_BUFFERSIZE, 2)  # Keep it minimal to reduce lag

        self.alerts_dir = os.path.abspath('static/alerts')
        os.makedirs(self.alerts_dir, exist_ok=True)

        self.frame_lock = threading.Lock()
        self.latest_frame = None

        self.model_path = model_path

        self.failure_count = 0
        self.max_failures = 20

        # Frame grabbing thread
        self.grab_running = True
        self.grab_thread = threading.Thread(target=self._frame_grabber)
        self.grab_thread.daemon = True
        self.grab_thread.start()

    def detect_faces(self, frame, conf_threshold=0.7):
        h, w = frame.shape[:2]
        logger.debug(f"Input frame dimensions: width={w}, height={h}")

        blob = cv2.dnn.blobFromImage(cv2.resize(frame, (300, 300)), 1.0,
                                     (300, 300), (104.0, 177.0, 123.0))
        self.face_net.setInput(blob)
        detections = self.face_net.forward()

        faces = []
        for i in range(detections.shape[2]):
            confidence = detections[0, 0, i, 2]
            logger.debug(f"Detection {i}: confidence={confidence:.4f}")

            if confidence > conf_threshold:
                box = detections[0, 0, i, 3:7] * np.array([w, h, w, h])
                (x1, y1, x2, y2) = box.astype("int")

                # Clip to frame boundaries
                x1, y1 = max(0, x1), max(0, y1)
                x2, y2 = min(w - 1, x2), min(h - 1, y2)

                faces.append((x1, y1, x2 - x1, y2 - y1))
                logger.debug(f"Face detected with box coordinates: {(x1, y1, x2, y2)}")

        logger.info(f"Total faces detected above threshold {conf_threshold}: {len(faces)}")
        return faces

    def _frame_grabber(self):
        logger.info("Frame grabber thread started.")
        while self.grab_running:
            ret, frame = self.capture.read()
            if ret:
                with self.frame_lock:
                    self.raw_frame = frame
                self.failure_count = 0
                logger.debug("Frame grabbed successfully.")
            else:
                self.failure_count += 1
                logger.warning(f"Failed to grab frame. Failure count: {self.failure_count}")
                if self.failure_count >= self.max_failures:
                    logger.error("Max failure count reached, attempting to reconnect.")
                    self.reconnect()
                    self.failure_count = 0
            time.sleep(0.03)
        logger.info("Frame grabber thread stopped.")

    def get_latest_frame(self):
        with self.frame_lock:
            if self.processed_frame is not None:
                logger.debug("Returning a copy of the latest processed frame.")
                return self.processed_frame.copy()
            else:
                logger.debug("No processed frame available to return.")
                return None

    def save_alert(self, face_img, emotion, confidence):
        now_ist = datetime.now(IST)
        timestamp = now_ist.strftime("%Y%m%d_%H%M%S")
        filename = f"alert_{emotion}_{timestamp}.jpg"

        # Full path for saving image to disk
        filepath = os.path.join(self.alerts_dir, filename)
        cv2.imwrite(filepath, face_img)

        logger.info(f"Alert saved: {filepath}")
        logger.debug(f"IST time: {datetime.now(IST)}")

        # Store only relative path in DB
        relative_image_url = f"/static/alerts/{filename}"

        with self.app.app_context():
            try:
                camera = db.session.get(Camera, self.cam_id)
                camera_label = camera.label if camera else "Unknown"

                alert = DetectionLog(
                    camera_id=self.cam_id,
                    camera_label=camera_label,
                    timestamp=now_ist,
                    emotion=emotion,
                    confidence=confidence,
                    image_path=relative_image_url  # store relative URL
                )
                db.session.add(alert)
                db.session.commit()
                logger.info("Alert logged to DB.")
            except Exception as e:
                db.session.rollback()
                logger.error(f"Failed to log alert to DB: {e}")

    def reconnect(self):
        logger.warning(f"Reconnecting camera {self.cam_id}")
        self.capture.release()
        time.sleep(2)
        self.capture = cv2.VideoCapture(self.src, cv2.CAP_FFMPEG)

        # Check if reconnection worked
        if not self.capture.isOpened():
            logger.error(f"Failed to reconnect camera {self.cam_id}")
            self.failure_count = 0

            with self.app.app_context():
                try:
                    # Mark the camera as inactive in DB
                    camera = db.session.get(Camera, self.cam_id)
                    if camera:
                        camera.status = CameraStatus.Inactive
                        db.session.commit()
                        logger.info(f"Marked camera {self.cam_id} as Inactive due to repeated failures.")

                    # Stop and remove from manager
                    globals_module.manager.remove_camera(self.cam_id)

                except Exception as e:
                    db.session.rollback()
                    logger.error(f"Could not update camera status: {e}")
        else:
            logger.info(f"Reconnected camera {self.cam_id}")
            self.failure_count = 0

    def run(self):
        FONT = cv2.FONT_HERSHEY_SIMPLEX
        FONT_SCALE = 0.8  # balanced for 720p and 1080p
        THICKNESS = 2
        COLOR = (0, 255, 0)  # green overlay (can also use red/yellow for alerts)
        LINE_TYPE = cv2.LINE_AA

        logger.info(f"Starting emotion detection run loop for camera {self.cam_id}")

        while self.running:
            with self.frame_lock:
                frame = self.raw_frame.copy() if self.raw_frame is not None else None
            if frame is None:
                logger.debug("No frame available yet, sleeping briefly")
                time.sleep(0.01)
                continue

            faces = []
            if self.no_face_counter < self.no_face_threshold:
                faces = self.detect_faces(frame)
                logger.debug(f"Detected {len(faces)} faces")
                if not faces:
                    self.no_face_counter += 1
                    logger.debug(f"No faces detected, incrementing no_face_counter to {self.no_face_counter}")
                else:
                    self.no_face_counter = 0
            else:
                self.no_face_counter += 1
                logger.debug(f"Skipping face detection, no_face_counter={self.no_face_counter}")
                if self.no_face_counter > self.no_face_threshold + 3:
                    logger.debug("Resetting no_face_counter after skipping frames")
                    self.no_face_counter = 0

            for (x, y, w, h) in faces:
                face_img = frame[y:y + h, x:x + w]
                emotion, confidence = predict_emotion(face_img, self.model_path)
                logger.debug(f"Predicted emotion: {emotion} with confidence {confidence:.2f}")

                # Only consider emotions above confidence threshold
                if confidence >= 0.6:
                    self.emotion_buffer.append(emotion)
                else:
                    self.emotion_buffer.append('neutral')  # treat low confidence as neutral

                # Check sustained negative emotion
                negative_count = sum(1 for e in self.emotion_buffer if e in self.negative_emotions)
                ratio = negative_count / len(self.emotion_buffer)

                # Only trigger alert if sustained negative emotion exceeds threshold
                if ratio >= self.sustain_threshold:
                    # Pick the most common negative emotion in buffer
                    from collections import Counter
                    counter = Counter(e for e in self.emotion_buffer if e in self.negative_emotions)
                    most_common_emotion, _ = counter.most_common(1)[0]

                    # Avoid duplicate alerts for the same sustained emotion
                    if most_common_emotion != self.last_negative_emotion:
                        logger.info(
                            f"Sustained negative emotion detected: {most_common_emotion} with ratio {ratio:.2f}")
                        self.save_alert(face_img, most_common_emotion, confidence)
                        self.last_negative_emotion = most_common_emotion
                else:
                    self.last_negative_emotion = None

                # Draw rectangle and label as before, with current frame's emotion
                COLOR = (0, 255, 0)  # or use red for negative if you want to highlight
                THICKNESS = 2
                FONT = cv2.FONT_HERSHEY_SIMPLEX
                FONT_SCALE = 0.8
                LINE_TYPE = cv2.LINE_AA

                cv2.rectangle(frame, (x, y), (x + w, y + h), COLOR, THICKNESS, LINE_TYPE)
                label = f'{emotion}({confidence:.2f})'
                cv2.putText(frame, label, (x, y - 10), FONT, FONT_SCALE, COLOR, THICKNESS, LINE_TYPE)


            with self.frame_lock:
                self.processed_frame = frame

            time.sleep(0)

        logger.info(f"Stopping emotion detection run loop for camera {self.cam_id}")

        self.grab_running = False
        self.grab_thread.join()
        self.capture.release()

    @property
    def is_active(self):
        # Return True if the thread is running and the video capture is open
        return self.running and self.capture.isOpened()

    def stop(self):
        logger.info(f"Stopping camera processing for camera {self.cam_id}")
        self.running = False  # Stop the detection loop
        self.grab_running = False  # Stop the frame grabber loop
        if self.grab_thread.is_alive():
            self.grab_thread.join(timeout=5)
        if self.is_alive():  # wait for main thread if running
            self.join(timeout=5)
        self.capture.release()
        logger.info(f"Camera {self.cam_id} stopped and resources released")

