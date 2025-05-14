from flask import Blueprint, Response
from app.camera import camera_manager
from app.camera.camera_manager import MultiCameraManager
from app.camera.model import predict_emotion
import cv2
import time
from collections import defaultdict
import datetime
import os  # ✅ Import for folder creation

camera_bp = Blueprint('camera_feed', __name__)

def generate_frames(camera_id):
    model_path = "app/camera/fer_model.pth"
    emotion_timer = defaultdict(lambda: {'start': None, 'emotion': None})
    negative_emotions = {'fear', 'anger', 'sadness', 'disgust'}

    target_width, target_height = 640, 360  # ✅ CCTV-like aspect ratio (16:9)

    while True:
        frame = camera_manager.get_frame(camera_id)
        if frame is not None:
            # Resize and pad frame to keep 16:9 ratio (letterboxing)
            frame = resize_and_pad(frame, (target_width, target_height))

            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            faces = cv2.CascadeClassifier(
                cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
            ).detectMultiScale(gray, 1.3, 5)

            for (x, y, w, h) in faces:
                crop = frame[y:y+h, x:x+w]
                label, conf = predict_emotion(crop, model_path)

                # Draw box and label
                cv2.rectangle(frame, (x, y), (x+w, y+h), (0, 255, 0), 2)
                cv2.putText(frame, f"{label.upper()} ({conf:.2f})", (x, y - 15),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2, cv2.LINE_AA)

                face_id = (x, y, w, h)

                if label in negative_emotions and conf > 0.5:
                    current_time = datetime.datetime.now()
                    if emotion_timer[face_id]['emotion'] != label:
                        emotion_timer[face_id] = {'start': current_time, 'emotion': label}
                    else:
                        elapsed = (current_time - emotion_timer[face_id]['start']).total_seconds()
                        if elapsed > 15:
                            timestamp = current_time.strftime('%Y%m%d_%H%M%S')
                            filename = f"alerts/alert_{label}_{timestamp}.jpg"
                            face_image = frame[y:y+h, x:x+w]

                            os.makedirs("alerts", exist_ok=True)  # ✅ Ensures folder exists
                            cv2.imwrite(filename, face_image)
                            print(f"[ALERT] Saved screenshot: {filename}")

                            emotion_timer[face_id]['start'] = current_time
                else:
                    if face_id in emotion_timer:
                        del emotion_timer[face_id]

            _, buf = cv2.imencode('.jpg', frame)
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + buf.tobytes() + b'\r\n')
        else:
            time.sleep(0.1)


# ✅ Helper function to resize and pad to CCTV-style (16:9) frame
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


# Set your video sources here
camera_sources = [
    "app/camera/video.mp4",
    "app/camera/video.mp4"
]
camera_manager = MultiCameraManager(camera_sources)

def generate(camera_id):
    target_width, target_height = 640, 360  # ✅ Consistent aspect ratio for normal feed
    while True:
        frame = camera_manager.get_frame(camera_id)
        if frame is not None:
            frame = resize_and_pad(frame, (target_width, target_height))  # ✅ CCTV aspect
            ret, buffer = cv2.imencode('.jpg', frame)
            if ret:
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
        else:
            continue

@camera_bp.route('/video_feed/<int:camera_id>')
def video_feed(camera_id):
    return Response(generate(camera_id), mimetype='multipart/x-mixed-replace; boundary=frame')

@camera_bp.route('/api/camera_feed/<int:camera_id>')
def camera_feed(camera_id):
    return Response(
        generate_frames(camera_id),
        mimetype='multipart/x-mixed-replace; boundary=frame'
    )