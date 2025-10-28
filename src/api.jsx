// src/api.jsx
import axios from "axios";

/**
 * 🌍 Dynamic Base URL Configuration
 */
const isLocalhost =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (isLocalhost
    ? "http://localhost:3000/api"
    : "https://assesslyplatform.onrender.com/api");

/**
 * 🔐 Axios Instance
 */
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: false, // enable if backend uses cookies
});

/**
 * ✅ Request interceptor to automatically attach JWT
 */
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * 🚨 Handle and log API errors globally
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("❌ API Error:", error.response?.data || error.message);
    return Promise.reject(error.response?.data || { message: "Server error" });
  }
);

// =================================================================
// ======================== API ENDPOINTS ===========================
// =================================================================

// Authentication
export const AuthAPI = {
  register: (data) => api.post("/auth/register", data).then((res) => res.data),
  login: (data) =>
    api.post("/auth/login", data).then((res) => {
      if (res.data.token) localStorage.setItem("token", res.data.token);
      return res.data;
    }),
  profile: () => api.get("/user/profile").then((res) => res.data),
};

// Organizations
export const OrganizationAPI = {
  list: () => api.get("/organizations").then((res) => res.data),
  details: (id) => api.get(`/organizations/${id}`).then((res) => res.data),
};

// Assessments
export const AssessmentAPI = {
  list: (status = "") =>
    api
      .get(`/assessments${status ? `?status=${status}` : ""}`)
      .then((res) => res.data.assessments || []),
  details: (id) => api.get(`/assessments/${id}`).then((res) => res.data),
  create: (data) => api.post("/assessments/create", data).then((res) => res.data),
  start: (id) => api.post(`/assessments/${id}/start`).then((res) => res.data),
  submit: (id, data) => api.post(`/assessments/${id}/submit`, data).then((res) => res.data),
  aiScore: (answers) => api.post("/assessments/ai-score", { answers }).then((res) => res.data),
};

// Billing
export const BillingAPI = {
  checkoutSession: (plan) =>
    api.post("/billing/checkout-session", { plan }).then((res) => res.data.url),
  portalLink: () => api.post("/billing/portal-link").then((res) => res.data.url),
  invoices: () => api.get("/billing/invoices").then((res) => res.data.invoices || []),
};

// Admin
export const AdminAPI = {
  stats: () => api.get("/admin/stats").then((res) => res.data),
};

// Search
export const SearchAPI = {
  query: (query) => api.post("/search", { query }).then((res) => res.data.results || []),
};

// Health Check
export const HealthAPI = {
  check: () => api.get("/health").then((res) => res.data),
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
};
