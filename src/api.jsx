// src/api.jsx
import axios from "axios";

/**
 * 🌍 Dynamic Base URL Configuration for Production
 */
const getApiBaseUrl = () => {
  // Always use environment variable in production
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  
  // Fallback for different environments
  const isLocalhost = window.location.hostname === "localhost" || 
                      window.location.hostname === "127.0.0.1";
  
  return isLocalhost 
    ? "http://localhost:3000/api" 
    : "https://assesslyplatform.onrender.com/api";
};

const API_BASE_URL = getApiBaseUrl();

/**
 * 🔐 Production Axios Instance
 */
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 
    "Content-Type": "application/json",
    "X-Client": "assessly-frontend" 
  },
  withCredentials: false,
  timeout: 15000, // 15 second timeout for production
});

/**
 * ✅ Production Request Interceptor
 */
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      // Verify token format before attaching
      if (token.startsWith('eyJ') && token.length > 50) {
        config.headers.Authorization = `Bearer ${token}`;
      } else {
        console.warn('Invalid token format detected');
        localStorage.removeItem("token");
      }
    }
    
    // Add request ID for tracking
    config.headers['X-Request-ID'] = Date.now().toString();
    
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

/**
 * 🚨 Production Response Interceptor with Enhanced Error Handling
 */
api.interceptors.response.use(
  (response) => {
    // Log successful API calls in development
    if (import.meta.env.DEV) {
      console.log(`✅ API Success: ${response.config.method?.toUpperCase()} ${response.config.url}`);
    }
    return response;
  },
  (error) => {
    const message = error.response?.data?.message || error.message;
    const status = error.response?.status;
    const url = error.config?.url;
    
    // Production error logging (avoid verbose logging in production)
    if (import.meta.env.PROD) {
      console.error(`API Error [${status}]: ${url} - ${message}`);
    } else {
      console.error("❌ API Error:", { 
        url, 
        status, 
        message,
        config: error.config 
      });
    }
    
    // Handle specific status codes
    if (status === 401) {
      // Token expired or invalid
      localStorage.removeItem("token");
      // Don't redirect automatically in production - let components handle
      console.warn('Authentication failed - token removed');
    }
    
    if (status === 429) {
      // Rate limiting
      console.warn('Rate limit exceeded');
    }
    
    if (status >= 500) {
      // Server errors
      console.error('Server error occurred');
    }
    
    // Return consistent error format
    return Promise.reject({ 
      message: message || "Service temporarily unavailable", 
      status: status || 0,
      code: error.code,
      url: url
    });
  }
);

/**
 * 🛡️ Safe API Call Wrapper with Retry Logic
 */
const handleRequest = (promise, maxRetries = 1) => {
  return promise
    .then((res) => res.data)
    .catch(async (error) => {
      // Only retry on network errors, not auth or validation errors
      if (maxRetries > 0 && (!error.status || error.status >= 500)) {
        console.warn(`Retrying request, ${maxRetries} attempts left`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
        return handleRequest(promise, maxRetries - 1);
      }
      
      throw error;
    });
};

// =================================================================
// ======================== PRODUCTION API ENDPOINTS ===============
// =================================================================

// Authentication
export const AuthAPI = {
  register: (data) => handleRequest(api.post("/auth/register", data)),
  login: (data) => 
    handleRequest(api.post("/auth/login", data).then((res) => {
      if (res.data.token) {
        localStorage.setItem("token", res.data.token);
        // Also store user info if available
        if (res.data.user) {
          localStorage.setItem("user", JSON.stringify(res.data.user));
        }
      }
      return res;
    })),
  profile: () => handleRequest(api.get("/user/profile")),
  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    return Promise.resolve();
  },
  refreshToken: () => handleRequest(api.post("/auth/refresh")),
};

// Organizations
export const OrganizationAPI = {
  list: () => handleRequest(api.get("/organizations")),
  details: (id) => handleRequest(api.get(`/organizations/${id}`)),
  create: (data) => handleRequest(api.post("/organizations", data)),
  update: (id, data) => handleRequest(api.put(`/organizations/${id}`, data)),
};

// Assessments
export const AssessmentAPI = {
  list: (status = "", page = 1, limit = 10) => 
    handleRequest(api.get(`/assessments?status=${status}&page=${page}&limit=${limit}`))
      .then((data) => data.assessments || []),
  details: (id) => handleRequest(api.get(`/assessments/${id}`)),
  create: (data) => handleRequest(api.post("/assessments/create", data)),
  update: (id, data) => handleRequest(api.put(`/assessments/${id}`, data)),
  delete: (id) => handleRequest(api.delete(`/assessments/${id}`)),
  start: (id) => handleRequest(api.post(`/assessments/${id}/start`)),
  submit: (id, data) => handleRequest(api.post(`/assessments/${id}/submit`, data)),
  aiScore: (answers) => handleRequest(api.post("/assessments/ai-score", { answers })),
  results: (id) => handleRequest(api.get(`/assessments/${id}/results`)),
};

// Billing
export const BillingAPI = {
  checkoutSession: (plan) => 
    handleRequest(api.post("/billing/checkout-session", { plan })),
  portalLink: () => handleRequest(api.post("/billing/portal-link")),
  invoices: () => handleRequest(api.get("/billing/invoices")),
  subscription: () => handleRequest(api.get("/billing/subscription")),
};

// Admin
export const AdminAPI = {
  stats: () => handleRequest(api.get("/admin/stats")),
  users: (page = 1, limit = 20) => 
    handleRequest(api.get(`/admin/users?page=${page}&limit=${limit}`)),
  organizations: () => handleRequest(api.get("/admin/organizations")),
};

// Search
export const SearchAPI = {
  query: (query, type = "all") => 
    handleRequest(api.post("/search", { query, type }))
      .then((data) => data.results || []),
};

// Health Check
export const HealthAPI = {
  check: () => handleRequest(api.get("/health")),
  ping: () => handleRequest(api.get("/health/ping")),
};

// System
export const SystemAPI = {
  config: () => handleRequest(api.get("/system/config")),
  maintenance: () => handleRequest(api.get("/system/maintenance")),
};

// Export all APIs
export default {
  AuthAPI,
  OrganizationAPI,
  AssessmentAPI,
  BillingAPI,
  AdminAPI,
  SearchAPI,
  HealthAPI,
  SystemAPI,
};
