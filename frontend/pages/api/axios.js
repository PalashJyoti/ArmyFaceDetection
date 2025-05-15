import axios from 'axios';

const instance = axios.create({
  baseURL: 'http://localhost:8080',
});

// Automatically attach token (if available) for every request
instance.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Global error handling
instance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const status = error.response.status;

      if (status === 401) {
        alert('Your session has expired. Please log in again.');
        localStorage.removeItem('token');
        window.location.href = '/login';
      } else if (status === 403) {
        // Do not alert here. Let individual request handlers (like your role change logic) deal with this.
        // Just return the error.
        // Optionally log it for debugging:
        console.warn('403 Forbidden:', error.response?.data || '');
      } else if (status === 404) {
        alert('Requested resource not found.');
      } else if (status === 500) {
        alert('Server error. Please try again later.');
      } else {
        alert('An unexpected error occurred.');
      }
    } else if (error.request) {
      alert('Network error. Please check your internet connection.');
    } else {
      alert(`Error: ${error.message}`);
    }
    return Promise.reject(error);
  }
);

export default instance;