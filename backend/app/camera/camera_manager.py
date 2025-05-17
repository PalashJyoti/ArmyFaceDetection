import cv2
import threading
import time
from app.models import Camera, CameraStatus

def get_active_camera_sources():
    cameras = Camera.query.filter_by(status=CameraStatus.Active).all()
    return [(cam.id, cam.src) for cam in cameras]

class CameraStream:
    def __init__(self, src, camera_id):
        self.src       = src
        self.camera_id = camera_id
        self.capture   = cv2.VideoCapture(src)
        self.frame     = None
        self.running   = True
        self.thread    = threading.Thread(target=self.update, daemon=True)
        self.thread.start()

    def update(self):
        while self.running:
            ret, frame = self.capture.read()
            if ret:
                self.frame = frame
            else:
                # rewind on EOF
                self.capture.set(cv2.CAP_PROP_POS_FRAMES, 0)
            time.sleep(0.03)  # ~30 FPS

    def get_frame(self):
        return self.frame

    def stop(self):
        self.running = False
        self.capture.release()

class MultiCameraManager:
    def __init__(self, camera_sources):
        self.cameras = {
            cam_id: CameraStream(src, cam_id)
            for cam_id, src in camera_sources
        }

    def get_frame(self, camera_id):
        cam = self.cameras.get(camera_id)
        return cam.get_frame() if cam else None

    def stop_all(self):
        for cam in self.cameras.values():
            cam.stop()

# Initialize
camera_manager = None  # Will be set in app initialization

def get_camera_manager():
    return camera_manager

def set_camera_manager(manager):
    global camera_manager
    camera_manager = manager

def init_camera_manager():
    sources = get_active_camera_sources()
    print(f'sources : {sources}')
    set_camera_manager(MultiCameraManager(sources))
