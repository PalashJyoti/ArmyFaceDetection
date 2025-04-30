from flask import Blueprint, request, jsonify, send_file
from app import db
from app.models import User
import pyotp, qrcode, io, jwt, datetime

auth_bp = Blueprint('auth', __name__)
JWT_SECRET = 'your_jwt_secret_key'  # Keep this secret and secure
JWT_EXP_DELTA_SECONDS = 3600        # Token validity time in seconds

# In-memory blacklist (replace with Redis or DB for production)
blacklisted_tokens = set()

def create_jwt(user):
    payload = {
        'user_id': user.id,
        'username': user.username,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(seconds=JWT_EXP_DELTA_SECONDS)
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm='HS256')
    return token

def decode_jwt(token):
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

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
        jwt_token = create_jwt(user)
        return jsonify({'token': jwt_token}), 200
    else:
        return jsonify({'error': 'Invalid token'}), 401


@auth_bp.route('/logout', methods=['POST'])
def logout():
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return jsonify({'error': 'Authorization header missing'}), 401

    token = auth_header.replace('Bearer ', '')
    blacklisted_tokens.add(token)
    return jsonify({'message': 'Logged out successfully'}), 200


# Optional: Decorator for protected routes
from functools import wraps

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

# Example protected route
@auth_bp.route('/dashboard', methods=['GET'])
@jwt_required
def dashboard():
    return jsonify({'message': f"Welcome, {request.user['username']}!"})