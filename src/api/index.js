// src/api/index.js
// Production-ready API client for Assessly Frontend
// Exports: default api, TokenManager, apiEvents, trackError, setAuthToken, AuthAPI, UsersAPI

import axios from 'axios';

/* -----------------------
   Base URL selection
   ----------------------- */
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD
    ? 'https://assessly-gedp.onrender.com'
    : 'http://localhost:5000');

export const API_PREFIX = import.meta.env.VITE_API_PREFIX || ''; // e.g. '/api/v1' if needed
export const API_ROOT = `${API_BASE_URL}${API_PREFIX}`.replace(/\/+$/, ''); // no trailing slash

/* -----------------------
   Axios instance
   ----------------------- */
const api = axios.create({
  baseURL: API_ROOT,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: import.meta.env.PROD ? 15000 : 30000,
});

/* -----------------------
   Lightweight Event Emitter
   ----------------------- */
const createEventEmitter = () => {
  const map = new Map();
  return {
    on(event, cb) {
      if (!map.has(event)) map.set(event, new Set());
      map.get(event).add(cb);
      return () => this.off(event, cb);
    },
    off(event, cb) {
      if (!map.has(event)) return;
      map.get(event).delete(cb);
    },
    emit(event, payload) {
      if (!map.has(event)) return;
      for (const cb of Array.from(map.get(event))) {
        try { cb(payload); } catch (e) { console.error('Event listener error', e); }
      }
    },
    removeAll(event) {
      if (event) map.delete(event);
      else map.clear();
    }
  };
};

export const apiEvents = createEventEmitter();

/* -----------------------
   TokenManager - small, reliable
   ----------------------- */
const TOKEN_KEY = 'assessly_token';
const REFRESH_KEY = 'assessly_refresh';
const USER_KEY = 'assessly_user';

export const TokenManager = {
  getToken() {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  },
  setToken(token) {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
      // keep axios default header in sync
      if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`;
      else delete api.defaults.headers.common.Authorization;
      return true;
    } catch (e) { console.warn('TokenManager.setToken error', e); return false; }
  },
  getRefreshToken() {
    try { return localStorage.getItem(REFRESH_KEY); } catch { return null; }
  },
  setRefreshToken(t) {
    try { if (t) localStorage.setItem(REFRESH_KEY, t); else localStorage.removeItem(REFRESH_KEY); return true; }
    catch (e) { console.warn(e); return false; }
  },
  getUser() {
    try {
      const v = localStorage.getItem(USER_KEY);
      return v ? JSON.parse(v) : null;
    } catch { return null; }
  },
  setUser(u) {
    try { if (u) localStorage.setItem(USER_KEY, JSON.stringify(u)); else localStorage.removeItem(USER_KEY); return true; }
    catch (e) { console.warn(e); return false; }
  },
  clearAll() {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_KEY);
      localStorage.removeItem(USER_KEY);
      delete api.defaults.headers.common.Authorization;
      return true;
    } catch (e) { console.warn('TokenManager.clearAll', e); return false; }
  }
};

/* Ensure axios header matches any stored token at startup */
if (typeof window !== 'undefined') {
  const existing = TokenManager.getToken();
  if (existing) api.defaults.headers.common.Authorization = `Bearer ${existing}`;
}

/* Helper to set auth token programmatically */
export const setAuthToken = (token) => TokenManager.setToken(token);

/* -----------------------
   trackError: safe error tracking
   - logs to console
   - attempts backend POST to /errors/log (non-blocking)
   - emits apiEvents 'error:tracked'
   ----------------------- */
export const trackError = (error, context = {}) => {
  try {
    const payload = {
      timestamp: new Date().toISOString(),
      message: typeof error === 'string' ? error : (error?.message || 'Unknown error'),
      stack: error?.stack || null,
      status: error?.status || null,
      code: error?.code || null,
      url: (typeof window !== 'undefined' && window.location && window.location.href) || null,
      user: TokenManager.getUser()?.id || null,
      ...context,
    };

    // Console + event
    console.error('Tracked Error:', payload);
    apiEvents.emit('error:tracked', payload);

    // Try to report to backend but never block (fire-and-forget)
    if (typeof fetch !== 'undefined') {
      fetch(`${API_ROOT}/errors/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => { /* swallow */ });
    }
  } catch (e) {
    // never throw from tracking
    console.error('trackError failure', e);
  }
};

/* -----------------------
   Global response interceptor
   - normalizes errors
   - handles 401 by clearing tokens and emitting event
   ----------------------- */
api.interceptors.response.use(
  (res) => res,
  (err) => {
    // Network error (no response)
    if (!err.response) {
      const netErr = { message: 'Network error', code: 'NETWORK_ERROR', original: err };
      apiEvents.emit('request:error', netErr);
      trackError(netErr, { phase: 'response' });
      return Promise.reject(netErr);
    }

    const status = err.response.status;
    const data = err.response.data || {};

    const normalized = {
      message: data.message || data.error || err.message || 'Server error',
      status,
      code: data.code || err.code || null,
      details: data,
    };

    // 401 -> clear tokens and emit
    if (status === 401) {
      TokenManager.clearAll();
      apiEvents.emit('auth:unauthorized', normalized);
    }

    // emit & track
    apiEvents.emit('request:error', normalized);
    trackError(normalized, { phase: 'response' });

    return Promise.reject(normalized);
  }
);

/* -----------------------
   Simple Auth & API helpers
   Keep these small — adapt endpoints if your backend is prefixed with /api/v1
   ----------------------- */
export const AuthAPI = {
  login: (payload) => api.post('/auth/login', payload),
  register: (payload) => api.post('/auth/register', payload),
  me: () => api.get('/auth/me'),
  logout: async () => {
    try {
      // Try server logout if available, but clear locally regardless
      await api.post('/auth/logout').catch(() => {});
    } catch (_) {}
    TokenManager.clearAll();
    return Promise.resolve();
  }
};

export const UsersAPI = {
  list: () => api.get('/users'),
  get: (id) => api.get(`/users/${id}`),
  update: (id, payload) => api.put(`/users/${id}`, payload)
};

/* Export commonly-used utilities so import { TokenManager, apiEvents, trackError } from './api' works */
export {
  api as default,
  TokenManager,
  apiEvents,
  trackError,
  setAuthToken,
  AuthAPI,
  UsersAPI,
};
