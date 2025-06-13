import logging
import threading
import time
import psutil
import torch

logger = logging.getLogger(__name__)


class ResourceMonitor(threading.Thread):
    def __init__(self, camera_manager, check_interval=30):
        super().__init__()
        self.camera_manager = camera_manager
        self.check_interval = check_interval  # seconds
        self.running = True
        self.daemon = True

    def run(self):
        while self.running:
            try:
                # Check CPU usage
                cpu_percent = psutil.cpu_percent(interval=1)
                # Check memory usage
                memory = psutil.virtual_memory()
                # Check GPU memory if available
                gpu_memory_used = 0
                if torch.cuda.is_available():
                    gpu_memory_used = torch.cuda.memory_allocated() / torch.cuda.get_device_properties(
                        0).total_memory * 100

                logger.info(
                    f"System resources - CPU: {cpu_percent}%, RAM: {memory.percent}%, GPU Memory: {gpu_memory_used:.1f}%")

                # Take action if resources are constrained
                if cpu_percent > 90 or memory.percent > 90 or gpu_memory_used > 90:
                    logger.warning("System resources critically high, reducing camera processing")
                    self._reduce_camera_load()

            except Exception as e:
                logger.error(f"Error in resource monitoring: {e}")

            time.sleep(self.check_interval)

    def _reduce_camera_load(self):
        # Implement logic to reduce load, e.g., increase frame skipping
        # or temporarily disable some cameras
        pass

    def stop(self):
        self.running = False