import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { jwtDecode } from 'jwt-decode';
import axios from '@/pages/api/axios';

const Navbar = () => {
  const [user, setUser] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const decodedUser = jwtDecode(token);
          setUser(decodedUser);
        } catch (error) {
          console.error("Invalid token:", error);
          setUser(null);
        }
      }
    }
  }, []);

  const handleLogout = async () => {
    const token = localStorage.getItem('token');

    try {
      await axios.post('/api/auth/logout', null, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      localStorage.removeItem('token');
      router.push('/login');
    } catch (err) {
      alert(err.response?.data?.error || 'Logout failed');
    }
  };

  const navigate = (path) => {
    setIsOpen(false);
    router.push(path);
  };

  const isActive = (path) =>
    router.pathname === path
      ? 'text-[#2a9d8f] font-semibold border-b-2 border-[#2a9d8f]'
      : 'hover:text-[#bde0fe]';

  return (
    <nav className="sticky top-0 z-50 bg-gradient-to-r from-[#0d0d0d]/95 to-[#1f1f1f]/95 shadow-md text-[#bde0fe]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="text-2xl font-bold tracking-wide text-[#bde0fe]">MindSight AI</div>

          <div className="hidden md:flex space-x-6 text-lg">
            <button onClick={() => navigate('/dashboard')} className={`transition ${isActive('/dashboard')}`}>
              Dashboard
            </button>
            {user?.role === "admin" && (
              <>
                <button onClick={() => navigate('/logs')} className={`transition ${isActive('/logs')}`}>
                  Detection Logs
                </button>
                <button onClick={() => navigate('/admin')} className={`transition ${isActive('/admin')}`}>
                  Admin Panel
                </button>
              </>
            )}
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-md transition"
            >
              Logout
            </button>
          </div>

          <div className="md:hidden">
            <button onClick={() => setIsOpen(!isOpen)}>
              <svg className="h-6 w-6 text-[#bde0fe]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            <button onClick={() => navigate('/dashboard')} className={`block w-full text-left px-4 py-2 hover:bg-[#2a9d8f]/10 ${isActive('/dashboard')}`}>
              Dashboard
            </button>
            {user?.role === "admin" && (
              <>
                <button onClick={() => navigate('/logs')} className={`block w-full text-left px-4 py-2 hover:bg-[#2a9d8f]/10 ${isActive('/logs')}`}>
                  Detection Logs
                </button>
                <button onClick={() => navigate('/admin')} className={`block w-full text-left px-4 py-2 hover:bg-[#2a9d8f]/10 ${isActive('/admin')}`}>
                  Admin Panel
                </button>
              </>
            )}
            <button onClick={handleLogout} className="block w-full text-left px-4 py-2 text-red-400 hover:bg-red-100">
              Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
