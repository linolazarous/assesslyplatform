// frontend/src/services/api.js
import axios from "axios";

/**
 * VITE environment variables must start with VITE_
 * Ensure you have a .env file in frontend/ with:
 * VITE_BACKEND_URL=https://assesslyplatform-pfm1.onrender.com
 * VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_key_here
 */

// -----------------------------
// BASE CONFIG
// -----------------------------
const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "https://assesslyplatform-pfm1.onrender.com";

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000, // 30 second timeout for production
});

// Automatically add auth token if exists
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("assessly_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle response errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 Unauthorized (token expired)
    if (error.response?.status === 401) {
      localStorage.removeItem("assessly_token");
      localStorage.removeItem("assessly_user");
      // Redirect to login if not already there
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    
    // Handle 403 Forbidden (insufficient permissions)
    if (error.response?.status === 403) {
      console.error('Access forbidden:', error.response.data);
    }
    
    // Handle 404 Not Found
    if (error.response?.status === 404) {
      console.error('Resource not found:', error.response.config.url);
    }
    
    // Handle 500 Internal Server Error
    if (error.response?.status === 500) {
      console.error('Server error:', error.response.data);
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
      const { data } = await api.post("/auth/register", userData);
      // Store tokens and user data on successful registration
      if (data.access_token) {
        localStorage.setItem("assessly_token", data.access_token);
        localStorage.setItem("assessly_user", JSON.stringify(data.user));
      }
      return data;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  },

  login: async (credentials) => {
    try {
      const { data } = await api.post("/auth/login", credentials);
      // Store tokens and user data on successful login
      if (data.access_token) {
        localStorage.setItem("assessly_token", data.access_token);
        localStorage.setItem("assessly_user", JSON.stringify(data.user));
      }
      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  getCurrentUser: async () => {
    try {
      const { data } = await api.get("/auth/me");
      return data;
    } catch (error) {
      console.error('Get current user error:', error);
      throw error;
    }
  },

  refreshToken: async (refreshToken) => {
    try {
      const { data } = await api.post("/auth/refresh", { refresh_token: refreshToken });
      if (data.access_token) {
        localStorage.setItem("assessly_token", data.access_token);
      }
      return data;
    } catch (error) {
      console.error('Refresh token error:', error);
      throw error;
    }
  },

  logout: async () => {
    try {
      // Clear local storage
      localStorage.removeItem("assessly_token");
      localStorage.removeItem("assessly_user");
      // Optionally call backend logout endpoint if implemented
      // await api.post("/auth/logout");
      return { success: true, message: "Logged out successfully" };
    } catch (error) {
      console.error('Logout error:', error);
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

  // Note: This endpoint may not exist in your backend
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

  // Note: This endpoint may not exist in your backend
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
// SUBSCRIPTION APIs (Updated to match backend)
// -----------------------------
export const subscriptionAPI = {
  // Create checkout session
  createCheckoutSession: async (planId) => {
    try {
      const { data } = await api.post("/subscriptions/checkout", { plan_id: planId });
      return data;
    } catch (error) {
      console.error('Create checkout session error:', error);
      throw error;
    }
  },

  // Get current subscription
  getCurrentSubscription: async () => {
    try {
      const { data } = await api.get("/subscriptions/me");
      return data;
    } catch (error) {
      console.error('Get current subscription error:', error);
      throw error;
    }
  },

  // Cancel subscription
  cancelSubscription: async (immediate = false) => {
    try {
      const { data } = await api.post("/subscriptions/cancel", { immediate });
      return data;
    } catch (error) {
      console.error('Cancel subscription error:', error);
      throw error;
    }
  },

  // Get available plans
  getAvailablePlans: async () => {
    try {
      const { data } = await api.get("/plans");
      return data;
    } catch (error) {
      console.error('Get available plans error:', error);
      throw error;
    }
  },

  // Upgrade/downgrade subscription
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
// ORGANIZATION APIs (Updated to match backend)
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
// CANDIDATE APIs (New)
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

  // Get candidates for specific assessment
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
// USER PROFILE APIs (New)
// -----------------------------
export const userAPI = {
  updateProfile: async (payload) => {
    try {
      const { data } = await api.put("/users/me", payload);
      // Update local storage if user data is returned
      if (data.user) {
        const currentUser = JSON.parse(localStorage.getItem("assessly_user") || "{}");
        const updatedUser = { ...currentUser, ...data.user };
        localStorage.setItem("assessly_user", JSON.stringify(updatedUser));
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
// DASHBOARD APIs (New)
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
// PAYMENT & BILLING APIs (Updated)
// -----------------------------
export const paymentAPI = {
  // Note: These endpoints may need to be implemented in your backend
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

  // Get billing history
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
  isAuthenticated: () => {
    const token = localStorage.getItem("assessly_token");
    return !!token;
  },

  // Get current user from localStorage
  getCurrentUser: () => {
    try {
      const userStr = localStorage.getItem("assessly_user");
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('Error parsing user from localStorage:', error);
      return null;
    }
  },

  // Clear all auth data
  clearAuthData: () => {
    localStorage.removeItem("assessly_token");
    localStorage.removeItem("assessly_user");
  },

  // Set auth data
  setAuthData: (token, user) => {
    localStorage.setItem("assessly_token", token);
    localStorage.setItem("assessly_user", JSON.stringify(user));
  },

  // Get API base URL
  getBaseURL: () => API_BASE_URL,
};

// Export all APIs
export default api;
