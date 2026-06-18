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

// Store CSRF token and session ID
let csrfToken = null;
let sessionId = null;

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

/**
 * Fetch CSRF token from backend
 * Called on app initialization
 */
export async function initializeCsrfToken() {
  try {
    // Generate or retrieve session ID
    sessionId = sessionId || crypto.randomUUID?.() || `session-${Date.now()}`;

    // Make a GET request to trigger CSRF token generation
    const response = await api.get('/health', {
      headers: {
        'X-Session-Id': sessionId
      }
    });

    // Extract CSRF token from response headers
    csrfToken = response.headers['x-csrf-token'];
    if (csrfToken) {
      sessionStorage.setItem('csrfToken', csrfToken);
      sessionStorage.setItem('sessionId', sessionId);
    }

    return csrfToken;
  } catch (error) {
    console.warn('Failed to initialize CSRF token:', error);
    return null;
  }
}

/**
 * Get current CSRF token (from storage or memory)
 */
export function getCsrfToken() {
  if (!csrfToken) {
    csrfToken = sessionStorage.getItem('csrfToken');
  }
  return csrfToken;
}

/**
 * Get current session ID
 */
export function getSessionId() {
  if (!sessionId) {
    sessionId = sessionStorage.getItem('sessionId');
  }
  return sessionId;
}

// Add auth token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Add CSRF token for state-changing requests
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(config.method?.toUpperCase())) {
    const currentCsrfToken = getCsrfToken();
    const currentSessionId = getSessionId();

    if (currentCsrfToken) {
      config.headers['X-CSRF-Token'] = currentCsrfToken;
    }
    if (currentSessionId) {
      config.headers['X-Session-Id'] = currentSessionId;
    }
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
      window.dispatchEvent(new Event('mailora:logout'));
    }
    return Promise.reject(error);
  }
);

export default api;
