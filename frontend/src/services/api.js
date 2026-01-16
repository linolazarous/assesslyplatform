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
const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    "Content-Type": "application/json",
  },
});

// Automatically add auth token if exists
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("assessly_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// -----------------------------
// AUTH APIs
// -----------------------------
export const authAPI = {
  register: async (userData) => {
    const { data } = await api.post("/auth/register", userData);
    return data;
  },

  login: async (credentials) => {
    const { data } = await api.post("/auth/login", credentials);
    return data;
  },

  getCurrentUser: async () => {
    const { data } = await api.get("/auth/me");
    return data;
  },
};

// -----------------------------
// CONTACT FORM APIs
// -----------------------------
export const contactAPI = {
  submitContactForm: async (formData) => {
    const { data } = await api.post("/contact", formData);
    return data;
  },

  getContactForms: async () => {
    const { data } = await api.get("/contact");
    return data;
  },
};

// -----------------------------
// DEMO REQUEST APIs
// -----------------------------
export const demoAPI = {
  submitDemoRequest: async (formData) => {
    const { data } = await api.post("/demo", formData);
    return data;
  },

  getDemoRequests: async () => {
    const { data } = await api.get("/demo");
    return data;
  },
};

// -----------------------------
// SUBSCRIPTION APIs
// -----------------------------
export const subscriptionAPI = {
  createSubscription: async (subscriptionData) => {
    const { data } = await api.post("/subscriptions", subscriptionData);
    return data;
  },

  getCurrentSubscription: async () => {
    const { data } = await api.get("/subscriptions/current");
    return data;
  },

  cancelSubscription: async (subscriptionId) => {
    const { data } = await api.delete(`/subscriptions/${subscriptionId}`);
    return data;
  },
};

// -----------------------------
// PAYMENT APIs
// -----------------------------
export const paymentAPI = {
  createPaymentIntent: async (amount) => {
    const { data } = await api.post("/payments/intent", { amount });
    return data;
  },
};

// -----------------------------
// ORGANIZATION APIs
// -----------------------------
export const organizationAPI = {
  getCurrent: async () => {
    const { data } = await api.get("/organizations/current");
    return data;
  },

  update: async (payload) => {
    const { data } = await api.put("/organizations/current", payload);
    return data;
  },
};

// -----------------------------
// ASSESSMENT APIs
// -----------------------------
export const assessmentAPI = {
  create: async (payload) => {
    const { data } = await api.post("/assessments", payload);
    return data;
  },

  getAll: async () => {
    const { data } = await api.get("/assessments");
    return data;
  },

  getById: async (id) => {
    const { data } = await api.get(`/assessments/${id}`);
    return data;
  },

  update: async (id, payload) => {
    const { data } = await api.put(`/assessments/${id}`, payload);
    return data;
  },

  delete: async (id) => {
    const { data } = await api.delete(`/assessments/${id}`);
    return data;
  },
};

export default api;
