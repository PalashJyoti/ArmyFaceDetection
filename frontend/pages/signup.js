import { useState } from 'react';
import { useRouter } from 'next/router';
import AuthNav from '../components/authNav';
import axios from '@/pages/api/axios';

const Signup = () => {
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
  });
  const [error, setError] = useState(null);
  const [qrCode, setQrCode] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await axios.post('/api/auth/signup', {
        username: formData.username.trim(),
        name: formData.name.trim(),
        password: formData.password,
      }, {
        responseType: 'blob' // Since the server returns a QR code image
      });

      const qrUrl = URL.createObjectURL(res.data);
      setQrCode(qrUrl);

      setTimeout(() => {
        router.push('/login');
      }, 10000);
    } catch (err) {
      let message = 'Signup failed.';
      if (err.response) {
        try {
          const errorData = await err.response.data.text();
          const parsed = JSON.parse(errorData);
          if (err.response.status === 409) {
            message = parsed.error || 'Username already exists.';
          } else if (err.response.status === 400) {
            message = parsed.error || 'Invalid request.';
          } else {
            message = parsed.error || `Error: ${err.response.status}`;
          }
        } catch (parseErr) {
          console.error('Failed to parse error response:', parseErr);
        }
      } else {
        console.error('Network or unexpected error:', err);
        message = 'Something went wrong. Please check your connection and try again.';
      }

      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoToLogin = () => {
    router.push('/login');
  };

 return (
  <div className="relative min-h-screen">
    {/* Navbar absolutely positioned at top */}
    <div className="absolute top-0 left-0 right-0 z-20">
      <AuthNav />
    </div>

    {/* Background wrapper */}
    <div
      className="min-h-screen bg-cover bg-center flex flex-col items-center justify-center px-4 py-8 relative"
      style={{
        backgroundImage:
          "linear-gradient(135deg, rgba(0, 0, 0, 0.5) 0%, rgba(0, 0, 0, 0.7) 100%), url('/image-4.png')",
      }}
    >
      {/* Additional overlay for better contrast */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px]"></div>

      <div className="relative z-10 w-full max-w-md mx-auto">
        {/* You can add <AuthNav /> here if you have it */}
        <div className="relative w-full">
          <div className="w-full bg-black/40 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-white/10 hover:border-white/20 transition-all duration-300 relative overflow-hidden">
            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-2xl blur-xl pointer-events-none"></div>

            <div className="relative z-10">
              <h2 className="text-3xl font-bold mb-8 text-center text-white drop-shadow-lg mt-6">
                Join{' '}
                <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  MindSight AI
                </span>
              </h2>

              {error && (
                <div className="mb-6 p-3 bg-red-500/20 border border-red-500/30 rounded-lg backdrop-blur-sm">
                  <p className="text-center text-red-200 font-medium">{error}</p>
                </div>
              )}

              <form onSubmit={handleSignupSubmit} className="space-y-6">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-200 mb-2"
                  >
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter your full name"
                    className="w-full px-4 py-3 border border-white/20 bg-white/10 backdrop-blur-sm text-white placeholder-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 transition-all duration-200 hover:bg-white/15"
                  />
                </div>

                <div>
                  <label
                    htmlFor="username"
                    className="block text-sm font-medium text-gray-200 mb-2"
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
                    placeholder="Choose a username"
                    className="w-full px-4 py-3 border border-white/20 bg-white/10 backdrop-blur-sm text-white placeholder-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 transition-all duration-200 hover:bg-white/15"
                  />
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-200 mb-2"
                  >
                    Password
                  </label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Create a secure password"
                    className="w-full px-4 py-3 border border-white/20 bg-white/10 backdrop-blur-sm text-white placeholder-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 transition-all duration-200 hover:bg-white/15"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 rounded-lg font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-[1.02] border border-white/20 flex justify-center items-center"
                >
                  {submitting && (
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
                  {submitting ? 'Creating Account...' : 'Create Account'}
                </button>
              </form>

              {qrCode && (
                <div className="mt-8 text-center p-6 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
                  <h3 className="text-xl font-semibold text-white mb-4 drop-shadow-lg">
                    Setup Two-Factor Authentication
                  </h3>
                  <p className="text-gray-200 mb-6 leading-relaxed">
                    Scan this QR code with{' '}
                    <span className="font-semibold text-blue-400">
                      Google Authenticator
                    </span>{' '}
                    or any compatible authenticator app
                  </p>

                  <div className="bg-white p-4 rounded-xl inline-block shadow-lg">
                    <img
                      src={qrCode}
                      alt="TOTP QR Code"
                      className="w-48 h-48 mx-auto"
                    />
                  </div>

                  <div className="mt-6 p-4 bg-blue-500/20 border border-blue-400/30 rounded-lg backdrop-blur-sm">
                    <p className="text-blue-200 font-medium flex items-center justify-center gap-2">
                      <svg
                        className="w-5 h-5 animate-pulse"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        ></path>
                      </svg>
                      Redirecting to login in 10 seconds...
                    </p>
                  </div>
                </div>
              )}

              <div className="mt-8 pt-6 border-t border-white/10">
                <p className="text-sm text-center text-gray-300">
                  Already have an account?{' '}
                  <button
                    onClick={handleGoToLogin}
                    className="text-blue-400 hover:text-blue-300 hover:underline transition-colors duration-200 font-medium"
                  >
                    Log in
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
)}



export default Signup;