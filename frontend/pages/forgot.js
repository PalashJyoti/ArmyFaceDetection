import { useState, useRef, useEffect } from 'react';
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
  const [successMessage, setSuccessMessage] = useState(null);
  const router = useRouter();
  const totpRef = useRef(null);

  useEffect(() => {
    if (showResetPasswordForm && totpRef.current) {
      totpRef.current.focus();
    }
  }, [showResetPasswordForm]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError(null);
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
      setSuccessMessage('TOTP verified successfully! Please enter your new password.');
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
      setSuccessMessage('Password reset successfully! Redirecting to login...');
      setTimeout(() => {
        router.push('/login');
      }, 2000);
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
  <div className="relative min-h-screen">
    {/* Navbar absolutely positioned at top */}
    <div className="absolute top-0 left-0 right-0 z-20">
      <AuthNav />
    </div>

    {/* Background wrapper */}
    <div
      className="min-h-screen bg-cover bg-center flex flex-col items-center justify-center px-4 py-8 relative pt-20"
      style={{
        backgroundImage:
          "linear-gradient(135deg, rgba(0, 0, 0, 0.5) 0%, rgba(0, 0, 0, 0.7) 100%), url('/image-4.png')",
      }}
    >
      {/* Additional overlay for better contrast */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px]"></div>

      <div className="relative z-10 w-full max-w-md mx-auto bg-black/40 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-white/10 hover:border-white/20 transition-all duration-300">
        {/* Subtle glow effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-2xl blur-xl pointer-events-none"></div>

        <div className="relative z-10">
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mb-4 shadow-lg">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                ></path>
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-white drop-shadow-lg">
              Reset Your Password
            </h2>
            <p className="text-gray-300 mt-2">
              {!showResetPasswordForm
                ? 'Enter your username and TOTP code to verify your identity'
                : 'Enter your new password to complete the reset'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-500/20 border border-red-500/30 rounded-lg backdrop-blur-sm">
              <p className="text-center text-red-200 font-medium">{error}</p>
            </div>
          )}

          {successMessage && (
            <div className="mb-6 p-3 bg-green-500/20 border border-green-500/30 rounded-lg backdrop-blur-sm">
              <p className="text-center text-green-200 font-medium">
                {successMessage}
              </p>
            </div>
          )}

          {!showResetPasswordForm && (
            <form onSubmit={handleTotpVerification} className="space-y-6">
              <div>
                <label
                  htmlFor="username"
                  className="block text-sm font-medium mb-2 text-gray-200"
                >
                  Username
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  required
                  value={formData.username}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-white/20 bg-white/10 backdrop-blur-sm text-white placeholder-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 transition-all duration-200 hover:bg-white/15"
                  placeholder="Enter your username"
                />
              </div>

              <div>
                <label
                  htmlFor="totp"
                  className="block text-sm font-medium mb-2 text-gray-200"
                >
                  Two-Factor Authentication Code
                </label>
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
                  className="w-full px-4 py-3 border border-white/20 bg-white/10 backdrop-blur-sm text-white placeholder-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 transition-all duration-200 hover:bg-white/15 text-center text-lg tracking-widest"
                  placeholder="000000"
                />
                <p className="text-xs text-gray-300 mt-1 text-center">
                  Enter the 6-digit code from your authenticator app
                </p>
              </div>

              <button
                type="submit"
                disabled={verifying}
                className="w-full py-3 rounded-lg font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-[1.02] border border-white/20 flex justify-center items-center"
                aria-busy={verifying}
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
                {verifying ? 'Verifying Code...' : 'Verify Authentication'}
              </button>
            </form>
          )}

          {showResetPasswordForm && (
            <form onSubmit={handlePasswordResetSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="newPassword"
                  className="block text-sm font-medium mb-2 text-gray-200"
                >
                  New Password
                </label>
                <input
                  type="password"
                  id="newPassword"
                  name="newPassword"
                  required
                  value={formData.newPassword}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-white/20 bg-white/10 backdrop-blur-sm text-white placeholder-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 transition-all duration-200 hover:bg-white/15"
                  placeholder="Enter your new secure password"
                />
                <p className="text-xs text-gray-300 mt-1">
                  Choose a strong password with at least 8 characters
                </p>
              </div>

              <button
                type="submit"
                disabled={resetting}
                className="w-full py-3 rounded-lg font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-[1.02] border border-white/20 flex justify-center items-center"
                aria-busy={resetting}
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
                {resetting ? 'Resetting Password...' : 'Reset Password'}
              </button>
            </form>
          )}

          <div className="mt-8 pt-6 border-t border-white/10">
            <p className="text-sm text-center text-gray-300">
              Remember your password?{' '}
              <a
                href="/login"
                className="text-blue-400 hover:text-blue-300 hover:underline transition-colors duration-200 font-medium"
              >
                Back to Login
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
);}


export default ForgotPassword;