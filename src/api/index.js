// src/api/index.js
// Production-ready API client for Assessly Frontend
// Fixed for production deployment

import axios from 'axios';

/* -----------------------
   Base URL Configuration
   ----------------------- */
export const getApiBaseUrl = () => {
  // FIXED: Use proper environment variable access
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  const isProd = import.meta.env.PROD === true || import.meta.env.MODE === 'production';
  const isDev = import.meta.env.DEV === true || import.meta.env.MODE === 'development';
  
  // Production defaults
  if (isProd) {
    return envUrl || 'https://assesslyplatform-t49h.onrender.com/api/v1';
  }
  
  // Development - if URL provided, use it
  if (envUrl) {
    return envUrl.replace(/\/+$/, '');
  }
  
  // Local development fallback
  if (isDev) {
    return 'http://localhost:10000/api/v1';
  }
  
  // Default fallback
  return 'https://assesslyplatform-t49h.onrender.com/api/v1';
};

export const API_BASE_URL = getApiBaseUrl();

/* -----------------------
   Axios Instance (FIXED: use simpler timeout logic)
   ----------------------- */
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-Client-Version': '1.0.0',
    'X-Client-Platform': 'web',
  },
  timeout: 15000, // Fixed value, no conditional
  withCredentials: true,
});

/* -----------------------
   Token Management (SIMPLIFIED - remove complex JWT logic)
   ----------------------- */
const TOKEN_STORAGE_KEYS = {
  TOKEN: 'assessly_token',
  REFRESH_TOKEN: 'assessly_refresh_token',
  USER: 'assessly_user',
  ORGANIZATION: 'assessly_organization',
};

export const TokenManager = {
  getToken() {
    try { 
      return localStorage.getItem(TOKEN_STORAGE_KEYS.TOKEN); 
    } catch { 
      return null; 
    }
  },
  
  setToken(token) {
    try { 
      if (token) {
        localStorage.setItem(TOKEN_STORAGE_KEYS.TOKEN, token);
        api.defaults.headers.common.Authorization = `Bearer ${token}`;
      } else {
        localStorage.removeItem(TOKEN_STORAGE_KEYS.TOKEN);
        delete api.defaults.headers.common.Authorization;
      }
      return true;
    } catch (e) { 
      console.warn('TokenManager.setToken error', e); 
      return false; 
    }
  },
  
  getUser() {
    try {
      const v = localStorage.getItem(TOKEN_STORAGE_KEYS.USER);
      return v ? JSON.parse(v) : null;
    } catch { 
      return null; 
    }
  },
  
  setUser(user) {
    try { 
      if (user) {
        localStorage.setItem(TOKEN_STORAGE_KEYS.USER, JSON.stringify(user));
      } else {
        localStorage.removeItem(TOKEN_STORAGE_KEYS.USER);
      }
      return true;
    } catch (e) { 
      console.warn('TokenManager.setUser error', e); 
      return false; 
    }
  },
  
  clearAll() {
    try {
      Object.values(TOKEN_STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
      delete api.defaults.headers.common.Authorization;
      return true;
    } catch (e) { 
      console.warn('TokenManager.clearAll error', e); 
      return false; 
    }
  },
};

/* -----------------------
   Request Interceptor (SIMPLIFIED)
   ----------------------- */
api.interceptors.request.use(
  (config) => {
    // Add Authorization header if token exists
    const token = TokenManager.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

/* -----------------------
   Response Interceptor (FIXED: remove complex refresh logic that can cause loops)
   ----------------------- */
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    // Simplified error handling
    if (error.response?.status === 401) {
      TokenManager.clearAll();
      // Don't redirect here - let components handle it
    }
    
    return Promise.reject(error);
  }
);

/* -----------------------
   API Service Functions (SIMPLIFIED - only essential ones)
   ----------------------- */
export const AuthAPI = {
  login: (payload) => api.post('/auth/login', payload),
  register: (payload) => api.post('/auth/register', payload),
  logout: async () => {
    TokenManager.clearAll();
    return Promise.resolve();
  },
};

export const HealthAPI = {
  check: () => api.get('/health'),
};

// Initialize auth header from storage
if (typeof window !== 'undefined') {
  const existingToken = TokenManager.getToken();
  if (existingToken) {
    api.defaults.headers.common.Authorization = `Bearer ${existingToken}`;
  }
}

export default api;
