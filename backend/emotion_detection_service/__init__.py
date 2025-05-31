import os
import logging
from flask import Flask
from extensions import db  # assuming extensions.py is in the project root or accessible

# Configure logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.WARN)

if not logger.handlers:  # Avoid duplicate logs
    ch = logging.StreamHandler()
    ch.setLevel(logging.DEBUG)
    formatter = logging.Formatter('[%(asctime)s] [%(levelname)s] [%(filename)s:%(lineno)d] %(message)s')
    ch.setFormatter(formatter)
    logger.addHandler(ch)

class Config:
    SQLALCHEMY_DATABASE_URI = 'sqlite:///database.db'  # adjust path as needed
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = 'your_secret_key'  # Optional for sessions, CSRF, etc.

def create_app():
    logger.debug("Starting app creation...")

    app = Flask(__name__)
    app.config.from_object(Config)
    logger.debug("App configuration loaded.")

    # Initialize extensions
    db.init_app(app)
    logger.debug("Database initialized.")

    try:
        from emotion_detection_service.routes import api_bp
        app.register_blueprint(api_bp)
        logger.debug("Blueprint 'api_bp' registered.")
    except Exception as e:
        logger.error(f"Failed to register blueprint: {e}")

    logger.info("App creation completed.")
    return app
