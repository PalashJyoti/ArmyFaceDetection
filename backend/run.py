from app import create_app
import os

app = create_app()

@app.route('/debug_static')
def debug_static():
    full_path = os.path.join(app.static_folder, 'alerts/alert_disgust_20250523_123116.jpg')
    return f"Static Folder: {app.static_folder}<br>File Exists: {os.path.exists(full_path)}<br>Path: {full_path}"


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080, debug=True)
