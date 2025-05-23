import React, { useRef, useState, useEffect } from 'react';
import axios from '@/pages/api/axios';
import { useRouter } from 'next/router';

export default function VideoEmotion() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [videoFile, setVideoFile] = useState(null);
  const [emotionData, setEmotionData] = useState(null);
  const router = useRouter();

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setVideoFile(URL.createObjectURL(file));
      setEmotionData(null);
    }
  };

  useEffect(() => {
    let interval;
    if (videoFile && videoRef.current) {
      videoRef.current.onloadeddata = () => {
        interval = setInterval(() => {
          captureAndSendFrame();
        }, 1000);
      };
    }

    return () => clearInterval(interval);
  }, [videoFile]);

  const captureAndSendFrame = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.paused || video.ended) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const base64Image = canvas.toDataURL('image/jpeg');

    try {
      const response = await axios.post('/api/emotion-detect', { image: base64Image });
      const data = response.data;
      setEmotionData(data);

      if (data.face) {
        const { x, y, w, h } = data.face;

        // Draw bounding box
        ctx.strokeStyle = 'lime';
        ctx.lineWidth = 15; // ← Thicker border
        ctx.strokeRect(x, y, w, h);

        // Draw emotion label
        ctx.font = '50px Arial'; // ← Larger font
        ctx.fillStyle = 'lime';
        ctx.fillText(`${data.label} (${(data.confidence * 100).toFixed(1)}%)`, x, y - 20);
      }
    } catch (error) {
      console.error('Emotion detection error:', error);
    }
  };

  return (
    <div className="w-full h-screen bg-black text-white flex flex-col items-center justify-center relative">
      <button
        onClick={() => router.back()}
        className="absolute top-4 left-4 z-50 px-3 py-1 rounded bg-gray-800 bg-opacity-70 text-white hover:bg-opacity-90 transition"
        aria-label="Go back"
      >
        ← Back
      </button>

      <label className="mb-4 px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 transition cursor-pointer">
        Choose Video File
        <input
          type="file"
          accept="video/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </label>

      {videoFile && (
        <div className="relative w-full max-w-4xl">
          <video
            ref={videoRef}
            src={videoFile}
            controls
            autoPlay
            className="w-full rounded shadow-lg"
          />
          <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
          />
        </div>
      )}

      {emotionData && emotionData.label && (
        <div className="mt-4 bg-gray-800 px-4 py-2 rounded text-lg">
          Detected: {emotionData.label} ({(emotionData.confidence * 100).toFixed(1)}%)
        </div>
      )}
    </div>
  );
}
