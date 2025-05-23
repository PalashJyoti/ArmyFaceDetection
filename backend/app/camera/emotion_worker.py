import datetime
import os
import threading
import time
from collections import defaultdict

import cv2
from sqlalchemy.orm import scoped_session, sessionmaker

from app.camera.camera_manager import get_camera_manager
from app.camera.model import predict_emotion
from app.extensions import db
from app.models import DetectionLog

Session = scoped_session(sessionmaker(bind=db.engine))

# class EmotionDetectorThread:
#     NEGATIVE_EMOTIONS = {'fear', 'anger', 'sadness', 'disgust'}
#     FACE_DETECTOR = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
#     RESIZE_DIM = (320, 240)
#     DETECTION_INTERVAL = 5  # Process every 5th frame
#     EMOTION_THRESHOLD = 0.5
#     ALERT_DURATION = 15  # Seconds emotion must persist before alert
#     COOLDOWN_PERIOD = 30  # Seconds cooldown between alerts per face+emotion
#
#     def __init__(self, camera_id, model_path, app):
#         self.camera_id = camera_id
#         self.model_path = model_path
#         self.app = app
#         self.running = True
#         self.frame_count = 0
#         self.latest_frame = None
#
#         # Stores info per face_id: {'start': datetime, 'emotion': str, 'cooldown_until': datetime or None}
#         self.emotion_timer = defaultdict(lambda: {'start': None, 'emotion': None, 'cooldown_until': None})
#
#         self.alerts_dir = os.path.normpath(os.path.join(
#             os.path.dirname(os.path.abspath(__file__)),
#             '..', 'static', 'alerts'
#         ))
#         os.makedirs(self.alerts_dir, exist_ok=True)
#
#         self.thread = threading.Thread(target=self.run, daemon=True)
#         self.thread.start()
#
#     def run(self):
#         with self.app.app_context():
#             while self.running:
#                 frame = get_camera_manager().get_frame(self.camera_id)
#                 if frame is None:
#                     time.sleep(0.1)
#                     continue
#
#                 self.frame_count += 1
#                 if self.frame_count % self.DETECTION_INTERVAL != 0:
#                     continue
#
#                 processed_frame = self.process_frame(frame)
#                 self.latest_frame = processed_frame.copy()
#                 time.sleep(0.03)
#
#     def process_frame(self, frame):
#         small_frame = cv2.resize(frame, self.RESIZE_DIM)
#         gray = cv2.cvtColor(small_frame, cv2.COLOR_BGR2GRAY)
#         faces = self.FACE_DETECTOR.detectMultiScale(gray, 1.3, 5)
#
#         scale_x = frame.shape[1] / self.RESIZE_DIM[0]
#         scale_y = frame.shape[0] / self.RESIZE_DIM[1]
#
#         for (x, y, w, h) in faces:
#             # Scale coordinates to original frame size
#             x, y, w, h = [int(v * scale) for v, scale in zip((x, y, w, h), (scale_x, scale_y, scale_x, scale_y))]
#             face_crop = frame[y:y+h, x:x+w]
#
#             label, confidence = predict_emotion(face_crop, self.model_path)
#
#             self.annotate_frame(frame, label, confidence, x, y, w, h)
#             self.handle_emotion(label, confidence, frame, x, y, w, h)
#
#         return frame
#
#     def annotate_frame(self, frame, label, confidence, x, y, w, h):
#         cv2.rectangle(frame, (x, y), (x + w, y + h), (255, 0, 0), 1)
#         cv2.putText(frame, f'{label} ({confidence:.2f})', (x, y - 10),
#                     cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)
#
#     def handle_emotion(self, label, confidence, frame, x, y, w, h):
#         face_id = self._get_face_id(x, y, w, h)
#         now = datetime.datetime.utcnow()
#         timer = self.emotion_timer.get(face_id)
#
#         # If not a negative emotion or confidence too low, clear any existing timer for this face
#         if label not in self.NEGATIVE_EMOTIONS or confidence < self.EMOTION_THRESHOLD:
#             if timer is not None:
#                 del self.emotion_timer[face_id]
#             return
#
#         # Check for active cooldown period first
#         if timer and timer['cooldown_until'] and now < timer['cooldown_until']:
#             # Currently in cooldown, so do nothing for this detection
#             return
#
#         # If this is a new detection for this face_id or emotion has changed
#         if timer is None or timer['emotion'] != label:
#             # Start a new timer for this face and emotion. Reset cooldown.
#             self.emotion_timer[face_id] = {'start': now, 'emotion': label, 'cooldown_until': None}
#             return # Wait for ALERT_DURATION to pass for the first alert
#
#         # If we reach here, it means:
#         # 1. It's a negative emotion with sufficient confidence.
#         # 2. It's the *same* negative emotion as the one being tracked for this face_id.
#         # 3. There is no active cooldown period.
#
#         elapsed = (now - timer['start']).total_seconds()
#
#         # If the emotion has persisted long enough for an alert
#         if elapsed >= self.ALERT_DURATION:
#             # Log the detection (save image and log to DB)
#             self._log_detection(frame, label, now, x, y, w, h)
#             # Activate the cooldown period for this specific face and emotion
#             self.emotion_timer[face_id]['cooldown_until'] = now + datetime.timedelta(seconds=self.COOLDOWN_PERIOD)
#             # Reset the 'start' time so that the next alert cycle starts after cooldown and ALERT_DURATION
#             self.emotion_timer[face_id]['start'] = now
#
#     def _log_detection(self, frame, label, timestamp, x, y, w, h):
#         timestamp_str = timestamp.strftime('%Y%m%d_%H%M%S')
#         filename = f"alert_{label}_{timestamp_str}.jpg"
#         full_path = os.path.join(self.alerts_dir, filename)
#         relative_path = f"static/alerts/{filename}"
#
#         # Save face crop only to alerts folder
#         cv2.imwrite(full_path, frame[y:y+h, x:x+w])
#         print(f"[ALERT] Saved screenshot: {relative_path}")
#
#         log = DetectionLog(
#             camera_id=self.camera_id,
#             emotion=label,
#             timestamp=timestamp,
#             image_path=relative_path
#         )
#         session = Session()
#         try:
#             session.add(log)
#             session.commit()
#             print(f"[INFO] DetectionLog saved for camera {self.camera_id}, emotion {label}")
#         except Exception as e:
#             session.rollback()
#             print(f"[ERROR] DB commit failed: {e}")
#         finally:
#             session.close()
#
#     def _get_face_id(self, x, y, w, h):
#         # Approximate face position for consistent ID, allowing minor movement tolerance
#         return (round(x / 10), round(y / 10), round(w / 10), round(h / 10))
#
#     def get_latest_frame(self):
#         return self.latest_frame
#
#     def stop(self):
#         self.running = False









import threading
import time
import cv2
import os
from datetime import datetime
from app.camera.model import predict_emotion
from app.models import DetectionLog
from app import db

NEGATIVE_EMOTIONS = {'fear', 'anger', 'sadness', 'disgust'}
EMOTION_THRESHOLD = 0.5

class EmotionDetectorThread(threading.Thread):
    def __init__(self, cam_id, model_path, app):
        super().__init__()
        self.cam_id = cam_id
        self.model_path = model_path
        self.app = app
        self.running = True
        self.last_negative_emotion = None

        from app.camera.camera_manager import get_camera_manager
        self.camera_manager = get_camera_manager()

        # Ensure alerts directory exists once, idempotent and thread-safe
        self.alerts_dir = os.path.abspath('static/alerts')
        os.makedirs(self.alerts_dir, exist_ok=True)

        # Load face cascade classifier once
        self.face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")

        self.latest_emotion = None
        self.latest_confidence = None
        self.frame_lock = threading.Lock()
        self.frame = None  # Initialize frame attribute to avoid race conditions

    def get_latest_frame(self):
        """Return the latest frame with emotion overlay if available, thread-safe."""
        with self.frame_lock:
            if self.frame is None:
                return None
            frame = self.frame.copy()
            if self.latest_emotion and self.latest_confidence is not None:
                text = f"{self.latest_emotion} ({self.latest_confidence:.2f})"
                cv2.putText(frame, text, (10, 30),
                            cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
            return frame

    def run(self):
        print(f"[EmotionDetectorThread] Starting emotion detection thread for camera {self.cam_id}")

        detection_interval = 0.5  # seconds between detections
        last_time = time.monotonic()

        while self.running:
            now = time.monotonic()
            elapsed = now - last_time
            if elapsed < detection_interval:
                time.sleep(detection_interval - elapsed)
            last_time = time.monotonic()

            frame = self._get_frame()
            if frame is None:
                continue

            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            faces = self.face_cascade.detectMultiScale(gray, scaleFactor=1.3, minNeighbors=5)

            if len(faces) == 0:
                with self.frame_lock:
                    self.latest_emotion = None
                    self.latest_confidence = None
                    self.frame = frame
                continue

            # Process only first detected face
            (x, y, w, h) = faces[0]
            face_img = frame[y:y+h, x:x+w]

            emotion, confidence = predict_emotion(face_img, self.model_path)
            print(f"[EmotionDetectorThread] Detected emotion: {emotion} with confidence {confidence:.2f} on camera {self.cam_id}")

            # Draw rectangle around face
            cv2.rectangle(frame, (x, y), (x+w, y+h), (0, 255, 0), 15)

            # Prepare overlay label text
            label = f"{emotion} ({confidence:.2f})"
            font = cv2.FONT_HERSHEY_SIMPLEX
            font_scale = 3.0
            thickness = 15
            text_size, _ = cv2.getTextSize(label, font, font_scale, thickness)
            text_x = x + 5
            text_y = y + text_size[1] + 5

            # Put emotion label text on frame
            cv2.putText(frame, label, (text_x, text_y), font, font_scale, (0, 255, 0), thickness)

            # Update latest frame and detection info thread-safely
            with self.frame_lock:
                self.latest_emotion = emotion
                self.latest_confidence = confidence
                self.frame = frame

            # Save snapshot and log only if new negative emotion detected
            if emotion in NEGATIVE_EMOTIONS and confidence >= EMOTION_THRESHOLD:
                if emotion != self.last_negative_emotion:
                    self._save_snapshot_and_log(frame, emotion, confidence)
                    self.last_negative_emotion = emotion
            else:
                self.last_negative_emotion = None

        print(f"[EmotionDetectorThread] Stopped emotion detection thread for camera {self.cam_id}")

    def _get_frame(self):
        """Fetch the latest frame from camera manager."""
        cam = self.camera_manager.cameras.get(self.cam_id)
        if cam is None:
            return None
        frame = cam.get_frame()
        if frame is None:
            return None
        return frame

    def _save_snapshot_and_log(self, frame, emotion, confidence):
        """Save snapshot image and log detection in DB."""
        timestamp = datetime.utcnow()
        timestamp_str = timestamp.strftime('%Y%m%d_%H%M%S')
        filename = f"alert_{emotion}_{timestamp_str}.jpg"
        full_path = os.path.join(self.alerts_dir, filename)
        relative_path = f"static/alerts/{filename}"

        # Save image snapshot
        cv2.imwrite(full_path, frame)
        print(f"[EmotionDetectorThread] Saved snapshot to {full_path}")

        # Log detection in database within app context
        with self.app.app_context():
            log = DetectionLog(
                camera_id=self.cam_id,
                emotion=emotion,
                confidence=confidence,
                image_path=relative_path,
                timestamp=timestamp
            )
            db.session.add(log)
            db.session.commit()
            print(f"[EmotionDetectorThread] Logged detection to database for camera {self.cam_id}")

    def stop(self):
        """Stop the thread cleanly."""
        print(f"[EmotionDetectorThread] Stopping thread for camera {self.cam_id}")
        self.running = False
