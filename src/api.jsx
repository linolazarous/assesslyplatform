import axios from "axios";

const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl) return envUrl;

  const isLocal = ["localhost", "127.0.0.1"].includes(window.location.hostname);
  return isLocal
    ? "http://localhost:3000/api"
    : "https://assesslyplatform-t49h.onrender.com/api";
};

export const API_BASE_URL = getApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    "X-Client": "assessly-frontend"
  },
  timeout: 20000
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem("token");
  if (token?.startsWith("eyJ") && token.length > 50) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  config.headers["X-Request-ID"] = Date.now().toString();
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    const status = err.response?.status;
    if (status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      if (!window.location.pathname.includes("/auth")) {
        window.location.href = "/auth";
      }
    }
    if (status === 429) err.message = "Too many requests. Try again later.";
    if (status >= 500) err.message = "Server unavailable. Please retry.";
    if (!status) err.message = "Network error. Check connection.";
    return Promise.reject(err);
  }
);

export const handleRequest = async (promise, retries = 2, delay = 1000) => {
  try {
    const res = await promise;
    return res.data;
  } catch (err) {
    if (retries > 0 && (!err.status || err.status >= 500)) {
      await new Promise(r => setTimeout(r, delay));
      return handleRequest(promise, retries - 1, delay * 2);
    }
    throw err;
  }
};

export default api;
