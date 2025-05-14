# app/__init__.py

from flask import Flask
from flask_cors import CORS
import pyotp
from .extensions import db  # Import db from extensions.py
from .models import User

def create_app():
    app = Flask(__name__)
    app.secret_key = 'your_secret_key'
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///users.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    db.init_app(app)
    CORS(app)

    from .auth.routes import auth_bp
    from .camera.routes import camera_bp
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(camera_bp)

    with app.app_context():
        from . import models
        db.create_all()

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
                issuer_name="AdminPanel"
            )

            print("✅ Permanent admin created.")
            print(f"Scan this QR in Google Authenticator:\n{otp_uri}")
        else:
            print("✅ Permanent admin already exists.")

    return app
