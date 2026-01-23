// frontend/src/services/api.js

import axios from "axios";
import config, {
  getAuthToken,
  setAuthToken,
  getRefreshToken,
  setRefreshToken,
  setUser,
  clearAuthData,
  isAuthenticated
} from '../config.js';

// -----------------------------
// BASE CONFIG
// -----------------------------
const api = axios.create({
  baseURL: config.API_BASE_URL, // Should be: https://assesslyplatform-pfm1.onrender.com
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

// Automatically add auth token if exists
api.interceptors.request.use((requestConfig) => {
  const token = getAuthToken();
  if (token) {
    requestConfig.headers.Authorization = `Bearer ${token}`; // Fixed: Added backticks
  }
  return requestConfig;
});

// Handle token refresh on 401 responses
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized (token expired)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Try to refresh token
        const refreshToken = getRefreshToken();
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        const response = await api.post('/api/auth/refresh', {
          refresh_token: refreshToken
        });

        const { access_token, refresh_token } = response.data;

        // Update tokens
        setAuthToken(access_token);
        if (refresh_token) setRefreshToken(refresh_token);

        // Update original request header
        originalRequest.headers.Authorization = `Bearer ${access_token}`;

        // Retry original request
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, logout user
        clearAuthData();
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login?session=expired';
        }
        return Promise.reject(refreshError);
      }
    }

    // Handle other errors
    if (error.response?.status === 403) {
      console.error('Access forbidden:', error.response.data);
    }

    if (error.response?.status === 404) {
      console.error('Resource not found:', error.response.config.url);
    }

    if (error.response?.status === 422) {
      console.warn('Validation error:', error.response.data);
    }

    if (error.response?.status === 500) {
      console.error('Server error:', error.response.data);
    }

    // Handle network errors
    if (error.code === 'ECONNABORTED') {
      console.error('Request timeout:', error.config.url);
    }

    if (!error.response) {
      console.error('Network error:', error.message);
    }

    return Promise.reject(error);
  }
);

// -----------------------------
// AUTH APIs - CORRECT ENDPOINTS
// -----------------------------
export const authAPI = {
  register: async (userData) => {
    try {
      const { data } = await api.post('/api/auth/register', userData);
      if (data.access_token) {
        setAuthToken(data.access_token);
        if (data.refresh_token) setRefreshToken(data.refresh_token);
        if (data.user) setUser(data.user);
      }
      return data;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  },

  login: async (credentials) => {
    try {
      const { data } = await api.post('/api/auth/login', credentials);
      if (data.access_token) {
        setAuthToken(data.access_token);
        if (data.refresh_token) setRefreshToken(data.refresh_token);
        if (data.user) setUser(data.user);
      }
      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  getCurrentUser: async () => {
    try {
      const { data } = await api.get('/api/auth/me');
      if (data) setUser(data);
      return data;
    } catch (error) {
      console.error('Get current user error:', error);
      if (error.response?.status === 401) {
        return { user: null, error: 'Unauthorized' };
      }
      throw error;
    }
  },

  refreshToken: async () => {
    try {
      const refreshToken = getRefreshToken();
      if (!refreshToken) throw new Error('No refresh token');
      
      const { data } = await api.post('/api/auth/refresh', {
        refresh_token: refreshToken
      });
      
      if (data.access_token) {
        setAuthToken(data.access_token);
        if (data.refresh_token) setRefreshToken(data.refresh_token);
      }
      
      return data;
    } catch (error) {
      console.error('Refresh token error:', error);
      throw error;
    }
  },

  logout: async () => {
    try {
      await api.post('/api/auth/logout');
    } catch (error) {
      console.log('Backend logout endpoint not available');
    } finally {
      clearAuthData();
      return { success: true, message: "Logged out successfully" };
    }
  },

  // Social auth endpoints - match your backend
  googleAuth: async () => {
    window.location.href = `${config.API_BASE_URL}/api/auth/google`;
  },

  githubAuth: async () => {
    window.location.href = `${config.API_BASE_URL}/api/auth/github`;
  },

  // These endpoints may not exist yet
  verifyEmail: async (token) => {
    try {
      const { data } = await api.post('/api/auth/verify-email', { token });
      return data;
    } catch (error) {
      console.error('Email verification error:', error);
      throw error;
    }
  },

  forgotPassword: async (email) => {
    try {
      const { data } = await api.post('/api/auth/forgot-password', { email });
      return data;
    } catch (error) {
      console.error('Forgot password error:', error);
      throw error;
    }
  },

  resetPassword: async (token, newPassword) => {
    try {
      const { data } = await api.post('/api/auth/reset-password', {
        token,
        new_password: newPassword
      });
      return data;
    } catch (error) {
      console.error('Reset password error:', error);
      throw error;
    }
  },
};

// -----------------------------
// CONTACT FORM APIs
// -----------------------------
export const contactAPI = {
  submitContactForm: async (formData) => {
    try {
      const { data } = await api.post('/api/contact', formData);
      return data;
    } catch (error) {
      console.error('Submit contact form error:', error);
      throw error;
    }
  },
};

// -----------------------------
// DEMO REQUEST APIs
// -----------------------------
export const demoAPI = {
  submitDemoRequest: async (formData) => {
    try {
      const { data } = await api.post('/api/demo', formData);
      return data;
    } catch (error) {
      console.error('Submit demo request error:', error);
      throw error;
    }
  },
};

// -----------------------------
// SUBSCRIPTION APIs
// -----------------------------
export const subscriptionAPI = {
  createCheckoutSession: async (planId) => {
    try {
      const { data } = await api.post('/api/subscriptions/checkout', { plan_id: planId });
      return data;
    } catch (error) {
      console.error('Create checkout session error:', error);
      throw error;
    }
  },

  getCurrentSubscription: async () => {
    try {
      const { data } = await api.get('/api/subscriptions/me');
      return data;
    } catch (error) {
      console.error('Get current subscription error:', error);
      throw error;
    }
  },

  cancelSubscription: async () => {
    try {
      const { data } = await api.post('/api/subscriptions/cancel');
      return data;
    } catch (error) {
      console.error('Cancel subscription error:', error);
      throw error;
    }
  },

  getAvailablePlans: async () => {
    try {
      const { data } = await api.get('/api/plans');
      return data;
    } catch (error) {
      console.error('Get available plans error:', error);
      throw error;
    }
  },
};

// -----------------------------
// ORGANIZATION APIs
// -----------------------------
export const organizationAPI = {
  getCurrent: async () => {
    try {
      const { data } = await api.get('/api/organizations/me');
      return data;
    } catch (error) {
      console.error('Get organization error:', error);
      throw error;
    }
  },

  update: async (payload) => {
    try {
      const { data } = await api.put('/api/organizations/me', payload);
      return data;
    } catch (error) {
      console.error('Update organization error:', error);
      throw error;
    }
  },
};

// -----------------------------
// ASSESSMENT APIs
// -----------------------------
export const assessmentAPI = {
  create: async (payload) => {
    try {
      const { data } = await api.post('/api/assessments', payload);
      return data;
    } catch (error) {
      console.error('Create assessment error:', error);
      throw error;
    }
  },

  getAll: async (params = {}) => {
    try {
      const { data } = await api.get('/api/assessments', { params });
      return data;
    } catch (error) {
      console.error('Get all assessments error:', error);
      throw error;
    }
  },

  getById: async (id) => {
    try {
      const { data } = await api.get(`/api/assessments/${id}`);
      return data;
    } catch (error) {
      console.error('Get assessment by ID error:', error);
      throw error;
    }
  },

  update: async (id, payload) => {
    try {
      const { data } = await api.put(`/api/assessments/${id}`, payload);
      return data;
    } catch (error) {
      console.error('Update assessment error:', error);
      throw error;
    }
  },

  delete: async (id) => {
    try {
      const { data } = await api.delete(`/api/assessments/${id}`);
      return data;
    } catch (error) {
      console.error('Delete assessment error:', error);
      throw error;
    }
  },

  getQuestions: async (assessmentId) => {
    try {
      const { data } = await api.get(`/api/assessments/${assessmentId}/questions`);
      return data;
    } catch (error) {
      console.error('Get assessment questions error:', error);
      throw error;
    }
  },

  addQuestion: async (assessmentId, question) => {
    try {
      const { data } = await api.post(`/api/assessments/${assessmentId}/questions`, question);
      return data;
    } catch (error) {
      console.error('Add assessment question error:', error);
      throw error;
    }
  },

  updateQuestion: async (assessmentId, questionId, question) => {
    try {
      const { data } = await api.put(`/api/assessments/${assessmentId}/questions/${questionId}`, question);
      return data;
    } catch (error) {
      console.error('Update assessment question error:', error);
      throw error;
    }
  },

  getSettings: async (assessmentId) => {
    try {
      const { data } = await api.get(`/api/assessments/${assessmentId}/settings`);
      return data;
    } catch (error) {
      console.error('Get assessment settings error:', error);
      throw error;
    }
  },

  updateSettings: async (assessmentId, settings) => {
    try {
      const { data } = await api.put(`/api/assessments/${assessmentId}/settings`, settings);
      return data;
    } catch (error) {
      console.error('Update assessment settings error:', error);
      throw error;
    }
  },
};

// -----------------------------
// CANDIDATE APIs
// -----------------------------
export const candidateAPI = {
  create: async (payload) => {
    try {
      const { data } = await api.post('/api/candidates', payload);
      return data;
    } catch (error) {
      console.error('Create candidate error:', error);
      throw error;
    }
  },

  getAll: async (params = {}) => {
    try {
      const { data } = await api.get('/api/candidates', { params });
      return data;
    } catch (error) {
      console.error('Get all candidates error:', error);
      throw error;
    }
  },

  getById: async (id) => {
    try {
      const { data } = await api.get(`/api/candidates/${id}`);
      return data;
    } catch (error) {
      console.error('Get candidate by ID error:', error);
      throw error;
    }
  },
};

// -----------------------------
// USER PROFILE APIs
// -----------------------------
export const userAPI = {
  updateProfile: async (payload) => {
    try {
      const { data } = await api.put('/api/users/me', payload);
      if (data) {
        setUser(data);
      }
      return data;
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  },
};

// -----------------------------
// DASHBOARD APIs
// -----------------------------
export const dashboardAPI = {
  getStats: async () => {
    try {
      const { data } = await api.get('/api/dashboard/stats');
      return data;
    } catch (error) {
      if (error.response?.status === 404) {
        return {
          assessments: { total: 0, published: 0, draft: 0 },
          candidates: { total: 0, invited: 0, completed: 0 },
          completion_rate: 0,
          average_score: 0,
          recent_assessments: [],
          recent_candidates: []
        };
      }
      console.error('Get dashboard stats error:', error);
      throw error;
    }
  },
};

// -----------------------------
// UTILITY FUNCTIONS
// -----------------------------
export const apiUtils = {
  isAuthenticated: isAuthenticated,

  getCurrentUser: () => {
    const userStr = localStorage.getItem(config.AUTH.USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  },

  clearAuthData: clearAuthData,

  setAuthData: (token, user, refreshToken = null) => {
    setAuthToken(token);
    if (refreshToken) setRefreshToken(refreshToken);
    if (user) setUser(user);
  },

  getBaseURL: () => config.API_BASE_URL,

  getConfig: () => config,

  call: async (method, endpoint, data = null, config = {}) => {
    try {
      const response = await api({
        method,
        url: endpoint,
        data,
        ...config
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

// Export all APIs
export default api;
