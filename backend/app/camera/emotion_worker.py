import os
import cv2
import threading
import datetime
import time
from collections import defaultdict
from app.extensions import db  # SQLAlchemy instance
from app.camera.model import predict_emotion
from app.camera.camera_manager import camera_manager
from app.models import DetectionLog  # DetectionLog model
from flask import current_app
from sqlalchemy.orm import scoped_session, sessionmaker

# Create a thread-safe scoped session factory for thread-local sessions
Session = scoped_session(sessionmaker(bind=db.engine))


class EmotionDetectorThread:
    def __init__(self, camera_id, model_path, app):
        self.camera_id = camera_id
        self.model_path = model_path
        self.app = app  # Flask app instance
        self.emotion_timer = defaultdict(lambda: {'start': None, 'emotion': None})
        self.negative_emotions = {'fear', 'anger', 'sadness', 'disgust'}
        self.running = True

        # Path for saving alert images: <project_root>/app/static/alerts
        base_dir = os.path.dirname(os.path.abspath(__file__))  # path to app/camera
        self.alerts_dir = os.path.normpath(os.path.join(base_dir, '..', 'static', 'alerts'))
        os.makedirs(self.alerts_dir, exist_ok=True)

        # Start the detector thread as a daemon so it won't block shutdown
        self.thread = threading.Thread(target=self.run, daemon=True)
        self.thread.start()

    def run(self):
        with self.app.app_context():
            face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

            while self.running:
                frame = camera_manager.get_frame(self.camera_id)
                if frame is None:
                    time.sleep(0.1)
                    continue

                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                faces = face_cascade.detectMultiScale(gray, scaleFactor=1.3, minNeighbors=5)

                for (x, y, w, h) in faces:
                    crop = frame[y:y+h, x:x+w]
                    label, conf = predict_emotion(crop, self.model_path)
                    face_id = (x, y, w, h)

                    if label in self.negative_emotions and conf > 0.5:
                        current_time = datetime.datetime.utcnow()

                        if self.emotion_timer[face_id]['emotion'] != label:
                            self.emotion_timer[face_id] = {'start': current_time, 'emotion': label}
                        else:
                            elapsed = (current_time - self.emotion_timer[face_id]['start']).total_seconds()
                            if elapsed > 15:
                                timestamp = current_time.strftime('%Y%m%d_%H%M%S')
                                filename = f"alert_{label}_{timestamp}.jpg"
                                full_path = os.path.join(self.alerts_dir, filename)
                                relative_path = f"static/alerts/{filename}"

                                cv2.imwrite(full_path, crop)
                                print(f"[ALERT] Saved screenshot: {relative_path}")

                                # Save detection log with thread-local session
                                session = Session()
                                try:
                                    log = DetectionLog(
                                        camera_id=self.camera_id,
                                        emotion=label,
                                        timestamp=current_time,
                                        image_path=relative_path
                                    )
                                    session.add(log)
                                    session.commit()
                                    print(f"[INFO] DetectionLog saved for camera {self.camera_id}, emotion {label}")
                                except Exception as e:
                                    print(f"[ERROR] DB commit failed: {e}")
                                    session.rollback()
                                finally:
                                    session.close()

                                # Reset timer for this face to avoid repeated alerts
                                self.emotion_timer[face_id]['start'] = current_time
                    else:
                        # If face emotion no longer negative or confidence low, remove timer
                        if face_id in self.emotion_timer:
                            del self.emotion_timer[face_id]

                time.sleep(0.03)

    def stop(self):
        self.running = False
        self.thread.join()  # Wait for thread to finish cleanly