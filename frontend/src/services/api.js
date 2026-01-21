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
  baseURL: config.API_BASE_URL,
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

        const response = await axios.post(
          `${config.API_BASE_URL}${config.AUTH.ENDPOINTS.REFRESH}`,
          { refresh_token: refreshToken }
        );

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
// AUTH APIs
// -----------------------------
export const authAPI = {
  register: async (userData) => {
    try {
      const { data } = await api.post(config.AUTH.ENDPOINTS.REGISTER, userData);
      // Store tokens and user data on successful registration
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
      const { data } = await api.post(config.AUTH.ENDPOINTS.LOGIN, credentials);
      // Store tokens and user data on successful login
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
      const { data } = await api.get(config.AUTH.ENDPOINTS.ME);
      // Update user data in storage
      if (data.user) setUser(data.user);
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
      
      const { data } = await api.post(config.AUTH.ENDPOINTS.REFRESH, { 
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
      // Call backend logout if endpoint exists
      await api.post(config.AUTH.ENDPOINTS.LOGOUT);
    } catch (error) {
      // Silently fail if logout endpoint doesn't exist
      console.log('Backend logout endpoint not available');
    } finally {
      clearAuthData();
      return { success: true, message: "Logged out successfully" };
    }
  },

  verifyEmail: async (token) => {
    try {
      const { data } = await api.post(config.AUTH.ENDPOINTS.VERIFY_EMAIL, { token });
      return data;
    } catch (error) {
      console.error('Email verification error:', error);
      throw error;
    }
  },

  forgotPassword: async (email) => {
    try {
      const { data } = await api.post(config.AUTH.ENDPOINTS.FORGOT_PASSWORD, { email });
      return data;
    } catch (error) {
      console.error('Forgot password error:', error);
      throw error;
    }
  },

  resetPassword: async (token, newPassword) => {
    try {
      const { data } = await api.post(config.AUTH.ENDPOINTS.RESET_PASSWORD, { 
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
      const { data } = await api.post("/contact", formData);
      return data;
    } catch (error) {
      console.error('Submit contact form error:', error);
      throw error;
    }
  },

  getContactForms: async () => {
    try {
      const { data } = await api.get("/contact");
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
// DEMO REQUEST APIs
// -----------------------------
export const demoAPI = {
  submitDemoRequest: async (formData) => {
    try {
      const { data } = await api.post("/demo", formData);
      return data;
    } catch (error) {
      console.error('Submit demo request error:', error);
      throw error;
    }
  },

  getDemoRequests: async () => {
    try {
      const { data } = await api.get("/demo");
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
// SUBSCRIPTION APIs
// -----------------------------
export const subscriptionAPI = {
  createCheckoutSession: async (planId) => {
    try {
      const { data } = await api.post("/subscriptions/checkout", { plan_id: planId });
      return data;
    } catch (error) {
      console.error('Create checkout session error:', error);
      throw error;
    }
  },

  getCurrentSubscription: async () => {
    try {
      const { data } = await api.get("/subscriptions/me");
      return data;
    } catch (error) {
      console.error('Get current subscription error:', error);
      throw error;
    }
  },

  cancelSubscription: async (immediate = false) => {
    try {
      const { data } = await api.post("/subscriptions/cancel", { immediate });
      return data;
    } catch (error) {
      console.error('Cancel subscription error:', error);
      throw error;
    }
  },

  getAvailablePlans: async () => {
    try {
      const { data } = await api.get("/plans");
      return data;
    } catch (error) {
      console.error('Get available plans error:', error);
      throw error;
    }
  },

  changeSubscription: async (newPlanId) => {
    try {
      const { data } = await api.post("/subscriptions/upgrade", { new_plan_id: newPlanId });
      return data;
    } catch (error) {
      console.error('Change subscription error:', error);
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
      const { data } = await api.get("/organizations/me");
      return data;
    } catch (error) {
      console.error('Get organization error:', error);
      throw error;
    }
  },

  update: async (payload) => {
    try {
      const { data } = await api.put("/organizations/me", payload);
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
      const { data } = await api.post("/assessments", payload);
      return data;
    } catch (error) {
      console.error('Create assessment error:', error);
      throw error;
    }
  },

  getAll: async (params = {}) => {
    try {
      const { data } = await api.get("/assessments", { params });
      return data;
    } catch (error) {
      console.error('Get all assessments error:', error);
      throw error;
    }
  },

  getById: async (id) => {
    try {
      const { data } = await api.get(`/assessments/${id}`);
      return data;
    } catch (error) {
      console.error('Get assessment by ID error:', error);
      throw error;
    }
  },

  update: async (id, payload) => {
    try {
      const { data } = await api.put(`/assessments/${id}`, payload);
      return data;
    } catch (error) {
      console.error('Update assessment error:', error);
      throw error;
    }
  },

  delete: async (id) => {
    try {
      const { data } = await api.delete(`/assessments/${id}`);
      return data;
    } catch (error) {
      console.error('Delete assessment error:', error);
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
      const { data } = await api.post("/candidates", payload);
      return data;
    } catch (error) {
      console.error('Create candidate error:', error);
      throw error;
    }
  },

  getAll: async (params = {}) => {
    try {
      const { data } = await api.get("/candidates", { params });
      return data;
    } catch (error) {
      console.error('Get all candidates error:', error);
      throw error;
    }
  },

  getById: async (id) => {
    try {
      const { data } = await api.get(`/candidates/${id}`);
      return data;
    } catch (error) {
      console.error('Get candidate by ID error:', error);
      throw error;
    }
  },

  update: async (id, payload) => {
    try {
      const { data } = await api.put(`/candidates/${id}`, payload);
      return data;
    } catch (error) {
      console.error('Update candidate error:', error);
      throw error;
    }
  },

  delete: async (id) => {
    try {
      const { data } = await api.delete(`/candidates/${id}`);
      return data;
    } catch (error) {
      console.error('Delete candidate error:', error);
      throw error;
    }
  },

  getByAssessment: async (assessmentId) => {
    try {
      const { data } = await api.get("/candidates", { params: { assessment_id: assessmentId } });
      return data;
    } catch (error) {
      console.error('Get candidates by assessment error:', error);
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
      const { data } = await api.put("/users/me", payload);
      // Update local storage if user data is returned
      if (data.user) {
        setUser(data.user);
      }
      return data;
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  },

  updatePassword: async (currentPassword, newPassword) => {
    try {
      const { data } = await api.put("/users/me/password", {
        current_password: currentPassword,
        new_password: newPassword
      });
      return data;
    } catch (error) {
      console.error('Update password error:', error);
      throw error;
    }
  },

  getProfile: async () => {
    try {
      const { data } = await api.get("/auth/me");
      return data;
    } catch (error) {
      console.error('Get profile error:', error);
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
      const { data } = await api.get("/dashboard/stats");
      return data;
    } catch (error) {
      // If endpoint doesn't exist yet, return fallback data
      if (error.response?.status === 404) {
        return {
          stats: {
            assessments: { total: 0, published: 0, draft: 0 },
            candidates: { total: 0, invited: 0, completed: 0 }
          },
          recent: { assessments: [], candidates: [] }
        };
      }
      console.error('Get dashboard stats error:', error);
      throw error;
    }
  },
};

// -----------------------------
// PAYMENT & BILLING APIs
// -----------------------------
export const paymentAPI = {
  createPaymentIntent: async (amount) => {
    try {
      const { data } = await api.post("/payments/intent", { amount });
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
      const { data } = await api.get("/billing/history");
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
// WEBHOOK APIs
// -----------------------------
export const webhookAPI = {
  stripe: async (payload, signature) => {
    try {
      const { data } = await api.post("/webhooks/stripe", payload, {
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
// HEALTH CHECK
// -----------------------------
export const healthAPI = {
  check: async () => {
    try {
      const { data } = await api.get("/health");
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
};

// Export all APIs
export default api;
