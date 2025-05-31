import threading
import cv2
import time

class FrameCaptureThread(threading.Thread):
    def __init__(self, src, cam_id):
        super().__init__()
        self.src = src
        self.cam_id = cam_id
        self.capture = cv2.VideoCapture(src, cv2.CAP_FFMPEG)
        self.frame_lock = threading.Lock()
        self.latest_frame = None
        self.running = True
        self.failure_count = 0
        self.max_failures = 20

    def run(self):
        while self.running:
            ret, frame = self.capture.read()
            if ret:
                with self.frame_lock:
                    self.latest_frame = frame
                self.failure_count = 0
            else:
                self.failure_count += 1
                print(f"[Camera {self.cam_id}] Frame grab failed ({self.failure_count})")
                if self.failure_count >= self.max_failures:
                    self.reconnect()
            time.sleep(0.03)

        self.capture.release()

    def get_frame(self):
        with self.frame_lock:
            return self.latest_frame.copy() if self.latest_frame is not None else None

    def reconnect(self):
        print(f"[Camera {self.cam_id}] Reconnecting to stream...")
        try:
            self.capture.release()
            time.sleep(1)
            if self.src.startswith("rtsp://") and "rtsp_transport=tcp" not in self.src:
                self.src += "?rtsp_transport=tcp"
            for attempt in range(3):
                self.capture = cv2.VideoCapture(self.src, cv2.CAP_FFMPEG)
                if self.capture.isOpened():
                    print(f"[Camera {self.cam_id}] Reconnected on attempt {attempt + 1}")
                    break
                time.sleep(2)
            else:
                print(f"[Camera {self.cam_id}] Failed to reconnect after 3 attempts.")
        except Exception as e:
            print(f"[Camera {self.cam_id}] Reconnect error: {e}")
        self.failure_count = 0

    def stop(self):
        self.running = False
