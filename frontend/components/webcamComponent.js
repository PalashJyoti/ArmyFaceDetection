import React, { useRef, useEffect, useState } from 'react';

const WebcamEmotionComponent = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [error, setError] = useState(null);
  const [emotion, setEmotion] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const startWebcam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 }
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      } catch (err) {
        console.error('Webcam access error:', err);
        setError('Could not access webcam. Please allow permission and ensure a camera is connected.');
      }
    };

    startWebcam();

    return () => {
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const captureAndDetect = async () => {
    if (!videoRef.current) return;

    setLoading(true);
    setEmotion(null);

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    // Set canvas size to video size
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;

    // Draw frame
    context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    const imageBase64 = canvas.toDataURL('image/jpeg');

    try {
      const res = await fetch(`http://localhost:5000/api/emotion-detect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageBase64 })
      });

      const data = await res.json();
      if (data.label) {
        setEmotion(`Emotion: ${data.label} (Confidence: ${(data.confidence * 100).toFixed(2)}%)`);
      } else {
        setEmotion('No emotion detected.');
      }
    } catch (err) {
      console.error(err);
      setEmotion('Error detecting emotion.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ textAlign: 'center', marginTop: '30px' }}>
      <h2>Live Emotion Detection</h2>

      {error ? (
        <p style={{ color: 'red' }}>{error}</p>
      ) : (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: '640px',
              height: '480px',
              border: '2px solid #ccc',
              backgroundColor: 'black'
            }}
          />
          <br />
          <button onClick={captureAndDetect} disabled={loading} style={{ marginTop: '15px', padding: '10px 20px' }}>
            {loading ? 'Detecting...' : 'Capture & Detect Emotion'}
          </button>
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          {emotion && <p style={{ marginTop: '10px', fontWeight: 'bold' }}>{emotion}</p>}
        </>
      )}
    </div>
  );
};