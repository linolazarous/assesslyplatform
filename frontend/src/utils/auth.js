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

/* ===============================
   Axios Instance
================================ */
const api = axios.create({
  baseURL: config.API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/* ===============================
   Request Interceptor
================================ */
api.interceptors.request.use(
  (requestConfig) => {
    const token = getAuthToken();
    const sessionId = getSessionId();

    if (token) {
      requestConfig.headers.Authorization = `Bearer ${token}`;
    }

    if (sessionId) {
      requestConfig.headers['X-Session-ID'] = sessionId;
    }

    return requestConfig;
  },
  (error) => Promise.reject(error)
);

/* ===============================
   Response Interceptor
================================ */
api.interceptors.response.use(
  (response) => {
    if (response?.data?.session_id) {
      setSessionId(response.data.session_id);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error?.config;

    try {
      // Handle expired access token
      if (
        error?.response?.status === 401 &&
        originalRequest &&
        !originalRequest._retry
      ) {
        originalRequest._retry = true;

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
      }

      // Handle API errors (NO redirects here)
      if (error.response) {
        const { status, data } = error.response;

        if (
          status === 403 &&
          data?.detail?.includes('Two-factor authentication required')
        ) {
          return Promise.reject({
            ...error,
            requires2FA: true,
          });
        }
      }

      return Promise.reject(error);
    } catch (refreshError) {
      clearAuthData();
      clearSessionId();

      return Promise.reject({
        ...refreshError,
        isAuthExpired: true,
      });
    }
  }
);

/* ===============================
   Auth API Helpers
================================ */

export const login = async (email, password) => {
  try {
    const result = await apiUtils.handle2FALogin({ email, password });

    if (result?.session_id) {
      setSessionId(result.session_id);
    }

    return result;
  } catch (error) {
    const authError = new Error(
      error?.response?.data?.detail || 'Login failed'
    );
    authError.isAuthError = true;
    authError.status = error?.response?.status;
    throw authError;
  }
};

export const loginWith2FA = async (token, tempToken) => {
  const originalToken = getAuthToken();
  try {
    setAuthToken(tempToken);
    const result = await authAPI.verify2FALogin(token);

    if (result?.session_id) {
      setSessionId(result.session_id);
    }

    return result;
  } catch (error) {
    setAuthToken(originalToken);
    const authError = new Error(
      error?.response?.data?.detail || '2FA verification failed'
    );
    authError.is2FAError = true;
    throw authError;
  }
};

export const logout = async () => {
  try {
    const sessionId = getSessionId();
    await authAPI.logout(sessionId);
  } catch (_) {
    // ignore backend logout failure
  } finally {
    clearAuthData();
    clearSessionId();
  }
  return { success: true };
};

export const getCurrentUser = async () => {
  try {
    return await authAPI.getCurrentUser();
  } catch (error) {
    if (error?.response?.status === 401) return null;
    throw error;
  }
};

export const refreshToken = async () => {
  try {
    return await authAPI.refreshToken();
  } catch (error) {
    clearAuthData();
    clearSessionId();
    throw error;
  }
};

export const checkAuth = () => isAuthenticated();

/* ===============================
   Utilities
================================ */

export const getAuthHeaders = (extra = {}) => {
  const headers = { ...extra };
  const token = getAuthToken();
  const sessionId = getSessionId();

  if (token) headers.Authorization = `Bearer ${token}`;
  if (sessionId) headers['X-Session-ID'] = sessionId;

  return headers;
};

/* ===============================
   Exports
================================ */

export {
  isAuthenticated,
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
  clearSessionId,
};

export default api;
