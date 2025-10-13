// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { CircularProgress, Box } from '@mui/material';
// FIX: The most common fix for the "default is not exported" error with jwt-decode is 
// to use a namespace import and then access the function, OR use the specific named export 
// available in newer versions. We'll use the recommended named export 'jwtDecode'.
// If this still causes issues, use: import * as jwtDecoder from 'jwt-decode'; and call jwtDecoder.default(token) or jwtDecoder.jwtDecode(token)
import { jwtDecode } from 'jwt-decode'; 
import PropTypes from 'prop-types';

// Create the Context
const AuthContext = createContext(undefined); // Use 'undefined' for clearer check

// --- Hook to consume the context ---
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  // Improved error message and check
  if (ctx === undefined) { 
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};

// --- Auth Provider Component ---
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [claims, setClaims] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // Renamed 'loading' to 'isLoading' for clarity

  /**
   * Clears local storage and resets all authentication states.
   */
  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setCurrentUser(null);
    setClaims(null);
    setToken(null);
  }, []); // Empty dependency array as it only clears state

  /**
   * Decodes a JWT, checks for expiry, and sets user/claims state.
   * If the token is invalid or expired, it triggers a logout.
   */
  const decodeAndSetUser = useCallback((jwtToken) => {
    if (!jwtToken) {
      // If no token is passed, ensure state is clean
      logout(); // Use logout to set state to nulls
      return;
    }

    try {
      // Use the fixed import name
      const decoded = jwtDecode(jwtToken); 
      // Destructure and ensure you're using the correct key names from your token
      const { email, role, orgs, permissions, exp, userId } = decoded;

      // Check token expiry
      if (Date.now() >= exp * 1000) {
        console.warn('Token expired. Logging out.');
        logout();
        return;
      }

      // Set user and claims state
      setCurrentUser({ id: userId, email, role });
      setClaims({ role, orgs, permissions });
      setToken(jwtToken);
      localStorage.setItem('token', jwtToken); // Ensure token is saved if valid

    } catch (error) {
      // Handle decoding errors (malformed JWT)
      console.error('Invalid or malformed JWT:', error);
      logout();
    }
  }, [logout]);

  // Effect to load and validate token on component mount
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    decodeAndSetUser(savedToken);
    // Setting isLoading to false is crucial for preventing a race condition 
    // where UI tries to render before the token check is complete.
    setIsLoading(false); 
  }, [decodeAndSetUser]);

  // The exposed context value using useMemo for performance
  const value = useMemo(() => ({
    currentUser,
    claims,
    token,
    isLoading, // Export the updated state name
    logout,
    // Placeholder login/register functions (should be implemented)
    login: async (credentials) => { /* implementation */ }, 
    register: async (userData) => { /* implementation */ },
    
    // Derived state/utility functions
    isAuthenticated: !!currentUser, // New derived state
    isAdmin: claims?.role === 'admin',
    isAssessor: claims?.role === 'assessor',
    isCandidate: claims?.role === 'candidate',
    getOrgRole: (orgId) => claims?.orgs?.[orgId] || null,
    hasPermission: (perm) => claims?.permissions?.includes(perm) || false,
  }), [currentUser, claims, token, isLoading, logout]);

  // Show a loading spinner while checking the token
  if (isLoading) {
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
// Optional: Export the context directly if needed elsewhere (though `useAuth` is preferred)
// export default AuthContext;
