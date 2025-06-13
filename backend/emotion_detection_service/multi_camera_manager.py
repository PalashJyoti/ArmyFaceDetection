import logging
import concurrent.futures  # Add this import

from emotion_detection_service.emotion_detector_thread import EmotionDetectorThread
from models import Camera, CameraStatus

# Configure logger
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

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

        # Add resource management
        self.max_cameras = 10  # Limit based on system resources
        self.active_cameras = 0

        # Add thread pool for background tasks
        self.thread_pool = concurrent.futures.ThreadPoolExecutor(max_workers=4)

        logger.info("MultiCameraManager initialized.")

    def add_camera(self, cam_id, src):
        if cam_id not in self.detectors:
            # Check if we're at capacity
            if self.active_cameras >= self.max_cameras:
                logger.warning(f"Maximum camera limit reached ({self.max_cameras}). Cannot add camera {cam_id}.")
                return False

            detector = EmotionDetectorThread(cam_id, src, self.model_path, self.app)
            detector.start()
            self.detectors[cam_id] = detector
            self.active_cameras += 1
            logger.info(
                f"Started detector for camera {cam_id}. Active cameras: {self.active_cameras}/{self.max_cameras}")
            return True
        else:
            logger.debug(f"Camera {cam_id} already exists.")
            return False

    def remove_camera(self, cam_id):
        detector = self.detectors.pop(cam_id, None)
        if detector:
            detector.stop()
            detector.join()
            self.active_cameras -= 1
            logger.debug(
                f"Stopped detector for camera {cam_id}. Active cameras: {self.active_cameras}/{self.max_cameras}")
            return True
        else:
            logger.debug(f"Attempted to remove unknown camera {cam_id}")
            return False

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
            logger.debug(f"No frame available for camera {cam_id}")
            return None

    def stop_all(self):
        logger.info("Stopping all camera detectors...")
        for detector in self.detectors.values():
            detector.stop()
        for detector in self.detectors.values():
            detector.join()
        self.detectors.clear()
        logger.info("All detectors stopped and cleared.")
