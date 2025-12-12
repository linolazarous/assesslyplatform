/**
 * src/api.jsx
 * Axios configuration with auto token refresh and OAuth login
 */

import axios from 'axios';

// ----------------------
// Dynamic Base URL
// ----------------------
const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl) return envUrl.replace(/\/$/, '');

  const { hostname } = window.location;
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';

  if (isLocal) return 'http://localhost:10000';
  if (hostname.includes('onrender.com')) return `https://${hostname}`;
  return 'https://assesslyplatform-t49h.onrender.com';
};

export const API_BASE_URL = getApiBaseUrl();
export const API_V1_BASE_URL = `${API_BASE_URL}/api/v1`;

// ----------------------
// Axios Instance
// ----------------------
const api = axios.create({
  baseURL: API_V1_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-Client': 'assessly-frontend',
  },
  timeout: 20000,
  withCredentials: true, // Required for OAuth cookies
});

// ----------------------
// Token Helpers
// ----------------------
export const getAuthToken = () => {
  try {
    const token = localStorage.getItem('token');
    return token && token.length > 50 ? token : null;
  } catch {
    return null;
  }
};

// ----------------------
// Request Interceptor
// ----------------------
api.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    config.headers['X-Request-ID'] = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// ----------------------
// Response Interceptor with Auto-Refresh
// ----------------------
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => (error ? prom.reject(error) : prom.resolve(token)));
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status ?? 0;

    // Auto-refresh token on 401
    if (status === 401 && !originalRequest._retry && !originalRequest.url.includes('/auth/login')) {
      if (isRefreshing) {
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshRes = await axios.get(`${API_BASE_URL}/api/auth/refresh`, { withCredentials: true });
        const newToken = refreshRes.data?.token;
        if (!newToken) throw new Error('No token returned from refresh');

        localStorage.setItem('token', newToken);
        api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
        processQueue(null, newToken);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('token');
        window.location.href = '/auth?expired=true';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Normalize error
    const serverMsg = error.response?.data?.message || error.message || 'Unknown error';
    return Promise.reject({
      message: serverMsg,
      status,
      url: originalRequest.url,
      code: error.code || 'UNKNOWN_ERROR',
      details: error.response?.data || {},
    });
  }
);

// ----------------------
// Retry Helper
// ----------------------
export const handleRequest = async (promiseFactory, { retries = 2, delay = 1000 } = {}) => {
  try {
    const res = await promiseFactory();
    return res?.data ?? res;
  } catch (err) {
    const retriable = !err.status || err.status >= 500;
    if (retries > 0 && retriable) {
      await new Promise((r) => setTimeout(r, delay));
      return handleRequest(promiseFactory, { retries: retries - 1, delay: delay * 1.5 });
    }
    throw err;
  }
};

// ----------------------
// Standardized Endpoints
// ----------------------
export const API_ENDPOINTS = {
  AUTH: {
    REGISTER: '/auth/register',
    LOGIN: '/auth/login',
    REFRESH: '/auth/refresh',
    ME: '/auth/me',
    LOGOUT: '/auth/logout',
    GOOGLE: '/auth/google',
    GITHUB: '/auth/github',
    LINKEDIN: '/auth/linkedin',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
  },
  USERS: '/users',
  ASSESSMENTS: '/assessments',
  ORGANIZATIONS: '/organizations',
  HEALTH: '/health',
  STATUS: '/status',
};

// ----------------------
// OAuth Helpers
// ----------------------
export const oauthLogin = async (provider) => {
  try {
    if (!['google', 'github', 'linkedin'].includes(provider)) {
      throw new Error('Unsupported OAuth provider');
    }

    // Open OAuth in a popup
    const width = 600, height = 700;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    return new Promise((resolve, reject) => {
      const popup = window.open(
        `${API_BASE_URL}/api/auth/${provider}`,
        '_blank',
        `width=${width},height=${height},top=${top},left=${left}`
      );

      const timer = setInterval(() => {
        try {
          if (!popup || popup.closed) {
            clearInterval(timer);
            reject(new Error('OAuth window closed'));
          }
        } catch {}
      }, 500);

      // Listen for message from popup
      window.addEventListener('message', function listener(event) {
        if (event.origin !== API_BASE_URL) return;
        const { success, token, error } = event.data;
        if (success) {
          localStorage.setItem('token', token);
          resolve(token);
        } else {
          reject(new Error(error || 'OAuth login failed'));
        }
        window.removeEventListener('message', listener);
        popup.close();
        clearInterval(timer);
      });
    });
  } catch (err) {
    console.error('OAuth login error:', err);
    throw err;
  }
};

// ----------------------
// Server Health Check
// ----------------------
export const checkServerHealth = async () => {
  try {
    const res = await handleRequest(() => api.get(API_ENDPOINTS.HEALTH));
    return res?.status === 'ok' || res?.healthy || true;
  } catch (e) {
    console.error('Server health check failed:', e);
    return false;
  }
};

export default api;
