import React, { useState, useEffect } from 'react';
import Navbar from '../components/navbar';
import axios from '../pages/api/axios';
import Spinner from '../components/spinner';
import CameraRow from '@/components/cameraRow';

const AdminPanel = () => {
  const [users, setUsers] = useState([]);
  const [cameras, setCameras] = useState([]);
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState('user');
  const [selectedCameraId, setSelectedCameraId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [newCameraLabel, setNewCameraLabel] = useState('');
  const [newCameraIP, setNewCameraIP] = useState('');
  const [newCameraSrc, setNewCameraSrc] = useState('');
  const [isCameraLoading, setIsCameraLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser));
      } catch (e) {
        console.error('Failed to parse currentUser from localStorage', e);
      }
    }
    fetchUsers();
    fetchCameras();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get('/api/auth/users');
      setUsers(Array.isArray(res.data) ? res.data : res.data.users || []);
    } catch (err) {
      console.error('Failed to fetch users', err);
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCameras = async () => {
    setIsCameraLoading(true);
    try {
      const res = await axios.get('/api/cameras');
      setCameras(res.data);
    } catch (error) {
      console.error('Error fetching cameras:', error);
      setCameras([]);
    } finally {
      setIsCameraLoading(false);
    }
  };

  const addCamera = async () => {
    if (!newCameraLabel.trim() || !newCameraIP.trim() || !newCameraSrc.trim()) return;
    try {
      const res = await axios.post('/api/cameras/add', {
        label: newCameraLabel.trim(),
        ip: newCameraIP.trim(),
        src: newCameraSrc.trim(),
      });
      setCameras((prev) => [...prev, res.data]);
      setNewCameraLabel('');
      setNewCameraIP('');
      setNewCameraSrc('');
    } catch (err) {
      console.error('Failed to add camera', err);
      alert('Failed to add camera. Please check inputs and try again.');
    }
  };

  const deleteCamera = async (id) => {
    if (!window.confirm('Are you sure you want to delete this camera?')) return;
    try {
      await axios.delete(`/api/cameras/delete/${id}`);
      setCameras((prev) => prev.filter((cam) => cam.id !== id));
      if (selectedCameraId === id) setSelectedCameraId(null);
    } catch (err) {
      console.error('Failed to delete camera', err);
      alert('Failed to delete camera. Please try again.');
    }
  };

  const updateCamera = async (updatedCamera) => {
    try {
      const res = await axios.put(`/api/cameras/update/${updatedCamera.id}`, updatedCamera);
      setCameras((prev) =>
        prev.map((cam) => (cam.id === updatedCamera.id ? res.data : cam))
      );
    } catch (err) {
      console.error('Failed to update camera', err);
      alert('Failed to update camera. Please try again.');
    }
  };

  const deleteUser = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await axios.delete(`/api/auth/users/${id}`);
      setUsers((prev) => prev.filter((user) => user.id !== id));
    } catch (err) {
      console.error('Failed to delete user', err);
      alert('Failed to delete user. Please try again.');
    }
  };

  const changeUserRole = async (id, newRole) => {
    if (currentUser && id === currentUser.id) {
      alert("You cannot change your own role.");
      return;
    }
    try {
      const res = await axios.put(`/api/auth/users/${id}/role`, { role: newRole });
      setUsers((prev) =>
        prev.map((user) => (user.id === id ? res.data : user))
      );
    } catch (err) {
      if (err.response?.status === 403) {
        alert("You can't downgrade your own role.");
      } else {
        console.error('Failed to change role', err);
        alert('Failed to change user role. Please try again.');
      }
    }
  };

  return (
    <>
      <Navbar />
      <div
        className="min-h-screen bg-center bg-no-repeat bg-cover pt-20 pb-10 px-4 relative"
        style={{ backgroundImage: `url('/image-8.png')` }}
      >
        {/* Dark overlay for better text readability */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px]"></div>
        
        <div className="relative z-10 max-w-7xl mx-auto space-y-16">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-extrabold text-white mb-4 drop-shadow-lg">
              Admin Control Panel
            </h1>
            <div className="w-32 h-1 bg-gradient-to-r from-indigo-500 to-purple-600 mx-auto rounded-full"></div>
          </div>

          {/* Camera Overview */}
          <section className="bg-gray-900/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-gray-600/50">
            <div className="flex items-center mb-6">
              <div className="w-2 h-8 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-full mr-4"></div>
              <h2 className="text-3xl font-bold text-white">Camera Overview</h2>
            </div>
            <p className="text-gray-300 mb-6 text-lg">Select a camera to view its feed and status.</p>
            
            <select
              onChange={(e) => setSelectedCameraId(Number(e.target.value))}
              className="w-full mb-6 px-4 py-3 bg-gray-800/90 text-white rounded-lg shadow-lg border border-gray-500/50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
              value={selectedCameraId ?? ''}
            >
              <option value="">-- Choose a Camera --</option>
              {cameras.map((cam) => (
                <option key={cam.id} value={cam.id}>
                  {cam.label} ({cam.ip})
                </option>
              ))}
            </select>

            {selectedCameraId !== null && (
              <div className="bg-gray-800/90 rounded-xl p-6 shadow-inner border border-gray-600/50">
                <h3 className="text-2xl font-semibold text-white mb-2">
                  {cameras.find((cam) => cam.id === selectedCameraId)?.label}
                </h3>
                <p className="text-gray-400 mb-4 text-lg">
                  IP: {cameras.find((cam) => cam.id === selectedCameraId)?.ip}
                </p>
                <div className="w-full max-w-4xl mx-auto">
                  <div className="relative w-full bg-black rounded-lg mb-4 overflow-hidden shadow-xl">
                    <img
                      src={`${process.env.NEXT_PUBLIC_FLASK_MAIN_API_BASE_URL}/api/camera_feed/${selectedCameraId}?t=${Date.now()}`}
                      alt="Live Feed"
                      className="rounded-lg w-full h-[500px] object-cover border border-gray-600"
                      key={selectedCameraId}
                    />
                  </div>
                </div>
                <span
                  className={`inline-block px-6 py-2 rounded-full text-sm font-semibold text-white shadow-lg ${
                    cameras.find((cam) => cam.id === selectedCameraId)?.status === 'Active'
                      ? 'bg-gradient-to-r from-green-500 to-green-600'
                      : 'bg-gradient-to-r from-red-500 to-red-600'
                  }`}
                >
                  {cameras.find((cam) => cam.id === selectedCameraId)?.status}
                </span>
              </div>
            )}
          </section>

          {/* Camera Management */}
          <section className="bg-gray-900/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-gray-600/50">
            <div className="flex items-center mb-6">
              <div className="w-2 h-8 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-full mr-4"></div>
              <h2 className="text-3xl font-bold text-white">Camera Management</h2>
            </div>
            
            <div className="mb-8">
              <h3 className="font-semibold text-white mb-4 text-xl">Add New Camera</h3>
              <div className="flex flex-col sm:flex-row gap-4 max-w-4xl">
                <input
                  type="text"
                  placeholder="Label"
                  value={newCameraLabel}
                  onChange={(e) => setNewCameraLabel(e.target.value)}
                  className="bg-gray-800/90 text-white border border-gray-500/50 rounded-lg px-4 py-3 flex-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                />
                <input
                  type="text"
                  placeholder="IP Address"
                  value={newCameraIP}
                  onChange={(e) => setNewCameraIP(e.target.value)}
                  className="bg-gray-800/90 text-white border border-gray-500/50 rounded-lg px-4 py-3 flex-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                />
                <input
                  type="text"
                  placeholder="Source URL"
                  value={newCameraSrc}
                  onChange={(e) => setNewCameraSrc(e.target.value)}
                  className="bg-gray-800/90 text-white border border-gray-500/50 rounded-lg px-4 py-3 flex-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                />
                <button
                  onClick={addCamera}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg"
                >
                  Add Camera
                </button>
              </div>
            </div>

            {isCameraLoading ? (
              <div className="flex justify-center">
                <Spinner />
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl shadow-2xl border border-gray-600/50">
                <table className="min-w-full text-sm text-left text-gray-200">
                  <thead className="bg-gray-800/90 text-indigo-300">
                    <tr>
                      <th className="px-6 py-4 font-semibold">Camera ID</th>
                      <th className="px-6 py-4 font-semibold">Label</th>
                      <th className="px-6 py-4 font-semibold">IP Address</th>
                      <th className="px-6 py-4 font-semibold">URL</th>
                      <th className="px-6 py-4 font-semibold">Status</th>
                      <th className="px-6 py-4 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-gray-900/50">
                    {Array.isArray(cameras) &&
                      cameras.map((cam, i) => (
                        <CameraRow
                          key={cam.id}
                          camera={cam}
                          index={i}
                          onDelete={deleteCamera}
                          onUpdate={updateCamera}
                        />
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* User Management */}
          <section className="bg-gray-900/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-gray-600/50">
            <div className="flex items-center mb-6">
              <div className="w-2 h-8 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-full mr-4"></div>
              <h2 className="text-3xl font-bold text-white">User Management</h2>
            </div>
            
            {isLoading ? (
              <div className="flex justify-center">
                <Spinner />
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl shadow-2xl border border-gray-600/50">
                <table className="min-w-full text-sm text-left text-gray-200">
                  <thead className="bg-gray-800/90 text-indigo-300">
                    <tr>
                      <th className="px-6 py-4 font-semibold">User ID</th>
                      <th className="px-6 py-4 font-semibold">Name</th>
                      <th className="px-6 py-4 font-semibold">Role</th>
                      <th className="px-6 py-4 font-semibold">Last Login</th>
                      <th className="px-6 py-4 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-gray-900/50">
                    {Array.isArray(users) &&
                      users.map((user, i) => (
                        <tr
                          key={user.id}
                          className={`${
                            i % 2 === 0 ? 'bg-gray-800/30' : 'bg-gray-700/30'
                          } border-t border-gray-600/50 hover:bg-gray-700/50 transition-colors duration-200`}
                        >
                          <td className="px-6 py-4 text-gray-200">{user.id}</td>
                          <td className="px-6 py-4 text-gray-200 font-medium">{user.name}</td>
                          <td className="px-6 py-4 capitalize text-gray-200">{user.role}</td>
                          <td className="px-6 py-4 text-gray-300">{user.last_login}</td>
                          <td className="px-6 py-4 flex flex-wrap gap-2">
                            <button
                              onClick={() =>
                                changeUserRole(user.id, user.role === 'admin' ? 'user' : 'admin')
                              }
                              className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 transform hover:scale-105 font-semibold text-sm shadow-lg"
                            >
                              Change Role
                            </button>
                            <button
                              onClick={() => deleteUser(user.id)}
                              className="bg-gradient-to-r from-red-600 to-red-700 text-white px-4 py-2 rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-200 transform hover:scale-105 font-semibold text-sm shadow-lg"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
};

export default AdminPanel;