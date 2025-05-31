import React, { useEffect, useRef, useState } from 'react';

export default function LiveEmotionDetect({ onBack }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [emotionData, setEmotionData] = useState(null);

  useEffect(() => {
    console.log('Requesting webcam...');
    navigator.mediaDevices.getUserMedia({ video: true })
      .then((stream) => {
        console.log('Got media stream:', stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;

          const playPromise = videoRef.current.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => console.log('Video playing...'))
              .catch(error => console.error('Error playing video:', error));
          }
        }
      })
      .catch((err) => console.error('Error accessing webcam:', err));

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
        console.log('Stopped webcam stream');
      }
    };
  }, []);

  useEffect(() => {
    const drawToCanvas = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) {
        requestAnimationFrame(drawToCanvas);
        return;
      }
      const ctx = canvas.getContext('2d');

      if (video.videoWidth && video.videoHeight) {
        // Resize canvas to fill the window (fullscreen)
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        // Calculate scale to fit video into canvas fullscreen preserving aspect ratio
        const scale = Math.min(canvas.width / video.videoWidth, canvas.height / video.videoHeight);
        const scaledWidth = video.videoWidth * scale;
        const scaledHeight = video.videoHeight * scale;
        const offsetX = (canvas.width - scaledWidth) / 2;
        const offsetY = (canvas.height - scaledHeight) / 2;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(video, offsetX, offsetY, scaledWidth, scaledHeight);

        if (emotionData && emotionData.face) {
          const { x, y, w, h } = emotionData.face;

          // Scale face box as well
          const scaledX = offsetX + x * scale;
          const scaledY = offsetY + y * scale;
          const scaledW = w * scale;
          const scaledH = h * scale;

          ctx.strokeStyle = 'lime';
          ctx.lineWidth = 3;
          ctx.strokeRect(scaledX, scaledY, scaledW, scaledH);

          ctx.font = '24px Arial';
          ctx.fillStyle = 'lime';
          ctx.fillText(
            `${emotionData.label} (${(emotionData.confidence * 100).toFixed(1)}%)`,
            scaledX,
            scaledY - 10
          );
        }
      } else {
        console.log('Waiting for video dimensions...');
      }

      requestAnimationFrame(drawToCanvas);
    };

    drawToCanvas();

    // Redraw on window resize
    const onResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [emotionData]);

  useEffect(() => {
    const interval = setInterval(() => {
      sendFrameToServer();
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const sendFrameToServer = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      console.log('Video not ready to capture frame');
      return;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageBase64 = canvas.toDataURL('image/jpeg');

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_FLASK_MAIN_API_BASE_URL}/api/emotion-detect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageBase64 }),
      });
      const data = await res.json();
      if (data && data.label && data.face) {
        setEmotionData(data);
      } else {
        console.log('No valid emotion data received:', data);
      }
    } catch (err) {
      console.error('Error sending frame:', err);
    }
  };

  return (
    <div className="relative w-screen h-screen bg-black">
      {/* Back Button */}
      <button
        onClick={() => {
          if (videoRef.current && videoRef.current.srcObject) {
            videoRef.current.srcObject.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
            console.log('Stopped webcam stream before going back');
          }
          window.history.back();
        }}
        className="absolute top-4 left-4 z-50 px-3 py-1 rounded bg-gray-800 bg-opacity-70 text-white hover:bg-opacity-90 transition"
        aria-label="Go back"
      >
        ← Back
      </button>

      {/* Hidden video element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="hidden"
        onLoadedMetadata={() => console.log('Video metadata loaded')}
        onPlay={() => console.log('Video play event')}
        onError={e => console.error('Video error event:', e)}
      />

      {/* Fullscreen canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full object-cover"
      />
    </div>
  );
}
