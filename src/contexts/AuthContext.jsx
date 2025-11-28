// src/contexts/AuthContext.jsx
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
} from "react";
import { CircularProgress, Box, Typography } from "@mui/material";
import PropTypes from "prop-types";
import axiosLib from "axios";

/**
 * Production-ready AuthContext
 * Fully compliant with Assessly Platform API documentation
 * Includes:
 * - Token validation
 * - Refresh token retry logic
 * - Global axios instance
 * - Auto retry on 401
 * - Role & permission helpers
 * - Optimized performance with useMemo/useCallback
 */

// ================================
// API CONFIG
// ================================
const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  "https://assesslyplatform-t49h.onrender.com";
const API_V1_BASE = `${API_BASE.replace(/\/+$/, "")}/api/v1`;

const AuthContext = createContext(null);

// ================================
// JWT DECODER WITH VALIDATION
// ================================
function decodeJwt(token) {
  if (!token || typeof token !== "string") return null;

  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = payload.padEnd(payload.length + (4 - (payload.length % 4)) % 4, "=");

    const json = atob(padded);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// ================================
// AXIOS INSTANCE
// ================================
const axios = axiosLib.create({
  baseURL: API_V1_BASE,
  withCredentials: true,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Add token to requests
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;

  config.metadata = { startTime: Date.now() };
  return config;
});

// Track response times
axios.interceptors.response.use(
  (response) => {
    const start = response.config.metadata?.startTime;
    if (start) {
      console.debug(
        `API ${response.config.method?.toUpperCase()} ${response.config.url} - ${
          Date.now() - start
        }ms`
      );
    }
    return response;
  },
  (error) => Promise.reject(error)
);

// ================================
// HOOK
// ================================
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};

// ================================
// PROVIDER
// ================================
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [claims, setClaims] = useState({});
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastTokenRefresh, setLastTokenRefresh] = useState(null);

  // ================================
  // LOGOUT
  // ================================
  const logout = useCallback(() => {
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    } catch {}

    delete axios.defaults.headers.common.Authorization;

    setCurrentUser(null);
    setClaims({});
    setToken(null);
    setLastTokenRefresh(null);
  }, []);

  // ================================
  // SET USER FROM TOKEN
  // ================================
  const decodeAndSetUser = useCallback(
    (jwtToken) => {
      const decoded = decodeJwt(jwtToken);
      if (!decoded) {
        logout();
        return false;
      }

      const { email, role, orgs, permissions, exp, userId, id, name } = decoded;

      // Token expiry check (5 min buffer)
      const buffer = 5 * 60 * 1000;
      if (!exp || Date.now() + buffer >= exp * 1000) {
        refreshAccessToken();
        return false;
      }

      const userData = {
        id: userId || id,
        email,
        role,
        name: name || email.split("@")[0],
      };

      setCurrentUser(userData);
      setClaims({ role, orgs: orgs || {}, permissions: permissions || [], exp });
      setToken(jwtToken);
      setLastTokenRefresh(Date.now());

      localStorage.setItem("token", jwtToken);
      localStorage.setItem("user", JSON.stringify(userData));

      return true;
    },
    [logout]
  );

  // ================================
  // REFRESH TOKEN
  // ================================
  const refreshAccessToken = useCallback(
    async (maxRetries = 2) => {
      for (let i = 0; i <= maxRetries; i++) {
        try {
          const res = await axios.get("/auth/refresh", {
            withCredentials: true,
            timeout: 10000,
          });

          const newToken = res.data?.token;
          if (newToken && decodeAndSetUser(newToken)) return true;

          throw new Error("Invalid token from refresh endpoint");
        } catch (err) {
          if (i === maxRetries) {
            logout();
            return false;
          }
          await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
        }
      }
      return false;
    },
    [decodeAndSetUser, logout]
  );

  // ================================
  // AUTO REFRESH ON 401
  // ================================
  useEffect(() => {
    const id = axios.interceptors.response.use(
      (res) => res,
      async (error) => {
        const req = error.config;

        if (error.response?.status !== 401 || req._retry) {
          return Promise.reject(error);
        }

        req._retry = true;

        const ok = await refreshAccessToken(1);
        if (ok) {
          req.headers.Authorization = `Bearer ${localStorage.getItem("token")}`;
          return axios(req);
        }

        return Promise.reject(error);
      }
    );

    return () => axios.interceptors.response.eject(id);
  }, [refreshAccessToken]);

  // ================================
  // INITIAL AUTH LOAD
  // ================================
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);

      try {
        const stored = localStorage.getItem("token");
        if (stored) decodeAndSetUser(stored);
      } catch {
        logout();
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, [decodeAndSetUser, logout]);

  // ================================
  // PROACTIVE EXPIRY REFRESH
  // ================================
  useEffect(() => {
    if (!token || !claims.exp) return;

    const refreshTime =
      claims.exp * 1000 - 15 * 60 * 1000 - Date.now(); // 15 min before expiry

    if (refreshTime <= 0) {
      refreshAccessToken();
      return;
    }

    const timer = setTimeout(() => refreshAccessToken(), refreshTime);
    return () => clearTimeout(timer);
  }, [token, claims.exp, refreshAccessToken]);

  // ================================
  // LOGIN
  // ================================
  const login = useCallback(
    async (email, password) => {
      try {
        const res = await axios.post("/auth/login", {
          email: email.trim().toLowerCase(),
          password,
        });

        const jwtToken = res.data?.token;
        if (!jwtToken) throw new Error("Token missing");

        decodeAndSetUser(jwtToken);

        return { ok: true, message: "Login successful" };
      } catch (err) {
        const msg =
          err.response?.data?.message ||
          err.response?.data?.error?.message ||
          "Login failed";
        return { ok: false, error: msg };
      }
    },
    [decodeAndSetUser]
  );

  // ================================
  // REGISTER
  // ================================
  const register = useCallback(async (data) => {
    try {
      if (!data.email || !data.password || !data.name)
        throw new Error("All fields required");

      const res = await axios.post("/auth/register", {
        ...data,
        email: data.email.trim().toLowerCase(),
        name: data.name.trim(),
      });

      return { ok: true, data: res.data };
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error?.message ||
        "Registration failed";
      return { ok: false, error: msg };
    }
  }, []);

  // ================================
  // PERMISSION HELPERS
  // ================================
  const hasPermission = useCallback(
    (perm) => claims?.permissions?.includes(perm),
    [claims]
  );

  const hasAnyPermission = useCallback(
    (perms) => perms.some((p) => claims?.permissions?.includes(p)),
    [claims]
  );

  const canAccess = useCallback(
    (role, perms = []) => {
      if (role && claims.role !== role) return false;
      if (perms.length && !hasAnyPermission(perms)) return false;
      return true;
    },
    [claims, hasAnyPermission]
  );

  // ================================
  // CONTEXT VALUE
  // ================================
  const value = useMemo(
    () => ({
      currentUser,
      claims,
      token,
      isAuthenticated: !!token,
      isLoading,

      login,
      logout,
      register,
      refreshAccessToken,

      isAdmin: claims.role === "admin",
      isAssessor: claims.role === "assessor",
      isCandidate: claims.role === "candidate",

      hasPermission,
      hasAnyPermission,
      canAccess,

      axios,
      apiBase: API_V1_BASE,

      _debug: {
        lastTokenRefresh,
        tokenExpiry: claims.exp
          ? new Date(claims.exp * 1000).toISOString()
          : null,
      },
    }),
    [
      currentUser,
      claims,
      token,
      isLoading,
      login,
      logout,
      register,
      refreshAccessToken,
      hasPermission,
      hasAnyPermission,
      canAccess,
      lastTokenRefresh,
    ]
  );

  // ================================
  // LOADING SCREEN
  // ================================
  if (isLoading) {
    return (
      <Box
        sx={{
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          gap: 2,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <CircularProgress size={60} />
        <Typography variant="body1" color="text.secondary">
          Loading...
        </Typography>
      </Box>
    );
  }

  // ================================
  // RENDER
  // ================================
  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default AuthProvider;
