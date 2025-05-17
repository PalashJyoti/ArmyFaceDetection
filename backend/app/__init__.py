from flask import Flask
from flask_cors import CORS
import pyotp
from app.extensions import db
import os
from sqlalchemy import inspect
from app.models import DetectionLog, Camera, User


emotion_detectors = []


def create_app():
    app = Flask(__name__)
    app.secret_key = 'your_secret_key'
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    db.init_app(app)
    CORS(app)

    from app.auth.routes import auth_bp
    from app.camera.routes import camera_bp
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(camera_bp)

    with app.app_context():
        # Now create all tables in the database
        db.create_all()

        inspector = inspect(db.engine)
        print(inspector.get_table_names())

        # Create Permanent Admin (if not exists)
        admin_username = 'admin'
        admin_password = 'secureAdmin123'

        existing_admin = User.query.filter_by(username=admin_username).first()
        if not existing_admin:
            totp_secret = pyotp.random_base32()

            admin_user = User(
                username=admin_username,
                name='Super Admin',
                role='admin',
                secret=totp_secret
            )
            admin_user.set_password(admin_password)

            db.session.add(admin_user)
            db.session.commit()

            otp_uri = pyotp.totp.TOTP(totp_secret).provisioning_uri(
                name=admin_username,
                issuer_name="MindSightAI"
            )

            print("✅ Permanent admin created.")
            print(f"Scan this QR in Google Authenticator:\n{otp_uri}")
        else:
            print("✅ Permanent admin already exists.")

        # Start your other app-related initializations
        start_emotion_threads(app)

    return app


def start_emotion_threads(app):
    from app.camera.camera_manager import camera_manager
    from app.camera.emotion_worker import EmotionDetectorThread

    model_path = os.path.abspath("app/camera/fer_model.pth")
    for cam_id in camera_manager.cameras:
        detector = EmotionDetectorThread(cam_id, model_path, app)
        emotion_detectors.append(detector)