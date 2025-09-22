import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { 
  onAuthStateChanged, 
  signOut as firebaseSignOut,
  getIdToken,
} from 'firebase/auth';
import { auth } from '../firebase/firebase'; // Keep Firebase auth
import { CircularProgress, Box } from '@mui/material';
import PropTypes from 'prop-types';

const AuthContext = createContext();

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Function to fetch user claims from your Vercel API
const fetchUserClaims = async (firebaseToken) => {
  if (!firebaseToken) return null;
  try {
    const response = await fetch('/api/auth/claims', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${firebaseToken}`
      },
      // You can send additional data if needed, like the UID
      body: JSON.stringify({ uid: auth.currentUser.uid })
    });
    if (!response.ok) {
      throw new Error('Failed to fetch user claims');
    }
    const data = await response.json();
    return data.claims;
  } catch (error) {
    console.error('Error fetching claims from API:', error);
    return null;
  }
};

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [claims, setClaims] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);

  const refreshClaims = async () => {
    if (!currentUser) return;
    try {
      const firebaseToken = await currentUser.getIdToken(true); // Force token refresh
      const fetchedClaims = await fetchUserClaims(firebaseToken);
      setClaims(fetchedClaims);
      setToken(firebaseToken);
    } catch (error) {
      console.error('Error refreshing claims:', error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      try {
        if (user) {
          const firebaseToken = await user.getIdToken();
          const fetchedClaims = await fetchUserClaims(firebaseToken);
          setCurrentUser(user);
          setClaims(fetchedClaims);
          setToken(firebaseToken);
        } else {
          setCurrentUser(null);
          setClaims(null);
          setToken(null);
        }
      } catch (error) {
        console.error('Auth state change error:', error);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  };

  const value = useMemo(() => ({
    currentUser,
    claims,
    token,
    loading,
    signOut,
    refreshClaims,
    isAdmin: claims?.role === 'admin',
    isAssessor: claims?.role === 'assessor',
    isCandidate: claims?.role === 'candidate',
    getOrgRole: (orgId) => claims?.orgs?.[orgId] || null,
    hasPermission: (permission) => claims?.permissions?.includes(permission) || false
  }), [currentUser, claims, token, loading]);

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
