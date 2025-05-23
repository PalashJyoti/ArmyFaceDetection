// utils/axiosInstance.ts or axios.js (depending on your project setup)
import axios from 'axios';

const instance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
   headers: {
    'Content-Type': 'application/json',
  },
});

// Automatically attach token (if available) for every request
instance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

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
