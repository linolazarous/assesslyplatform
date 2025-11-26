// src/contexts/AuthContext.jsx

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
} from "react";
import { CircularProgress, Box } from "@mui/material";
import PropTypes from "prop-types";
import axiosLib from "axios";

/**
 * Production-ready AuthContext
 * Avoids jwt-decode ESM import issues by using a tiny local decode helper
 * Central axios instance with auth header + refresh-on-401 logic
 * Uses localStorage token and periodic refresh
 */

// Use VITE_API_BASE_URL if provided, otherwise point to your deployed backend.
// NOTE: keep the origin only (no trailing /api/v1), Axios instance below composes v1 path.
const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://assesslyplatform-t49h.onrender.com";
const API_V1_BASE = API_BASE.replace(/\/+$/, "") + "/api/v1";

const AuthContext = createContext(null);

// Local JWT decode helper (safe, small — avoids external dependency problems)
function decodeJwt(token) {
  if (!token || typeof token !== "string") return null;
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    
    // base64-url decode
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(payload)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(json);
  } catch (e) {
    if (import.meta.env.DEV) console.warn("decodeJwt failed:", e);
    return null;
  }
}

// Create an axios instance for auth-related requests
const axios = axiosLib.create({
  baseURL: API_V1_BASE,
  withCredentials: true, // cookie-based refresh endpoints often need this
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [claims, setClaims] = useState({});
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Attach token header for outgoing requests
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common.Authorization = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common.Authorization;
    }
  }, [token]);

  // axios response interceptor: on 401 attempt refresh once
  useEffect(() => {
    const interceptorId = axios.interceptors.response.use(
      (res) => res,
      async (err) => {
        const originalReq = err.config;
        if (!originalReq || originalReq._retry) return Promise.reject(err);
        
        if (err.response && err.response.status === 401) {
          originalReq._retry = true;
          try {
            const refreshRes = await axios.get("/auth/refresh"); // /api/v1/auth/refresh
            const newToken = refreshRes.data?.token;
            if (newToken) {
              // apply new token globally and retry original request
              localStorage.setItem("token", newToken);
              setToken(newToken);
              axios.defaults.headers.common.Authorization = `Bearer ${newToken}`;
              originalReq.headers.Authorization = `Bearer ${newToken}`;
              return axios(originalReq);
            }
          } catch (refreshErr) {
            // refresh failed — fall through to logout
            if (import.meta.env.DEV) console.warn("Token refresh failed:", refreshErr);
          }
        }
        return Promise.reject(err);
      }
    );
    
    return () => axios.interceptors.response.eject(interceptorId);
  }, []);

  /** Logout user */
  const logout = useCallback(() => {
    try {
      localStorage.removeItem("token");
    } catch (e) {
      // ignore
    }
    setCurrentUser(null);
    setClaims({});
    setToken(null);
  }, []);

  /** Decode token & set user state */
  const decodeAndSetUser = useCallback((jwtToken) => {
    if (!jwtToken) {
      logout();
      return;
    }

    const decoded = decodeJwt(jwtToken);
    if (!decoded) {
      // invalid token
      logout();
      return;
    }

    const { email, role, orgs, permissions, exp, userId, id } = decoded;
    
    // expiry check (exp is in seconds)
    if (!exp || Date.now() >= exp * 1000) {
      // try refresh flow — caller should handle
      // keep token set to null for safety
      if (import.meta.env.DEV) console.info("JWT expired, attempting refresh.");
      refreshAccessToken();
      return;
    }

    setCurrentUser({
      id: userId || id,
      email,
      role
    });
    setClaims({
      role,
      orgs,
      permissions: permissions || []
    });
    setToken(jwtToken);
    
    try {
      localStorage.setItem("token", jwtToken);
    } catch (_) {
      // ignore storage issues in private mode
    }
  }, [logout]);

  /** Refresh access token (calls backend refresh endpoint) */
  const refreshAccessToken = useCallback(async () => {
    try {
      const res = await axios.get("/auth/refresh", { withCredentials: true }); // resolves to API_V1_BASE/auth/refresh
      const newToken = res.data?.token;
      if (newToken) {
        decodeAndSetUser(newToken);
        if (import.meta.env.DEV) console.info("Token refreshed successfully.");
        return true;
      }
      logout();
      return false;
    } catch (err) {
      if (import.meta.env.DEV) console.error("refreshAccessToken error:", err);
      logout();
      return false;
    }
  }, [decodeAndSetUser, logout]);

  // Initialize from localStorage
  useEffect(() => {
    setIsLoading(true);
    try {
      const stored = localStorage.getItem("token");
      if (stored) {
        decodeAndSetUser(stored);
      }
    } catch (e) {
      if (import.meta.env.DEV) console.warn("Failed to read token from localStorage", e);
    } finally {
      setIsLoading(false);
    }
  }, [decodeAndSetUser]);

  // Periodic refresh every 10 minutes when a token exists
  useEffect(() => {
    if (!token) return undefined;
    
    const id = setInterval(() => {
      refreshAccessToken().catch(() => {});
    }, 10 * 60 * 1000);
    
    return () => clearInterval(id);
  }, [token, refreshAccessToken]);

  /** Login */
  const login = useCallback(async (email, password) => {
    try {
      const res = await axios.post("/auth/login", { email, password });
      const jwtToken = res.data?.token;
      if (!jwtToken) throw new Error("No token returned from server");
      
      decodeAndSetUser(jwtToken);
      return { ok: true };
    } catch (err) {
      if (import.meta.env.DEV) console.error("Login failed:", err);
      return { ok: false, error: err?.response?.data || err.message || "Login failed" };
    }
  }, [decodeAndSetUser]);

  /** Register */
  const register = useCallback(async (userData) => {
    try {
      const res = await axios.post("/auth/register", userData);
      return { ok: true, data: res.data };
    } catch (err) {
      if (import.meta.env.DEV) console.error("Registration failed:", err);
      return { ok: false, error: err?.response?.data || err.message || "Registration failed" };
    }
  }, []);

  // Helpers
  const isAdmin = claims?.role === "admin";
  const isAssessor = claims?.role === "assessor";
  const isCandidate = claims?.role === "candidate";
  const getOrgRole = useCallback((orgId) => claims?.orgs?.[orgId] || null, [claims]);
  const hasPermission = useCallback((perm) => 
    Array.isArray(claims?.permissions) && claims.permissions.includes(perm), 
    [claims]
  );

  const value = useMemo(
    () => ({
      currentUser,
      claims,
      token,
      isLoading,
      login,
      logout,
      register,
      refreshAccessToken,
      isAdmin,
      isAssessor,
      isCandidate,
      getOrgRole,
      hasPermission,
      axios, // export axios instance for callers who need it
      isAuthenticated: !!token, // Added missing isAuthenticated property
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
      isAdmin, 
      isAssessor, 
      isCandidate, 
      getOrgRole, 
      hasPermission
    ]
  );

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default AuthProvider;
