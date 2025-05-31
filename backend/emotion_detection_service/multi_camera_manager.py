import logging

from emotion_detection_service.emotion_detector_thread import EmotionDetectorThread
from models import Camera, CameraStatus

# Configure logger
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

# Optional: Add console handler if not already configured globally
if not logger.handlers:
    ch = logging.StreamHandler()
    ch.setLevel(logging.INFO)
    formatter = logging.Formatter('[%(asctime)s] [%(levelname)s] [%(filename)s:%(lineno)d] %(message)s')
    ch.setFormatter(formatter)
    logger.addHandler(ch)

class MultiCameraManager:
    def __init__(self, model_path, app):
        self.detectors = {}
        self.model_path = model_path
        self.app = app
        logger.info("MultiCameraManager initialized.")

    def add_camera(self, cam_id, src):
        if cam_id not in self.detectors:
            detector = EmotionDetectorThread(cam_id, src, self.model_path, self.app)
            detector.start()
            self.detectors[cam_id] = detector
            logger.info(f"Started detector for camera {cam_id}")
        else:
            logger.warning(f"Camera {cam_id} already exists.")

    def remove_camera(self, cam_id):
        detector = self.detectors.pop(cam_id, None)
        if detector:
            detector.stop()
            detector.join()
            logger.info(f"Stopped detector for camera {cam_id}")
        else:
            logger.warning(f"Attempted to remove unknown camera {cam_id}")

    def cleanup_inactive_cameras(self):
        with self.app.app_context():
            inactive_cameras = Camera.query.filter(Camera.status.in_([CameraStatus.Inactive, CameraStatus.Error])).all()
            inactive_ids = {cam.id for cam in inactive_cameras}

            logger.debug(f"Inactive camera IDs from DB: {inactive_ids}")
            logger.debug(f"Current detectors in manager: {list(self.detectors.keys())}")

            for cam_id in list(self.detectors.keys()):
                if cam_id in inactive_ids:
                    status = Camera.query.get(cam_id).status.value
                    logger.info(f"Stopping camera {cam_id}, status from DB: {status}")
                    self.remove_camera(cam_id)


    def get_frame(self, cam_id):
        detector = self.detectors.get(cam_id)
        if detector:
            return detector.get_latest_frame()
        else:
            logger.warning(f"No frame available for camera {cam_id}")
            return None

    def stop_all(self):
        logger.info("Stopping all camera detectors...")
        for detector in self.detectors.values():
            detector.stop()
        for detector in self.detectors.values():
            detector.join()
        self.detectors.clear()
        logger.info("All detectors stopped and cleared.")
