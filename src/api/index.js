// src/api/index.js
import axios from 'axios';

/* =====================================================
   BASE URL
===================================================== */

export const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl) return envUrl.replace(/\/+$/, '');

  return import.meta.env.PROD
    ? 'https://assesslyplatform-t49h.onrender.com/api/v1'
    : 'http://localhost:5000/api/v1';
};

export const API_BASE_URL = getApiBaseUrl();

/* =====================================================
   API ENDPOINTS
===================================================== */

export const API_ENDPOINTS = Object.freeze({
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    PROFILE: '/auth/profile'
  },
  PRICING: {
    LIST: '/pricing',
    DETAIL: (id) => `/pricing/${id}`
  }
});

/* =====================================================
   EVENT EMITTER (SAFE)
===================================================== */

export const apiEvents = {
  _events: Object.create(null),

  on(event, cb) {
    (this._events[event] ||= []).push(cb);
  },

  off(event, cb) {
    this._events[event] =
      (this._events[event] || []).filter(fn => fn !== cb);
  },

  emit(event, payload) {
    (this._events[event] || []).forEach(cb => {
      try {
        cb(payload);
      } catch (e) {
        console.error(`apiEvents error [${event}]`, e);
      }
    });
  }
};

/* =====================================================
   ERROR TRACKING (🔥 REQUIRED BY APP)
===================================================== */

export const trackError = (error, context = {}) => {
  const payload = {
    message: error?.message || 'Unknown error',
    stack: import.meta.env.DEV ? error?.stack : undefined,
    context,
    url: typeof window !== 'undefined' ? window.location.href : '',
    timestamp: new Date().toISOString()
  };

  if (import.meta.env.DEV) {
    console.error('[Tracked Error]', payload);
  }

  if (
    import.meta.env.PROD &&
    typeof window !== 'undefined' &&
    window.gtag
  ) {
    window.gtag('event', 'exception', {
      description: payload.message,
      fatal: false
    });
  }

  return payload;
};

/* =====================================================
   RESPONSE VALIDATION
===================================================== */

export const validateResponse = (response) => {
  if (!response) {
    throw new Error('Empty API response');
  }

  if (response.status >= 400) {
    throw new Error(
      response.data?.message || 'API request failed'
    );
  }

  return response.data;
};

/* =====================================================
   RETRY WITH BACKOFF
===================================================== */

export const retryWithBackoff = async (
  fn,
  retries = 3,
  delay = 500
) => {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) throw error;

    await new Promise(res =>
      setTimeout(res, delay)
    );

    return retryWithBackoff(
      fn,
      retries - 1,
      delay * 2
    );
  }
};

/* =====================================================
   AXIOS INSTANCE
===================================================== */

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: import.meta.env.PROD ? 15000 : 30000,
  withCredentials: true,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'X-Client-Version': '1.0.0',
    'X-Client-Platform': 'web'
  }
});

/* =====================================================
   TOKEN MANAGER
===================================================== */

const TOKEN_KEYS = {
  ACCESS: 'assessly_token',
  REFRESH: 'assessly_refresh'
};

export const TokenManager = {
  getToken() {
    try {
      return localStorage.getItem(TOKEN_KEYS.ACCESS);
    } catch {
      return null;
    }
  },

  getRefresh() {
    try {
      return localStorage.getItem(TOKEN_KEYS.REFRESH);
    } catch {
      return null;
    }
  },

  setTokens(token, refresh) {
    try {
      if (token) {
        localStorage.setItem(TOKEN_KEYS.ACCESS, token);
        api.defaults.headers.common.Authorization = `Bearer ${token}`;
      }
      if (refresh) {
        localStorage.setItem(TOKEN_KEYS.REFRESH, refresh);
      }
    } catch (e) {
      console.error('Token storage error', e);
    }
  },

  clearAll() {
    Object.values(TOKEN_KEYS).forEach(k => {
      try {
        localStorage.removeItem(k);
      } catch {}
    });
    delete api.defaults.headers.common.Authorization;
  }
};

/* =====================================================
   INTERCEPTORS
===================================================== */

api.interceptors.request.use(
  (config) => {
    const token = TokenManager.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    apiEvents.emit('request:start', {
      url: config.url,
      method: config.method
    });

    return config;
  },
  (error) => {
    apiEvents.emit('request:error', error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    apiEvents.emit('request:success', {
      url: response.config?.url,
      status: response.status
    });
    return response;
  },
  (error) => {
    apiEvents.emit('request:error', error);
    trackError(error);
    return Promise.reject(error);
  }
);

/* =====================================================
   EXPORTS
===================================================== */

// Export axios alias for compatibility
export { api as axios };

// Export everything - api is already exported above as a named export
export default api;
