// src/contexts/AuthContext.js
import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { CircularProgress, Box } from '@mui/material';
import jwtDecode from 'jwt-decode';
import PropTypes from 'prop-types';

const AuthContext = createContext();

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [claims, setClaims] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

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
        console.warn('Token expired');
        localStorage.removeItem('token');
        setCurrentUser(null);
        setClaims(null);
        setToken(null);
        return;
      }

      setCurrentUser({ id: userId, email, role });
      setClaims({ role, orgs, permissions });
      setToken(jwtToken);
      localStorage.setItem('token', jwtToken);
    } catch (error) {
      console.error('Invalid JWT:', error);
      localStorage.removeItem('token');
      setCurrentUser(null);
      setClaims(null);
      setToken(null);
    }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('token');
    decodeAndSetUser(saved);
    setLoading(false);
  }, [decodeAndSetUser]);

  const signOut = useCallback(() => {
    localStorage.removeItem('token');
    setCurrentUser(null);
    setClaims(null);
    setToken(null);
  }, []);

  const value = useMemo(() => ({
    currentUser,
    claims,
    token,
    loading,
    signOut,
    login: async () => {}, // handled elsewhere
    register: async () => {},
    resetPassword: async () => {},
    isAdmin: claims?.role === 'admin',
    isAssessor: claims?.role === 'assessor',
    isCandidate: claims?.role === 'candidate',
    getOrgRole: (orgId) => claims?.orgs?.[orgId] || null,
    hasPermission: (perm) => claims?.permissions?.includes(perm) || false,
  }), [currentUser, claims, token, loading, signOut]);

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
