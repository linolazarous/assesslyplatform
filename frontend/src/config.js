// Environment Configuration
const config = {
  // API Configuration
  API_BASE_URL: import.meta.env.VITE_API_URL || 'https://assesslyplatform-pfm1.onrender.com/api',
  FRONTEND_URL: import.meta.env.VITE_FRONTEND_URL || window.location.origin,
  
  // Authentication Configuration
  AUTH: {
    // LocalStorage keys
    ACCESS_TOKEN_KEY: 'access_token',
    REFRESH_TOKEN_KEY: 'refresh_token',
    USER_KEY: 'user',
    
    // API Endpoints
    ENDPOINTS: {
      LOGIN: '/auth/login',
      REGISTER: '/auth/register',
      LOGOUT: '/auth/logout',
      REFRESH: '/auth/refresh',
      ME: '/auth/me',
      VERIFY_EMAIL: '/auth/verify-email',
      FORGOT_PASSWORD: '/auth/forgot-password',
      RESET_PASSWORD: '/auth/reset-password'
    },
    
    // Token expiration (in seconds)
    TOKEN_EXPIRY: {
      ACCESS: 15 * 60, // 15 minutes
      REFRESH: 7 * 24 * 60 * 60 // 7 days
    }
  },
  
  // Application Configuration
  APP: {
    NAME: 'Assessly Platform',
    VERSION: '1.0.0',
    DESCRIPTION: 'Enterprise assessment platform'
  },
  
  // Feature Flags
  FEATURES: {
    EMAIL_VERIFICATION: import.meta.env.VITE_ENABLE_EMAIL_VERIFICATION === 'true',
    SOCIAL_LOGIN: import.meta.env.VITE_ENABLE_SOCIAL_LOGIN === 'true',
    TWO_FACTOR_AUTH: import.meta.env.VITE_ENABLE_2FA === 'true'
  },
  
  // External Services
  SERVICES: {
    STRIPE_PUBLISHABLE_KEY: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,
    GOOGLE_CLIENT_ID: import.meta.env.VITE_GOOGLE_CLIENT_ID,
    GITHUB_CLIENT_ID: import.meta.env.VITE_GITHUB_CLIENT_ID
  }
};

// Helper functions
export const getAuthToken = () => localStorage.getItem(config.AUTH.ACCESS_TOKEN_KEY);
export const setAuthToken = (token) => localStorage.setItem(config.AUTH.ACCESS_TOKEN_KEY, token);
export const removeAuthToken = () => localStorage.removeItem(config.AUTH.ACCESS_TOKEN_KEY);

export const getRefreshToken = () => localStorage.getItem(config.AUTH.REFRESH_TOKEN_KEY);
export const setRefreshToken = (token) => localStorage.setItem(config.AUTH.REFRESH_TOKEN_KEY, token);
export const removeRefreshToken = () => localStorage.removeItem(config.AUTH.REFRESH_TOKEN_KEY);

export const getUser = () => {
  const userStr = localStorage.getItem(config.AUTH.USER_KEY);
  return userStr ? JSON.parse(userStr) : null;
};
export const setUser = (user) => localStorage.setItem(config.AUTH.USER_KEY, JSON.stringify(user));
export const removeUser = () => localStorage.removeItem(config.AUTH.USER_KEY);

export const clearAuthData = () => {
  removeAuthToken();
  removeRefreshToken();
  removeUser();
};

export const isAuthenticated = () => {
  const token = getAuthToken();
  if (!token) return false;
  
  // Optional: Check token expiration
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 > Date.now();
  } catch {
    return true; // If we can't parse, assume valid
  }
};

export const getAuthHeaders = () => ({
  Authorization: `Bearer ${getAuthToken()}`,
  'Content-Type': 'application/json'
});

export default config;
