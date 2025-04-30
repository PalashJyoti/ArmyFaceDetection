import React from 'react';
import { useRouter } from 'next/router';
import Navbar from '../components/navbar';

const Dashboard = () => {
  const router = useRouter();

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

  const detections = [
    {
      camera: 'Camera 1',
      person: '/sad_person1.png',
      timestamp: '2024-04-26 15:30:45',
    },
    {
      camera: 'Camera 2',
      person: '/sad_person2.png',
      timestamp: '2024-04-26 16:20:10',
    },
    {
      camera: 'Camera 3',
      person: '/sad_person3.png',
      timestamp: '2024-04-26 17:45:30',
    },
  ];

  return (
    <>
      {/* Navbar */}
      <Navbar />

      <div className="min-h-screen bg-gradient-to-r from-indigo-100 via-indigo-200 to-indigo-300 px-6 sm:px-12 py-8">
        <div className="max-w-screen-xl mx-auto">
          {/* Heading */}
          <h1 className="text-5xl font-extrabold text-indigo-900 mb-12 text-center tracking-tight">
            MindSight AI Dashboard
          </h1>

          {/* Camera Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-16">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="bg-white border border-indigo-300 rounded-xl shadow-xl hover:shadow-2xl transition duration-300 ease-in-out transform hover:scale-105"
              >
                <div className="bg-indigo-700 text-white px-6 py-4 rounded-t-xl font-semibold text-lg">
                  Camera {n}
                </div>
                <div className="h-52 bg-gradient-to-br from-indigo-100 to-gray-200 rounded-b-xl flex items-center justify-center text-gray-500 italic">
                  Feed Not Available
                </div>
              </div>
            ))}
          </div>

          {/* Detection Log */}
          <div className="bg-white border border-rose-300 rounded-xl shadow-lg p-8">
            <h2 className="text-3xl font-semibold text-rose-700 mb-8 text-center">Sad Detections Log</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm bg-white rounded-lg shadow-md">
                <thead className="bg-rose-100 text-rose-700">
                  <tr>
                    <th className="p-4 text-left">Camera</th>
                    <th className="p-4 text-left">Person Captured</th>
                    <th className="p-4 text-left">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {detections.map((entry, idx) => (
                    <tr
                      key={idx}
                      className="border-t border-gray-200 hover:bg-rose-50 transition duration-300"
                    >
                      <td className="p-4">{entry.camera}</td>
                      <td className="p-4">
                        <img
                          src={entry.person}
                          alt="Detected"
                          className="h-16 w-16 rounded-full border border-gray-300 object-cover"
                        />
                      </td>
                      <td className="p-4">{entry.timestamp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;