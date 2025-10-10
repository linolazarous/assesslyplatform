// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { CircularProgress, Box } from '@mui/material';
import jwtDecode from 'jwt-decode'; // Assuming this works for the default export
import PropTypes from 'prop-types';

const AuthContext = createContext();

// --- Hook to consume the context ---
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};

// --- Auth Provider Component ---
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [claims, setClaims] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // FIX: Renamed signOut to logout for consistency with usage elsewhere (e.g., Header.jsx)
  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setCurrentUser(null);
    setClaims(null);
    setToken(null);
  }, []);

  const decodeAndSetUser = useCallback((jwtToken) => {
    if (!jwtToken) {
      setCurrentUser(null);
      setClaims(null);
      setToken(null);
      return;
    }

    try {
      const decoded = jwtDecode(jwtToken);
      // Destructure expected fields from the decoded payload
      const { email, role, orgs, permissions, exp, userId } = decoded;

      if (Date.now() >= exp * 1000) {
        console.warn('Token expired. Logging out.');
        localStorage.removeItem('token');
        logout(); // Use the stable logout function
        return;
      }

      // Set user information and claims
      setCurrentUser({ id: userId, email, role });
      setClaims({ role, orgs, permissions });
      setToken(jwtToken);
      localStorage.setItem('token', jwtToken);

    } catch (error) {
      console.error('Invalid or malformed JWT:', error);
      localStorage.removeItem('token');
      logout(); // Use the stable logout function
    }
  }, [logout]); // Added logout to dependencies

  // Effect to run once on mount to check local storage for token
  useEffect(() => {
    const saved = localStorage.getItem('token');
    // Simulate a brief loading time before decoding
    const initializeAuth = () => {
        decodeAndSetUser(saved);
        setLoading(false);
    };
    // Debounce the setting of loading state slightly if desired, but running immediately is fine
    initializeAuth();
  }, [decodeAndSetUser]);

  // Memoize the context value to prevent unnecessary re-renders in consumers
  const value = useMemo(() => ({
    currentUser,
    claims,
    token,
    loading,
    logout, // Exposed as logout
    // Placeholder functions (to be defined in Auth.jsx and passed up via a setter or API call)
    login: async () => {}, 
    register: async () => {},
    
    // Authorization helpers
    isAdmin: claims?.role === 'admin',
    isAssessor: claims?.role === 'assessor',
    isCandidate: claims?.role === 'candidate',
    getOrgRole: (orgId) => claims?.orgs?.[orgId] || null,
    hasPermission: (perm) => claims?.permissions?.includes(perm) || false,
  }), [currentUser, claims, token, loading, logout]);

  // Show a full-screen loading spinner while the token check is running
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
