import { useState } from 'react';
import { useRouter } from 'next/router';

const Login = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    totp: '',
  });
  const [error, setError] = useState(null);
  const [showTotpInput, setShowTotpInput] = useState(false);
  const router = useRouter();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://127.0.0.1:8080/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: formData.username, password: formData.password }),
      });

      const data = await res.json();

      if (res.ok) {
        setShowTotpInput(true); // Show the TOTP input after successful login
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    }
  };

  const handleTotpSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://127.0.0.1:8080/api/auth/verify-totp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: formData.username, token: formData.totp }),
      });

      const data = await res.json();

      if (res.ok && data.token) {
        localStorage.setItem('token', data.token); // Store JWT
        router.push('/dashboard'); // Navigate to dashboard after successful 2FA
      } else {
        setError(data.error || 'Invalid TOTP');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-indigo-100 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-md border border-indigo-200">
        <h2 className="text-2xl font-bold text-indigo-800 mb-6 text-center">Login to MindSight AI</h2>

        {error && <p className="text-red-600 text-center mb-4">{error}</p>}

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
            className="w-full py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white font-medium rounded-lg"
          >
            Log In
          </button>
        </form>

        {showTotpInput && (
          <form onSubmit={handleTotpSubmit} className="mt-6 space-y-5">
            <div>
              <label htmlFor="totp" className="block text-sm font-medium text-indigo-700 mb-1">TOTP</label>
              <input
                type="number"
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
              className="w-full py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white font-medium rounded-lg"
            >
              Verify TOTP
            </button>
          </form>
        )}

        <p className="text-sm text-center text-gray-600 mt-6">
          Don't have an account? <a href="/signup" className="text-indigo-700 hover:underline">Sign up</a>
        </p>
      </div>
    </div>
  );
};

export default Login;