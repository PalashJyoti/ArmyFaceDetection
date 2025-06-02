from flask import Blueprint, request, jsonify, send_file
from datetime import datetime, timezone, timedelta
from functools import wraps
from extensions import db
from models import User
import pyotp
import qrcode
import io
import jwt
from pytz import timezone as pytz_timezone, utc

auth_bp = Blueprint('auth', __name__)
JWT_SECRET = 'your_jwt_secret_key'  # Replace this with a secure env var in production
JWT_EXP_DELTA_SECONDS = 3600

blacklisted_tokens = set()

def create_jwt(user):
    payload = {
        'user_id': user.id,
        'username': user.username,
        'role': user.role,
        'exp': datetime.utcnow() + timedelta(seconds=JWT_EXP_DELTA_SECONDS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm='HS256')

def decode_jwt(token):
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def jwt_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Authorization header missing'}), 401

        token = auth_header.replace('Bearer ', '')
        if token in blacklisted_tokens:
            return jsonify({'error': 'Token is blacklisted'}), 401

        payload = decode_jwt(token)
        if not payload:
            return jsonify({'error': 'Invalid or expired token'}), 401

        request.user = payload
        return f(*args, **kwargs)
    return decorated

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
    otp_url = totp.provisioning_uri(name=username, issuer_name="MindSightAI")

    img = qrcode.make(otp_url)
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    buf.seek(0)

    user = User(name=name, username=username, secret=secret, role='user')
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

    user.last_login = datetime.utcnow().replace(tzinfo=timezone.utc)
    db.session.commit()

    return jsonify({'message': '2FA required'}), 200

@auth_bp.route('/verify-totp', methods=['POST'])
def verify_totp():
    data = request.json
    username = data.get('username')
    token = data.get('token')

    if not username or not token:
        return jsonify({'error': 'Username and token are required'}), 400

    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    print(f"User secret: {user.secret}")
    print(f"Token received: {token}")

    totp = pyotp.TOTP(user.secret)
    if totp.verify(token):
        jwt_token = create_jwt(user)
        return jsonify({'token': jwt_token}), 200
    else:
        return jsonify({'error': 'Invalid TOTP'}), 401

@auth_bp.route('/verify-totp-for-reset', methods=['POST'])
def verify_totp_for_reset():
    data = request.json
    username = data.get('username')
    token = data.get('token')

    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    totp = pyotp.TOTP(user.secret)
    if totp.verify(token):
        return jsonify({'message': 'TOTP verified successfully'}), 200
    else:
        return jsonify({'error': 'Invalid token'}), 401

@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    data = request.json
    username = data.get('username')
    new_password = data.get('newPassword')

    if not new_password:
        return jsonify({'error': 'New password is required'}), 400

    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    user.set_password(new_password)
    db.session.commit()

    return jsonify({'message': 'Password reset successfully'}), 200

@auth_bp.route('/logout', methods=['POST'])
def logout():
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return jsonify({'error': 'Authorization header missing'}), 401

    token = auth_header.replace('Bearer ', '')
    blacklisted_tokens.add(token)
    return jsonify({'message': 'Logged out successfully'}), 200

@auth_bp.route('/change-role', methods=['POST'])
@jwt_required
def change_role():
    current_user = User.query.get(request.user['user_id'])
    if current_user.role != 'admin':
        return jsonify({'error': 'Access denied. Admins only.'}), 403

    data = request.json
    username = data.get('username')
    new_role = data.get('role')

    if not username or not new_role:
        return jsonify({'error': 'Username and role are required'}), 400

    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    user.role = new_role
    db.session.commit()

    return jsonify({'message': f"Role for {username} changed to {new_role}"}), 200

@auth_bp.route('/users', methods=['GET'])
def get_users():
    ist = pytz_timezone('Asia/Kolkata')
    users = User.query.all()
    return jsonify({
        'users': [
            {
                'id': user.id,
                'name': user.name,
                'role': user.role,
                'last_login': user.last_login.replace(tzinfo=utc).astimezone(ist).strftime('%b %d, %Y, %I:%M %p') if user.last_login else None
            }
            for user in users
        ]
    })

@auth_bp.route('/users/add', methods=['POST'])
def add_user():
    data = request.json
    name = data.get('name')
    role = data.get('role', 'user')

    if not name:
        return jsonify({'error': 'Name is required'}), 400

    user = User(name=name, role=role)
    db.session.add(user)
    db.session.commit()
    return jsonify({'message': 'User added'}), 201

@auth_bp.route('/users/delete/<int:user_id>', methods=['DELETE'])
@jwt_required
def delete_user(user_id):
    current_user = User.query.get(request.user['user_id'])
    if current_user.role != 'admin':
        return jsonify({'error': 'Access denied. Admins only.'}), 403

    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    db.session.delete(user)
    db.session.commit()
    return jsonify({'message': 'User deleted'}), 200

@auth_bp.route('/users/<int:user_id>/role', methods=['PUT'])
@jwt_required
def update_role(user_id):
    current_user = request.user

    if current_user['role'] != 'admin':
        return jsonify({'error': 'Access denied. Admins only.'}), 403

    if user_id == current_user['user_id']:
        return jsonify({'error': 'You cannot change your own role.'}), 403

    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    data = request.json
    new_role = data.get('role')
    if not new_role:
        return jsonify({'error': 'New role is required'}), 400

    if new_role not in ['admin', 'user']:
        return jsonify({'error': 'Invalid role specified'}), 400

    user.role = new_role
    db.session.commit()

    return jsonify({'id': user.id, 'name': user.name, 'role': user.role})

@auth_bp.route('/dashboard', methods=['GET'])
@jwt_required
def dashboard():
    return jsonify({'message': f"Welcome, {request.user['username']}!"})