// src/api.jsx
import axios from 'axios';

const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl) return envUrl.replace(/\/$/, '');
  const hostname = window.location.hostname;
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
  return isLocal ? 'http://localhost:3000/api' : 'https://assesslyplatform-t49h.onrender.com/api';
};

export const API_BASE_URL = getApiBaseUrl();

const instance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-Client': 'assessly-frontend'
  },
  timeout: 20000,
  withCredentials: false
});

// Request interceptor - attach token when present
instance.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem('token');
    if (token && token.startsWith('eyJ') && token.length > 50) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    config.headers['X-Request-ID'] = `${Date.now()}-${Math.random().toString(36).slice(2,9)}`;
  } catch (err) {
    console.warn('Request interceptor error', err);
  }
  return config;
}, (error) => Promise.reject(error));

// Response interceptor - consistent error shaping & auth handling
instance.interceptors.response.use((res) => res, (err) => {
  const status = err.response?.status || 0;
  const url = err.config?.url;
  const serverMsg = err.response?.data?.message || err.message;

  // Production logging (non-verbose)
  if (import.meta.env.PROD) {
    console.error(`API Error [${status}] ${url} - ${serverMsg}`);
  } else {
    console.error('API Error details:', { status, url, serverMsg, config: err.config });
  }

  // Auth handling
  if (status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    if (!window.location.pathname.startsWith('/auth') && !window.location.pathname.startsWith('/login')) {
      // allow UI to handle redirect; but fallback to login
      window.location.href = '/auth';
    }
  }

  // Normalize error object
  return Promise.reject({
    message: serverMsg || 'Service unavailable',
    status,
    url,
    code: err.code || null
  });
});

// Safe wrapper with simple retry for server errors
export const handleRequest = async (promiseFactory, { retries = 1, delay = 800 } = {}) => {
  try {
    const res = await promiseFactory();
    return res.data ?? res;
  } catch (err) {
    if (retries > 0 && (!err.status || err.status >= 500)) {
      await new Promise(r => setTimeout(r, delay));
      return handleRequest(promiseFactory, { retries: retries - 1, delay: delay * 2 });
    }
    throw err;
  }
};

export default instance;
