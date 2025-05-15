// pages/login.js
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import AuthNav from '@/components/authNav';

const Login = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    totp: '',
  });
  const [showTotpInput, setShowTotpInput] = useState(false);
  const [loginError, setLoginError] = useState(null);
  const [totpError, setTotpError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const totpRef = useRef(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  useEffect(() => {
    if (showTotpInput && totpRef.current) {
      totpRef.current.focus();
    }
  }, [showTotpInput]);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError(null);
    setTotpError(null);
    setIsLoading(true);

    try {
      const res = await fetch('http://127.0.0.1:8080/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: formData.username, password: formData.password }),
      });

      let data;
      try {
        data = await res.json();
      } catch {
        data = { error: 'Invalid server response' };
      }

      if (res.ok) {
        setShowTotpInput(true);
      } else {
        setLoginError(data.error || 'Invalid login');
      }
    } catch (err) {
      setLoginError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTotpSubmit = async (e) => {
    e.preventDefault();
    setTotpError(null);
    setIsLoading(true);

    try {
      const res = await fetch('http://127.0.0.1:8080/api/auth/verify-totp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: formData.username, token: formData.totp }),
      });

      let data;
      try {
        data = await res.json();
      } catch {
        data = { error: 'Invalid server response' };
      }

      if (res.ok && data.token) {
        localStorage.setItem('token', data.token);
        router.push('/dashboard'); // Go to admin page
      } else {
        setTotpError(data.error || 'Invalid TOTP');
      }
    } catch (err) {
      setTotpError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-indigo-100 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-md border border-indigo-200">
        <AuthNav />
        <h2 className="text-2xl font-bold text-indigo-800 mb-6 text-center">Login to MindSight AI</h2>

        {loginError && !showTotpInput && <p className="text-red-600 text-center mb-4">{loginError}</p>}

        <form onSubmit={handleLoginSubmit} className="space-y-5">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-indigo-700 mb-1">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              required
              value={formData.username}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-indigo-700 mb-1">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              required
              value={formData.password}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white font-medium rounded-lg disabled:opacity-50"
          >
            {isLoading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        {showTotpInput && (
          <>
            {totpError && <p className="text-red-600 text-center mt-4">{totpError}</p>}
            <form onSubmit={handleTotpSubmit} className="mt-6 space-y-5">
              <div>
                <label htmlFor="totp" className="block text-sm font-medium text-indigo-700 mb-1">TOTP</label>
                <input
                  ref={totpRef}
                  type="text"
                  inputMode="numeric"
                  pattern="\d*"
                  maxLength="6"
                  id="totp"
                  name="totp"
                  required
                  value={formData.totp}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white font-medium rounded-lg disabled:opacity-50"
              >
                {isLoading ? 'Verifying...' : 'Verify TOTP'}
              </button>
            </form>
          </>
        )}

        <p className="text-sm text-center text-gray-600 mt-6">
          <a href="/forgot" className="text-indigo-700 hover:underline">Forgot Password?</a>
        </p>
        <p className="text-sm text-center text-gray-600 mt-2">
          Don&apos;t have an account? <a href="/signup" className="text-indigo-700 hover:underline">Sign up</a>
        </p>
      </div>
    </div>
  );
};

export default Login;