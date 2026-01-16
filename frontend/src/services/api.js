// frontend/src/services/api.js
import axios from "axios";

// Use Vite env variables (must start with VITE_)
const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;
const API_URL = `${API_BASE_URL}/api`;

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("assessly_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth APIs
export const authAPI = {
  register: async (userData) => {
    const response = await api.post("/auth/register", userData);
    return response.data;
  },

  login: async (credentials) => {
    const response = await api.post("/auth/login", credentials);
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await api.get("/auth/me");
    return response.data;
  },
};

// Contact Form APIs
export const contactAPI = {
  submitContactForm: async (formData) => {
    const response = await api.post("/contact", formData);
    return response.data;
  },

  getContactForms: async () => {
    const response = await api.get("/contact");
    return response.data;
  },
};

// Demo Request APIs
export const demoAPI = {
  submitDemoRequest: async (formData) => {
    const response = await api.post("/demo", formData);
    return response.data;
  },

  getDemoRequests: async () => {
    const response = await api.get("/demo");
    return response.data;
  },
};

// Subscription APIs
export const subscriptionAPI = {
  createSubscription: async (subscriptionData) => {
    const response = await api.post("/subscriptions", subscriptionData);
    return response.data;
  },

  getCurrentSubscription: async () => {
    const response = await api.get("/subscriptions/current");
    return response.data;
  },

  cancelSubscription: async (subscriptionId) => {
    const response = await api.delete(`/subscriptions/${subscriptionId}`);
    return response.data;
  },
};

// Payment APIs
export const paymentAPI = {
  createPaymentIntent: async (amount) => {
    const response = await api.post("/payments/intent", { amount });
    return response.data;
  },
};

// Organization APIs
export const organizationAPI = {
  getCurrentOrganization: async () => {
    const response = await api.get("/organizations/current");
    return response.data;
  },
};

export default api;
