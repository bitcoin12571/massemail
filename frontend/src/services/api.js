import axios from 'axios';

const API_BASE_URL = import.meta.env.PROD
  ? '/api'
  : (import.meta.env.VITE_API_URL || 'http://localhost:5000/api');

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

export function getApiErrorMessage(error, fallback = 'Request failed') {
  const payload = error?.response?.data;
  const candidate = payload?.error ?? payload?.message ?? error?.message;

  if (typeof candidate === 'string' && candidate.trim()) {
    return candidate;
  }

  if (candidate && typeof candidate.message === 'string') {
    return candidate.message;
  }

  if (candidate && typeof candidate.code === 'string') {
    return candidate.code;
  }

  return fallback;
}

// Add auth token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config?.url?.startsWith('/auth/')) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('mailoraUser');
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

export default api;
