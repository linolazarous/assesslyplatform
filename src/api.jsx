// src/api.jsx
import axios from "axios";

/**
 * 🌍 Dynamic Base URL Configuration
 * Automatically switches between local and production environments.
 */
const API_BASE_URL =
  import.meta.env.MODE === "development"
    ? "http://localhost:3000/api" // Local backend (for testing)
    : "https://assesslyplatform.onrender.com/api"; // 🔗 Replace with your Render Web Service URL

/**
 * 🔐 Create a global axios instance with defaults
 */
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: false,
});

/**
 * 🌈 Handle and log API errors gracefully
 */
const handleError = (error) => {
  console.error("❌ API Error:", error.response?.data || error.message);
  throw error.response?.data || { message: "Server error" };
};

// =================================================================
// ======================== API ENDPOINTS ===========================
// =================================================================

// ✅ Authentication
export const AuthAPI = {
  register: async (data) => {
    try {
      const res = await api.post("/auth/register", data);
      return res.data;
    } catch (err) {
      handleError(err);
    }
  },

  login: async (data) => {
    try {
      const res = await api.post("/auth/login", data);
      // You can store token in localStorage for persistence
      if (res.data.token) localStorage.setItem("token", res.data.token);
      return res.data;
    } catch (err) {
      handleError(err);
    }
  },

  profile: async () => {
    try {
      const res = await api.get("/user/profile");
      return res.data;
    } catch (err) {
      handleError(err);
    }
  },
};

// ✅ Organizations
export const OrganizationAPI = {
  list: async () => {
    try {
      const res = await api.get("/organizations");
      return res.data;
    } catch (err) {
      handleError(err);
    }
  },

  details: async (id) => {
    try {
      const res = await api.get(`/organizations/${id}`);
      return res.data;
    } catch (err) {
      handleError(err);
    }
  },
};

// ✅ Assessments
export const AssessmentAPI = {
  list: async (status = "") => {
    try {
      const res = await api.get(`/assessments${status ? `?status=${status}` : ""}`);
      return res.data.assessments || [];
    } catch (err) {
      handleError(err);
    }
  },

  details: async (id) => {
    try {
      const res = await api.get(`/assessments/${id}`);
      return res.data;
    } catch (err) {
      handleError(err);
    }
  },

  create: async (data) => {
    try {
      const res = await api.post("/assessments/create", data);
      return res.data;
    } catch (err) {
      handleError(err);
    }
  },

  start: async (id) => {
    try {
      const res = await api.post(`/assessments/${id}/start`);
      return res.data;
    } catch (err) {
      handleError(err);
    }
  },

  submit: async (id, data) => {
    try {
      const res = await api.post(`/assessments/${id}/submit`, data);
      return res.data;
    } catch (err) {
      handleError(err);
    }
  },

  aiScore: async (answers) => {
    try {
      const res = await api.post("/assessments/ai-score", { answers });
      return res.data;
    } catch (err) {
      handleError(err);
    }
  },
};

// ✅ Billing
export const BillingAPI = {
  checkoutSession: async (plan) => {
    try {
      const res = await api.post("/billing/checkout-session", { plan });
      return res.data.url;
    } catch (err) {
      handleError(err);
    }
  },

  portalLink: async () => {
    try {
      const res = await api.post("/billing/portal-link");
      return res.data.url;
    } catch (err) {
      handleError(err);
    }
  },

  invoices: async () => {
    try {
      const res = await api.get("/billing/invoices");
      return res.data.invoices || [];
    } catch (err) {
      handleError(err);
    }
  },
};

// ✅ Admin
export const AdminAPI = {
  stats: async () => {
    try {
      const res = await api.get("/admin/stats");
      return res.data;
    } catch (err) {
      handleError(err);
    }
  },
};

// ✅ Search
export const SearchAPI = {
  query: async (query) => {
    try {
      const res = await api.post("/search", { query });
      return res.data.results || [];
    } catch (err) {
      handleError(err);
    }
  },
};

// ✅ Health Check (optional for diagnostics)
export const HealthAPI = {
  check: async () => {
    try {
      const res = await api.get("/health");
      return res.data;
    } catch (err) {
      handleError(err);
    }
  },
};

// ✅ Default export for flexible use
export default {
  AuthAPI,
  OrganizationAPI,
  AssessmentAPI,
  BillingAPI,
  AdminAPI,
  SearchAPI,
  HealthAPI,
};
