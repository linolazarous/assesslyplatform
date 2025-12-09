// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from "react";
import PropTypes from "prop-types";
import axiosLib from "axios";
import { useNavigate } from "react-router-dom";
import { useSnackbar } from "notistack";
import { CircularProgress, Box, Typography, Alert, Snackbar, Slide, Fade } from "@mui/material";
import { Security, Error } from "@mui/icons-material";

/** ================================
 * CONSTANTS
 * ================================ */
const API_V1_BASE = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, "") + "/api/v1" || "http://localhost:3000/api/v1";

const STORAGE_KEYS = {
  TOKEN: "assessly_token",
  REFRESH_TOKEN: "assessly_refresh_token",
  USER: "assessly_user",
  ORGANIZATION: "assessly_current_org",
  TOKEN_EXPIRY: "assessly_token_expiry",
};

const ROLE_HIERARCHY = { super_admin: 100, organization_owner: 90, organization_admin: 80, organization_manager: 70, assessor: 60, candidate: 50, viewer: 40, guest: 10 };

/** ================================
 * UTILS
 * ================================ */
const decodeJwt = (token) => {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
};

const isTokenValid = (token) => {
  const decoded = decodeJwt(token);
  if (!decoded?.exp) return false;
  return Date.now() + 5 * 60 * 1000 < decoded.exp * 1000; // 5-minute buffer
};

/** ================================
 * AXIOS INSTANCE
 * ================================ */
const axios = axiosLib.create({
  baseURL: API_V1_BASE,
  withCredentials: true,
  timeout: 30000,
  headers: { "Content-Type": "application/json", Accept: "application/json" },
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
  const { enqueueSnackbar } = useSnackbar();

  const [currentUser, setCurrentUser] = useState(null);
  const [claims, setClaims] = useState({});
  const [token, setToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [currentOrganization, setCurrentOrganization] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  const refreshTimeoutRef = useRef(null);

  /** SAFE LOCAL STORAGE PARSE */
  const parseLocalStorage = (key) => {
    try { return JSON.parse(localStorage.getItem(key)); } 
    catch { localStorage.removeItem(key); return null; }
  };

  /** ================================
   * LOGOUT
   * ================================ */
  const logout = useCallback(() => {
    clearTimeout(refreshTimeoutRef.current);
    localStorage.clear();
    setToken(null);
    setRefreshToken(null);
    setCurrentUser(null);
    setCurrentOrganization(null);
    setClaims({});
    navigate("/login", { replace: true });
  }, [navigate]);

  /** ================================
   * TOKEN REFRESH
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
      setClaims(decodeJwt(newToken) || {});
      scheduleTokenRefresh(newToken);
    } catch (err) {
      console.error("Token refresh failed:", err);
      logout();
    }
  }, [refreshToken, logout]);

  /** ================================
   * SCHEDULE AUTO REFRESH
   * ================================ */
  const scheduleTokenRefresh = (token) => {
    const decoded = decodeJwt(token);
    if (!decoded?.exp) return;
    const expiryMs = decoded.exp * 1000 - Date.now() - 60 * 1000; // 1 min before expiry
    clearTimeout(refreshTimeoutRef.current);
    if (expiryMs > 0) refreshTimeoutRef.current = setTimeout(refreshAccessToken, expiryMs);
  };

  /** ================================
   * INITIALIZE AUTH
   * ================================ */
  useEffect(() => {
    const initAuth = () => {
      try {
        const storedToken = localStorage.getItem(STORAGE_KEYS.TOKEN);
        const storedRefresh = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
        const storedUser = parseLocalStorage(STORAGE_KEYS.USER);
        const storedOrg = parseLocalStorage(STORAGE_KEYS.ORGANIZATION);

        if (storedToken && isTokenValid(storedToken)) {
          setToken(storedToken);
          setCurrentUser(storedUser || null);
          setCurrentOrganization(storedOrg || null);
          setClaims(decodeJwt(storedToken) || {});
          scheduleTokenRefresh(storedToken);
        } else if (storedRefresh) {
          setRefreshToken(storedRefresh);
          refreshAccessToken();
        } else {
          logout();
        }
      } catch (err) {
        console.error("Auth initialization error:", err);
        logout();
      } finally {
        setIsLoading(false);
      }
    };
    initAuth();
    return () => clearTimeout(refreshTimeoutRef.current);
  }, [refreshAccessToken, logout]);

  /** ================================
   * AXIOS INTERCEPTOR
   * ================================ */
  useEffect(() => {
    const reqInterceptor = axios.interceptors.request.use((config) => {
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    });

    const resInterceptor = axios.interceptors.response.use(
      (res) => res,
      async (error) => {
        if (error.response?.status === 401) await refreshAccessToken();
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.request.eject(reqInterceptor);
      axios.interceptors.response.eject(resInterceptor);
    };
  }, [token, refreshAccessToken]);

  /** ================================
   * CONTEXT VALUE
   * ================================ */
  const value = useMemo(() => ({
    currentUser,
    claims,
    token,
    refreshToken,
    currentOrganization,
    organizations,
    isLoading,
    isAuthenticated: !!token && isTokenValid(token),
    authError,
    logout,
    axios,
  }), [currentUser, claims, token, refreshToken, currentOrganization, organizations, isLoading, authError, logout]);

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
 * HOOKS
 * ================================ */
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
