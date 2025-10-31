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
import { jwtDecode } from "jwt-decode"; // ✅ correct modern import
import PropTypes from "prop-types";
import axios from "axios";

// ✅ Adjust this to your deployed backend URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://assesslyplatform-t49h.onrender.com";

const AuthContext = createContext();

// --- Hook to consume the context ---
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
};

// --- Auth Provider Component ---
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [claims, setClaims] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- Logout ---
  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setCurrentUser(null);
    setClaims(null);
    setToken(null);
  }, []);

  // --- Decode Token & Set User ---
  const decodeAndSetUser = useCallback(
    (jwtToken) => {
      if (!jwtToken) {
        logout();
        return;
      }

      try {
        const decoded = jwtDecode(jwtToken);
        const { email, role, orgs, permissions, exp, userId } = decoded;

        if (Date.now() >= exp * 1000) {
          console.warn("Token expired. Attempting to refresh...");
          refreshAccessToken(); // 🔄 attempt auto-refresh
          return;
        }

        setCurrentUser({ id: userId, email, role });
        setClaims({ role, orgs, permissions });
        setToken(jwtToken);
        localStorage.setItem("token", jwtToken);
      } catch (error) {
        console.error("Invalid or malformed JWT:", error);
        logout();
      }
    },
    [logout]
  );

  // --- Attempt to Refresh Access Token ---
  const refreshAccessToken = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/auth/refresh`, {
        withCredentials: true,
      });
      const newToken = response.data?.token;
      if (newToken) {
        decodeAndSetUser(newToken);
        console.info("🔄 Token refreshed successfully.");
      } else {
        console.warn("No new token received. Logging out.");
        logout();
      }
    } catch (err) {
      console.error("Failed to refresh token:", err);
      logout();
    }
  }, [logout, decodeAndSetUser]);

  // --- Load Token on Startup ---
  useEffect(() => {
    const saved = localStorage.getItem("token");
    decodeAndSetUser(saved);
    setLoading(false);
  }, [decodeAndSetUser]);

  // --- Auto Token Refresh (every 10 minutes) ---
  useEffect(() => {
    const interval = setInterval(() => {
      if (token) refreshAccessToken();
    }, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [token, refreshAccessToken]);

  // --- Memoized Context Value ---
  const value = useMemo(
    () => ({
      currentUser,
      claims,
      token,
      loading,
      logout,
      login: async (email, password) => {
        try {
          const res = await axios.post(`${API_BASE_URL}/api/auth/login`, { email, password });
          const { token } = res.data;
          decodeAndSetUser(token);
          return true;
        } catch (err) {
          console.error("Login failed:", err);
          return false;
        }
      },
      register: async (userData) => {
        try {
          const res = await axios.post(`${API_BASE_URL}/api/auth/register`, userData);
          return res.data;
        } catch (err) {
          console.error("Registration failed:", err);
          throw err;
        }
      },
      isAdmin: claims?.role === "admin",
      isAssessor: claims?.role === "assessor",
      isCandidate: claims?.role === "candidate",
      getOrgRole: (orgId) => claims?.orgs?.[orgId] || null,
      hasPermission: (perm) => claims?.permissions?.includes(perm) || false,
    }),
    [currentUser, claims, token, loading, logout, decodeAndSetUser, refreshAccessToken]
  );

  // --- Loader While Initializing ---
  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

