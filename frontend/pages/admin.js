import React, { useState, useEffect } from 'react';
import Navbar from '../components/navbar';
import axios from './api/axios';

const AdminPanel = () => {
  const [users, setUsers] = useState([]);
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState('user');
  const [selectedCameraId, setSelectedCameraId] = useState(null);

  const cameras = Array.from({ length: 10 }, (_, i) => ({
    id: i,
    label: `Camera ${i + 1}`,
    status: i % 3 === 0 ? 'Inactive' : 'Active',
    ip: `192.168.0.10${i + 1}`,
  }));

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await axios.get('/api/auth/users');
      setUsers(Array.isArray(res.data) ? res.data : res.data.users || []);
    } catch (err) {
      console.error('Failed to fetch users', err);
      setUsers([]);
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
    }
  };

  const deleteUser = async (id) => {
    try {
      await axios.delete(`/api/auth/users/${id}`);
      setUsers((prev) => prev.filter((user) => user.id !== id));
    } catch (err) {
      console.error('Failed to delete user', err);
    }
  };

  const changeUserRole = async (id, newRole) => {
    try {
      const res = await axios.put(`/api/auth/users/${id}/role`, { role: newRole });
      setUsers((prev) =>
        prev.map((user) => (user.id === id ? res.data : user))
      );
    } catch (err) {
      console.error('Failed to change role', err);
    }
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-tr from-indigo-100 via-purple-100 to-pink-100 text-white px-6 py-10">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-extrabold mb-10 text-center text-indigo-800 tracking-tight">
            Admin Control Panel
          </h1>

          {/* Camera Overview */}
          <section className="mb-16">
            <h2 className="text-2xl font-bold mb-6 text-indigo-700">Camera Overview</h2>
            <div className="mb-6">
              <label className="block mb-2 text-lg font-medium text-indigo-700">Select a Camera:</label>
              <select
                onChange={(e) => setSelectedCameraId(Number(e.target.value))}
                className="w-full px-4 py-2 text-black rounded-md"
                value={selectedCameraId ?? ''}
              >
                <option value="">-- Choose a Camera --</option>
                {cameras.map((cam) => (
                  <option key={cam.id} value={cam.id}>
                    {cam.label} ({cam.ip})
                  </option>
                ))}
              </select>
            </div>

            {selectedCameraId !== null && (
              <div className="bg-white rounded-2xl shadow-lg p-6 border-t-4 border-indigo-500">
                <h3 className="text-xl font-semibold mb-1 text-indigo-700">{cameras[selectedCameraId].label}</h3>
                <p className="text-sm text-slate-300 mb-2">IP: {cameras[selectedCameraId].ip}</p>
                <div className="relative w-full aspect-video bg-black rounded-lg mb-3 overflow-hidden">
  <img
    src={`http://localhost:8080/api/camera_feed/${selectedCameraId}`}
    alt={`Camera ${selectedCameraId} feed`}
    className="absolute top-0 left-0 w-full h-full object-cover"
    onError={(e) => {
      e.target.src = '/no-signal.png';
    }}
  />
</div>
                <span
                  className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                    cameras[selectedCameraId].status === 'Active'
                      ? 'bg-green-600'
                      : 'bg-red-600'
                  }`}
                >
                  {cameras[selectedCameraId].status}
                </span>
              </div>
            )}
          </section>

          {/* User Management */}
          <section className="mb-16">
            <h2 className="text-2xl font-bold mb-6 text-indigo-700">User Management</h2>
            <div className="mb-6 flex flex-wrap gap-4">
              <input
                type="text"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder="Enter new user name"
                className="px-4 py-2 text-black rounded-md"
              />
              <select
                value={newUserRole}
                onChange={(e) => setNewUserRole(e.target.value)}
                className="px-4 py-2 text-black rounded-md"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
              <button
                onClick={addUser}
                className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition"
              >
                Add User
              </button>
            </div>
            <div className="overflow-x-auto bg-white rounded-xl shadow-lg">
              <table className="min-w-full text-sm text-left text-gray-800">
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
                  {Array.isArray(users) && users.map((user) => (
                    <tr key={user.id} className="border-t border-gray-200 hover:bg-indigo-50 transition duration-300">
                      <td className="px-6 py-4">{user.id}</td>
                      <td className="px-6 py-4">{user.name}</td>
                      <td className="px-6 py-4 capitalize">{user.role}</td>
                      <td className="px-6 py-4">{user.lastLogin}</td>
                      <td className="px-6 py-4 flex gap-2">
                        <button
                          onClick={() => changeUserRole(user.id, user.role === 'admin' ? 'user' : 'admin')}
                          className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 transition"
                        >
                          Change Role
                        </button>
                        <button
                          onClick={() => deleteUser(user.id)}
                          className="bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-700 transition"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </>
  );
};

export default AdminPanel;