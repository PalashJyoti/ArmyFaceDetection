import cv2
import threading
import time
from models import Camera, CameraStatus

def get_active_camera_sources():
    cameras = Camera.query.filter_by(status=CameraStatus.Active).all()
    return [(cam.id, cam.src) for cam in cameras]

class CameraStream:
    def __init__(self, src, camera_id):
        self.src = src
        self.camera_id = camera_id
        self.capture = cv2.VideoCapture(src)
        self.frame = None
        self.running = False
        self.valid = self.capture.isOpened()

        if self.valid:
            self.running = True
            self.thread = threading.Thread(target=self.update, daemon=True)
            self.thread.start()
            print(f"✅ Camera {camera_id} started with src: {src}")
        else:
            print(f"❌ Failed to open camera {camera_id} with src: {src}")

    def update(self):
        while self.running:
            ret, frame = self.capture.read()
            if ret:
                self.frame = frame
            else:
                if self.capture.get(cv2.CAP_PROP_FRAME_COUNT) > 0:
                    # Only rewind if it's a file, not a stream (avoid crash)
                    self.capture.set(cv2.CAP_PROP_POS_FRAMES, 0)
                else:
                    print(f"⚠️ Camera {self.camera_id} read failed (stream might be dead)")
            time.sleep(0.03)

    def get_frame(self):
        return self.frame if self.valid else None

    def stop(self):
        self.running = False
        if self.capture.isOpened():
            self.capture.release()

class MultiCameraManager:
    def __init__(self, camera_sources):
        self.cameras = {}

        for cam_id, src in camera_sources:
            cam_stream = CameraStream(src, cam_id)
            if cam_stream.valid:
                self.cameras[cam_id] = cam_stream
                print(f"✅ Camera {cam_id} initialized and running.")
            else:
                print(f"❌ Skipping invalid camera source: {src} (ID: {cam_id})")

    def get_frame(self, camera_id):
        cam = self.cameras.get(camera_id)
        return cam.get_frame() if cam else None

    def stop_camera(self, camera_id):
        cam = self.cameras.get(camera_id)
        if cam:
            cam.stop()
            # If your CameraStream runs in a thread, wait for it to finish cleanly:
            if hasattr(cam, 'join'):
                cam.join(timeout=2)
            del self.cameras[camera_id]
            print(f"🛑 Camera {camera_id} stopped and removed.")

    def stop_all(self):
        for cam_id in list(self.cameras.keys()):
            self.stop_camera(cam_id)

    def restart_camera(self, camera_id, src):
        # Stop and remove existing stream if any
        if camera_id in self.cameras:
            print(f"🔄 Restarting camera {camera_id}")
            self.stop_camera(camera_id)

        # Start new camera stream
        new_cam_stream = CameraStream(src, camera_id)
        if new_cam_stream.valid:
            self.cameras[camera_id] = new_cam_stream
            print(f"✅ Camera {camera_id} restarted successfully.")
        else:
            print(f"❌ Failed to restart camera {camera_id} with source: {src}")



# Initialize
_camera_manager = None  # global singleton variable

def get_camera_manager():
    global _camera_manager
    if _camera_manager is None:
        # initialize with empty list or actual camera sources
        _camera_manager = MultiCameraManager(camera_sources=[])
        _camera_manager.emotion_detectors = {}
    return _camera_manager

def set_camera_manager(manager):
    global _camera_manager
    _camera_manager = manager

def init_camera_manager():
    sources = get_active_camera_sources()
    print(f'sources : {sources}')
    set_camera_manager(MultiCameraManager(sources))
