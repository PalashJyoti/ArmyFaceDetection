from flask import Blueprint, send_from_directory, Response, stream_with_context, current_app, jsonify, request
from app.camera.camera_manager import get_camera_manager  # Use the singleton manager already created
from models import DetectionLog, Camera, CameraStatus
from app.camera.model import predict_emotion, ResEmoteNet
from extensions import db
import requests
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
import torch.nn.functional as f
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
from ip import ipaddress


from collections import defaultdict
from datetime import datetime, timedelta

from pytz import timezone as pytz_timezone, utc

camera_bp = Blueprint('camera_feed', __name__)

IST = ZoneInfo("Asia/Kolkata")

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
# @camera_bp.route('/video_feed/<int:camera_id>')
# def video_feed(camera_id):
#     def generate():
#         target_width, target_height = 640, 360
#         while True:
#             frame = get_camera_manager().get_frame(camera_id)
#             if frame is not None:
#                 frame = resize_and_pad(frame, (target_width, target_height))
#                 ret, buffer = cv2.imencode('.jpg', frame)
#                 if ret:
#                     yield (b'--frame\r\n'
#                            b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
#             else:
#                 time.sleep(0.1)
#     return Response(generate(), mimetype='multipart/x-mixed-replace; boundary=frame')

# Emotion-detected feed from background thread
@camera_bp.route('/api/camera_feed/<int:camera_id>')
def camera_feed(camera_id):
    emotion_service_url = f"http://{ipaddress}:5001/stream/{camera_id}"

    def external_stream():
        try:
            with requests.get(emotion_service_url, stream=True, timeout=5) as r:
                r.raise_for_status()
                for chunk in r.iter_content(chunk_size=1024):
                    if chunk:
                        yield chunk
        except requests.RequestException as e:
            current_app.logger.warning(f"External stream failed for camera_id={camera_id}: {e}")
            # Raise to propagate the error and return HTTP 500
            raise

    return Response(stream_with_context(external_stream()),
                    mimetype='multipart/x-mixed-replace; boundary=frame')



@camera_bp.route('/api/detection-logs', methods=['GET'])
def get_detection_logs():
    range_filter = request.args.get('range', 'overall').lower()
    now_ist = datetime.now(IST)  # Use IST directly

    # Determine time range filter
    if range_filter == 'weekly':
        start_time = now_ist - timedelta(days=7)
    elif range_filter == 'monthly':
        start_time = now_ist - timedelta(days=30)
    elif range_filter == 'yearly':
        start_time = now_ist - timedelta(days=365)
    elif range_filter == 'overall':
        start_time = None
    else:
        return jsonify({"error": "Invalid range parameter"}), 400

    # Fetch logs from database
    if start_time:
        logs = DetectionLog.query.filter(
            DetectionLog.timestamp >= start_time
        ).order_by(DetectionLog.timestamp.desc()).all()
    else:
        logs = DetectionLog.query.order_by(
            DetectionLog.timestamp.desc()
        ).all()

    # Format logs
    result = []
    for log in logs:
        result.append({
            'id': log.id,
            'camera_label': getattr(log, 'camera_label', 'Unknown'),
            'emotion': log.emotion,
            'timestamp': log.timestamp.strftime('%b %d, %Y, %I:%M %p') if log.timestamp else None,
            'image_url': f"/{log.image_path}" if log.image_path else None
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


@camera_bp.route('/api/detection-analytics', methods=['GET'])
def get_detection_analytics():
    """
    Returns detection analytics (pie chart, timeline, trends, etc.)
    Filtered by time range: '5m', '30m', '1h', 'today'.
    """
    ist = pytz_timezone('Asia/Kolkata')
    time_range = request.args.get('range', '5m')
    now_utc = datetime.utcnow().replace(tzinfo=utc)

    # Define time deltas for short ranges
    time_deltas = {
        '5m': timedelta(minutes=5),
        '30m': timedelta(minutes=30),
        '1h': timedelta(hours=1)
    }

    if time_range == 'today':
        now_ist = now_utc.astimezone(ist)
        since_ist = now_ist.replace(hour=0, minute=0, second=0, microsecond=0)
        since = since_ist.astimezone(utc)
        delta = now_utc - since
    else:
        delta = time_deltas.get(time_range, timedelta(minutes=5))  # fallback to 5m
        since = now_utc - delta

    # Fetch logs within time window
    logs = DetectionLog.query.filter(
        DetectionLog.timestamp >= since
    ).order_by(DetectionLog.timestamp.asc()).all()

    # Aggregate emotion counts for the current period
    emotion_counts = defaultdict(int)
    for log in logs:
        emotion = log.emotion.upper()
        emotion_counts[emotion] += 1

    total = sum(emotion_counts.values())

    pie_data = [{'name': emo, 'value': count} for emo, count in emotion_counts.items()]
    pie_percentage_data = [
        {'name': emo, 'value': count, 'percentage': round(count / total * 100, 2)}
        for emo, count in emotion_counts.items()
    ] if total > 0 else []

    most_frequent_emotion = max(emotion_counts, key=emotion_counts.get) if emotion_counts else None

    # Timeline aggregation with fixed emotions only
    emotions = ['FEAR', 'ANGER', 'SADNESS', 'DISGUST']
    timeline_buckets = defaultdict(lambda: {emo: 0 for emo in emotions})

    def bucket_time(ts):
        ts_ist = ts.replace(tzinfo=utc).astimezone(ist)
        minute_bucket = (ts_ist.minute // 5) * 5
        return ts_ist.replace(minute=minute_bucket, second=0, microsecond=0).strftime('%H:%M')

    for log in logs:
        if not log.timestamp:
            continue
        bucket = bucket_time(log.timestamp)
        emo = log.emotion.upper()
        if emo in emotions:
            timeline_buckets[bucket][emo] += 1

    timeline_data = [{'time': time_label, **timeline_buckets[time_label]} for time_label in sorted(timeline_buckets)]

    # Previous period for trend comparison
    previous_since = since - delta
    previous_until = since

    previous_logs = DetectionLog.query.filter(
        DetectionLog.timestamp >= previous_since,
        DetectionLog.timestamp < previous_until
    ).all()

    previous_emotion_counts = defaultdict(int)
    for log in previous_logs:
        emo = log.emotion.upper()
        previous_emotion_counts[emo] += 1

    trend = {}
    for emo in emotions:
        current = emotion_counts.get(emo, 0)
        previous = previous_emotion_counts.get(emo, 0)
        if previous == 0:
            trend[emo] = 'increase' if current > 0 else 'no change'
        else:
            if current > previous:
                trend[emo] = 'increase'
            elif current < previous:
                trend[emo] = 'decrease'
            else:
                trend[emo] = 'no change'

    # Peak times per emotion
    peak_times = {}
    for emo in emotions:
        peak_time, _ = max(timeline_buckets.items(), key=lambda x: x[1].get(emo, 0), default=(None, {}))
        peak_times[emo] = peak_time

    # Average confidence (intensity) per emotion
    confidence_sums = defaultdict(float)
    confidence_counts = defaultdict(int)

    for log in logs:
        if log.confidence is None:
            continue
        emo = log.emotion.upper()
        confidence_sums[emo] += log.confidence
        confidence_counts[emo] += 1

    avg_intensity = [
        {
            "name": emo,
            "value": round(confidence_sums[emo] / confidence_counts[emo], 2)
        }
        for emo in confidence_counts
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


@camera_bp.route('/api/cameras/<int:camera_id>', methods=['GET'])
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
        # Save to DB
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
        return jsonify({'error': str(e)}), 400


@camera_bp.route('/api/cameras/delete/<int:camera_id>', methods=['DELETE'])
def delete_camera(camera_id):
    camera = Camera.query.get(camera_id)
    if not camera:
        return jsonify({'error': 'Camera not found'}), 404

    # Notify emotion detection service to stop the camera detector
    try:
        # Replace this URL if your emotion service runs on a different host/port
        response = requests.post(
            f'http://{ipaddress}/camera_status_update',
            json={'camera_id': camera_id, 'status': 'Inactive'},
            timeout=3
        )
        if response.status_code != 200:
            print(f"[WARN] Failed to notify emotion detection service: {response.text}")
    except Exception as e:
        print(f"[ERROR] Could not reach emotion detection service: {e}")

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
    from models import Camera, CameraStatus
    from extensions import db
    import requests

    data = request.get_json()
    if not data:
        return jsonify({'error': 'No input data provided'}), 400

    label = data.get('label')
    ip = data.get('ip')
    src = data.get('src')  # <-- new field
    status = data.get('status')

    # Validate required fields (including src)
    if not label or not ip or not src or not status:
        return jsonify({'error': 'label, ip, src, and status are required'}), 400

    valid_status_values = [e.value for e in CameraStatus]
    if status not in CameraStatus.__members__ and status not in valid_status_values:
        return jsonify({'error': f'Invalid status value. Must be one of {valid_status_values}'}), 400

    camera = Camera.query.get(camera_id)
    if not camera:
        return jsonify({'error': 'Camera not found'}), 404

    # Convert status string to Enum
    if isinstance(status, str):
        try:
            camera.status = CameraStatus[status]
        except KeyError:
            camera.status = CameraStatus(status)
    else:
        camera.status = status

    camera.label = label
    camera.ip = ip
    camera.src = src   # <-- update src here

    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({'error': 'Label, IP, or src must be unique, conflict detected'}), 409
    except Exception:
        db.session.rollback()
        return jsonify({'error': 'Failed to update camera'}), 500

    # Notify emotion worker service
    try:
        requests.post(f"http://{ipaddress}:5001/camera_status_update", json={
            "camera_id": camera_id,
            "status": camera.status.name  # "Active" or "Inactive"
        })
        print(f"📡 Notified emotion_worker_service of status change for camera {camera_id}")
    except requests.exceptions.RequestException as e:
        print(f"⚠️ Failed to notify emotion_worker_service: {e}")

    return jsonify(camera.to_dict()), 200



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
            probs = f.softmax(outputs, dim=1)
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
        probabilities = f.softmax(output, dim=1)
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



# log deletion routes
@camera_bp.route('/api/detection-logs/<int:log_id>', methods=['DELETE'])
def delete_detection_log(log_id):
    """Delete a specific detection log by ID"""
    try:
        # Find the detection log
        log = DetectionLog.query.get(log_id)

        if not log:
            return jsonify({
                'success': False,
                'message': 'Detection log not found'
            }), 404

        # Store image path before deletion (if we need to delete the file)
        image_path = log.image_path

        # Delete the log from database
        db.session.delete(log)
        db.session.commit()

        # Optionally delete the associated image file if it exists
        if image_path and os.path.exists(image_path):
            try:
                os.remove(image_path)
            except OSError as e:
                print(f"Warning: Could not delete image file {image_path}: {e}")

        return jsonify({
            'success': True,
            'message': 'Detection log deleted successfully'
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Error deleting detection log: {str(e)}'
        }), 500


@camera_bp.route('/api/detection-logs/bulk', methods=['DELETE'])
def bulk_delete_detection_logs():
    """Delete multiple detection logs by IDs"""
    try:
        data = request.get_json()
        if not data or 'ids' not in data:
            return jsonify({
                'success': False,
                'message': 'No log IDs provided'
            }), 400

        log_ids = data['ids']
        if not isinstance(log_ids, list) or not log_ids:
            return jsonify({
                'success': False,
                'message': 'Invalid log IDs format'
            }), 400

        # Find all logs to delete
        logs = DetectionLog.query.filter(DetectionLog.id.in_(log_ids)).all()

        if not logs:
            return jsonify({
                'success': False,
                'message': 'No logs found with provided IDs'
            }), 404

        # Collect image paths before deletion
        image_paths = [log.image_path for log in logs if log.image_path]

        # Delete logs from database
        deleted_count = 0
        for log in logs:
            db.session.delete(log)
            deleted_count += 1

        db.session.commit()

        # Delete associated image files
        deleted_images = 0
        for image_path in image_paths:
            if os.path.exists(image_path):
                try:
                    os.remove(image_path)
                    deleted_images += 1
                except OSError as e:
                    print(f"Warning: Could not delete image file {image_path}: {e}")

        return jsonify({
            'success': True,
            'message': f'Successfully deleted {deleted_count} detection logs and {deleted_images} image files'
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Error deleting detection logs: {str(e)}'
        }), 500


@camera_bp.route('/api/detection-logs/camera/<int:camera_id>', methods=['DELETE'])
def delete_logs_by_camera(camera_id):
    """Delete all detection logs for a specific camera"""
    try:
        # Find all logs for the camera
        logs = DetectionLog.query.filter_by(camera_id=camera_id).all()

        if not logs:
            return jsonify({
                'success': True,
                'message': f'No logs found for camera ID {camera_id}'
            }), 200

        # Collect image paths before deletion
        image_paths = [log.image_path for log in logs if log.image_path]

        # Delete logs from database
        deleted_count = DetectionLog.query.filter_by(camera_id=camera_id).delete()
        db.session.commit()

        # Delete associated image files
        deleted_images = 0
        for image_path in image_paths:
            if os.path.exists(image_path):
                try:
                    os.remove(image_path)
                    deleted_images += 1
                except OSError as e:
                    print(f"Warning: Could not delete image file {image_path}: {e}")

        return jsonify({
            'success': True,
            'message': f'Successfully deleted {deleted_count} detection logs for camera {camera_id} and {deleted_images} image files'
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Error deleting logs for camera {camera_id}: {str(e)}'
        }), 500


@camera_bp.route('/api/detection-logs/clear-all', methods=['DELETE'])
def clear_all_detection_logs():
    """Delete ALL detection logs (use with caution)"""
    try:
        # Get confirmation parameter (optional safety check)
        confirm = request.args.get('confirm', '').lower()
        if confirm != 'true':
            return jsonify({
                'success': False,
                'message': 'This action requires confirmation. Add ?confirm=true to the URL'
            }), 400

        # Get all logs to collect image paths
        logs = DetectionLog.query.all()
        image_paths = [log.image_path for log in logs if log.image_path]

        # Delete all logs
        deleted_count = DetectionLog.query.delete()
        db.session.commit()

        # Delete all associated image files
        deleted_images = 0
        for image_path in image_paths:
            if os.path.exists(image_path):
                try:
                    os.remove(image_path)
                    deleted_images += 1
                except OSError as e:
                    print(f"Warning: Could not delete image file {image_path}: {e}")

        return jsonify({
            'success': True,
            'message': f'Successfully deleted all {deleted_count} detection logs and {deleted_images} image files'
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Error clearing all detection logs: {str(e)}'
        }), 500


@camera_bp.route('/api/detection-logs/cleanup-old', methods=['DELETE'])
def cleanup_old_detection_logs():
    """Delete detection logs older than specified days"""
    try:
        # Get days parameter (default to 30 days)
        days = request.args.get('days', 30, type=int)

        if days <= 0:
            return jsonify({
                'success': False,
                'message': 'Days parameter must be positive'
            }), 400

        from datetime import datetime, timedelta
        cutoff_date = datetime.utcnow() - timedelta(days=days)

        # Find old logs
        old_logs = DetectionLog.query.filter(DetectionLog.timestamp < cutoff_date).all()

        if not old_logs:
            return jsonify({
                'success': True,
                'message': f'No logs older than {days} days found'
            }), 200

        # Collect image paths before deletion
        image_paths = [log.image_path for log in old_logs if log.image_path]

        # Delete old logs
        deleted_count = DetectionLog.query.filter(DetectionLog.timestamp < cutoff_date).delete()
        db.session.commit()

        # Delete associated image files
        deleted_images = 0
        for image_path in image_paths:
            if os.path.exists(image_path):
                try:
                    os.remove(image_path)
                    deleted_images += 1
                except OSError as e:
                    print(f"Warning: Could not delete image file {image_path}: {e}")

        return jsonify({
            'success': True,
            'message': f'Successfully deleted {deleted_count} logs older than {days} days and {deleted_images} image files'
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Error cleaning up old detection logs: {str(e)}'
        }), 500
