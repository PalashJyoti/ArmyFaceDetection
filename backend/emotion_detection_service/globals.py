import logging
from threading import Lock
from typing import Optional

import torch
from torchvision import transforms

from emotion_detection_service.model import ResEmoteNet

logger = logging.getLogger(__name__)
logger.setLevel(logging.WARN)

if not logger.handlers:  # Avoid duplicate logs
    ch = logging.StreamHandler()
    ch.setLevel(logging.DEBUG)
    formatter = logging.Formatter('[%(asctime)s] [%(levelname)s] %(message)s')
    ch.setFormatter(formatter)
    logger.addHandler(ch)


# Face detector model files (adjust if needed)
FACE_DETECTOR_PROTO = "emotion_detection_service/deploy.prototxt"
FACE_DETECTOR_MODEL = "emotion_detection_service/res10_300x300_ssd_iter_140000.caffemodel"

# Internal globals
manager = None
_model: Optional[ResEmoteNet] = None
_model_lock = Lock()
_labels = ['happiness', 'surprise', 'sadness', 'anger', 'disgust', 'fear', 'neutral']
_device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

_transform = transforms.Compose([
    transforms.ToPILImage(),
    transforms.Resize((64, 64)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406],
                         [0.229, 0.224, 0.225])  # standard ImageNet
])



def load_model(model_path: str):
    global _model
    with _model_lock:
        if _model is None:
            logger.debug("Loading emotion detection model...")
            try:
                _model = ResEmoteNet().to(_device)
                checkpoint = torch.load(model_path, map_location=_device)
                _model.load_state_dict(checkpoint['model_state_dict'])
                _model.eval()
                logger.info("Emotion detection model loaded successfully.")
            except Exception as e:
                logger.error(f"Failed to load model: {e}")
                raise


def init_camera_manager(model_path: str, app):
    global manager
    from emotion_detection_service.multi_camera_manager import MultiCameraManager
    logger.debug("Initializing multi-camera manager...")
    manager = MultiCameraManager(model_path=model_path, app=app)
    return manager
