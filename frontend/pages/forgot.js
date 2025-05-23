import { useState } from 'react';
import { useRouter } from 'next/router';
import AuthNav from '@/components/authNav';
import axios from '@/pages/api/axios';

const ForgotPassword = () => {
  const [formData, setFormData] = useState({
    username: '',
    totp: '',
    newPassword: '',
  });
  const [error, setError] = useState(null);
  const [showResetPasswordForm, setShowResetPasswordForm] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resetting, setResetting] = useState(false);
  const router = useRouter();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleTotpVerification = async (e) => {
    e.preventDefault();
    setError(null);
    setVerifying(true);
    try {
      await axios.post('/api/auth/verify-totp-for-reset', {
        username: formData.username,
        token: formData.totp,
      });
      setShowResetPasswordForm(true);
    } catch (err) {
      if (err.response && err.response.data) {
        setError(err.response.data.error || 'Invalid TOTP');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setVerifying(false);
    }
  };

  const handlePasswordResetSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setResetting(true);
    try {
      await axios.post('/api/auth/reset-password', {
        username: formData.username,
        newPassword: formData.newPassword,
      });
      alert('Password reset successfully');
      router.push('/login');
    } catch (err) {
      if (err.response && err.response.data) {
        setError(err.response.data.error || 'Password reset failed');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-indigo-100 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-md border border-indigo-200">
        <AuthNav />
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
            disabled={verifying}
            className={`w-full py-2.5 font-medium rounded-lg text-white flex justify-center items-center ${verifying ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-700 hover:bg-indigo-800'}`}
          >
            {verifying && (
              <svg
                className="animate-spin h-5 w-5 mr-2 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                ></path>
              </svg>
            )}
            {verifying ? 'Verifying...' : 'Verify TOTP'}
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
              disabled={resetting}
              className={`w-full py-2.5 font-medium rounded-lg text-white flex justify-center items-center ${resetting ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-700 hover:bg-indigo-800'}`}
            >
              {resetting && (
                <svg
                  className="animate-spin h-5 w-5 mr-2 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  ></path>
                </svg>
              )}
              {resetting ? 'Resetting...' : 'Reset Password'}
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
