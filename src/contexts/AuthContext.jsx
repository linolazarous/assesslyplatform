import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
} from "react";
import { CircularProgress, Box } from "@mui/material";
import { jwtDecode } from "jwt-decode";
import PropTypes from "prop-types";
import axios from "axios";

// 🌐 Base API (adjust to your production backend)
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://assesslyplatform-t49h.onrender.com";

const AuthContext = createContext(null);

// --- Custom Hook ---
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};

// --- Auth Provider ---
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [claims, setClaims] = useState({});
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * 🚪 Logout User
   * Clears localStorage + state
   */
  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setCurrentUser(null);
    setClaims({});
    setToken(null);
  }, []);

  /**
   * 🧩 Decode & Initialize User From Token
   */
  const decodeAndSetUser = useCallback(
    (jwtToken) => {
      if (!jwtToken) {
        logout();
        return;
      }

      try {
        const decoded = jwtDecode(jwtToken);
        const { email, role, orgs, permissions, exp, userId } = decoded;

        if (!exp || Date.now() >= exp * 1000) {
          console.warn("⏰ Token expired — refreshing...");
          refreshAccessToken();
          return;
        }

        setCurrentUser({ id: userId, email, role });
        setClaims({ role, orgs, permissions });
        setToken(jwtToken);
        localStorage.setItem("token", jwtToken);
      } catch (error) {
        console.error("❌ Invalid JWT — logging out:", error);
        logout();
      }
    },
    [logout]
  );

  /**
   * 🔄 Refresh Access Token
   */
  const refreshAccessToken = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/auth/refresh`, {
        withCredentials: true,
      });
      const newToken = res.data?.token;
      if (newToken) {
        decodeAndSetUser(newToken);
        if (import.meta.env.DEV) console.info("🔁 Token refreshed successfully.");
      } else {
        if (import.meta.env.DEV) console.warn("⚠️ No new token received, logging out.");
        logout();
      }
    } catch (error) {
      if (import.meta.env.DEV) console.error("❌ Token refresh failed:", error);
      logout();
    }
  }, [decodeAndSetUser, logout]);

  /**
   * 🚀 Load Token From Local Storage On App Start
   */
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    decodeAndSetUser(storedToken);
    setIsLoading(false);
  }, [decodeAndSetUser]);

  /**
   * ⏱️ Periodic Token Refresh (Every 10 Minutes)
   */
  useEffect(() => {
    if (!token) return;
    const interval = setInterval(refreshAccessToken, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [token, refreshAccessToken]);

  /**
   * 💡 Login
   */
  const login = useCallback(
    async (email, password) => {
      try {
        const res = await axios.post(`${API_BASE_URL}/api/auth/login`, {
          email,
          password,
        });
        const { token: jwtToken } = res.data || {};
        if (!jwtToken) throw new Error("No token returned from server.");
        decodeAndSetUser(jwtToken);
        return true;
      } catch (error) {
        console.error("❌ Login failed:", error);
        return false;
      }
    },
    [decodeAndSetUser]
  );

  /**
   * 🧾 Register
   */
  const register = useCallback(async (userData) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/api/auth/register`, userData);
      return res.data;
    } catch (error) {
      console.error("❌ Registration failed:", error);
      throw error;
    }
  }, []);

  /**
   * 🧠 Derived Helpers
   */
  const isAdmin = claims?.role === "admin";
  const isAssessor = claims?.role === "assessor";
  const isCandidate = claims?.role === "candidate";

  const getOrgRole = useCallback(
    (orgId) => claims?.orgs?.[orgId] || null,
    [claims]
  );

  const hasPermission = useCallback(
    (perm) => claims?.permissions?.includes(perm) || false,
    [claims]
  );

  /**
   * 🧱 Memoized Context Value
   */
  const value = useMemo(
    () => ({
      currentUser,
      claims,
      token,
      isLoading,
      login,
      logout,
      register,
      isAdmin,
      isAssessor,
      isCandidate,
      getOrgRole,
      hasPermission,
    }),
    [
      currentUser,
      claims,
      token,
      isLoading,
      login,
      logout,
      register,
      isAdmin,
      isAssessor,
      isCandidate,
      getOrgRole,
      hasPermission,
    ]
  );

  /**
   * ⏳ Global Loader While Initializing
   */
  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <CircularProgress size={60} />
      </Box>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
