import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { CircularProgress, Box } from '@mui/material';
import PropTypes from 'prop-types';
import jwt_decode from 'jwt-decode';

const AuthContext = createContext();

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [claims, setClaims] = useState(null);
  const [token, setToken] = useState(null);

  // Function to decode and set user data from a JWT
  const decodeAndSetUser = useCallback((jwtToken) => {
    if (!jwtToken) {
      setCurrentUser(null);
      setClaims(null);
      setToken(null);
      return;
    }
    try {
      const decoded = jwt_decode(jwtToken);
      const { email, role, orgs, permissions, exp } = decoded;

      if (Date.now() >= exp * 1000) {
        // Token is expired
        console.warn('Token has expired');
        localStorage.removeItem('token');
        setCurrentUser(null);
        setClaims(null);
        setToken(null);
        return;
      }
      
      setCurrentUser({ email, role, id: decoded.userId });
      setClaims({ role, orgs, permissions });
      setToken(jwtToken);
      localStorage.setItem('token', jwtToken);
    } catch (error) {
      console.error('Failed to decode JWT:', error);
      localStorage.removeItem('token');
      setCurrentUser(null);
      setClaims(null);
      setToken(null);
    }
  }, []);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    decodeAndSetUser(storedToken);
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
    // Methods to be implemented in components
    login: async (email, password) => {},
    register: async (email, password) => {},
    resetPassword: async (email) => {},
    isAdmin: claims?.role === 'admin',
    isAssessor: claims?.role === 'assessor',
    isCandidate: claims?.role === 'candidate',
    getOrgRole: (orgId) => claims?.orgs?.[orgId] || null,
    hasPermission: (permission) => claims?.permissions?.includes(permission) || false
  }), [currentUser, claims, token, loading, signOut]);

  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: 'background.default'
      }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired
};
