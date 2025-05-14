import cv2
import threading
import time

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
            i+1: CameraStream(src, i+1)
            for i, src in enumerate(camera_sources)
        }

    def get_frame(self, camera_id):
        cam = self.cameras.get(camera_id)
        return cam.get_frame() if cam else None

    def stop_all(self):
        for cam in self.cameras.values():
            cam.stop()
