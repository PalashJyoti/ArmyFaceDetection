import torch
import torch.nn as nn
import torch.nn.functional as f
import torchvision.transforms as transforms
from PIL import Image
import cv2
import numpy as np


class SEBlock(nn.Module):
    def __init__(self, in_channels, reduction=16):
        super(SEBlock, self).__init__()
        self.avg_pool = nn.AdaptiveAvgPool2d(1)
        self.fc = nn.Sequential(
            nn.Linear(in_channels, in_channels // reduction, bias=False),
            nn.ReLU(inplace=True),
            nn.Linear(in_channels // reduction, in_channels, bias=False),
            nn.Sigmoid()
        )

    def forward(self, x):
        b, c, _, _ = x.size()
        y = self.avg_pool(x).view(b, c)
        y = self.fc(y).view(b, c, 1, 1)
        return x * y.expand_as(x)


class ResidualBlock(nn.Module):
    def __init__(self, in_ch, out_ch, stride=1):
        super(ResidualBlock, self).__init__()
        self.conv1 = nn.Conv2d(in_ch, out_ch, kernel_size=3, stride=stride, padding=1)
        self.bn1 = nn.BatchNorm2d(out_ch)
        self.conv2 = nn.Conv2d(out_ch, out_ch, kernel_size=3, stride=1, padding=1)
        self.bn2 = nn.BatchNorm2d(out_ch)

        self.shortcut = nn.Sequential()
        if stride != 1 or in_ch != out_ch:
            self.shortcut = nn.Sequential(
                nn.Conv2d(in_ch, out_ch, kernel_size=1, stride=stride, padding=0),
                nn.BatchNorm2d(out_ch)
            )

    def forward(self, x):
        out = f.relu(self.bn1(self.conv1(x)))
        out = self.bn2(self.conv2(out))
        out += self.shortcut(x)
        out = f.relu(out)
        return out


class ResEmoteNet(nn.Module):
    def __init__(self):
        super(ResEmoteNet, self).__init__()
        self.conv1 = nn.Conv2d(3, 64, kernel_size=3, padding=1)
        self.bn1 = nn.BatchNorm2d(64)
        self.conv2 = nn.Conv2d(64, 128, kernel_size=3, padding=1)
        self.bn2 = nn.BatchNorm2d(128)
        self.conv3 = nn.Conv2d(128, 256, kernel_size=3, padding=1)
        self.bn3 = nn.BatchNorm2d(256)
        self.relu = nn.ReLU(inplace=True)
        self.se = SEBlock(256)

        self.res_block1 = ResidualBlock(256, 512, stride=2)
        self.res_block2 = ResidualBlock(512, 1024, stride=2)
        self.res_block3 = ResidualBlock(1024, 2048, stride=2)

        self.pool = nn.AdaptiveAvgPool2d((1, 1))
        self.fc1 = nn.Linear(2048, 1024)
        self.fc2 = nn.Linear(1024, 512)
        self.fc3 = nn.Linear(512, 256)
        self.dropout1 = nn.Dropout(0.2)
        self.dropout2 = nn.Dropout(0.5)
        self.fc4 = nn.Linear(256, 7)

    def forward(self, x):
        x = f.relu(self.bn1(self.conv1(x)))
        x = f.max_pool2d(x, 2)
        x = self.dropout1(x)
        x = f.relu(self.bn2(self.conv2(x)))
        x = f.max_pool2d(x, 2)
        x = self.dropout1(x)
        x = f.relu(self.bn3(self.conv3(x)))
        x = f.max_pool2d(x, 2)
        x = self.se(x)

        x = self.res_block1(x)
        x = self.res_block2(x)
        x = self.res_block3(x)

        x = self.pool(x)
        x = x.view(x.size(0), -1)
        x = f.relu(self.fc1(x))
        x = self.dropout2(x)
        x = f.relu(self.fc2(x))
        x = self.dropout2(x)
        x = f.relu(self.fc3(x))
        x = self.dropout2(x)
        x = self.fc4(x)
        return x


# Model initialization and prediction functions
_model = None
_labels = ['happiness', 'surprise', 'sadness', 'anger', 'disgust', 'fear', 'neutral']


def _load_model(path):
    global _model
    if _model is None:
        _model = ResEmoteNet()
        checkpoint = torch.load(path, map_location='cpu')
        _model.load_state_dict(checkpoint['model_state_dict'])
        _model.eval()


def predict_emotion(frame, model_path):
    """
    frame: BGR image (NumPy array).
    Returns: (label, confidence)
    """
    _load_model(model_path)

    # Resize and convert BGR to RGB
    face = cv2.resize(frame, (64, 64))
    rgb = cv2.cvtColor(face, cv2.COLOR_BGR2RGB)
    tensor = torch.from_numpy(rgb).permute(2, 0, 1).unsqueeze(0).float() / 255.0

    _model.eval()  # <- ensure eval mode before prediction

    with torch.no_grad():
        logits = _model(tensor)
        probs = torch.nn.functional.softmax(logits, dim=1).squeeze(0).numpy()

    idx = np.argmax(probs)
    return _labels[idx], float(probs[idx])