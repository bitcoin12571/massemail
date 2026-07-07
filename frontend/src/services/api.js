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
let tokenInitializing = false;
let tokenPromise = null;

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
 * Uses a lock to prevent race conditions when multiple requests need a token
 */
export async function initializeCsrfToken() {
  try {
    // If already initializing, wait for that promise
    if (tokenPromise) {
      return await tokenPromise;
    }

    // If token already exists, return it
    if (csrfToken) {
      return csrfToken;
    }

    // Mark as initializing and create the promise
    tokenInitializing = true;
    tokenPromise = (async () => {
      try {
        // Generate or retrieve session ID
        sessionId = sessionStorage.getItem('sessionId') || sessionId || crypto.randomUUID?.() || `session-${Date.now()}`;

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
      } finally {
        tokenInitializing = false;
        tokenPromise = null;
      }
    })();

    return await tokenPromise;
  } catch (error) {
    console.warn('Failed to initialize CSRF token:', error);
    return null;
  }
}

/**
 * Force refresh CSRF token
 * Call this on page navigation or when token might be stale
 */
export async function refreshCsrfToken() {
  csrfToken = null; // Clear cached token
  return await initializeCsrfToken();
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
  const storedSessionId = sessionStorage.getItem('sessionId');
  if (storedSessionId && storedSessionId !== sessionId) {
    sessionId = storedSessionId;
  } else if (!sessionId) {
    sessionId = storedSessionId;
  }
  return sessionId;
}

// Add auth token to every request
api.interceptors.request.use(async (config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Add CSRF token for all requests (including GET)
  // This ensures token is always fresh
  let currentCsrfToken = getCsrfToken();
  const currentSessionId = getSessionId();

  // For state-changing requests, always ensure we have a token
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(config.method?.toUpperCase())) {
    // Regenerate CSRF token if missing
    if (!currentCsrfToken) {
      currentCsrfToken = await initializeCsrfToken();
    }
  }

  if (currentCsrfToken) {
    config.headers['X-CSRF-Token'] = currentCsrfToken;
  }
  if (currentSessionId) {
    config.headers['X-Session-Id'] = currentSessionId;
  }

  return config;
});

// Handle responses
api.interceptors.response.use(
  (response) => {
    // Always capture fresh CSRF token from response headers
    const newToken = response.headers['x-csrf-token'];
    if (newToken) {
      csrfToken = newToken;
      sessionStorage.setItem('csrfToken', newToken);
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401 && !error.config?.url?.startsWith('/auth/')) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('mailoraUser');
      sessionStorage.removeItem('csrfToken');
      sessionStorage.removeItem('sessionId');
      csrfToken = null;
      sessionId = null;
      window.dispatchEvent(new Event('mailora:logout'));
    }
    return Promise.reject(error);
  }
);

export default api;
