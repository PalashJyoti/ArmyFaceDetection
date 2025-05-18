import { useState } from 'react';
import { useRouter } from 'next/router';
import AuthNav from '../components/authNav';

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
      const res = await fetch('http://127.0.0.1:8080/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username.trim(),
          name: formData.name.trim(),
          password: formData.password,
        }),
      });

      if (res.ok) {
        const qrBlob = await res.blob();
        const qrUrl = URL.createObjectURL(qrBlob);
        setQrCode(qrUrl);

        setTimeout(() => {
          router.push('/login');
        }, 10000);
      } else {
        let message = 'Signup failed.';
        try {
          const errorData = await res.json();
          if (res.status === 409) {
            message = errorData.error || 'Username already exists.';
          } else if (res.status === 400) {
            message = errorData.error || 'Invalid request.';
          } else {
            message = errorData.error || `Error: ${res.status}`;
          }
        } catch (parseErr) {
          console.error('Failed to parse error response:', parseErr);
        }
        setError(message);
      }
    } catch (err) {
      console.error('Network or unexpected error:', err);
      setError('Something went wrong. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoToLogin = () => {
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-indigo-100 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-md border border-indigo-200">
        <AuthNav />
        <h2 className="text-2xl font-bold text-indigo-800 mb-6 text-center">Sign Up for MindSight AI</h2>

        {error && <p className="text-red-600 text-center mb-4">{error}</p>}

        <form onSubmit={handleSignupSubmit} className="space-y-5">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-indigo-700 mb-1">Full Name</label>
            <input
              type="text"
              id="name"
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
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
            disabled={submitting}
            className={`w-full py-2.5 font-medium rounded-lg text-white ${submitting ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-700 hover:bg-indigo-800'}`}
          >
            {submitting ? 'Signing Up...' : 'Sign Up'}
          </button>
        </form>

        {qrCode && (
          <div className="mt-6 text-center">
            <p className="text-lg text-indigo-700 mb-4">Scan this QR code with Google Authenticator</p>
            <img src={qrCode} alt="TOTP QR Code" className="mx-auto w-40 h-40" />
            <p className="text-sm text-gray-600 mt-2">Redirecting to login in 10 seconds...</p>
          </div>
        )}

        <p className="text-sm text-center text-gray-600 mt-6">
          Already have an account?{' '}
          <button
            onClick={handleGoToLogin}
            className="text-indigo-700 hover:underline"
          >
            Log in
          </button>
        </p>
      </div>
    </div>
  );
};

export default Signup;