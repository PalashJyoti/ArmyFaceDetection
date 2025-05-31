// pages/login.js
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import AuthNav from '@/components/authNav';
import axios from '@/pages/api/axios';

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
      const res = await axios.post('/api/auth/login', {
        username: formData.username,
        password: formData.password,
      });
      setShowTotpInput(true);
    } catch (err) {
      if (err.response) {
        setLoginError(err.response.data.error || 'Invalid login');
      } else {
        setLoginError('Network error. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleTotpSubmit = async (e) => {
    e.preventDefault();
    setTotpError(null);
    setIsLoading(true);

    try {
      const res = await axios.post('/api/auth/verify-totp', {
        username: formData.username,
        token: formData.totp,
      });

      if (res.data.token) {
        localStorage.setItem('token', res.data.token);
        router.push('/dashboard');
      } else {
        setTotpError('Invalid TOTP');
      }
    } catch (err) {
      if (err.response && err.response.data) {
        setTotpError(err.response.data.error || 'Invalid TOTP');
      } else {
        setTotpError('Network error. Please try again.');
      }
    } finally {
      setIsLoading(false);
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
        className="min-h-screen bg-cover bg-center flex flex-col items-center justify-center px-4 py-8 relative"
        style={{
          backgroundImage:
            "linear-gradient(135deg, rgba(0, 0, 0, 0.5) 0%, rgba(0, 0, 0, 0.7) 100%), url('/image-4.png')",
        }}
      >
        {/* Additional overlay for better contrast */}
        <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px]"></div>

        <div className="relative z-10 w-full">
          <div className="w-full max-w-md mx-auto mt-24 bg-black/40 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-white/10 hover:border-white/20 transition-all duration-300">
            {/* Subtle glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-2xl blur-xl"></div>

            <div className="relative z-10">
              <h2 className="text-3xl font-bold mb-8 text-center text-white drop-shadow-lg">
                Login to{' '}
                <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  MindSight AI
                </span>
              </h2>

              {loginError && !showTotpInput && (
                <div className="mb-6 p-3 bg-red-500/20 border border-red-500/30 rounded-lg backdrop-blur-sm">
                  <p className="text-center text-red-200 font-medium">{loginError}</p>
                </div>
              )}

              {!showTotpInput && (
                <form onSubmit={handleLoginSubmit} className="space-y-6">
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
                      htmlFor="password"
                      className="block text-sm font-medium mb-2 text-gray-200"
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
                      className="w-full px-4 py-3 border border-white/20 bg-white/10 backdrop-blur-sm text-white placeholder-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 transition-all duration-200 hover:bg-white/15"
                      placeholder="Enter your password"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 rounded-lg font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-[1.02] border border-white/20"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Logging in...
                      </span>
                    ) : (
                      'Log In'
                    )}
                  </button>
                </form>
              )}

              {showTotpInput && (
                <>
                  {totpError && (
                    <div className="mb-6 p-3 bg-red-500/20 border border-red-500/30 rounded-lg backdrop-blur-sm">
                      <p className="text-center text-red-200 font-medium">{totpError}</p>
                    </div>
                  )}

                  <form onSubmit={handleTotpSubmit} className="space-y-6">
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
                      disabled={isLoading}
                      className="w-full py-3 rounded-lg font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-[1.02] border border-white/20"
                    >
                      {isLoading ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                              fill="none"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          Verifying...
                        </span>
                      ) : (
                        'Verify Code'
                      )}
                    </button>
                  </form>
                </>
              )}

              <div className="mt-8 pt-6 border-t border-white/10">
                <p className="text-sm text-center mb-3 text-gray-300">
                  <a
                    href="/forgot"
                    className="hover:underline text-blue-400 hover:text-blue-300 transition-colors duration-200"
                  >
                    Forgot Password?
                  </a>
                </p>
                <p className="text-sm text-center text-gray-300">
                  Don&apos;t have an account?{' '}
                  <a
                    href="/signup"
                    className="hover:underline text-blue-400 hover:text-blue-300 transition-colors duration-200 font-medium"
                  >
                    Sign up
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;