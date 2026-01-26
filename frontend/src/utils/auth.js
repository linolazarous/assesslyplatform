// frontend/src/utils/auth.js
import axios from 'axios';
import { authAPI, apiUtils } from '../services/api';
import config, {
  getAuthToken,
  setAuthToken,
  getRefreshToken,
  setRefreshToken,
  setUser,
  getUser,
  clearAuthData,
  isAuthenticated as _isAuthenticated,
  decodeToken,
  isTokenExpired,
  getTokenLifetime,
  setSessionId,
  getSessionId,
  clearSessionId
} from '../config.js';

/* ------------------------------------------------------------------ */
/* Axios instance */
/* ------------------------------------------------------------------ */

const api = axios.create({
  baseURL: config.API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000
});

/* ------------------------------------------------------------------ */
/* Request interceptor */
/* ------------------------------------------------------------------ */

api.interceptors.request.use(
  (req) => {
    const token = getAuthToken();
    const sessionId = getSessionId();

    if (token) {
      req.headers.Authorization = `Bearer ${token}`;
    }

    if (sessionId) {
      req.headers['X-Session-ID'] = sessionId;
    }

    return req;
  },
  (error) => Promise.reject(error)
);

/* ------------------------------------------------------------------ */
/* Response interceptor (NO redirects here) */
/* ------------------------------------------------------------------ */

api.interceptors.response.use(
  (response) => {
    if (response?.data?.session_id) {
      setSessionId(response.data.session_id);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest?._retry) {
      originalRequest._retry = true;

      try {
        const result = await authAPI.refreshToken();

        if (result?.access_token) {
          setAuthToken(result.access_token);
          if (result.refresh_token) {
            setRefreshToken(result.refresh_token);
          }

          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${result.access_token}`;

          return api(originalRequest);
        }
      } catch (refreshError) {
        clearAuthData();
        clearSessionId();

        return Promise.reject({
          ...refreshError,
          isAuthExpired: true
        });
      }
    }

    return Promise.reject(error);
  }
);

/* ------------------------------------------------------------------ */
/* AUTH ACTIONS */
/* ------------------------------------------------------------------ */

export const login = async (email, password) => {
  const result = await apiUtils.handle2FALogin({ email, password });

  if (result?.session_id) {
    setSessionId(result.session_id);
  }

  return result;
};

export const register = async (userData) => {
  const result = await authAPI.register(userData);

  if (result?.session_id) {
    setSessionId(result.session_id);
  }

  return result;
};

export const logout = async () => {
  try {
    await authAPI.logout(getSessionId());
  } catch (_) {
    // ignore backend logout errors
  } finally {
    clearAuthData();
    clearSessionId();
  }

  return { success: true };
};

export const refreshToken = async () => {
  const result = await authAPI.refreshToken();

  if (result?.access_token) {
    setAuthToken(result.access_token);
  }

  if (result?.refresh_token) {
    setRefreshToken(result.refresh_token);
  }

  return result;
};

/* ------------------------------------------------------------------ */
/* USER & SESSION */
/* ------------------------------------------------------------------ */

export const getCurrentUser = async () => {
  try {
    const user = await authAPI.getCurrentUser();
    setUser(user);
    return user;
  } catch (error) {
    if (error.response?.status === 401) {
      return null;
    }
    throw error;
  }
};

export const validateSession = async () => {
  if (!_isAuthenticated()) return false;

  const token = getAuthToken();
  if (isTokenExpired(token)) {
    await refreshToken();
  }

  return true;
};

/* ------------------------------------------------------------------ */
/* UTILITIES (EXPLICIT EXPORTS) */
/* ------------------------------------------------------------------ */

export const isAuthenticated = () => {
  return _isAuthenticated();
};

export const checkAuth = () => {
  return _isAuthenticated();
};

export const getAuthHeaders = () => {
  const headers = { 'Content-Type': 'application/json' };
  const token = getAuthToken();
  const sessionId = getSessionId();

  if (token) headers.Authorization = `Bearer ${token}`;
  if (sessionId) headers['X-Session-ID'] = sessionId;

  return headers;
};

/* ------------------------------------------------------------------ */
/* RE-EXPORT SHARED HELPERS */
/* ------------------------------------------------------------------ */

export {
  clearAuthData,
  getAuthToken,
  setAuthToken,
  getRefreshToken,
  setRefreshToken,
  getUser,
  setUser,
  decodeToken,
  isTokenExpired,
  getTokenLifetime,
  getSessionId,
  setSessionId,
  clearSessionId
};

/* ------------------------------------------------------------------ */
/* DEFAULT EXPORT */
/* ------------------------------------------------------------------ */

export default api;
