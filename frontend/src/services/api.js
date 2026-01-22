// frontend/src/services/api.js
import axios from "axios";
import config, {
  getAuthToken,
  setAuthToken,
  getRefreshToken,
  setRefreshToken,
  setUser,
  clearAuthData,
  isAuthenticated,
} from "../config";

// =============================
// AXIOS INSTANCE
// =============================
const api = axios.create({
  baseURL: config.API_BASE_URL, // https://assesslyplatform-pfm1.onrender.com/api
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});

// =============================
// REQUEST INTERCEPTOR
// =============================
api.interceptors.request.use((req) => {
  const token = getAuthToken();
  if (token) req.headers.Authorization = `Bearer ${token}`;
  return req;
});

// =============================
// RESPONSE INTERCEPTOR (TOKEN REFRESH)
// =============================
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refreshToken = getRefreshToken();
        if (!refreshToken) throw new Error("No refresh token");

        const { data } = await api.post("/auth/refresh", {
          refresh_token: refreshToken,
        });

        setAuthToken(data.access_token);
        if (data.refresh_token) setRefreshToken(data.refresh_token);

        original.headers.Authorization = `Bearer ${data.access_token}`;
        return api(original);
      } catch {
        clearAuthData();
        if (!window.location.pathname.startsWith("/login")) {
          window.location.replace("/login?session=expired");
        }
      }
    }

    return Promise.reject(error);
  }
);

// =============================
// AUTH API
// =============================
export const authAPI = {
  register: async (payload) => {
    const { data } = await api.post("/auth/register", payload);
    if (data.access_token) {
      setAuthToken(data.access_token);
      if (data.refresh_token) setRefreshToken(data.refresh_token);
      if (data.user) setUser(data.user);
    }
    return data;
  },

  login: async (payload) => {
    const { data } = await api.post("/auth/login", payload);
    if (data.access_token) {
      setAuthToken(data.access_token);
      if (data.refresh_token) setRefreshToken(data.refresh_token);
      if (data.user) setUser(data.user);
    }
    return data;
  },

  me: async () => {
    const { data } = await api.get("/auth/me");
    setUser(data);
    return data;
  },

  logout: async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      clearAuthData();
    }
  },
};

// =============================
// DASHBOARD API (REAL SOURCE)
// =============================
export const dashboardAPI = {
  getStats: async () => {
    const { data } = await api.get("/dashboard/stats");
    return data;
  },

  // Derived stats for landing / home UI
  getPlatformStats: async () => {
    const stats = await dashboardAPI.getStats();
    return {
      active_assessments: stats.assessments?.total ?? 0,
      active_candidates: stats.candidates?.invited ?? 0,
      completion_rate: stats.completion_rate ?? 0,
      average_score: stats.average_score ?? 0,
      original_stats: stats,
    };
  },
};

// =============================
// ASSESSMENTS API
// =============================
export const assessmentAPI = {
  create: (payload) => api.post("/assessments", payload).then((r) => r.data),
  getAll: (params) =>
    api.get("/assessments", { params }).then((r) => r.data),
  getById: (id) =>
    api.get(`/assessments/${id}`).then((r) => r.data),
  update: (id, payload) =>
    api.put(`/assessments/${id}`, payload).then((r) => r.data),
  delete: (id) =>
    api.delete(`/assessments/${id}`).then((r) => r.data),

  getQuestions: (id) =>
    api.get(`/assessments/${id}/questions`).then((r) => r.data),
  addQuestion: (id, payload) =>
    api.post(`/assessments/${id}/questions`, payload).then((r) => r.data),
  getSettings: (id) =>
    api.get(`/assessments/${id}/settings`).then((r) => r.data),
  updateSettings: (id, payload) =>
    api.put(`/assessments/${id}/settings`, payload).then((r) => r.data),
};

// =============================
// CANDIDATES API
// =============================
export const candidateAPI = {
  create: (payload) =>
    api.post("/candidates", payload).then((r) => r.data),
  getAll: (params) =>
    api.get("/candidates", { params }).then((r) => r.data),
  getById: (id) =>
    api.get(`/candidates/${id}`).then((r) => r.data),
};

// =============================
// ORGANIZATION API
// =============================
export const organizationAPI = {
  me: () => api.get("/organizations/me").then((r) => r.data),
};

// =============================
// SUBSCRIPTIONS API
// =============================
export const subscriptionAPI = {
  checkout: (planId) =>
    api.post("/subscriptions/checkout", { plan_id: planId }).then((r) => r.data),
  me: () => api.get("/subscriptions/me").then((r) => r.data),
  cancel: () =>
    api.post("/subscriptions/cancel").then((r) => r.data),
  plans: () => api.get("/plans").then((r) => r.data),
};

// =============================
// PUBLIC APIs
// =============================
export const publicAPI = {
  contact: (payload) =>
    api.post("/contact", payload).then((r) => r.data),
  demo: (payload) =>
    api.post("/demo", payload).then((r) => r.data),
};

// =============================
// UTILITIES
// =============================
export const apiUtils = {
  isAuthenticated,
  clearAuthData,
  getBaseURL: () => config.API_BASE_URL,
};

// Default export (axios instance)
export default api;
