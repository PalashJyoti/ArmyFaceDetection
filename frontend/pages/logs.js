import React, { useState, useEffect } from 'react';
import Navbar from '../components/navbar';

const DetectionLogs = () => {
  const [logs, setLogs] = useState([]);

  // Fetch logs from the Flask backend
  useEffect(() => {
    fetch('http://localhost:5000/api/detection_logs')
      .then(res => res.json())
      .then(data => setLogs(data))
      .catch((error) => console.error('Error fetching logs:', error));
  }, []);

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-tr from-indigo-100 via-purple-100 to-pink-100 text-white px-6 py-10">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-extrabold mb-10 text-center text-indigo-800 tracking-tight">
            Detection Logs
          </h1>

          {/* Logs Table */}
          <section className="mb-16">
            <h2 className="text-2xl font-bold mb-6 text-indigo-700">Log Overview</h2>
            <div className="overflow-x-auto bg-white rounded-xl shadow-lg">
              <table className="min-w-full text-sm text-left text-gray-800">
                <thead className="bg-indigo-700 text-white">
                  <tr>
                    <th className="px-6 py-3">Timestamp</th>
                    <th className="px-6 py-3">Emotion</th>
                    <th className="px-6 py-3">Confidence</th>
                    <th className="px-6 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.length > 0 ? (
                    logs.map((log, index) => (
                      <tr
                        key={index}
                        className="border-t border-gray-200 hover:bg-indigo-50 transition duration-300"
                      >
                        <td className="px-6 py-4">{log.timestamp}</td>
                        <td className="px-6 py-4">{log.emotion}</td>
                        <td className="px-6 py-4">{log.confidence}</td>
                        <td className="px-6 py-4">{log.action}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="px-6 py-4 text-center text-gray-400">
                        No detection logs available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </>
  );
};

export default DetectionLogs;
