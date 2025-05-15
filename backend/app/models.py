from app import db
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timezone

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


class Camera(db.Model):
    __tablename__ = 'cameras'

    id = db.Column(db.Integer, primary_key=True)
    label = db.Column(db.String(100), nullable=False)
    ip = db.Column(db.String(100), nullable=False)
    src = db.Column(db.String(255), nullable=False)  # video source (rtsp, file, etc)
    status = db.Column(db.String(20), nullable=False, default='Inactive')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'label': self.label,
            'ip': self.ip,
            'src': self.src,
            'status': self.status,
            'created_at': self.created_at.isoformat()
        }