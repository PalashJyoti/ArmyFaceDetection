import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Navbar from '../components/navbar';

import {
  PieChart, Pie, Cell,
  BarChart, Bar,
  XAxis, YAxis, Tooltip,
  LineChart, Line, Legend
} from 'recharts';

const emotionColors = {
  FEAR: '#f87171',     // red-400
  ANGER: '#f59e0b',    // amber-500
  SADNESS: '#60a5fa',  // blue-400
  DISGUST: '#34d399'   // green-400
};

const negativeEmotions = ['FEAR', 'ANGER', 'SADNESS', 'DISGUST'];

const emotionEmojis = {
  FEAR: '😨',
  ANGER: '😠',
  SADNESS: '😢',
  DISGUST: '🤢'
};

const Dashboard = () => {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [cameraList, setCameraList] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [pieData, setPieData] = useState([]);
  const [timelineData, setTimelineData] = useState([]);
  const [timeRange, setTimeRange] = useState('5min');
  const [loadingCameras, setLoadingCameras] = useState(false);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    const fetchCameras = async () => {
      setLoadingCameras(true);
      try {
        const res = await fetch('http://127.0.0.1:8080/api/cameras');
        const data = await res.json();
        setCameraList(data);
        if (data.length > 0) setSelectedCamera(data[0].id);
      } catch (err) {
        console.error("Failed to fetch cameras", err);
      } finally {
        setLoadingCameras(false);
      }
    };

    fetchCameras();
  }, []);

  useEffect(() => {
    if (!selectedCamera) return;
    const fetchAnalytics = async () => {
      setLoadingAnalytics(true);
      try {
        const res = await fetch(`http://127.0.0.1:8080/api/detection-analytics?time_range=${timeRange}&camera_id=${selectedCamera}`);
        if (!res.ok) throw new Error("Failed to fetch analytics");
        const data = await res.json();
        setPieData(data.pie_data);
        setTimelineData(data.timeline_data);
      } catch (err) {
        console.error("Failed to fetch analytics", err);
        setPieData([]);
        setTimelineData([]);
      } finally {
        setLoadingAnalytics(false);
      }
    };

    fetchAnalytics();
  }, [timeRange, selectedCamera]);

  const handleLogout = async () => {
    const token = localStorage.getItem('token');

    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const res = await fetch('http://127.0.0.1:8080/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (res.ok) {
        localStorage.removeItem('token');
        router.push('/login');
      } else {
        const data = await res.json();
        alert(data.error || 'Logout failed');
      }
    } catch (error) {
      alert('Something went wrong during logout');
    }
  };

  // Export CSV
  const exportCSV = () => {
    if (!pieData.length) return alert('No data to export');

    const header = 'Emotion,Value\n';
    const rows = pieData.map(({ name, value }) => `${name},${value}`).join('\n');
    const csvContent = "data:text/csv;charset=utf-8," + header + rows;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `emotion_data_${selectedCamera || 'all'}_${timeRange}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export JSON
  const exportJSON = () => {
    if (!pieData.length) return alert('No data to export');

    const data = {
      camera_id: selectedCamera,
      time_range: timeRange,
      pieData,
      timelineData,
    };

    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `emotion_data_${selectedCamera || 'all'}_${timeRange}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculate dominant negative emotion
  const dominantEmotion = pieData.length > 0 ? pieData.reduce((a, b) => a.value > b.value ? a : b) : null;

  return (
    <>
      <Navbar onLogout={handleLogout} />
      <div className="min-h-screen bg-gradient-to-tr from-indigo-100 via-purple-100 to-pink-100 p-6">
        <h1 className="text-4xl font-bold text-center text-indigo-800 mb-10 tracking-tight">
          Emotion Analysis Dashboard
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-screen-xl mx-auto">

          {/* Column 1 */}
          <div className="space-y-4">

            <div className="bg-white rounded-2xl shadow p-6 text-center">
              <h2 className="text-lg font-semibold text-indigo-700 mb-2">Dominant Negative Emotion</h2>
              {loadingAnalytics ? (
                <p className="text-gray-500">Loading...</p>
              ) : dominantEmotion ? (
                <div className="text-3xl font-bold flex justify-center items-center gap-2">
                  {emotionEmojis[dominantEmotion.name.toUpperCase()] || '❓'} {dominantEmotion.name} ({dominantEmotion.value})
                </div>
              ) : (
                <div className="text-gray-500">No data</div>
              )}
            </div>

            {/* Live Feed */}
            <div className="bg-white rounded-2xl shadow p-6">
              <h3 className="text-lg font-semibold text-indigo-700 mb-4">Live Detection Feed</h3>

              {loadingCameras ? (
                <p className="text-gray-500">Loading cameras...</p>
              ) : (
                <>
                  <div className="mb-4 flex items-center gap-2">
                    <label className="text-sm font-medium">Select Camera:</label>
                    <select
                      className="border border-gray-300 rounded px-2 py-1"
                      value={selectedCamera || ''}
                      onChange={(e) => setSelectedCamera(e.target.value)}
                    >
                      {cameraList.map(cam => (
                        <option key={cam.id} value={cam.id}>
                          {cam.name || `Camera ${cam.id}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedCamera ? (
                    <img
                      src={`http://127.0.0.1:8080/api/camera_feed/${selectedCamera}`}
                      alt="Live Feed"
                      className="rounded-lg w-full h-64 object-cover border"
                    />
                  ) : (
                    <div className="bg-gray-100 h-64 flex items-center justify-center rounded-lg">
                      <span className="text-gray-500">Select a camera to view feed</span>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow p-6">
              <h3 className="text-lg font-semibold text-indigo-700 mb-2">Instant Emotion Count</h3>
              {isClient ? (
                pieData.length ? (
                  <BarChart width={300} height={150} data={pieData}>
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#8884d8" />
                  </BarChart>
                ) : <p className="text-gray-500">No data</p>
              ) : null}
            </div>
          </div>

          {/* Column 2 */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow p-6">
              <h3 className="text-lg font-semibold text-indigo-700 mb-2">Negative Emotion Timeline</h3>
              {isClient ? (
                timelineData.length ? (
                  <LineChart width={300} height={150} data={timelineData}>
                    <XAxis
                      dataKey="time"
                      tickFormatter={timeStr => {
                        // Format time string nicely if needed
                        const date = new Date(timeStr);
                        return date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                      }}
                    />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    {negativeEmotions.map(emotion => (
                      <Line
                        key={emotion}
                        type="monotone"
                        dataKey={emotion}
                        stroke={emotionColors[emotion]}
                        strokeWidth={2}
                        dot={false}
                      />
                    ))}
                  </LineChart>
                ) : <p className="text-gray-500">No data</p>
              ) : null}
            </div>

            <div className="bg-white rounded-2xl shadow p-6">
              <h3 className="text-lg font-semibold text-indigo-700 mb-2">Emotion Intensity Over Time</h3>
              {isClient ? (
                timelineData.length ? (
                  <LineChart width={300} height={150} data={timelineData}>
                    <XAxis
                      dataKey="time"
                      tickFormatter={timeStr => {
                        const date = new Date(timeStr);
                        return date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                      }}
                    />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    {negativeEmotions.map(emotion => (
                      <Line
                        key={emotion}
                        type="monotone"
                        dataKey={emotion}
                        stroke={emotionColors[emotion]}
                        strokeWidth={2}
                        dot={false}
                        strokeDasharray="3 3"
                      />
                    ))}
                  </LineChart>
                ) : <p className="text-gray-500">No data</p>
              ) : null}
            </div>

            <div className="bg-white rounded-2xl shadow p-6 flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Time Range:</span>
              <select
                className="ml-2 border border-gray-300 rounded px-2 py-1"
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
              >
                <option value="5min">Last 5 minutes</option>
                <option value="30min">Last 30 minutes</option>
                <option value="1hr">Last Hour</option>
                <option value="today">Today</option>
              </select>
            </div>

            <div className="bg-white rounded-2xl shadow p-6 text-sm text-gray-600">
              <p>Camera: <span className="text-green-600">Online</span></p>
              <p>Calibration: <span className="text-blue-600">Active</span></p>
            </div>
          </div>

          {/* Column 3 */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow p-6">
              <h3 className="text-lg font-semibold text-indigo-700 mb-2">Emotion Distribution</h3>
              {isClient ? (
                pieData.length ? (
                  <PieChart width={250} height={200}>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={60}
                      label
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={emotionColors[entry.name.toUpperCase()] || '#8884d8'} />
                      ))}
                    </Pie>
                  </PieChart>
                ) : <p className="text-gray-500">No data</p>
              ) : null}
            </div>

            <div className="bg-white rounded-2xl shadow p-6">
              <h3 className="text-lg font-semibold text-indigo-700 mb-2">Average Intensity</h3>
              {isClient ? (
                pieData.length ? (
                  <BarChart width={300} height={150} data={pieData}>
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#facc15" />
                  </BarChart>
                ) : <p className="text-gray-500">No data</p>
              ) : null}
            </div>

            <div className="bg-white rounded-2xl shadow p-6 space-y-2">
              <button
                onClick={exportCSV}
                className="w-full bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition"
              >
                Export as CSV
              </button>
              <button
                onClick={exportJSON}
                className="w-full bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition"
              >
                Export as JSON
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;