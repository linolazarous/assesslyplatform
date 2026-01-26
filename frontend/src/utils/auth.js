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
  isAuthenticated,
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
/* Response interceptor (SAFE, NO REDIRECTS) */
/* ------------------------------------------------------------------ */

api.interceptors.response.use(
  (response) => {
    if (response.data?.session_id) {
      setSessionId(response.data.session_id);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle expired access token
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
  return apiUtils.handle2FALogin({ email, password });
};

export const register = async (userData) => {
  return authAPI.register(userData);
};

export const logout = async () => {
  try {
    await authAPI.logout(getSessionId());
  } catch (_) {
    // ignore
  } finally {
    clearAuthData();
    clearSessionId();
  }
  return { success: true };
};

export const refreshToken = async () => {
  const result = await authAPI.refreshToken();
  setAuthToken(result.access_token);
  if (result.refresh_token) {
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
  if (!isAuthenticated()) return false;

  const token = getAuthToken();
  if (isTokenExpired(token)) {
    await refreshToken();
  }
  return true;
};

/* ------------------------------------------------------------------ */
/* UTILITIES */
/* ------------------------------------------------------------------ */

export const checkAuth = () => isAuthenticated();

export const getAuthHeaders = () => {
  const headers = { 'Content-Type': 'application/json' };
  const token = getAuthToken();
  const sessionId = getSessionId();

  if (token) headers.Authorization = `Bearer ${token}`;
  if (sessionId) headers['X-Session-ID'] = sessionId;

  return headers;
};

/* ------------------------------------------------------------------ */
/* EXPORTS */
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

export default api;
