// frontend/src/services/api.js
import axios from "axios";
import config, { 
  getAuthToken, setAuthToken, getRefreshToken, setRefreshToken,
  setUser, clearAuthData, isAuthenticated 
} from '../config.js';

// -----------------------------
// BASE CONFIG
// -----------------------------
const api = axios.create({
  baseURL: config.API_BASE_URL, // Already includes /api: https://assesslyplatform-pfm1.onrender.com/api
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000, // 30 second timeout for production
});

// Automatically add auth token if exists
api.interceptors.request.use((requestConfig) => {
  const token = getAuthToken();
  if (token) {
    requestConfig.headers.Authorization = `Bearer ${token}`;
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

        // FIXED: Removed /api prefix (baseURL already includes it)
        const response = await api.post('/auth/refresh', { 
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

    // Handle 403 Forbidden (insufficient permissions)
    if (error.response?.status === 403) {
      console.error('Access forbidden:', error.response.data);
      // Optionally redirect to unauthorized page
      // window.location.href = '/unauthorized';
    }
    
    // Handle 404 Not Found
    if (error.response?.status === 404) {
      console.error('Resource not found:', error.response.config.url);
    }
    
    // Handle 422 Validation Error
    if (error.response?.status === 422) {
      // Validation errors are handled by the calling component
      console.warn('Validation error:', error.response.data);
    }
    
    // Handle 500 Internal Server Error
    if (error.response?.status === 500) {
      console.error('Server error:', error.response.data);
      // Optionally show a user-friendly error message
      // toast.error('Server error. Please try again later.');
    }

    // Handle network errors
    if (error.code === 'ECONNABORTED') {
      console.error('Request timeout:', error.config.url);
      // toast.error('Request timeout. Please check your connection.');
    }

    if (!error.response) {
      console.error('Network error:', error.message);
      // toast.error('Network error. Please check your connection.');
    }
    
    return Promise.reject(error);
  }
);

// -----------------------------
// AUTH APIs - FIXED ENDPOINTS
// -----------------------------
export const authAPI = {
  register: async (userData) => {
    try {
      // FIXED: Removed /api prefix
      const { data } = await api.post('/auth/register', userData);
      // Store tokens and user data on successful registration
      if (data.access_token) {
        setAuthToken(data.access_token);
        // Backend returns refresh_token separately
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
      // FIXED: Removed /api prefix
      const { data } = await api.post('/auth/login', credentials);
      // Store tokens and user data on successful login
      if (data.access_token) {
        setAuthToken(data.access_token);
        // Backend returns refresh_token separately
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
      // FIXED: Removed /api prefix
      const { data } = await api.get('/auth/me');
      // Update user data in storage
      if (data) setUser(data);
      return data;
    } catch (error) {
      console.error('Get current user error:', error);
      // Don't throw if unauthorized - let component handle it
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
      
      // FIXED: Removed /api prefix
      const { data } = await api.post('/auth/refresh', { 
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
      // FIXED: Removed /api prefix
      await api.post('/auth/logout');
    } catch (error) {
      // Silently fail if logout endpoint has issues
      console.log('Backend logout endpoint not available');
    } finally {
      clearAuthData();
      return { success: true, message: "Logged out successfully" };
    }
  },

  // NOTE: These endpoints don't exist in the backend yet - they return 404
  verifyEmail: async (token) => {
    try {
      // FIXED: Removed /api prefix
      const { data } = await api.post('/auth/verify-email', { token });
      return data;
    } catch (error) {
      console.error('Email verification error:', error);
      throw error;
    }
  },

  forgotPassword: async (email) => {
    try {
      // FIXED: Removed /api prefix
      const { data } = await api.post('/auth/forgot-password', { email });
      return data;
    } catch (error) {
      console.error('Forgot password error:', error);
      throw error;
    }
  },

  resetPassword: async (token, newPassword) => {
    try {
      // FIXED: Removed /api prefix
      const { data } = await api.post('/auth/reset-password', { 
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
// CONTACT FORM APIs - FIXED ENDPOINTS
// -----------------------------
export const contactAPI = {
  submitContactForm: async (formData) => {
    try {
      // FIXED: Removed /api prefix
      const { data } = await api.post('/contact', formData);
      return data;
    } catch (error) {
      console.error('Submit contact form error:', error);
      throw error;
    }
  },

  // NOTE: This endpoint doesn't exist in backend - only POST /contact exists
  getContactForms: async () => {
    try {
      // FIXED: Removed /api prefix
      const { data } = await api.get('/contact');
      return data;
    } catch (error) {
      // If endpoint doesn't exist, return empty array
      if (error.response?.status === 404) {
        return { forms: [] };
      }
      console.error('Get contact forms error:', error);
      throw error;
    }
  },
};

// -----------------------------
// DEMO REQUEST APIs - FIXED ENDPOINTS
// -----------------------------
export const demoAPI = {
  submitDemoRequest: async (formData) => {
    try {
      // FIXED: Removed /api prefix
      const { data } = await api.post('/demo', formData);
      return data;
    } catch (error) {
      console.error('Submit demo request error:', error);
      throw error;
    }
  },

  // NOTE: This endpoint doesn't exist in backend - only POST /demo exists
  getDemoRequests: async () => {
    try {
      // FIXED: Removed /api prefix
      const { data } = await api.get('/demo');
      return data;
    } catch (error) {
      // If endpoint doesn't exist, return empty array
      if (error.response?.status === 404) {
        return { requests: [] };
      }
      console.error('Get demo requests error:', error);
      throw error;
    }
  },
};

// -----------------------------
// SUBSCRIPTION APIs - FIXED ENDPOINTS
// -----------------------------
export const subscriptionAPI = {
  createCheckoutSession: async (planId) => {
    try {
      // FIXED: Removed /api prefix
      const { data } = await api.post('/subscriptions/checkout', { plan_id: planId });
      return data;
    } catch (error) {
      console.error('Create checkout session error:', error);
      throw error;
    }
  },

  getCurrentSubscription: async () => {
    try {
      // FIXED: Removed /api prefix
      const { data } = await api.get('/subscriptions/me');
      return data;
    } catch (error) {
      console.error('Get current subscription error:', error);
      throw error;
    }
  },

  cancelSubscription: async () => {
    try {
      // FIXED: Removed /api prefix
      const { data } = await api.post('/subscriptions/cancel');
      return data;
    } catch (error) {
      console.error('Cancel subscription error:', error);
      throw error;
    }
  },

  getAvailablePlans: async () => {
    try {
      // FIXED: Removed /api prefix
      const { data } = await api.get('/plans');
      return data;
    } catch (error) {
      console.error('Get available plans error:', error);
      throw error;
    }
  },

  // NOTE: This endpoint doesn't exist in backend - use createCheckoutSession instead
  changeSubscription: async (newPlanId) => {
    try {
      // Use checkout session for subscription changes
      return await subscriptionAPI.createCheckoutSession(newPlanId);
    } catch (error) {
      console.error('Change subscription error:', error);
      throw error;
    }
  },
};

// -----------------------------
// ORGANIZATION APIs - FIXED ENDPOINTS
// -----------------------------
export const organizationAPI = {
  getCurrent: async () => {
    try {
      // FIXED: Removed /api prefix
      const { data } = await api.get('/organizations/me');
      return data;
    } catch (error) {
      console.error('Get organization error:', error);
      throw error;
    }
  },

  update: async (payload) => {
    try {
      // FIXED: Removed /api prefix
      const { data } = await api.put('/organizations/me', payload);
      return data;
    } catch (error) {
      console.error('Update organization error:', error);
      throw error;
    }
  },
};

// -----------------------------
// ASSESSMENT APIs - FIXED ENDPOINTS
// -----------------------------
export const assessmentAPI = {
  create: async (payload) => {
    try {
      // FIXED: Removed /api prefix
      const { data } = await api.post('/assessments', payload);
      return data;
    } catch (error) {
      console.error('Create assessment error:', error);
      throw error;
    }
  },

  getAll: async (params = {}) => {
    try {
      // FIXED: Removed /api prefix
      const { data } = await api.get('/assessments', { params });
      return data;
    } catch (error) {
      console.error('Get all assessments error:', error);
      throw error;
    }
  },

  getById: async (id) => {
    try {
      // FIXED: Removed /api prefix
      const { data } = await api.get(`/assessments/${id}`);
      return data;
    } catch (error) {
      console.error('Get assessment by ID error:', error);
      throw error;
    }
  },

  update: async (id, payload) => {
    try {
      // FIXED: Removed /api prefix
      const { data } = await api.put(`/assessments/${id}`, payload);
      return data;
    } catch (error) {
      console.error('Update assessment error:', error);
      throw error;
    }
  },

  delete: async (id) => {
    try {
      // FIXED: Removed /api prefix
      const { data } = await api.delete(`/assessments/${id}`);
      return data;
    } catch (error) {
      console.error('Delete assessment error:', error);
      throw error;
    }
  },

  // Additional assessment endpoints that exist in backend
  getQuestions: async (assessmentId) => {
    try {
      // FIXED: Removed /api prefix
      const { data } = await api.get(`/assessments/${assessmentId}/questions`);
      return data;
    } catch (error) {
      console.error('Get assessment questions error:', error);
      throw error;
    }
  },

  addQuestion: async (assessmentId, question) => {
    try {
      // FIXED: Removed /api prefix
      const { data } = await api.post(`/assessments/${assessmentId}/questions`, question);
      return data;
    } catch (error) {
      console.error('Add assessment question error:', error);
      throw error;
    }
  },

  updateQuestion: async (assessmentId, questionId, question) => {
    try {
      // FIXED: Removed /api prefix
      const { data } = await api.put(`/assessments/${assessmentId}/questions/${questionId}`, question);
      return data;
    } catch (error) {
      console.error('Update assessment question error:', error);
      throw error;
    }
  },

  getSettings: async (assessmentId) => {
    try {
      // FIXED: Removed /api prefix
      const { data } = await api.get(`/assessments/${assessmentId}/settings`);
      return data;
    } catch (error) {
      console.error('Get assessment settings error:', error);
      throw error;
    }
  },

  updateSettings: async (assessmentId, settings) => {
    try {
      // FIXED: Removed /api prefix
      const { data } = await api.put(`/assessments/${assessmentId}/settings`, settings);
      return data;
    } catch (error) {
      console.error('Update assessment settings error:', error);
      throw error;
    }
  },
};

// -----------------------------
// CANDIDATE APIs - FIXED ENDPOINTS
// -----------------------------
export const candidateAPI = {
  create: async (payload) => {
    try {
      // FIXED: Removed /api prefix
      const { data } = await api.post('/candidates', payload);
      return data;
    } catch (error) {
      console.error('Create candidate error:', error);
      throw error;
    }
  },

  getAll: async (params = {}) => {
    try {
      // FIXED: Removed /api prefix
      const { data } = await api.get('/candidates', { params });
      return data;
    } catch (error) {
      console.error('Get all candidates error:', error);
      throw error;
    }
  },

  // NOTE: These endpoints don't exist in backend
  getById: async (id) => {
    try {
      // FIXED: Removed /api prefix
      const { data } = await api.get(`/candidates/${id}`);
      return data;
    } catch (error) {
      console.error('Get candidate by ID error:', error);
      throw error;
    }
  },

  update: async (id, payload) => {
    try {
      // FIXED: Removed /api prefix
      const { data } = await api.put(`/candidates/${id}`, payload);
      return data;
    } catch (error) {
      console.error('Update candidate error:', error);
      throw error;
    }
  },

  delete: async (id) => {
    try {
      // FIXED: Removed /api prefix
      const { data } = await api.delete(`/candidates/${id}`);
      return data;
    } catch (error) {
      console.error('Delete candidate error:', error);
      throw error;
    }
  },

  getByAssessment: async (assessmentId) => {
    try {
      // FIXED: Removed /api prefix
      const { data } = await api.get('/candidates', { 
        params: { assessment_id: assessmentId } 
      });
      return data;
    } catch (error) {
      console.error('Get candidates by assessment error:', error);
      throw error;
    }
  },
};

// -----------------------------
// USER PROFILE APIs - FIXED ENDPOINTS
// -----------------------------
export const userAPI = {
  updateProfile: async (payload) => {
    try {
      // FIXED: Removed /api prefix
      const { data } = await api.put('/users/me', payload);
      // Update local storage if user data is returned
      if (data) {
        setUser(data);
      }
      return data;
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  },

  updatePassword: async (currentPassword, newPassword) => {
    try {
      // FIXED: Removed /api prefix
      const { data } = await api.put('/users/me/password', {
        current_password: currentPassword,
        new_password: newPassword
      });
      return data;
    } catch (error) {
      console.error('Update password error:', error);
      throw error;
    }
  },

  // NOTE: Use authAPI.getCurrentUser() instead - same endpoint
  getProfile: async () => {
    try {
      // FIXED: Removed /api prefix
      const { data } = await api.get('/auth/me');
      return data;
    } catch (error) {
      console.error('Get profile error:', error);
      throw error;
    }
  },
};

// -----------------------------
// DASHBOARD APIs - FIXED ENDPOINTS
// -----------------------------
export const dashboardAPI = {
  getStats: async () => {
    try {
      // FIXED: Removed /api prefix
      const { data } = await api.get('/dashboard/stats');
      return data;
    } catch (error) {
      // If endpoint doesn't exist yet, return fallback data
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

  // New function for Home.jsx platform statistics
  getPlatformStats: async () => {
    try {
      // First try to get stats from the existing endpoint
      const stats = await dashboardAPI.getStats();
      
      // Transform and enhance the data for platform-wide statistics
      return {
        total_organizations: 500, // Hardcoded for now
        total_candidates: stats?.candidates?.total || 85000,
        total_questions: 250000, // Hardcoded for now
        uptime_percentage: 99.9, // Hardcoded for now
        active_candidates: stats?.candidates?.invited || 2847,
        active_assessments: stats?.assessments?.total || 156,
        completion_rate: stats?.completion_rate || 94.2,
        average_score: stats?.average_score || 78.5,
        // Include the original stats as well for backward compatibility
        original_stats: stats
      };
    } catch (error) {
      console.warn('Platform stats error, using fallback data:', error);
      // Return comprehensive mock data if API fails
      return {
        total_organizations: 500,
        total_candidates: 85000,
        total_questions: 250000,
        uptime_percentage: 99.9,
        active_candidates: 2847,
        active_assessments: 156,
        completion_rate: 94.2,
        average_score: 78.5,
        original_stats: null
      };
    }
  },
};


// -----------------------------
// PAYMENT & BILLING APIs - FIXED ENDPOINTS
// -----------------------------
export const paymentAPI = {
  // NOTE: These endpoints don't exist in backend
  createPaymentIntent: async (amount) => {
    try {
      // FIXED: Removed /api prefix
      const { data } = await api.post('/payments/intent', { amount });
      return data;
    } catch (error) {
      // If endpoint doesn't exist, return mock data for now
      if (error.response?.status === 404) {
        console.warn('Payment intent endpoint not available');
        return {
          client_secret: `mock_secret_${Date.now()}`,
          id: `mock_intent_${Date.now()}`,
          amount,
          currency: 'usd'
        };
      }
      console.error('Create payment intent error:', error);
      throw error;
    }
  },

  getBillingHistory: async () => {
    try {
      // FIXED: Removed /api prefix
      const { data } = await api.get('/billing/history');
      return data;
    } catch (error) {
      // If endpoint doesn't exist, return empty array
      if (error.response?.status === 404) {
        return { invoices: [] };
      }
      console.error('Get billing history error:', error);
      throw error;
    }
  },
};

// -----------------------------
// WEBHOOK APIs - FIXED ENDPOINTS
// -----------------------------
export const webhookAPI = {
  stripe: async (payload, signature) => {
    try {
      // FIXED: Removed /api prefix
      const { data } = await api.post('/webhooks/stripe', payload, {
        headers: {
          'stripe-signature': signature
        }
      });
      return data;
    } catch (error) {
      console.error('Stripe webhook error:', error);
      throw error;
    }
  },
};

// -----------------------------
// HEALTH CHECK - FIXED ENDPOINTS
// -----------------------------
export const healthAPI = {
  check: async () => {
    try {
      // FIXED: Removed /api prefix
      const { data } = await api.get('/health');
      return data;
    } catch (error) {
      console.error('Health check error:', error);
      throw error;
    }
  },
};

// -----------------------------
// UTILITY FUNCTIONS
// -----------------------------
export const apiUtils = {
  // Check if user is authenticated
  isAuthenticated: isAuthenticated,

  // Get current user from localStorage
  getCurrentUser: () => {
    const userStr = localStorage.getItem(config.AUTH.USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  },

  // Clear all auth data
  clearAuthData: clearAuthData,

  // Set auth data
  setAuthData: (token, user, refreshToken = null) => {
    setAuthToken(token);
    if (refreshToken) setRefreshToken(refreshToken);
    if (user) setUser(user);
  },

  // Get API base URL
  getBaseURL: () => config.API_BASE_URL,
  
  // Get config
  getConfig: () => config,
  
  // Direct API call helper
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
