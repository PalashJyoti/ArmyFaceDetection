from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS  # 🔥 Import CORS
import os

db = SQLAlchemy()

def create_app():
    app = Flask(__name__)
    app.secret_key = 'your_secret_key'
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///users.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    db.init_app(app)
    
    CORS(app)  # 🔥 Enable CORS for all routes and origins

    from .auth.routes import auth_bp
    app.register_blueprint(auth_bp, url_prefix='/api/auth')

    with app.app_context():
        from . import models
        db.create_all()

    return app