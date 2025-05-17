from app import create_app, start_emotion_threads

app = create_app()
start_emotion_threads(app)

if __name__ == '__main__':
    app.run(port=8080, debug=True)  # Access from LAN