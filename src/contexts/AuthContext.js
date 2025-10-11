// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { CircularProgress, Box } from '@mui/material';
import jwtDecode from 'jwt-decode';
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
      const { email, role, orgs, permissions, exp, userId } = decoded;

      if (Date.now() >= exp * 1000) {
        console.warn('Token expired. Logging out.');
        localStorage.removeItem('token');
        logout();
        return;
      }

      setCurrentUser({ id: userId, email, role });
      setClaims({ role, orgs, permissions });
      setToken(jwtToken);
      localStorage.setItem('token', jwtToken);

    } catch (error) {
      console.error('Invalid or malformed JWT:', error);
      localStorage.removeItem('token');
      logout();
    }
  }, [logout]);

  useEffect(() => {
    const saved = localStorage.getItem('token');
    const initializeAuth = () => {
        decodeAndSetUser(saved);
        setLoading(false);
    };
    initializeAuth();
  }, [decodeAndSetUser]);

  const value = useMemo(() => ({
    currentUser,
    claims,
    token,
    loading,
    logout,
    login: async () => {}, 
    register: async () => {},
    isAdmin: claims?.role === 'admin',
    isAssessor: claims?.role === 'assessor',
    isCandidate: claims?.role === 'candidate',
    getOrgRole: (orgId) => claims?.orgs?.[orgId] || null,
    hasPermission: (perm) => claims?.permissions?.includes(perm) || false,
  }), [currentUser, claims, token, loading, logout]);

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
