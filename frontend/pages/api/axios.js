// utils/axios.js
import axios from 'axios';

// Create axios instance with enhanced configuration
const instance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_FLASK_MAIN_API_BASE_URL,
  timeout: 30000, // 30 second timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token management utilities
const getToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token');
  }
  return null;
};

const removeToken = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
    // Optionally redirect to login page
    // window.location.href = '/login';
  }
};

// Optionally centralized logout function
const logout = () => {
  removeToken();
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
};

// Request interceptor - automatically attach token and add metadata
instance.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add request timestamp for debugging
    config.metadata = { startTime: new Date() };

    // In development mode, log request details
    if (process.env.NODE_ENV === 'development') {
      console.log('Starting Request:', {
        method: config.method?.toUpperCase(),
        url: config.url,
        data: config.data,
      });
    }

    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor - enhanced error handling & timing
instance.interceptors.response.use(
  (response) => {
    const endTime = new Date();
    const duration = endTime.getTime() - (response.config.metadata?.startTime?.getTime() || endTime.getTime());
    console.debug(`Request to ${response.config.url} took ${duration}ms`);

    return response;
  },
  (error) => {
    const { response, request, message } = error;

    if (response) {
      const { status, data } = response;

      switch (status) {
        case 400:
          console.error('Bad Request:', data);
          if (data && typeof data === 'object' && data.errors) {
            console.error('Validation errors:', data.errors);
          }
          break;

        case 401:
          const errorMessage = data?.error || 'Authentication failed';
          console.warn('Authentication Error:', errorMessage);

          if (
            errorMessage.toLowerCase().includes('expired') ||
            errorMessage.toLowerCase().includes('invalid')
          ) {
            logout();
            // Optionally show a toast notification
            // toast.error('Session expired. Please login again.');
          }
          break;

        case 403:
          console.warn('Access Forbidden:', data || 'Insufficient permissions');
          // Optionally redirect to unauthorized page
          break;

        case 404:
          console.warn('Resource Not Found:', response.config.url);
          break;

        case 422:
          console.error('Unprocessable Entity:', data);
          // Handle validation errors from server
          break;

        case 429:
          console.warn('Rate Limit Exceeded. Please try again later.');
          break;

        case 500:
          console.error('Internal Server Error:', data);
          // Optionally report to error tracking service
          break;

        case 502:
        case 503:
        case 504:
          console.error('Server Unavailable:', status);
          // Optionally implement retry logic
          break;

        default:
          console.error(`HTTP Error ${status}:`, data || 'Unknown error occurred');
      }
    } else if (request) {
      console.error('Network Error: No response received from server');
      console.error('Request details:', {
        url: request.responseURL || 'Unknown',
        method: error.config?.method?.toUpperCase(),
      });
    } else {
      console.error('Request Setup Error:', message);
    }

    return Promise.reject(error);
  }
);

// Utility function to convert Axios errors to user-friendly messages
export const handleApiError = (error) => {
  if (error.response) {
    const { status, data } = error.response;

    switch (status) {
      case 400:
        return data?.message || 'Invalid request. Please check your input.';
      case 401:
        return 'Authentication required. Please login again.';
      case 403:
        return "You don't have permission to perform this action.";
      case 404:
        return 'The requested resource was not found.';
      case 422:
        return data?.message || 'Validation failed. Please check your input.';
      case 429:
        return 'Too many requests. Please try again later.';
      case 500:
        return 'Server error. Please try again later.';
      default:
        return data?.message || 'An unexpected error occurred.';
    }
  } else if (error.request) {
    return 'Network error. Please check your internet connection.';
  } else {
    return error.message || 'An unexpected error occurred.';
  }
};

// Retry logic for requests with exponential backoff
export const createRetryableRequest = (maxRetries = 3) => {
  return async (requestConfig) => {
    let lastError;

    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await instance(requestConfig);
      } catch (error) {
        lastError = error;

        // Only retry on network errors or 5xx errors
        const shouldRetry =
          !error.response || (error.response.status >= 500 && error.response.status < 600);

        if (shouldRetry && i < maxRetries) {
          const delay = Math.pow(2, i) * 1000; // Exponential backoff: 1s, 2s, 4s...
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        throw error;
      }
    }

    throw lastError;
  };
};

export default instance;
