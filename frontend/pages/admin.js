import React, { useState, useEffect } from 'react';
import Navbar from '../components/navbar';
import axios from './api/axios';
import Spinner from '../components/spinner';

const AdminPanel = () => {
  const [users, setUsers] = useState([]);
  const [cameras, setCameras] = useState([]);
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState('user');
  const [selectedCameraId, setSelectedCameraId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

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
    try {
      const res = await axios.get('/api/cameras');
      setCameras(res.data || []);
    } catch (err) {
      console.error('Failed to fetch cameras', err);
      setCameras([]);
    }
  };

  const addUser = async () => {
    if (!newUserName.trim()) return;
    try {
      const res = await axios.post('/api/auth/users', {
        name: newUserName.trim(),
        role: newUserRole,
      });
      setUsers((prev) => [...prev, res.data]);
      setNewUserName('');
      setNewUserRole('user');
    } catch (err) {
      console.error('Failed to add user', err);
      alert('Failed to add user. Please try again.');
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
        alert("You can’t downgrade your own role.");
      } else {
        console.error('Failed to change role', err);
        alert('Failed to change user role. Please try again.');
      }
    }
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-tr from-indigo-100 via-purple-100 to-pink-100 px-6 py-10">
        <div className="max-w-7xl mx-auto space-y-16">
          <h1 className="text-4xl font-extrabold text-center text-indigo-800">Admin Control Panel</h1>

          {/* Camera Overview */}
          <section className="bg-white rounded-2xl shadow-xl p-8 border-t-4 border-indigo-500">
            <h2 className="text-2xl font-bold text-indigo-700 mb-4">Camera Overview</h2>
            <p className="text-gray-500 mb-6">Select a camera to view its feed and status.</p>

            <select
              onChange={(e) => setSelectedCameraId(Number(e.target.value))}
              className="w-full mb-6 px-4 py-2 text-black rounded-md shadow border border-indigo-300 focus:outline-none"
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
              <div className="bg-gray-50 rounded-xl p-6 shadow-inner">
                <h3 className="text-xl font-semibold text-indigo-700 mb-2">
                  {cameras.find(cam => cam.id === selectedCameraId)?.label}
                </h3>
                <p className="text-sm text-gray-500 mb-3">
                  IP: {cameras.find(cam => cam.id === selectedCameraId)?.ip}
                </p>
                <div className="w-full max-w-md mx-auto">
                  <div className="relative w-full aspect-video bg-black rounded-lg mb-3 overflow-hidden">
                    <img
                      src={`http://localhost:8080/api/camera_feed/${selectedCameraId}`}
                      alt={`Camera ${selectedCameraId} feed`}
                      className="absolute top-0 left-0 w-full h-full object-cover"
                      onError={(e) => { e.target.src = '/no-signal.png'; }}
                    />
                  </div>
                </div>
                <span
                  className={`inline-block px-4 py-1 rounded-full text-sm font-medium text-white ${
                    cameras.find(cam => cam.id === selectedCameraId)?.status === 'Active'
                      ? 'bg-green-600'
                      : 'bg-red-600'
                  }`}
                >
                  {cameras.find(cam => cam.id === selectedCameraId)?.status}
                </span>
              </div>
            )}
          </section>

          {/* User Management */}
          <section className="bg-white rounded-2xl shadow-xl p-8 border-t-4 border-indigo-500">
            <h2 className="text-2xl font-bold text-indigo-700 mb-4">User Management</h2>

            {/* Uncomment this if you want to enable Add User Form */}
            {/* <div className="flex flex-wrap gap-4 mb-6">
              <input
                type="text"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder="Enter new user name"
                className="px-4 py-2 text-black rounded-md border border-indigo-300 shadow-sm focus:outline-none"
              />
              <select
                value={newUserRole}
                onChange={(e) => setNewUserRole(e.target.value)}
                className="px-4 py-2 text-black rounded-md border border-indigo-300 shadow-sm focus:outline-none"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
              <button
                onClick={addUser}
                className="bg-indigo-600 text-white px-4 py-2 rounded-md shadow hover:bg-indigo-700 transition duration-300"
              >
                Add User
              </button>
            </div> */}

            {isLoading ? (
              <Spinner />
            ) : (
              <div className="overflow-x-auto rounded-xl shadow-lg">
                <table className="min-w-full text-sm text-left text-gray-700">
                  <thead className="bg-indigo-700 text-white">
                    <tr>
                      <th className="px-6 py-3">User ID</th>
                      <th className="px-6 py-3">Name</th>
                      <th className="px-6 py-3">Role</th>
                      <th className="px-6 py-3">Last Login</th>
                      <th className="px-6 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(users) && users.map((user, i) => (
                      <tr key={user.id} className={`${i % 2 === 0 ? 'bg-white' : 'bg-indigo-50'} border-t border-gray-200`}>
                        <td className="px-6 py-4">{user.id}</td>
                        <td className="px-6 py-4">{user.name}</td>
                        <td className="px-6 py-4 capitalize">{user.role}</td>
                        <td className="px-6 py-4">{user.last_login}</td>
                        <td className="px-6 py-4 flex flex-wrap gap-2">
                          <button
                            onClick={() => changeUserRole(user.id, user.role === 'admin' ? 'user' : 'admin')}
                            className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 transition duration-200"
                          >
                            Change Role
                          </button>
                          <button
                            onClick={() => deleteUser(user.id)}
                            className="bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-700 transition duration-200"
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