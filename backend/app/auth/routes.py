from flask import Blueprint, request, jsonify, send_file
from app import db
from app.models import User
import pyotp, qrcode, io

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/signup', methods=['POST'])
def signup():
    data = request.json
    username = data.get('username')
    name = data.get('name')
    password = data.get('password')

    if not username or not name or not password:
        return jsonify({'error': 'All fields are required'}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'User already exists'}), 409

    secret = pyotp.random_base32()
    totp = pyotp.TOTP(secret)
    otp_url = totp.provisioning_uri(name=username, issuer_name="MyApp")

    # QR code generation
    img = qrcode.make(otp_url)
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    buf.seek(0)

    user = User(name=name, username=username, secret=secret)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    return send_file(buf, mimetype='image/png')


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')

    user = User.query.filter_by(username=username).first()
    if not user or not user.check_password(password):
        return jsonify({'error': 'Invalid credentials'}), 401

    # Ask for TOTP next
    return jsonify({'message': '2FA required'}), 200


@auth_bp.route('/verify-totp', methods=['POST'])
def verify_totp():
    data = request.json
    username = data.get('username')
    token = data.get('token')

    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    totp = pyotp.TOTP(user.secret)
    if totp.verify(token):
        return jsonify({'message': 'Login successful'}), 200
    else:
        return jsonify({'error': 'Invalid token'}), 401