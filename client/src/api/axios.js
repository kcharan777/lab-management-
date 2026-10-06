import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request Interceptor: Attach JWT Token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Uniform error handling & Token expiration
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    const response = error.response;
    let message = 'Unable to communicate with LabPulse server. Please check connection.';

    if (response) {
      message = response.data?.message || `Server Error (${response.status})`;

      // Token expired or invalid
      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // If not already on login or register, redirect
        if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
          window.location.href = '/login?expired=1';
        }
      }
    }

    const enhancedError = new Error(message);
    enhancedError.statusCode = response?.status;
    enhancedError.data = response?.data;
    return Promise.reject(enhancedError);
  }
);

export default api;
