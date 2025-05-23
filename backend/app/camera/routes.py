from flask import Blueprint, Response, jsonify, send_from_directory, current_app, request
from datetime import datetime, timedelta
from app.camera.camera_manager import get_camera_manager  # Use the singleton manager already created
from app.models import DetectionLog, Camera, CameraStatus
from collections import defaultdict
from app.camera.model import predict_emotion, ResEmoteNet
from app.extensions import db
from pytz import timezone as pytz_timezone, utc
import cv2
import os
import base64
import torchvision.transforms as transforms
import uuid
from PIL import Image
import time
from sqlalchemy.exc import IntegrityError
import numpy as np
import torch
import torch.nn.functional as F
from app import emotion_detectors
from app.camera.model import _load_model

camera_bp = Blueprint('camera_feed', __name__)

# Helper function for resizing with padding (16:9)
def resize_and_pad(image, target_size):
    target_w, target_h = target_size
    h, w = image.shape[:2]
    scale = min(target_w / w, target_h / h)
    resized = cv2.resize(image, (int(w * scale), int(h * scale)))
    top_pad = (target_h - resized.shape[0]) // 2
    bottom_pad = target_h - resized.shape[0] - top_pad
    left_pad = (target_w - resized.shape[1]) // 2
    right_pad = target_w - resized.shape[1] - left_pad
    padded = cv2.copyMakeBorder(resized, top_pad, bottom_pad, left_pad, right_pad,
                                cv2.BORDER_CONSTANT, value=[0, 0, 0])
    return padded

# No hardcoded camera_sources here! The camera_manager should be initialized elsewhere
# and already loaded cameras from the database on app start.

# Raw feed route (no detection)
@camera_bp.route('/video_feed/<int:camera_id>')
def video_feed(camera_id):
    def generate():
        target_width, target_height = 640, 360
        while True:
            frame = get_camera_manager().get_frame(camera_id)
            if frame is not None:
                frame = resize_and_pad(frame, (target_width, target_height))
                ret, buffer = cv2.imencode('.jpg', frame)
                if ret:
                    yield (b'--frame\r\n'
                           b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
            else:
                time.sleep(0.1)
    return Response(generate(), mimetype='multipart/x-mixed-replace; boundary=frame')

# Emotion-detected feed from background thread
@camera_bp.route('/api/camera_feed/<int:camera_id>')
def camera_feed(camera_id):
    camera_manager = get_camera_manager()

    def generate():
        detector = camera_manager.emotion_detectors.get(camera_id)
        if detector is None:
            yield (b'--frame\r\n'
                   b'Content-Type: text/plain\r\n\r\nCamera not initialized\r\n\r\n')
            return

        while True:
            frame = detector.get_latest_frame()
            if frame is not None:
                _, buf = cv2.imencode('.jpg', frame)
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + buf.tobytes() + b'\r\n')
            else:
                time.sleep(0.1)

    return Response(generate(), mimetype='multipart/x-mixed-replace; boundary=frame')

# Detection log API
@camera_bp.route('/api/detection-logs', methods=['GET'])
def get_detection_logs():
    ist = pytz_timezone('Asia/Kolkata')
    logs = DetectionLog.query.order_by(DetectionLog.timestamp.desc()).all()
    result = []
    for log in logs:
        camera = Camera.query.get(log.camera_id)
        result.append({
            'id': log.id,
            'camera_label': camera.label if camera else 'Unknown',
            'emotion': log.emotion,
            'timestamp': log.timestamp.replace(tzinfo=utc).astimezone(ist).strftime('%b %d, %Y, %I:%M %p') if log.timestamp else None,
            'image_url': f"/{log.image_path}"
        })
    return jsonify(result)

# Serve alert screenshots
@camera_bp.route('/alerts/<path:filename>')
def serve_alert_image(filename):
    alerts_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'static', 'alerts')
    return send_from_directory(alerts_dir, filename)


@camera_bp.route('/api/cameras', methods=['GET'])
def get_cameras():
    cameras = Camera.query.all()
    return jsonify([camera.to_dict() for camera in cameras])


# @camera_bp.route('/api/detection-analytics', methods=['GET'])
# def get_detection_analytics():
#     ist = pytz_timezone('Asia/Kolkata')
#
#     # Handle time range filtering
#     time_range = request.args.get('range', '5m')
#     now_utc = datetime.utcnow().replace(tzinfo=utc)
#
#     if time_range == '5m':
#         since = now_utc - timedelta(minutes=5)
#     elif time_range == '30m':
#         since = now_utc - timedelta(minutes=30)
#     elif time_range == '1h':
#         since = now_utc - timedelta(hours=1)
#     elif time_range == 'today':
#         now_ist = now_utc.astimezone(ist)
#         since = now_ist.replace(hour=0, minute=0, second=0, microsecond=0).astimezone(utc)
#     else:
#         since = now_utc - timedelta(minutes=5)  # Default fallback
#
#     # Fetch filtered logs
#     logs = DetectionLog.query.filter(DetectionLog.timestamp >= since).order_by(DetectionLog.timestamp.asc()).all()
#
#     # Pie chart aggregation
#     emotion_counts = {}
#     for log in logs:
#         emotion = log.emotion.upper()
#         emotion_counts[emotion] = emotion_counts.get(emotion, 0) + 1
#
#     pie_data = [{'name': k, 'value': v} for k, v in emotion_counts.items()]
#
#     # Timeline aggregation (5-minute buckets)
#     timeline_buckets = defaultdict(lambda: {'FEAR': 0, 'ANGER': 0, 'SADNESS': 0, 'DISGUST': 0})
#
#     def bucket_time(ts):
#         ts_ist = ts.replace(tzinfo=utc).astimezone(ist)
#         minute = (ts_ist.minute // 5) * 5
#         return ts_ist.replace(minute=minute, second=0, microsecond=0).strftime('%H:%M')
#
#     for log in logs:
#         if not log.timestamp:
#             continue
#         bucket = bucket_time(log.timestamp)
#         emotion = log.emotion.upper()
#         if emotion in timeline_buckets[bucket]:
#             timeline_buckets[bucket][emotion] += 1
#
#     timeline_data = []
#     for time_label in sorted(timeline_buckets.keys()):
#         data_point = {'time': time_label}
#         data_point.update(timeline_buckets[time_label])
#         timeline_data.append(data_point)
#
#     return jsonify({
#         'pie_data': pie_data,
#         'timeline_data': timeline_data,
#     })


from collections import defaultdict
from datetime import datetime, timedelta
from flask import jsonify, request
from pytz import timezone as pytz_timezone, utc


@camera_bp.route('/api/detection-analytics', methods=['GET'])
def get_detection_analytics():
    """
    Returns detection analytics (pie chart, timeline, trends, etc.)
    Filtered by time range: '5m', '30m', '1h', 'today'.
    """
    ist = pytz_timezone('Asia/Kolkata')
    time_range = request.args.get('range', '5m')
    now_utc = datetime.utcnow().replace(tzinfo=utc)

    # Determine time delta
    time_deltas = {
        '5m': timedelta(minutes=5),
        '30m': timedelta(minutes=30),
        '1h': timedelta(hours=1)
    }

    if time_range == 'today':
        now_ist = now_utc.astimezone(ist)
        since = now_ist.replace(hour=0, minute=0, second=0, microsecond=0).astimezone(utc)
        delta = now_utc - since
    else:
        delta = time_deltas.get(time_range, timedelta(minutes=5))  # fallback to 5m
        since = now_utc - delta

    # Fetch logs for current time window
    logs = DetectionLog.query.filter(
        DetectionLog.timestamp >= since
    ).order_by(DetectionLog.timestamp.asc()).all()

    # --- Aggregate Emotion Counts ---
    emotion_counts = {}
    for log in logs:
        emotion = log.emotion.upper()
        emotion_counts[emotion] = emotion_counts.get(emotion, 0) + 1

    total = sum(emotion_counts.values())

    pie_data = [{'name': k, 'value': v} for k, v in emotion_counts.items()]
    pie_percentage_data = [
        {'name': k, 'value': v, 'percentage': round(v / total * 100, 2)}
        for k, v in emotion_counts.items()
    ] if total > 0 else []

    most_frequent_emotion = max(emotion_counts, key=emotion_counts.get) if emotion_counts else None

    # --- Timeline Aggregation ---
    timeline_buckets = defaultdict(lambda: {'FEAR': 0, 'ANGER': 0, 'SADNESS': 0, 'DISGUST': 0})

    def bucket_time(ts):
        ts_ist = ts.replace(tzinfo=utc).astimezone(ist)
        minute = (ts_ist.minute // 5) * 5
        return ts_ist.replace(minute=minute, second=0, microsecond=0).strftime('%H:%M')

    for log in logs:
        if not log.timestamp:
            continue
        bucket = bucket_time(log.timestamp)
        emotion = log.emotion.upper()
        if emotion in timeline_buckets[bucket]:
            timeline_buckets[bucket][emotion] += 1

    timeline_data = [
        {'time': time_label, **timeline_buckets[time_label]}
        for time_label in sorted(timeline_buckets)
    ]

    # --- Emotion Trend (current vs previous) ---
    previous_since = since - delta
    previous_until = since

    previous_logs = DetectionLog.query.filter(
        DetectionLog.timestamp >= previous_since,
        DetectionLog.timestamp < previous_until
    ).all()

    previous_emotion_counts = {}
    for log in previous_logs:
        emotion = log.emotion.upper()
        previous_emotion_counts[emotion] = previous_emotion_counts.get(emotion, 0) + 1

    emotions = ['FEAR', 'ANGER', 'SADNESS', 'DISGUST']
    trend = {}
    for emotion in emotions:
        current = emotion_counts.get(emotion, 0)
        previous = previous_emotion_counts.get(emotion, 0)
        if previous == 0:
            trend[emotion] = 'increase' if current > 0 else 'no change'
        else:
            trend[emotion] = 'increase' if current > previous else 'decrease' if current < previous else 'no change'

    # --- Peak Times ---
    peak_times = {}
    for emotion in emotions:
        peak = max(timeline_buckets.items(), key=lambda x: x[1][emotion], default=(None, {}))[0]
        peak_times[emotion] = peak

    emotion_confidence_sums = defaultdict(float)
    emotion_counts_for_confidence = defaultdict(int)

    for log in logs:
        if log.confidence is None:
            continue  # skip if no confidence value

        emotion = log.emotion.upper()
        emotion_confidence_sums[emotion] += log.confidence
        emotion_counts_for_confidence[emotion] += 1

    avg_intensity = [
        {"name": emotion, "value": round(emotion_confidence_sums[emotion] / emotion_counts_for_confidence[emotion], 2)}
        for emotion in emotion_counts_for_confidence
    ]

    return jsonify({
        'pie_data': pie_data,
        'pie_percentage_data': pie_percentage_data,
        'most_frequent_emotion': most_frequent_emotion,
        'timeline_data': timeline_data,
        'emotion_trends': trend,
        'peak_times': peak_times,
        'total_detections': total,
        'avg_intensity': avg_intensity
    })

@camera_bp.route('/<int:camera_id>', methods=['GET'])
def get_camera(camera_id):
    camera = Camera.query.get(camera_id)
    if not camera:
        return jsonify({'error': 'Camera not found'}), 404
    return jsonify(camera.to_dict()), 200


@camera_bp.route('/api/cameras/add', methods=['POST'])
def create_camera():
    data = request.json
    required_fields = ['label', 'ip', 'src']
    if not all(field in data for field in required_fields):
        return jsonify({'error': 'Missing required fields'}), 400

    try:
        camera = Camera(
            label=data['label'],
            ip=data['ip'],
            src=data['src'],
            status=CameraStatus[data.get('status', 'Inactive')]
        )
        db.session.add(camera)
        db.session.commit()
        return jsonify(camera.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        print(f"Error adding camera: {e}")  # Log error on backend console
        return jsonify({'error': str(e)}), 400


@camera_bp.route('/api/cameras/delete/<int:camera_id>', methods=['DELETE'])
def delete_camera(camera_id):
    camera = Camera.query.get(camera_id)
    if not camera:
        return jsonify({'error': 'Camera not found'}), 404

    db.session.delete(camera)
    db.session.commit()
    return jsonify({'message': 'Camera deleted successfully'}), 200


@camera_bp.route('/<int:camera_id>/status', methods=['PATCH'])
def update_camera_status(camera_id):
    camera = Camera.query.get(camera_id)
    if not camera:
        return jsonify({'error': 'Camera not found'}), 404

    data = request.json
    try:
        camera.status = CameraStatus[data['status']]
    except KeyError:
        return jsonify({'error': 'Invalid status'}), 400

    db.session.commit()
    return jsonify({'message': f'Status updated to {camera.status.value}'}), 200


@camera_bp.route('/api/cameras/update/<int:camera_id>', methods=['PUT'])
def update_camera(camera_id):
    data = request.get_json()

    if not data:
        return jsonify({'error': 'No input data provided'}), 400

    # Validate required fields
    label = data.get('label')
    ip = data.get('ip')
    status = data.get('status')

    if not label or not ip or not status:
        return jsonify({'error': 'label, ip, and status are required'}), 400

    if status not in CameraStatus.__members__ and status not in [e.value for e in CameraStatus]:
        return jsonify({'error': f'Invalid status value. Must be one of {[e.value for e in CameraStatus]}'}), 400

    camera = Camera.query.get(camera_id)
    if not camera:
        return jsonify({'error': 'Camera not found'}), 404

    # Update fields
    camera.label = label
    camera.ip = ip
    camera.status = CameraStatus(status) if isinstance(status, str) else status

    try:
        db.session.commit()
        return jsonify(camera.to_dict()), 200
    except IntegrityError as e:
        db.session.rollback()
        return jsonify({'error': 'Label or IP must be unique, conflict detected'}), 409
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to update camera'}), 500


UPLOAD_FOLDER = 'uploads'
OUTPUT_FOLDER = 'outputs'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

def run_emotion_detection(input_path, output_path):
    device = torch.device("cpu")
    model = ResEmoteNet().to(device)
    checkpoint = torch.load('models/fer_model.pth', map_location='cpu')
    model.load_state_dict(checkpoint['model_state_dict'])
    model.eval()

    transform = transforms.Compose([
        transforms.Resize((64, 64)),
        transforms.Grayscale(num_output_channels=3),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])

    emotions = ['happiness', 'surprise', 'sadness', 'anger', 'disgust', 'fear', 'neutral']
    face_classifier = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

    cap = cv2.VideoCapture(input_path)
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_path, fourcc, 20.0, (1920, 1080))

    font = cv2.FONT_HERSHEY_SIMPLEX
    max_emotion = ''
    counter = 0

    def detect_emotion(frame):
        frame_tensor = transform(Image.fromarray(frame)).unsqueeze(0).to(device)
        with torch.no_grad():
            outputs = model(frame_tensor)
            probs = F.softmax(outputs, dim=1)
        return probs.cpu().numpy().flatten()

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        frame = cv2.resize(frame, (1920, 1080))
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = face_classifier.detectMultiScale(gray, 1.3, 5)

        for (x, y, w, h) in faces:
            crop = frame[y:y+h, x:x+w]
            scores = detect_emotion(crop)
            label_idx = np.argmax(scores)
            label = emotions[label_idx]
            conf = scores[label_idx]
            cv2.rectangle(frame, (x, y), (x+w, y+h), (0, 255, 0), 2)
            cv2.putText(frame, f"{label.upper()} ({conf:.2f})", (x, y - 10), font, 1.0, (0, 255, 0), 2)

        out.write(frame)

    cap.release()
    out.release()

@camera_bp.route('/api/process_video', methods=['POST'])
def process_uploaded_video():
    file = request.files['video']
    if not file:
        return jsonify({'error': 'No file uploaded'}), 400

    filename = f"{uuid.uuid4().hex}.mp4"
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    file.save(filepath)

    output_path = os.path.join(OUTPUT_FOLDER, f"processed_{filename}")
    run_emotion_detection(filepath, output_path)

    return jsonify({'filename': f"processed_{filename}"}), 200


MODEL_PATH = 'app/camera/fer_model.pth'
# Setup device, model, emotions and transforms just like before
device = torch.device("mps" if torch.backends.mps.is_available() else "cpu")

emotions = ['happiness', 'surprise', 'sadness', 'anger', 'disgust', 'fear', 'neutral']

transform = transforms.Compose([
    transforms.Resize((64, 64)),
    transforms.Grayscale(num_output_channels=3),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                         std=[0.229, 0.224, 0.225]),
])

model = ResEmoteNet().to(device)
checkpoint = torch.load(MODEL_PATH, map_location=torch.device('cpu'), weights_only=True)
model.load_state_dict(checkpoint['model_state_dict'])
model.eval()

# Haarcascade for face detection
face_classifier = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

# Text settings
font = cv2.FONT_HERSHEY_SIMPLEX
font_scale = 0.7
font_color = (0, 255, 0)
thickness = 2
line_type = cv2.LINE_AA

def predict_emotion(cv2_img, model_path=None):
    # Convert OpenCV image (BGR) to PIL image (RGB)
    pil_img = Image.fromarray(cv2.cvtColor(cv2_img, cv2.COLOR_BGR2RGB))

    scores = detect_emotion(pil_img)
    label_index = np.argmax(scores)
    label = emotions[label_index]
    confidence = float(scores[label_index])
    return label, confidence


def base64_to_cv2_img(base64_str):
    # Remove header if present
    if ',' in base64_str:
        base64_str = base64_str.split(',')[1]

    img_data = base64.b64decode(base64_str)
    nparr = np.frombuffer(img_data, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    return img


def cv2_img_to_base64(cv2_img):
    _, buffer = cv2.imencode('.jpg', cv2_img)
    jpg_as_text = base64.b64encode(buffer).decode('utf-8')
    return jpg_as_text


def detect_emotion(pil_img):
    input_tensor = transform(pil_img).unsqueeze(0).to(device)
    with torch.no_grad():
        output = model(input_tensor)
        probabilities = F.softmax(output, dim=1)
    scores = probabilities.cpu().numpy().flatten()
    return scores


@camera_bp.route('/api/emotion-detect', methods=['POST'])
def emotion_detect():
    try:
        data = request.json
        img_b64 = data.get('image')
        if not img_b64:
            return jsonify({"error": "No image provided"}), 400

        img = base64_to_cv2_img(img_b64)
        if img is None:
            return jsonify({"error": "Invalid image data"}), 400

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        faces = face_classifier.detectMultiScale(gray, scaleFactor=1.3, minNeighbors=5)

        if len(faces) == 0:
            return jsonify({"error": "No face detected"}), 200

        x, y, w, h = faces[0]
        face_img = img[y:y+h, x:x+w]
        label, confidence = predict_emotion(face_img)

        return jsonify({
            "label": label,
            "confidence": confidence,
            "face": {"x": int(x), "y": int(y), "w": int(w), "h": int(h)}
        })
    except Exception as e:
        import traceback
        print("Error:", traceback.format_exc())
        return jsonify({"error": "Server error"}), 500
