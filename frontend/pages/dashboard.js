import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Navbar from '../components/navbar';

import {
  PieChart, Pie, Cell,
  BarChart, Bar,
  XAxis, YAxis, Tooltip,
  LineChart, Line, Legend
} from 'recharts';

const Dashboard = () => {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

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

  const emotionColors = {
    HAPPY: '#4ade80',
    SAD: '#60a5fa',
    NEUTRAL: '#9ca3af',
  };

  const mockProbabilities = [
    { name: 'Happy', value: 70 },
    { name: 'Sad', value: 20 },
    { name: 'Neutral', value: 10 },
  ];

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-tr from-indigo-100 via-purple-100 to-pink-100 p-6">
        <h1 className="text-4xl font-bold text-center text-indigo-800 mb-10 tracking-tight">
          Emotion Analysis Dashboard
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-screen-xl mx-auto">

          {/* Column 1 */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow p-6">
              <h2 className="text-lg font-semibold text-indigo-700 mb-2">Current Emotional State</h2>
              <div className="text-3xl font-bold flex items-center gap-2">
                😊 Happy <span className="text-green-500 ml-2">(92%)</span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded mt-3">
                <div className="h-full bg-green-500 rounded" style={{ width: '92%' }} />
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow p-6">
              <h3 className="text-lg font-semibold text-indigo-700 mb-2">Live Video Feed</h3>
              <div className="bg-gray-200 h-48 rounded-md flex items-center justify-center">
                <span className="text-gray-500 italic">Live feed with facial landmarks</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow p-6">
              <h3 className="text-lg font-semibold text-indigo-700 mb-2">Instantaneous Emotion Probabilities</h3>
              {isClient && (
                <BarChart width={300} height={150} data={mockProbabilities}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8884d8" />
                </BarChart>
              )}
            </div>
          </div>

          {/* Column 2 */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow p-6">
              <h3 className="text-lg font-semibold text-indigo-700 mb-2">Dominant Emotion Timeline</h3>
              {isClient && (
                <LineChart width={300} height={150} data={mockProbabilities}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke="#6366f1" />
                </LineChart>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow p-6">
              <h3 className="text-lg font-semibold text-indigo-700 mb-2">Emotion Intensity Over Time</h3>
              {isClient && (
                <LineChart width={300} height={150} data={mockProbabilities}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="value" stroke="#22c55e" />
                </LineChart>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow p-6 flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Time Range:</span>
              <select className="ml-2 border border-gray-300 rounded px-2 py-1">
                <option>Last 5 minutes</option>
                <option>Last 30 minutes</option>
                <option>Last Hour</option>
                <option>Today</option>
              </select>
            </div>

            {/* Moved Camera & Calibration Card */}
            <div className="bg-white rounded-2xl shadow p-6 text-sm text-gray-600">
              <p>Camera: <span className="text-green-600">Online</span></p>
              <p>Calibration: <span className="text-blue-600">Active</span></p>
            </div>
          </div>

          {/* Column 3 */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow p-6">
              <h3 className="text-lg font-semibold text-indigo-700 mb-2">Overall Emotion Distribution</h3>
              {isClient && (
                <PieChart width={250} height={200}>
                  <Pie
                    data={mockProbabilities}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={60}
                    label
                  >
                    {mockProbabilities.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={emotionColors[entry.name.toUpperCase()] || '#8884d8'} />
                    ))}
                  </Pie>
                </PieChart>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow p-6">
              <h3 className="text-lg font-semibold text-indigo-700 mb-2">Average Emotion Intensity</h3>
              {isClient && (
                <BarChart width={300} height={150} data={mockProbabilities}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Bar dataKey="value" fill="#facc15" />
                </BarChart>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow p-6 space-y-2">
              <button className="w-full bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition">Export as CSV</button>
              <button className="w-full bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition">Export as JSON</button>
            </div>
          </div>
        </div>

        
      </div>
    </>
  );
};

export default Dashboard;