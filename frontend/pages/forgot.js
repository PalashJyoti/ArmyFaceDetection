import { useState } from 'react';
import { useRouter } from 'next/router';
import AuthNav from '@/components/authNav';

const ForgotPassword = () => {
  const [formData, setFormData] = useState({
    username: '',
    totp: '',
    newPassword: '',
  });
  const [error, setError] = useState(null);
  const [showTotpInput, setShowTotpInput] = useState(false);
  const [showResetPasswordForm, setShowResetPasswordForm] = useState(false);
  const router = useRouter();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleTotpVerification = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://127.0.0.1:8080/api/auth/verify-totp-for-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: formData.username, token: formData.totp }),
      });

      const data = await res.json();

      if (res.ok) {
        setShowResetPasswordForm(true); // Show the reset password form
      } else {
        setError(data.error || 'Invalid TOTP');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    }
  };

  const handlePasswordResetSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://127.0.0.1:8080/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: formData.username, newPassword: formData.newPassword }),
      });

      const data = await res.json();

      if (res.ok) {
        alert('Password reset successfully');
        router.push('/login');
      } else {
        setError(data.error || 'Password reset failed');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-indigo-100 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-md border border-indigo-200">
        <AuthNav/>
        <h2 className="text-2xl font-bold text-indigo-800 mb-6 text-center">Forgot Password</h2>

        {error && <p className="text-red-600 text-center mb-4">{error}</p>}

        <form onSubmit={handleTotpVerification} className="space-y-5">
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

        {showResetPasswordForm && (
          <form onSubmit={handlePasswordResetSubmit} className="mt-6 space-y-5">
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-indigo-700 mb-1">New Password</label>
              <input
                type="password"
                id="newPassword"
                name="newPassword"
                required
                value={formData.newPassword}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white font-medium rounded-lg"
            >
              Reset Password
            </button>
          </form>
        )}

        <p className="text-sm text-center text-gray-600 mt-6">
          Remember your password? <a href="/login" className="text-indigo-700 hover:underline">Login</a>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
