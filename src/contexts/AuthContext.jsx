// src/contexts/AuthContext.jsx
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
} from "react";
import {
  CircularProgress,
  Box,
  Typography,
  Alert,
  Snackbar,
  Slide,
  Fade,
} from "@mui/material";
import {
  Security,
  VerifiedUser,
  AdminPanelSettings,
  Business,
  Groups,
  Person,
  Error,
  Warning,
  Info,
  CheckCircle,
} from "@mui/icons-material";
import PropTypes from "prop-types";
import axiosLib from "axios";
import { useNavigate } from "react-router-dom";
import { useSnackbar } from "notistack";

/**
 * Enhanced AuthContext for Assessly Platform
 * Features:
 * - Multi-tenant authentication
 * - Organization context management
 * - Role-based permissions with hierarchy
 * - Token refresh with exponential backoff
 * - Session management
 * - Activity tracking
 * - Comprehensive error handling
 */

// ================================
// CONSTANTS & CONFIG
// ================================

// Get API base URL - IMPORTANT FIX: Use proper API URL from environment
const getApiBase = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  
  // Production defaults - ensure it ends with /api/v1
  if (import.meta.env.PROD) {
    if (envUrl) {
      return envUrl.endsWith('/api/v1') ? envUrl : `${envUrl.replace(/\/+$/, '')}/api/v1`;
    }
    return 'https://assesslyplatform-t49h.onrender.com/api/v1';
  }
  
  // Development defaults
  if (envUrl) {
    return envUrl.endsWith('/api/v1') ? envUrl : `${envUrl.replace(/\/+$/, '')}/api/v1`;
  }
  
  // Local development
  if (import.meta.env.DEV) {
    return 'http://localhost:3000/api/v1';
  }
  
  // Fallback
  return 'https://assesslyplatform-t49h.onrender.com/api/v1';
};

const API_V1_BASE = getApiBase();

// Token storage keys
const STORAGE_KEYS = {
  TOKEN: 'assessly_token',
  REFRESH_TOKEN: 'assessly_refresh_token',
  USER: 'assessly_user',
  ORGANIZATION: 'assessly_current_org',
  SESSION: 'assessly_session',
  TOKEN_EXPIRY: 'assessly_token_expiry',
};

// Role hierarchy (higher number = higher privilege)
const ROLE_HIERARCHY = {
  super_admin: 100,
  organization_owner: 90,
  organization_admin: 80,
  organization_manager: 70,
  assessor: 60,
  candidate: 50,
  viewer: 40,
  guest: 10,
};

// Default permissions per role
const DEFAULT_PERMISSIONS = {
  super_admin: ["*"],
  organization_owner: ["org:*", "assessment:*", "user:manage", "billing:*"],
  organization_admin: ["org:settings", "assessment:create", "assessment:edit", "user:view"],
  organization_manager: ["assessment:create", "assessment:edit", "report:view"],
  assessor: ["assessment:create", "assessment:evaluate", "response:view"],
  candidate: ["assessment:take", "result:own"],
  viewer: ["assessment:view", "report:view"],
  guest: ["assessment:public"],
};

const AuthContext = createContext(null);
const OrganizationContext = createContext(null);

// ================================
// JWT UTILITIES
// ================================
const decodeJwt = (token) => {
  if (!token || typeof token !== "string") return null;

  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );

    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error("JWT decode error:", error);
    return null;
  }
};

const isTokenValid = (token) => {
  if (!token) return false;
  
  const decoded = decodeJwt(token);
  if (!decoded || !decoded.exp) return false;
  
  // Check expiration with 5-minute buffer
  const buffer = 5 * 60 * 1000;
  return Date.now() + buffer < decoded.exp * 1000;
};

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
    "X-Client": "assessly-web",
    "X-Client-Version": import.meta.env.VITE_APP_VERSION || "1.0.0",
  },
});

// Request interceptor for auth token
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add organization context if available
    const currentOrg = localStorage.getItem(STORAGE_KEYS.ORGANIZATION);
    if (currentOrg) {
      try {
        const org = JSON.parse(currentOrg);
        config.headers["X-Organization-ID"] = org.id;
      } catch (e) {
        // Ignore parsing errors
      }
    }
    
    // Add session ID if available
    const sessionId = localStorage.getItem(STORAGE_KEYS.SESSION);
    if (sessionId) {
      config.headers["X-Session-ID"] = sessionId;
    }
    
    config.metadata = { startTime: Date.now(), url: config.url };
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for enhanced error handling
axios.interceptors.response.use(
  (response) => {
    const { startTime, url } = response.config.metadata || {};
    if (startTime) {
      const duration = Date.now() - startTime;
      if (import.meta.env.DEV) {
        console.debug(`✅ API ${response.config.method?.toUpperCase()} ${url} - ${duration}ms`);
      }
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    const { startTime, url } = originalRequest?.metadata || {};
    
    if (startTime) {
      const duration = Date.now() - startTime;
      console.error(`🔴 API ${originalRequest?.method?.toUpperCase()} ${url} - ${duration}ms - Error: ${error.message}`);
    }
    
    // Handle network errors
    if (!error.response) {
      const networkError = new Error('Network error. Please check your connection.');
      networkError.code = 'NETWORK_ERROR';
      networkError.status = 0;
      return Promise.reject(networkError);
    }
    
    return Promise.reject(error);
  }
);

// ================================
// HOOKS
// ================================
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};

export const useOrganization = () => {
  const ctx = useContext(OrganizationContext);
  if (!ctx) throw new Error("useOrganization must be used inside OrganizationProvider");
  return ctx;
};

// ================================
// PROVIDERS
// ================================
export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  
  // State
  const [currentUser, setCurrentUser] = useState(null);
  const [claims, setClaims] = useState({});
  const [token, setToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [currentOrganization, setCurrentOrganization] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sessionActivity, setSessionActivity] = useState(null);
  const [authError, setAuthError] = useState(null);
  
  // Refs
  const refreshTimeoutRef = useRef(null);
  const activityTimeoutRef = useRef(null);
  const retryCountRef = useRef(0);
  const sessionIdRef = useRef(null);

  // ================================
  // SESSION MANAGEMENT
  // ================================
  const generateSessionId = useCallback(() => {
    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    localStorage.setItem(STORAGE_KEYS.SESSION, sessionId);
    sessionIdRef.current = sessionId;
    return sessionId;
  }, []);

  const updateSessionActivity = useCallback(() => {
    setSessionActivity(Date.now());
    if (sessionIdRef.current) {
      localStorage.setItem('assessly_last_activity', Date.now().toString());
    }
  }, []);

  // Auto logout after inactivity
  useEffect(() => {
    const handleUserActivity = () => {
      updateSessionActivity();
    };

    // Listen for user activity
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach(event => {
      window.addEventListener(event, handleUserActivity, { passive: true });
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleUserActivity);
      });
    };
  }, [updateSessionActivity]);

  // Check session timeout (24 hours)
  useEffect(() => {
    if (!sessionActivity || !token) return;

    const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

    const checkTimeout = () => {
      if (Date.now() - sessionActivity > SESSION_TIMEOUT) {
        enqueueSnackbar("Session expired due to inactivity", { 
          variant: "warning",
          autoHideDuration: 3000,
        });
        logout("Session expired due to inactivity");
      }
    };

    const interval = setInterval(checkTimeout, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [sessionActivity, token, enqueueSnackbar]);

  // ================================
  // TOKEN MANAGEMENT
  // ================================
  const saveTokens = useCallback((accessToken, refreshTokenValue, expiry = null) => {
    localStorage.setItem(STORAGE_KEYS.TOKEN, accessToken);
    if (refreshTokenValue) {
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshTokenValue);
    }
    if (expiry) {
      localStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRY, expiry);
    }
    setToken(accessToken);
    setRefreshToken(refreshTokenValue);
    
    // Generate session ID on first token save
    if (!sessionIdRef.current) {
      generateSessionId();
    }
  }, [generateSessionId]);

  const clearTokens = useCallback(() => {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
    localStorage.removeItem("assessly_remember_me");
    localStorage.removeItem('assessly_last_activity');
    setToken(null);
    setRefreshToken(null);
    sessionIdRef.current = null;
  }, []);

  // ================================
  // USER & CLAIMS MANAGEMENT
  // ================================
  const decodeAndSetUser = useCallback((jwtToken, refreshTokenValue = null) => {
    const decoded = decodeJwt(jwtToken);
    if (!decoded) {
      console.error("Failed to decode JWT token");
      clearTokens();
      return false;
    }

    // Validate token expiration
    if (!isTokenValid(jwtToken)) {
      console.warn("Token expired or invalid");
      if (refreshTokenValue) {
        // Try to refresh
        refreshAccessToken(refreshTokenValue);
        return false;
      }
      clearTokens();
      return false;
    }

    const {
      sub,
      email,
      role,
      orgs = {},
      permissions = [],
      name,
      userId,
      exp,
      iat,
      aud,
      iss,
    } = decoded;

    // Build user object
    const userData = {
      id: userId || sub,
      email: email || sub,
      name: name || email?.split("@")[0] || "User",
      role: role || "guest",
      avatar: decoded.avatar,
      emailVerified: decoded.email_verified || false,
      phone: decoded.phone,
      jobTitle: decoded.job_title,
      department: decoded.department,
      createdAt: decoded.created_at,
    };

    // Build claims object
    const claimsData = {
      role: role || "guest",
      orgs: orgs || {},
      permissions: permissions.length > 0 ? permissions : DEFAULT_PERMISSIONS[role] || [],
      exp,
      iat,
      aud,
      iss,
      userId: userData.id,
    };

    // Calculate hierarchy level
    claimsData.hierarchyLevel = ROLE_HIERARCHY[role] || ROLE_HIERARCHY.guest;

    setCurrentUser(userData);
    setClaims(claimsData);
    
    // Calculate token expiry
    const expiry = exp ? new Date(exp * 1000).toISOString() : null;
    saveTokens(jwtToken, refreshTokenValue, expiry);

    // Save to localStorage
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));

    // Load organizations if available
    if (orgs && Object.keys(orgs).length > 0) {
      const orgList = Object.entries(orgs).map(([id, org]) => ({
        id,
        ...org,
      }));
      setOrganizations(orgList);
      
      // Set current organization if not set
      if (!currentOrganization && orgList.length > 0) {
        const defaultOrg = orgList[0];
        setCurrentOrganization(defaultOrg);
        localStorage.setItem(STORAGE_KEYS.ORGANIZATION, JSON.stringify(defaultOrg));
      }
    }

    updateSessionActivity();
    setAuthError(null);
    return true;
  }, [clearTokens, saveTokens, currentOrganization, updateSessionActivity, refreshAccessToken]);

  // ================================
  // TOKEN REFRESH
  // ================================
  const refreshAccessToken = useCallback(async (customRefreshToken = null) => {
    if (isRefreshing) {
      console.log("Token refresh already in progress");
      return false;
    }
    
    setIsRefreshing(true);
    const refreshTokenToUse = customRefreshToken || refreshToken;
    
    if (!refreshTokenToUse) {
      console.warn("No refresh token available");
      setIsRefreshing(false);
      return false;
    }

    try {
      console.log("🔄 Refreshing access token...");
      
      const response = await axios.post("/auth/refresh", {
        refresh_token: refreshTokenToUse,
      }, {
        timeout: 10000,
        headers: {
          'X-Bypass-Rate-Limit': 'true'
        }
      });

      const { access_token, refresh_token } = response.data;
      
      if (!access_token) {
        throw new Error("Invalid token response: No access token");
      }

      decodeAndSetUser(access_token, refresh_token || refreshTokenToUse);
      retryCountRef.current = 0;
      setIsRefreshing(false);
      
      console.log("✅ Token refreshed successfully");
      return true;
    } catch (error) {
      console.error("❌ Token refresh failed:", error);
      retryCountRef.current++;
      
      // Exponential backoff
      if (retryCountRef.current <= 3) {
        const delay = Math.min(1000 * Math.pow(2, retryCountRef.current - 1), 30000);
        console.log(`Retrying token refresh in ${delay}ms (attempt ${retryCountRef.current}/3)`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return refreshAccessToken(refreshTokenToUse);
      }
      
      // Max retries reached
      enqueueSnackbar("Session expired. Please log in again.", { 
        variant: "error",
        autoHideDuration: 5000,
      });
      
      logout("Session expired");
      setIsRefreshing(false);
      return false;
    }
  }, [refreshToken, isRefreshing, decodeAndSetUser, enqueueSnackbar]);

  // ================================
  // AUTO-REFRESH INTERCEPTOR
  // ================================
  useEffect(() => {
    const interceptorId = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        
        // Skip if already retrying or not a 401
        if (error.response?.status !== 401 || originalRequest._retry) {
          return Promise.reject(error);
        }
        
        // Skip for auth endpoints to avoid loops
        if (originalRequest.url?.includes('/auth/')) {
          return Promise.reject(error);
        }
        
        originalRequest._retry = true;
        
        // Try to refresh token
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          // Update auth header and retry
          const newToken = localStorage.getItem(STORAGE_KEYS.TOKEN);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return axios(originalRequest);
        }
        
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptorId);
    };
  }, [refreshAccessToken]);

  // ================================
  // PROACTIVE TOKEN REFRESH
  // ================================
  useEffect(() => {
    if (!token || !claims.exp) return;
    
    // Calculate refresh time (15 minutes before expiry)
    const refreshTime = claims.exp * 1000 - 15 * 60 * 1000 - Date.now();
    
    if (refreshTime <= 0) {
      // Token already expired or close to expiry
      if (!isRefreshing) {
        refreshAccessToken();
      }
      return;
    }
    
    // Clear any existing timeout
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    
    // Schedule refresh
    refreshTimeoutRef.current = setTimeout(() => {
      if (!isRefreshing) {
        refreshAccessToken();
      }
    }, Math.max(refreshTime, 1000)); // Ensure at least 1 second
    
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [token, claims.exp, refreshAccessToken, isRefreshing]);

  // ================================
  // AUTH METHODS
  // ================================
  const login = useCallback(async (email, password, rememberMe = false) => {
    setIsLoading(true);
    setAuthError(null);
    
    try {
      const response = await axios.post("/auth/login", {
        email: email.trim().toLowerCase(),
        password,
        remember_me: rememberMe,
      });

      const { access_token, refresh_token, user } = response.data;
      
      if (!access_token) {
        throw new Error("Authentication failed: No token received");
      }
      
      decodeAndSetUser(access_token, refresh_token);
      
      // Store remember me preference
      if (rememberMe) {
        localStorage.setItem("assessly_remember_me", "true");
      }
      
      enqueueSnackbar("Login successful!", { 
        variant: "success",
        autoHideDuration: 3000,
      });
      
      return { 
        ok: true, 
        user: currentUser,
        requiresTwoFactor: response.data.requires_2fa || false,
        twoFactorMethods: response.data.two_factor_methods || [],
      };
    } catch (error) {
      const message = error.response?.data?.message || 
                     error.response?.data?.error?.message || 
                     error.response?.data?.error ||
                     error.message || 
                     "Login failed. Please check your credentials.";
      
      setAuthError(message);
      enqueueSnackbar(message, { 
        variant: "error",
        autoHideDuration: 5000,
      });
      
      return { 
        ok: false, 
        error: message,
        requiresTwoFactor: false,
        twoFactorMethods: [],
      };
    } finally {
      setIsLoading(false);
    }
  }, [decodeAndSetUser, enqueueSnackbar, currentUser]);

  const register = useCallback(async (userData) => {
    setIsLoading(true);
    setAuthError(null);
    
    try {
      const response = await axios.post("/auth/register", {
        name: userData.name?.trim() || '',
        email: userData.email?.trim().toLowerCase() || '',
        password: userData.password || '',
        role: userData.role || "candidate",
        phone: userData.phone || '',
        job_title: userData.jobTitle || '',
        department: userData.department || '',
        organization_name: userData.organizationName || '',
        invite_code: userData.inviteCode || '',
      });

      const { access_token, refresh_token, user, requires_verification } = response.data;
      
      if (access_token) {
        decodeAndSetUser(access_token, refresh_token);
      }
      
      enqueueSnackbar("Account created successfully!", { 
        variant: "success",
        autoHideDuration: 3000,
      });
      
      return { 
        ok: true, 
        user: user || currentUser,
        requiresVerification: requires_verification || false,
      };
    } catch (error) {
      const message = error.response?.data?.message || 
                     error.response?.data?.error?.message || 
                     error.response?.data?.error ||
                     error.message || 
                     "Registration failed. Please try again.";
      
      setAuthError(message);
      enqueueSnackbar(message, { 
        variant: "error",
        autoHideDuration: 5000,
      });
      
      return { ok: false, error: message };
    } finally {
      setIsLoading(false);
    }
  }, [decodeAndSetUser, enqueueSnackbar, currentUser]);

  const logout = useCallback((message = "Logged out successfully") => {
    // Clear all local storage
    clearTokens();
    
    // Clear state
    setCurrentUser(null);
    setClaims({});
    setToken(null);
    setRefreshToken(null);
    setCurrentOrganization(null);
    setOrganizations([]);
    setSessionActivity(null);
    setAuthError(null);
    
    // Clear axios headers
    delete axios.defaults.headers.common.Authorization;
    
    // Clear timeouts
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }
    
    if (activityTimeoutRef.current) {
      clearTimeout(activityTimeoutRef.current);
      activityTimeoutRef.current = null;
    }
    
    // Show logout message
    if (message) {
      enqueueSnackbar(message, { 
        variant: "info",
        autoHideDuration: 3000,
      });
    }
    
    // Navigate to login
    navigate("/login", { replace: true });
  }, [enqueueSnackbar, navigate, clearTokens]);

  const forgotPassword = useCallback(async (email) => {
    try {
      await axios.post("/auth/forgot-password", {
        email: email.trim().toLowerCase(),
      });
      
      return { ok: true };
    } catch (error) {
      const message = error.response?.data?.message || 
                     error.response?.data?.error?.message || 
                     error.response?.data?.error ||
                     error.message || 
                     "Failed to send reset instructions";
      throw new Error(message);
    }
  }, []);

  const resetPassword = useCallback(async (token, newPassword) => {
    try {
      await axios.post("/auth/reset-password", {
        token,
        password: newPassword,
      });
      
      return { ok: true };
    } catch (error) {
      const message = error.response?.data?.message || 
                     error.response?.data?.error?.message || 
                     error.response?.data?.error ||
                     error.message || 
                     "Failed to reset password";
      throw new Error(message);
    }
  }, []);

  // ================================
  // ORGANIZATION MANAGEMENT
  // ================================
  const updateCurrentOrganization = useCallback((organization) => {
    if (!organization || !organization.id) {
      console.warn("Invalid organization object provided");
      return;
    }
    
    setCurrentOrganization(organization);
    localStorage.setItem(STORAGE_KEYS.ORGANIZATION, JSON.stringify(organization));
    
    // Update organization context in claims if available
    if (claims.orgs && claims.orgs[organization.id]) {
      setClaims(prev => ({
        ...prev,
        currentOrgId: organization.id,
        currentOrgRole: prev.orgs[organization.id].role,
      }));
    }
    
    enqueueSnackbar(`Switched to ${organization.name}`, { 
      variant: "success",
      autoHideDuration: 2000,
    });
  }, [claims, enqueueSnackbar]);

  const switchOrganization = useCallback(async (organizationId) => {
    try {
      const response = await axios.post("/auth/switch-organization", {
        organization_id: organizationId,
      });
      
      const { access_token } = response.data;
      if (access_token) {
        decodeAndSetUser(access_token, refreshToken);
        return { ok: true };
      }
      
      throw new Error("No access token received");
    } catch (error) {
      const message = error.response?.data?.message || 
                     error.response?.data?.error?.message || 
                     error.message || 
                     "Failed to switch organization";
      
      enqueueSnackbar(message, { 
        variant: "error",
        autoHideDuration: 3000,
      });
      return { ok: false, error: message };
    }
  }, [decodeAndSetUser, refreshToken, enqueueSnackbar]);

  // ================================
  // PERMISSION HELPERS
  // ================================
  const hasPermission = useCallback((permission) => {
    if (!claims.permissions) return false;
    if (claims.permissions.includes("*")) return true;
    
    // Check for wildcard permissions
    const [resource, action] = permission.split(":");
    if (resource && action) {
      if (claims.permissions.includes(`${resource}:*`)) return true;
    }
    
    return claims.permissions.includes(permission);
  }, [claims]);

  const hasAnyPermission = useCallback((permissions) => {
    if (!claims.permissions) return false;
    return permissions.some(permission => hasPermission(permission));
  }, [claims, hasPermission]);

  const canAccess = useCallback((requiredRole, requiredPermissions = []) => {
    // Check role hierarchy
    const userRoleLevel = claims.hierarchyLevel || ROLE_HIERARCHY.guest;
    const requiredRoleLevel = ROLE_HIERARCHY[requiredRole] || ROLE_HIERARCHY.guest;
    
    if (userRoleLevel < requiredRoleLevel) {
      return false;
    }
    
    // Check specific permissions
    if (requiredPermissions.length > 0) {
      return hasAnyPermission(requiredPermissions);
    }
    
    return true;
  }, [claims, hasAnyPermission]);

  const isSuperAdmin = useMemo(() => claims.role === "super_admin", [claims]);
  const isOrganizationAdmin = useMemo(() => 
    ["organization_owner", "organization_admin"].includes(claims.role), 
    [claims]
  );
  const isAssessor = useMemo(() => claims.role === "assessor", [claims]);
  const isCandidate = useMemo(() => claims.role === "candidate", [claims]);

  // ================================
  // INITIALIZATION
  // ================================
  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true);
      
      try {
        // Check for existing token
        const storedToken = localStorage.getItem(STORAGE_KEYS.TOKEN);
        const storedUser = localStorage.getItem(STORAGE_KEYS.USER);
        const storedOrg = localStorage.getItem(STORAGE_KEYS.ORGANIZATION);
        const storedRefresh = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
        
        if (storedToken && isTokenValid(storedToken)) {
          // Valid token exists
          decodeAndSetUser(storedToken, storedRefresh);
          
          if (storedOrg) {
            try {
              const org = JSON.parse(storedOrg);
              setCurrentOrganization(org);
            } catch (e) {
              console.warn("Failed to parse stored organization:", e);
            }
          }
        } else if (storedRefresh) {
          // Try to refresh using refresh token
          await refreshAccessToken(storedRefresh);
        } else {
          // No valid tokens
          clearTokens();
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
        clearTokens();
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, [decodeAndSetUser, refreshAccessToken, clearTokens]);

  // ================================
  // CONTEXT VALUE
  // ================================
  const value = useMemo(() => ({
    // State
    currentUser,
    claims,
    token,
    refreshToken,
    currentOrganization,
    organizations,
    isLoading,
    isRefreshing,
    isAuthenticated: !!token && isTokenValid(token),
    authError,
    sessionActivity,
    
    // Core methods
    login,
    logout,
    register,
    forgotPassword,
    resetPassword,
    refreshAccessToken,
    
    // Organization methods
    updateCurrentOrganization,
    switchOrganization,
    setOrganizations,
    
    // Permission methods
    hasPermission,
    hasAnyPermission,
    canAccess,
    isSuperAdmin,
    isOrganizationAdmin,
    isAssessor,
    isCandidate,
    
    // Role helpers
    getRoleHierarchy: (role) => ROLE_HIERARCHY[role] || ROLE_HIERARCHY.guest,
    getDefaultPermissions: (role) => DEFAULT_PERMISSIONS[role] || DEFAULT_PERMISSIONS.guest,
    
    // Utilities
    axios,
    apiBase: API_V1_BASE,
    
    // Debug info
    _debug: {
      tokenExpiry: claims.exp ? new Date(claims.exp * 1000).toISOString() : null,
      tokenIssued: claims.iat ? new Date(claims.iat * 1000).toISOString() : null,
      sessionDuration: sessionActivity ? Date.now() - sessionActivity : null,
      organizationCount: organizations.length,
      currentOrgRole: claims.orgs?.[currentOrganization?.id]?.role,
      sessionId: sessionIdRef.current,
    },
  }), [
    currentUser,
    claims,
    token,
    refreshToken,
    currentOrganization,
    organizations,
    isLoading,
    isRefreshing,
    authError,
    sessionActivity,
    login,
    logout,
    register,
    forgotPassword,
    resetPassword,
    refreshAccessToken,
    updateCurrentOrganization,
    switchOrganization,
    hasPermission,
    hasAnyPermission,
    canAccess,
    isSuperAdmin,
    isOrganizationAdmin,
    isAssessor,
    isCandidate,
  ]);

  // ================================
  // LOADING STATE
  // ================================
  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          bgcolor: "background.default",
          gap: 3,
        }}
      >
        <CircularProgress size={80} thickness={4} />
        <Box sx={{ textAlign: "center" }}>
          <Typography variant="h6" color="text.primary" gutterBottom>
            Loading Assessly
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Securing your session...
          </Typography>
        </Box>
        <Fade in>
          <Alert 
            severity="info" 
            icon={<Security />}
            sx={{ maxWidth: 400 }}
          >
            <Typography variant="body2">
              Multi-tenant authentication in progress
            </Typography>
          </Alert>
        </Fade>
      </Box>
    );
  }

  // ================================
  // RENDER
  // ================================
  return (
    <AuthContext.Provider value={value}>
      {children}
      
      {/* Global auth error snackbar */}
      <Snackbar
        open={!!authError}
        autoHideDuration={6000}
        onClose={() => setAuthError(null)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        TransitionComponent={Slide}
      >
        <Alert 
          severity="error" 
          variant="filled"
          onClose={() => setAuthError(null)}
          sx={{ width: "100%" }}
          icon={<Error />}
        >
          {authError}
        </Alert>
      </Snackbar>
    </AuthContext.Provider>
  );
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

// ================================
// ORGANIZATION PROVIDER
// ================================
export const OrganizationProvider = ({ children }) => {
  const { currentOrganization, updateCurrentOrganization, organizations, isLoading } = useAuth();
  
  const value = useMemo(() => ({
    currentOrganization,
    updateCurrentOrganization,
    organizations,
    isLoading,
    isOrganizationSet: !!currentOrganization,
    getOrganization: (id) => organizations.find(org => org.id === id),
    switchOrganization: (organization) => updateCurrentOrganization(organization),
    hasMultipleOrganizations: organizations.length > 1,
  }), [currentOrganization, updateCurrentOrganization, organizations, isLoading]);

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
};

OrganizationProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default AuthProvider;
