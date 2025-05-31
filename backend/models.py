from extensions import db
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
import enum
from sqlalchemy import Enum, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy_utils import IPAddressType


# ---------- User Model ----------
class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    secret = db.Column(db.String(32), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='user')
    last_login = db.Column(db.DateTime(timezone=True), nullable=True)

    def set_password(self, password):
        """Hash and store the user's password."""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        """Verify the user's password."""
        return check_password_hash(self.password_hash, password)

    def __repr__(self):
        return f"<User {self.username}, Role: {self.role}>"

# ---------- Camera Status Enum ----------
class CameraStatus(enum.Enum):
    Inactive = "Inactive"
    Active = "Active"
    Error = "Error"


# ---------- Camera Model ----------
class Camera(db.Model):
    __tablename__ = 'cameras'

    id = db.Column(db.Integer, primary_key=True)
    label = db.Column(db.String(100), nullable=False, unique=True, index=True)
    ip = db.Column(IPAddressType, nullable=False, unique=True, index=True)
    src = db.Column(db.String(255), nullable=False, unique=True)
    status = db.Column(Enum(CameraStatus), nullable=False, default=CameraStatus.Inactive)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Removed detection_logs relationship since camera_id is no longer a ForeignKey

    def __init__(self, label, ip, src, status=CameraStatus.Inactive):
        self.label = label
        self.ip = ip
        self.src = src
        self.status = status

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'label': self.label,
            'ip': str(self.ip),
            'src': self.src,
            'status': self.status.value,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

    def __repr__(self):
        return f"<Camera {self.label} ({self.ip}) - Status: {self.status.value}>"


# ---------- Detection Log Model ----------
class DetectionLog(db.Model):
    __tablename__ = 'detection_logs'

    id = db.Column(db.Integer, primary_key=True)
    camera_id = db.Column(db.Integer, nullable=False)  # No ForeignKey constraint now
    camera_label = db.Column(db.String(100), nullable=False)  # New field for camera label
    emotion = db.Column(db.String(50), nullable=False)
    confidence = db.Column(db.Float, nullable=True)
    image_path = db.Column(db.String(255), nullable=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    def __init__(self, camera_id, camera_label, emotion, timestamp=None, image_path=None, confidence=None):
        self.camera_id = camera_id
        self.camera_label = camera_label
        self.emotion = emotion
        self.timestamp = timestamp or datetime.utcnow()
        self.image_path = image_path
        self.confidence = confidence

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'camera_id': self.camera_id,
            'camera_label': self.camera_label,
            'emotion': self.emotion,
            'confidence': self.confidence,
            'image_path': self.image_path,
            'timestamp': self.timestamp.isoformat()
        }

    def __repr__(self):
        return f"<Log Cam#{self.camera_id} ({self.camera_label}) - {self.emotion} @ {self.timestamp}>"
