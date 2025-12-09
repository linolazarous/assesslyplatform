// src/contexts/AuthProvider.jsx
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from "react";
import PropTypes from "prop-types";
import axiosLib from "axios";
import { useNavigate } from "react-router-dom";
import { CircularProgress, Box, Typography, Alert, Snackbar, Slide, Fade } from "@mui/material";
import { Security, Error } from "@mui/icons-material";

/** ================================
 * CONFIG
 * ================================ */
const API_BASE = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, "") || "http://localhost:3000";
const API_V1 = `${API_BASE}/api/v1`;

const STORAGE_KEYS = {
  TOKEN: "assessly_token",
  REFRESH_TOKEN: "assessly_refresh_token",
  USER: "assessly_user",
  ORG: "assessly_current_org",
};

const ROLE_HIERARCHY = { super_admin: 100, organization_owner: 90, organization_admin: 80, organization_manager: 70, assessor: 60, candidate: 50, viewer: 40, guest: 10 };

/** ================================
 * UTILS
 * ================================ */
const decodeJWT = (token) => {
  try { return JSON.parse(atob(token.split(".")[1])); } 
  catch { return null; }
};

const isTokenValid = (token) => {
  const decoded = decodeJWT(token);
  return decoded?.exp ? Date.now() + 60 * 1000 < decoded.exp * 1000 : false; // 1-min buffer
};

/** ================================
 * AXIOS INSTANCE
 * ================================ */
const axios = axiosLib.create({
  baseURL: API_V1,
  withCredentials: true,
  headers: { "Content-Type": "application/json", Accept: "application/json" },
  timeout: 30000,
});

/** ================================
 * CONTEXTS
 * ================================ */
const AuthContext = createContext(null);
const OrganizationContext = createContext(null);

/** ================================
 * PROVIDER
 * ================================ */
export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState(null);
  const [currentOrg, setCurrentOrg] = useState(null);
  const [token, setToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [claims, setClaims] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  const refreshTimeout = useRef(null);

  /** ================================
   * SAFE LOCAL STORAGE
   * ================================ */
  const parseLS = (key) => {
    try { return JSON.parse(localStorage.getItem(key)); } 
    catch { localStorage.removeItem(key); return null; }
  };

  /** ================================
   * LOGOUT
   * ================================ */
  const logout = useCallback(() => {
    clearTimeout(refreshTimeout.current);
    localStorage.clear();
    setToken(null);
    setRefreshToken(null);
    setCurrentUser(null);
    setCurrentOrg(null);
    setClaims({});
    navigate("/login", { replace: true });
  }, [navigate]);

  /** ================================
   * REFRESH TOKEN
   * ================================ */
  const refreshAccessToken = useCallback(async () => {
    if (!refreshToken) return logout();
    try {
      const { data } = await axios.post("/auth/refresh", { refreshToken });
      const { token: newToken, user } = data;
      localStorage.setItem(STORAGE_KEYS.TOKEN, newToken);
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      setToken(newToken);
      setCurrentUser(user);
      setClaims(decodeJWT(newToken) || {});
      scheduleRefresh(newToken);
    } catch (err) {
      console.error("Token refresh failed:", err);
      logout();
    }
  }, [refreshToken, logout]);

  /** ================================
   * SCHEDULE REFRESH
   * ================================ */
  const scheduleRefresh = (token) => {
    const decoded = decodeJWT(token);
    if (!decoded?.exp) return;
    const delay = decoded.exp * 1000 - Date.now() - 60 * 1000;
    clearTimeout(refreshTimeout.current);
    if (delay > 0) refreshTimeout.current = setTimeout(refreshAccessToken, delay);
  };

  /** ================================
   * INITIALIZE AUTH
   * ================================ */
  useEffect(() => {
    const initAuth = () => {
      try {
        const tkn = localStorage.getItem(STORAGE_KEYS.TOKEN);
        const refTkn = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
        const user = parseLS(STORAGE_KEYS.USER);
        const org = parseLS(STORAGE_KEYS.ORG);

        if (tkn && isTokenValid(tkn)) {
          setToken(tkn);
          setCurrentUser(user);
          setCurrentOrg(org);
          setClaims(decodeJWT(tkn) || {});
          scheduleRefresh(tkn);
        } else if (refTkn) {
          setRefreshToken(refTkn);
          refreshAccessToken();
        } else {
          logout();
        }
      } catch (err) {
        console.error("Auth init error:", err);
        logout();
      } finally {
        setIsLoading(false);
      }
    };
    initAuth();
    return () => clearTimeout(refreshTimeout.current);
  }, [refreshAccessToken, logout]);

  /** ================================
   * AXIOS INTERCEPTORS
   * ================================ */
  useEffect(() => {
    const req = axios.interceptors.request.use((config) => {
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    });

    const res = axios.interceptors.response.use(
      (res) => res,
      async (err) => {
        if (err.response?.status === 401) await refreshAccessToken();
        return Promise.reject(err);
      }
    );

    return () => {
      axios.interceptors.request.eject(req);
      axios.interceptors.response.eject(res);
    };
  }, [token, refreshAccessToken]);

  /** ================================
   * CONTEXT VALUE
   * ================================ */
  const value = useMemo(() => ({
    currentUser,
    currentOrg,
    claims,
    token,
    refreshToken,
    isAuthenticated: !!token && isTokenValid(token),
    isLoading,
    authError,
    logout,
    axios,
    hasRole: (role) => ROLE_HIERARCHY[claims.role] >= ROLE_HIERARCHY[role] || false,
    setCurrentOrg: (org) => { localStorage.setItem(STORAGE_KEYS.ORG, JSON.stringify(org)); setCurrentOrg(org); },
  }), [currentUser, currentOrg, claims, token, refreshToken, isLoading, authError, logout]);

  /** ================================
   * LOADING UI
   * ================================ */
  if (isLoading) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", minHeight: "100vh", gap: 2 }}>
        <CircularProgress size={60} />
        <Typography>Loading your session...</Typography>
        <Fade in>
          <Alert severity="info" icon={<Security />}>Initializing authentication...</Alert>
        </Fade>
      </Box>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
      <Snackbar open={!!authError} autoHideDuration={6000} onClose={() => setAuthError(null)} anchorOrigin={{ vertical: "top", horizontal: "center" }} TransitionComponent={Slide}>
        <Alert severity="error" variant="filled" onClose={() => setAuthError(null)} icon={<Error />} sx={{ width: "100%" }}>
          {authError}
        </Alert>
      </Snackbar>
    </AuthContext.Provider>
  );
};

AuthProvider.propTypes = { children: PropTypes.node.isRequired };

/** ================================
 * HOOK
 * ================================ */
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
