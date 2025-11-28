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
 * Fully compliant with Assessly Platform API documentation
 * Enhanced error handling, token management, and API integration
 */

// API Configuration - follows documentation structure
const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://assesslyplatform-t49h.onrender.com";
const API_V1_BASE = `${API_BASE.replace(/\/+$/, "")}/api/v1`;

// Rate limiting configuration based on API docs
const RATE_LIMITS = {
  AUTH: 10, // 10 requests per minute for auth endpoints
  GENERAL: 100, // 100 requests per minute for other endpoints
};

const AuthContext = createContext(null);

// Enhanced JWT decode helper with better error handling
function decodeJwt(token) {
  if (!token || typeof token !== "string") {
    console.warn("Invalid token provided to decodeJwt");
    return null;
  }
  
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      console.warn("JWT token has invalid structure");
      return null;
    }
    
    // Base64Url decode with proper padding
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const paddedPayload = payload.padEnd(payload.length + (4 - (payload.length % 4)) % 4, "=");
    
    const jsonPayload = atob(paddedPayload);
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error("JWT decoding failed:", error);
    return null;
  }
}

// Create axios instance with production-ready configuration
const axios = axiosLib.create({
  baseURL: API_V1_BASE,
  withCredentials: true,
  timeout: 30000, // 30 second timeout
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Request interceptor for adding auth token
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add request timestamp for debugging
    config.metadata = { startTime: Date.now() };
    
    return config;
  },
  (error) => {
    console.error("Request interceptor error:", error);
    return Promise.reject(error);
  }
);

// Response interceptor for logging and error handling
axios.interceptors.response.use(
  (response) => {
    const endTime = Date.now();
    const startTime = response.config.metadata?.startTime;
    if (startTime) {
      console.debug(`API ${response.config.method?.toUpperCase()} ${response.config.url} - ${endTime - startTime}ms`);
    }
    return response;
  },
  (error) => {
    console.error("Response interceptor error:", {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      message: error.message,
    });
    return Promise.reject(error);
  }
);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [claims, setClaims] = useState({});
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastTokenRefresh, setLastTokenRefresh] = useState(null);

  // Enhanced logout with cleanup
  const logout = useCallback((message = "You have been logged out") => {
    console.log("Logging out user:", { message, currentUser: currentUser?.email });
    
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      sessionStorage.removeItem("auth_redirect");
    } catch (error) {
      console.warn("Storage cleanup during logout failed:", error);
    }
    
    // Clear axios authorization header
    delete axios.defaults.headers.common.Authorization;
    
    // Reset state
    setCurrentUser(null);
    setClaims({});
    setToken(null);
    setLastTokenRefresh(null);
    
    // Notify user if message provided
    if (message && typeof window !== "undefined") {
      // This could be connected to a notification system
      console.info("Logout message:", message);
    }
  }, [currentUser]);

  // Enhanced token validation and user setup
  const decodeAndSetUser = useCallback((jwtToken) => {
    if (!jwtToken) {
      logout("Invalid authentication token");
      return false;
    }

    const decoded = decodeJwt(jwtToken);
    if (!decoded) {
      logout("Failed to decode authentication token");
      return false;
    }

    const { email, role, orgs, permissions, exp, userId, id, name } = decoded;
    
    // Enhanced expiry check with buffer (5 minutes)
    const expiryBuffer = 5 * 60 * 1000; // 5 minutes in milliseconds
    if (!exp || (Date.now() + expiryBuffer) >= exp * 1000) {
      console.warn("JWT expired or near expiry, attempting refresh");
      refreshAccessToken();
      return false;
    }

    // Set user state with enhanced user object
    const userData = {
      id: userId || id,
      email,
      role,
      name: name || email.split('@')[0], // Fallback name from email
    };
    
    setCurrentUser(userData);
    setClaims({
      role,
      orgs: orgs || {},
      permissions: permissions || [],
      exp, // Store expiry for proactive refresh
    });
    setToken(jwtToken);
    setLastTokenRefresh(Date.now());

    // Persist to storage
    try {
      localStorage.setItem("token", jwtToken);
      localStorage.setItem("user", JSON.stringify(userData));
    } catch (error) {
      console.warn("Failed to persist auth data to storage:", error);
    }

    console.log("User authenticated successfully:", { email, role });
    return true;
  }, [logout]);

  // Enhanced token refresh with retry logic
  const refreshAccessToken = useCallback(async (maxRetries = 2) => {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Refreshing token (attempt ${attempt + 1}/${maxRetries + 1})`);
        
        const response = await axios.get("/auth/refresh", { 
          withCredentials: true,
          timeout: 10000, // 10 second timeout for refresh
        });
        
        const newToken = response.data?.token;
        if (newToken && typeof newToken === "string") {
          const success = decodeAndSetUser(newToken);
          if (success) {
            console.info("Token refreshed successfully");
            return true;
          }
        }
        
        throw new Error("Invalid token in refresh response");
        
      } catch (error) {
        console.error(`Token refresh attempt ${attempt + 1} failed:`, error);
        
        if (attempt === maxRetries) {
          console.error("All token refresh attempts failed");
          logout("Your session has expired. Please log in again.");
          return false;
        }
        
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
    
    return false;
  }, [decodeAndSetUser, logout]);

  // Response interceptor for token refresh on 401
  useEffect(() => {
    const interceptorId = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        
        // Skip if already retried or not a 401 error
        if (originalRequest._retry || error.response?.status !== 401) {
          return Promise.reject(error);
        }

        originalRequest._retry = true;
        console.log("Encountered 401 error, attempting token refresh");

        try {
          const refreshSuccess = await refreshAccessToken(1); // Single retry for 401
          
          if (refreshSuccess) {
            // Update authorization header and retry original request
            const newToken = localStorage.getItem("token");
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return axios(originalRequest);
          }
        } catch (refreshError) {
          console.error("Token refresh in interceptor failed:", refreshError);
        }

        // If refresh fails, reject the original error
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptorId);
    };
  }, [refreshAccessToken]);

  // Initialize auth state from storage
  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true);
      
      try {
        const storedToken = localStorage.getItem("token");
        
        if (storedToken) {
          console.log("Found stored token, validating...");
          const isValid = decodeAndSetUser(storedToken);
          
          if (!isValid) {
            console.log("Stored token invalid, clearing auth state");
            logout();
          }
        } else {
          console.log("No stored token found");
        }
      } catch (error) {
        console.error("Auth initialization failed:", error);
        logout("Authentication initialization failed");
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, [decodeAndSetUser, logout]);

  // Proactive token refresh before expiry
  useEffect(() => {
    if (!token || !claims.exp) return;

    const refreshThreshold = 15 * 60 * 1000; // Refresh 15 minutes before expiry
    const refreshTime = (claims.exp * 1000) - refreshThreshold - Date.now();

    if (refreshTime <= 0) {
      // Token is already near expiry, refresh immediately
      refreshAccessToken().catch(console.error);
      return;
    }

    console.log(`Scheduling token refresh in ${Math.round(refreshTime / 1000 / 60)} minutes`);
    const refreshTimer = setTimeout(() => {
      refreshAccessToken().catch(console.error);
    }, refreshTime);

    return () => clearTimeout(refreshTimer);
  }, [token, claims.exp, refreshAccessToken]);

  // Enhanced login with better error handling
  const login = useCallback(async (email, password) => {
    try {
      console.log("Attempting login for:", email);
      
      const response = await axios.post("/auth/login", { 
        email: email.trim().toLowerCase(), 
        password 
      });

      const { token: jwtToken, user } = response.data;

      if (!jwtToken) {
        throw new Error("No authentication token received");
      }

      const success = decodeAndSetUser(jwtToken);
      if (!success) {
        throw new Error("Failed to process authentication token");
      }

      console.log("Login successful for:", email);
      return { 
        ok: true, 
        data: { token: jwtToken, user },
        message: "Login successful" 
      };

    } catch (error) {
      console.error("Login failed:", error);
      
      let userMessage = "Login failed. Please try again.";
      let errorData = null;

      if (error.response) {
        errorData = error.response.data;
        userMessage = errorData?.message || 
                     errorData?.error?.message || 
                     `Server error: ${error.response.status}`;
      } else if (error.request) {
        userMessage = "Network error. Please check your connection.";
      }

      return { 
        ok: false, 
        error: userMessage,
        details: errorData 
      };
    }
  }, [decodeAndSetUser]);

  // Enhanced registration with validation
  const register = useCallback(async (userData) => {
    try {
      console.log("Attempting registration for:", userData.email);
      
      // Validate required fields
      if (!userData.name?.trim() || !userData.email?.trim() || !userData.password) {
        throw new Error("Name, email, and password are required");
      }

      // Normalize email
      const normalizedData = {
        ...userData,
        email: userData.email.trim().toLowerCase(),
        name: userData.name.trim(),
      };

      const response = await axios.post("/auth/register", normalizedData);

      console.log("Registration successful for:", userData.email);
      return { 
        ok: true, 
        data: response.data,
        message: "Account created successfully" 
      };

    } catch (error) {
      console.error("Registration failed:", error);
      
      let userMessage = "Registration failed. Please try again.";
      let errorData = null;

      if (error.response) {
        errorData = error.response.data;
        userMessage = errorData?.message || 
                     errorData?.error?.message || 
                     `Server error: ${error.response.status}`;
        
        // Handle specific error cases
        if (error.response.status === 409) {
          userMessage = "An account with this email already exists.";
        }
      } else if (error.request) {
        userMessage = "Network error. Please check your connection.";
      }

      return { 
        ok: false, 
        error: userMessage,
        details: errorData 
      };
    }
  }, []);

  // Enhanced helper functions
  const isAdmin = useMemo(() => claims?.role === "admin", [claims]);
  const isAssessor = useMemo(() => claims?.role === "assessor", [claims]);
  const isCandidate = useMemo(() => claims?.role === "candidate", [claims]);
  
  const getOrgRole = useCallback((orgId) => claims?.orgs?.[orgId] || null, [claims]);
  
  const hasPermission = useCallback((permission) => {
    if (!Array.isArray(claims?.permissions)) return false;
    return claims.permissions.includes(permission);
  }, [claims]);

  const hasAnyPermission = useCallback((permissions) => {
    if (!Array.isArray(claims?.permissions) || !Array.isArray(permissions)) return false;
    return permissions.some(permission => claims.permissions.includes(permission));
  }, [claims]);

  const canAccess = useCallback((requiredRole, requiredPermissions = []) => {
    if (requiredRole && claims?.role !== requiredRole) return false;
    if (requiredPermissions.length > 0 && !hasAnyPermission(requiredPermissions)) return false;
    return true;
  }, [claims, hasAnyPermission]);

  // Enhanced context value
  const value = useMemo(() => ({
    // State
    currentUser,
    claims,
    token,
    isLoading,
    isAuthenticated: !!token,
    
    // Core actions
    login,
    logout,
    register,
    refreshAccessToken,
    
    // Role checks
    isAdmin,
    isAssessor,
    isCandidate,
    
    // Permission checks
    getOrgRole,
    hasPermission,
    hasAnyPermission,
    canAccess,
    
    // Utilities
    axios,
    apiBase: API_V1_BASE,
    
    // Debug info (remove in production if needed)
    _debug: {
      lastTokenRefresh,
      tokenExpiry: claims.exp ? new Date(claims.exp * 1000).toISOString() : null,
    }
  }), [
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
    hasAnyPermission,
    canAccess,
    lastTokenRefresh,
  ]);

  // Loading state with better UX
  if (isLoading) {
    return (
      <Box 
        sx={{ 
          display: "flex", 
          justifyContent: "center", 
          alignItems: "center", 
          height: "100vh",
          flexDirection: "column",
          gap: 2
        }}
      >
        <CircularProgress size={60} />
        <Typography variant="body1" color="text.secondary">
          Loading...
        </Typography>
      </Box>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default AuthProvider;
