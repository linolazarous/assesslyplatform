// src/api/index.js
// -----------------------------------------------------------------------------
// PRODUCTION-READY API CLIENT FOR ASSESSLY PLATFORM
// -----------------------------------------------------------------------------

import axios from "axios";

/**
 * Automatically choose correct API URL based on environment.
 * - Local dev  → VITE_API_BASE_URL or http://localhost:5000
 * - Production → Render backend URL (update when custom domain ready)
 */
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD
    ? "https://assessly-gedp.onrender.com"
    : "http://localhost:5000");

/**
 * Axios instance
 * - Credentials disabled → JWT via Authorization header only
 * - JSON structured communication
 */
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

// -----------------------------------------------------------------------------
// TOKEN MANAGEMENT
// -----------------------------------------------------------------------------
export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem("token", token);
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    localStorage.removeItem("token");
    delete api.defaults.headers.common.Authorization;
  }
};

// Load token at startup (auto-login)
const existingToken = localStorage.getItem("token");
if (existingToken) setAuthToken(existingToken);

// -----------------------------------------------------------------------------
// GLOBAL RESPONSE HANDLING
// -----------------------------------------------------------------------------
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (!err.response) {
      console.error("Network Error", err);
      return Promise.reject({ message: "Network error. Try again." });
    }

    const { status, data } = err.response;

    if (status === 401) {
      console.warn("Unauthorized — clearing session");
      setAuthToken(null);
      window.location.replace("/login");
    }

    return Promise.reject(
      data?.message || data?.error || "Unexpected server error"
    );
  }
);

// -----------------------------------------------------------------------------
// API ENDPOINTS
// 🔹 Modify if your backend routes differ
// -----------------------------------------------------------------------------

// AUTH
export const AuthAPI = {
  login: (payload) => api.post("/auth/login", payload),
  register: (payload) => api.post("/auth/register", payload),
  me: () => api.get("/auth/me"),
  logout: () => {
    setAuthToken(null);
    return Promise.resolve();
  },
};

// USERS
export const UsersAPI = {
  list: () => api.get("/users"),
  details: (id) => api.get(`/users/${id}`),
};

// QUIZZES
export const QuizzesAPI = {
  list: () => api.get("/quizzes"),
  questions: (quizId) => api.get(`/quizzes/${quizId}/questions`),
  submit: (quizId, answers) =>
    api.post(`/quizzes/${quizId}/submit`, { answers }),
};

// COURSES (optional)
export const CoursesAPI = {
  list: () => api.get("/courses"),
  details: (id) => api.get(`/courses/${id}`),
};

// -----------------------------------------------------------------------------
// EXPORT DEFAULT
// -----------------------------------------------------------------------------
export default api;
