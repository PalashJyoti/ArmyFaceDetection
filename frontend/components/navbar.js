import React, { useState } from 'react';
import { useRouter } from 'next/router';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    const token = localStorage.getItem('token');

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
    } catch (err) {
      alert('Network error during logout');
    }
  };

  const navigate = (path) => {
    setIsOpen(false);
    router.push(path);
  };

  const isActive = (path) => {
    return router.pathname === path ? 'text-indigo-500 font-semibold border-b-2 border-indigo-400' : 'hover:text-gray-300';
  };

  return (
    <nav className="sticky top-0 bg-indigo-800 text-white shadow-md z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center space-x-3">
            <span className="text-2xl font-bold tracking-wide">MindSight AI</span>
          </div>
          <div className="hidden md:flex space-x-6 text-lg">
            <button onClick={() => navigate('/dashboard')} className={`transition ${isActive('/dashboard')}`}>Home</button>
            <button onClick={() => navigate('/logs')} className={`transition ${isActive('/logs')}`}>Detection Logs</button>
            <button onClick={() => navigate('/admin')} className={`transition ${isActive('/admin')}`}>Admin Panel</button>
            <button onClick={handleLogout} className="bg-red-500 hover:bg-red-600 px-4 py-1.5 rounded-md transition">Logout</button>
          </div>
          <div className="md:hidden">
            <button onClick={() => setIsOpen(!isOpen)}>
              <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8h16M4 16h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {isOpen && (
          <div className="md:hidden mt-2 space-y-2 pb-4">
            <button onClick={() => navigate('/dashboard')} className={`block w-full text-left px-4 py-2 hover:bg-indigo-600 ${isActive('/dashboard')}`}>Home</button>
            <button onClick={() => navigate('/logs')} className={`block w-full text-left px-4 py-2 hover:bg-indigo-600 ${isActive('/logs')}`}>Detection Logs</button>
            <button onClick={() => navigate('/admin')} className={`block w-full text-left px-4 py-2 hover:bg-indigo-600 ${isActive('/admin')}`}>Admin Panel</button>
            <button onClick={handleLogout} className="block w-full text-left px-4 py-2 text-red-400 hover:bg-red-100">Logout</button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;