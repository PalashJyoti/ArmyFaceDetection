from flask import Blueprint, Response, jsonify, send_from_directory, current_app, request
from datetime import datetime, timedelta
from app.camera.camera_manager import get_camera_manager  # Use the singleton manager already created
from app.models import DetectionLog, Camera
from collections import defaultdict
from app.extensions import db
from pytz import timezone as pytz_timezone, utc
import cv2
import os
import time
from app import emotion_detectors

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
    camera_manager=get_camera_manager()
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
@camera_bp.route('/static/alerts/<path:filename>')
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