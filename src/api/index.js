// src/api/index.js
import axios from 'axios';

/* -----------------------
   Base URL Resolution (Render Safe)
   ----------------------- */
export const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;

  if (envUrl) return envUrl.replace(/\/+$/, '');

  if (import.meta.env.PROD) {
    return 'https://assesslyplatform-t49h.onrender.com/api/v1';
  }

  return 'http://localhost:5000/api/v1';
};

export const API_BASE_URL = getApiBaseUrl();

/* -----------------------
   Axios Instance
   ----------------------- */
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: import.meta.env.PROD ? 15000 : 30000,
  withCredentials: true,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'X-Client-Version': '1.0.0',
    'X-Client-Platform': 'web',
  }
});

/* -----------------------
   Token Storage + JWT Decode
   ----------------------- */
const TOKEN_KEYS = {
  TOKEN: 'assessly_token',
  REFRESH: 'assessly_refresh',
  USER: 'assessly_user',
  ORG: 'assessly_org',
  EXPIRES: 'assessly_exp',
  TENANT: 'assessly_tenant'
};

const decodeJwt = (token) => {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;

    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
};

const isTokenValid = (token) => {
  const decoded = decodeJwt(token);
  if (!decoded?.exp) return false;
  return Date.now() < decoded.exp * 1000;
};

export const TokenManager = {
  getToken: () => localStorage.getItem(TOKEN_KEYS.TOKEN) || null,
  getRefresh: () => localStorage.getItem(TOKEN_KEYS.REFRESH) || null,

  setTokens(token, refreshToken) {
    if (token) localStorage.setItem(TOKEN_KEYS.TOKEN, token);
    if (refreshToken) localStorage.setItem(TOKEN_KEYS.REFRESH, refreshToken);
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  },

  clearAll() {
    Object.values(TOKEN_KEYS).forEach((k) => localStorage.removeItem(k));
    delete api.defaults.headers.common.Authorization;
  },

  isExpired() {
    const token = this.getToken();
    return !token || !isTokenValid(token);
  }
};

/* -----------------------
   Request Interceptor
   ----------------------- */
api.interceptors.request.use((config) => {
  const token = TokenManager.getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/* -----------------------
   Response Interceptor (Refresh Fix)
   ----------------------- */
let refreshing = false;
let retryQueue = [];

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      const refreshToken = TokenManager.getRefresh();

      if (!refreshToken) {
        TokenManager.clearAll();
        window.location.href = '/auth/login?session=expired';
        return Promise.reject(error);
      }

      if (refreshing) {
        return new Promise((resolve) => retryQueue.push(resolve));
      }

      original._retry = true;
      refreshing = true;

      try {
        const r = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken
        });

        const newToken = r.data.token;
        const newRefresh = r.data.refreshToken;

        TokenManager.setTokens(newToken, newRefresh);

        retryQueue.forEach((cb) => cb(api(original)));
        retryQueue = [];
        refreshing = false;

        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch (e) {
        refreshing = false;
        retryQueue = [];
        TokenManager.clearAll();
        window.location.href = '/auth/login?session=expired';
        return Promise.reject(e);
      }
    }

    return Promise.reject(error);
  }
);

/* -----------------------
   API ENDPOINTS
   ----------------------- */
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    ME: '/auth/me',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
  }
};

export default api;
