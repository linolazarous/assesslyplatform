// frontend/src/config.js
// Environment Configuration
const config = {
  // API Configuration - Updated: No /api in base URL
  API_BASE_URL: import.meta.env.VITE_API_URL || 'https://assesslyplatform-pfm1.onrender.com',
  FRONTEND_URL: import.meta.env.VITE_FRONTEND_URL || window.location.origin,
  
  // Authentication Configuration
  AUTH: {
    // LocalStorage keys
    ACCESS_TOKEN_KEY: 'access_token',
    REFRESH_TOKEN_KEY: 'refresh_token',
    USER_KEY: 'user',
    
    // API Endpoints - UPDATED: Added /api prefix to match backend
    ENDPOINTS: {
      LOGIN: '/api/auth/login',
      REGISTER: '/api/auth/register',
      LOGOUT: '/api/auth/logout',
      REFRESH: '/api/auth/refresh',
      ME: '/api/auth/me',
      VERIFY_EMAIL: '/api/auth/verify-email',
      FORGOT_PASSWORD: '/api/auth/forgot-password',
      RESET_PASSWORD: '/api/auth/reset-password',
      RESEND_VERIFICATION: '/api/auth/resend-verification',
      // Social auth redirects - these are for frontend navigation
      GOOGLE: '/api/auth/google',
      GITHUB: '/api/auth/github'
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
    DESCRIPTION: 'Enterprise assessment platform',
    
    // API Routes
    ROUTES: {
      // Authentication
      LOGIN: '/login',
      REGISTER: '/register',
      FORGOT_PASSWORD: '/forgot-password',
      RESET_PASSWORD: '/reset-password',
      
      // Dashboard
      DASHBOARD: '/dashboard',
      
      // Assessments
      ASSESSMENTS: '/assessments',
      ASSESSMENT_DETAIL: '/assessments/:id',
      CREATE_ASSESSMENT: '/assessments/new',
      
      // Candidates
      CANDIDATES: '/candidates',
      CANDIDATE_DETAIL: '/candidates/:id',
      
      // Organization
      ORGANIZATION: '/organization',
      
      // Settings
      SETTINGS: '/settings',
      PROFILE: '/settings/profile',
      BILLING: '/settings/billing',
      SECURITY: '/settings/security',
      
      // Public pages
      HOME: '/',
      PRICING: '/pricing',
      CONTACT: '/contact',
      DEMO: '/demo',
      FEATURES: '/features'
    }
  },
  
  // Feature Flags
  FEATURES: {
    EMAIL_VERIFICATION: import.meta.env.VITE_ENABLE_EMAIL_VERIFICATION === 'true',
    SOCIAL_LOGIN: import.meta.env.VITE_ENABLE_SOCIAL_LOGIN === 'true',
    TWO_FACTOR_AUTH: import.meta.env.VITE_ENABLE_2FA === 'false', // Default to false
    FREE_TIER: true,
    BASIC_TIER: true,
    PROFESSIONAL_TIER: true,
    ENTERPRISE_TIER: true
  },
  
  // External Services
  SERVICES: {
    STRIPE_PUBLISHABLE_KEY: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder',
    GOOGLE_CLIENT_ID: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
    GITHUB_CLIENT_ID: import.meta.env.VITE_GITHUB_CLIENT_ID || '',
    
    // API Service URLs - UPDATED: All endpoints now have /api prefix
    API: {
      // Authentication
      AUTH: {
        LOGIN: '/api/auth/login',
        REGISTER: '/api/auth/register',
        LOGOUT: '/api/auth/logout',
        REFRESH: '/api/auth/refresh',
        ME: '/api/auth/me',
        VERIFY_EMAIL: '/api/auth/verify-email',
        FORGOT_PASSWORD: '/api/auth/forgot-password',
        RESET_PASSWORD: '/api/auth/reset-password',
        RESEND_VERIFICATION: '/api/auth/resend-verification'
      },
      
      // Assessments
      ASSESSMENTS: {
        BASE: '/api/assessments',
        DETAIL: '/api/assessments/:id',
        QUESTIONS: '/api/assessments/:id/questions',
        SETTINGS: '/api/assessments/:id/settings',
        QUESTION_DETAIL: '/api/assessments/:assessmentId/questions/:questionId'
      },
      
      // Candidates
      CANDIDATES: {
        BASE: '/api/candidates',
        DETAIL: '/api/candidates/:id'
      },
      
      // Organization
      ORGANIZATION: {
        BASE: '/api/organizations/me'
      },
      
      // User
      USER: {
        PROFILE: '/api/users/me',
        PASSWORD: '/api/users/me/password'
      },
      
      // Dashboard
      DASHBOARD: {
        STATS: '/api/dashboard/stats'
      },
      
      // Subscriptions
      SUBSCRIPTIONS: {
        CHECKOUT: '/api/subscriptions/checkout',
        ME: '/api/subscriptions/me',
        CANCEL: '/api/subscriptions/cancel',
        PLANS: '/api/plans',
        UPGRADE: '/api/subscriptions/upgrade' // Note: This doesn't exist in backend
      },
      
      // Payments
      PAYMENTS: {
        INTENT: '/api/payments/intent',
        HISTORY: '/api/billing/history'
      },
      
      // Webhooks
      WEBHOOKS: {
        STRIPE: '/api/webhooks/stripe'
      },
      
      // Public endpoints
      PUBLIC: {
        CONTACT: '/api/contact',
        DEMO: '/api/demo',
        HEALTH: '/api/health'
      }
    }
  },
  
  // Plan Configuration
  PLANS: {
    FREE: {
      id: 'free',
      name: 'Free',
      price: 0,
      currency: 'usd',
      interval: 'month',
      features: [
        'Up to 50 candidates',
        '5 assessments',
        'Basic assessment types',
        'Email support',
        'Community forum access'
      ],
      limits: {
        candidates: 50,
        assessments: 5,
        questions: 100
      }
    },
    BASIC: {
      id: 'basic',
      name: 'Basic',
      price: 29,
      currency: 'usd',
      interval: 'month',
      features: [
        'Up to 500 candidates',
        '50 assessments',
        'Advanced assessment types',
        'Priority support',
        'Basic analytics',
        'API access'
      ],
      limits: {
        candidates: 500,
        assessments: 50,
        questions: 5000
      }
    },
    PROFESSIONAL: {
      id: 'professional',
      name: 'Professional',
      price: 79,
      currency: 'usd',
      interval: 'month',
      features: [
        'Unlimited candidates',
        'Unlimited assessments',
        'All assessment types',
        'Dedicated support',
        'Advanced analytics',
        'AI-powered insights',
        'Custom branding'
      ],
      limits: {
        candidates: 'unlimited',
        assessments: 'unlimited',
        questions: 'unlimited'
      }
    },
    ENTERPRISE: {
      id: 'enterprise',
      name: 'Enterprise',
      price: 'Custom',
      currency: 'usd',
      interval: 'custom',
      features: [
        'Everything in Professional',
        'Custom integrations',
        'SLA guarantees',
        'Dedicated account manager',
        'On-premise deployment',
        'Custom development',
        'Advanced security features'
      ],
      limits: {
        candidates: 'unlimited',
        assessments: 'unlimited',
        questions: 'unlimited'
      }
    }
  },
  
  // API Request Configuration
  API_CONFIG: {
    TIMEOUT: 30000, // 30 seconds
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000, // 1 second
    CACHE_TTL: 5 * 60 * 1000, // 5 minutes
    MAX_FILE_SIZE: 10 * 1024 * 1024 // 10MB
  },
  
  // Pagination Configuration
  PAGINATION: {
    DEFAULT_LIMIT: 20,
    DEFAULT_PAGE: 1,
    MAX_LIMIT: 100
  },
  
  // Assessment Configuration
  ASSESSMENT: {
    STATUS: {
      DRAFT: 'draft',
      PUBLISHED: 'published',
      ARCHIVED: 'archived'
    },
    QUESTION_TYPES: {
      MULTIPLE_CHOICE: 'multiple_choice',
      SINGLE_CHOICE: 'single_choice',
      TEXT: 'text',
      CODE: 'code',
      FILE_UPLOAD: 'file_upload'
    },
    DIFFICULTY: {
      EASY: 'easy',
      MEDIUM: 'medium',
      HARD: 'hard'
    }
  },
  
  // Candidate Configuration
  CANDIDATE: {
    STATUS: {
      INVITED: 'invited',
      IN_PROGRESS: 'in_progress',
      COMPLETED: 'completed',
      EXPIRED: 'expired',
      REJECTED: 'rejected'
    }
  }
};

// Helper functions
export const getAuthToken = () => {
  try {
    return localStorage.getItem(config.AUTH.ACCESS_TOKEN_KEY);
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

export const setAuthToken = (token) => {
  try {
    if (!token) {
      console.warn('Attempting to set empty auth token');
      return;
    }
    localStorage.setItem(config.AUTH.ACCESS_TOKEN_KEY, token);
  } catch (error) {
    console.error('Error setting auth token:', error);
  }
};

export const removeAuthToken = () => {
  try {
    localStorage.removeItem(config.AUTH.ACCESS_TOKEN_KEY);
  } catch (error) {
    console.error('Error removing auth token:', error);
  }
};

export const getRefreshToken = () => {
  try {
    return localStorage.getItem(config.AUTH.REFRESH_TOKEN_KEY);
  } catch (error) {
    console.error('Error getting refresh token:', error);
    return null;
  }
};

export const setRefreshToken = (token) => {
  try {
    if (!token) {
      console.warn('Attempting to set empty refresh token');
      return;
    }
    localStorage.setItem(config.AUTH.REFRESH_TOKEN_KEY, token);
  } catch (error) {
    console.error('Error setting refresh token:', error);
  }
};

export const removeRefreshToken = () => {
  try {
    localStorage.removeItem(config.AUTH.REFRESH_TOKEN_KEY);
  } catch (error) {
    console.error('Error removing refresh token:', error);
  }
};

export const getUser = () => {
  try {
    const userStr = localStorage.getItem(config.AUTH.USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
};

export const setUser = (user) => {
  try {
    if (!user) {
      console.warn('Attempting to set empty user');
      return;
    }
    localStorage.setItem(config.AUTH.USER_KEY, JSON.stringify(user));
  } catch (error) {
    console.error('Error setting user:', error);
  }
};

export const removeUser = () => {
  try {
    localStorage.removeItem(config.AUTH.USER_KEY);
  } catch (error) {
    console.error('Error removing user:', error);
  }
};

export const clearAuthData = () => {
  try {
    removeAuthToken();
    removeRefreshToken();
    removeUser();
    
    // Clear any other auth-related data
    localStorage.removeItem('auth_redirect');
    localStorage.removeItem('last_login_time');
    localStorage.removeItem('session_start');
  } catch (error) {
    console.error('Error clearing auth data:', error);
  }
};

export const isAuthenticated = () => {
  try {
    const token = getAuthToken();
    if (!token) return false;
    
    // Check token expiration
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const isExpired = payload.exp * 1000 < Date.now();
      
      if (isExpired) {
        console.warn('Token has expired');
        // Optionally try to refresh the token here
        return false;
      }
      
      return true;
    } catch (parseError) {
      console.warn('Unable to parse token payload, assuming valid');
      return true; // If we can't parse, assume valid but log warning
    }
  } catch (error) {
    console.error('Error checking authentication:', error);
    return false;
  }
};

/**
 * Extract user from JWT token
 * @param {string} token - JWT token
 * @returns {object|null} - Decoded token payload or null
 */
export const decodeToken = (token) => {
  try {
    if (!token) return null;
    
    const payload = token.split('.')[1];
    if (!payload) return null;
    
    const decoded = JSON.parse(atob(payload));
    return decoded;
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
};

// UPDATED: Helper to get full API URL with /api prefix if needed
export const getAuthHeaders = (additionalHeaders = {}) => {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...additionalHeaders
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

// UPDATED: Get full URL for API endpoints
export const getFullUrl = (endpoint) => {
  // If endpoint already includes the full URL, return it
  if (endpoint.startsWith('http')) {
    return endpoint;
  }
  
  // Remove duplicate /api prefix if present
  const cleanEndpoint = endpoint.replace(/^\/api\/api\//, '/api/');
  
  // Add base URL
  return `${config.API_BASE_URL}${cleanEndpoint}`;
};

// Helper to get API endpoint from config
export const getApiEndpoint = (service, endpointKey, params = {}) => {
  try {
    // Navigate through config.SERVICES.API structure
    const endpointPath = endpointKey.split('.');
    let endpointObj = config.SERVICES.API;
    
    for (const path of endpointPath) {
      if (endpointObj[path]) {
        endpointObj = endpointObj[path];
      } else {
        console.error(`Endpoint not found: ${endpointKey}`);
        return '';
      }
    }
    
    let endpoint = endpointObj;
    
    // Replace parameters in endpoint template
    if (typeof endpoint === 'string') {
      Object.keys(params).forEach(key => {
        endpoint = endpoint.replace(`:${key}`, params[key]);
      });
    }
    
    return endpoint;
  } catch (error) {
    console.error(`Error getting API endpoint ${endpointKey}:`, error);
    return '';
  }
};

export const getRoute = (routeKey, params = {}) => {
  if (!config.APP.ROUTES[routeKey]) {
    console.error(`Route key "${routeKey}" not found in config.APP.ROUTES`);
    return '/';
  }
  
  let route = config.APP.ROUTES[routeKey];
  
  // Replace route parameters
  Object.keys(params).forEach(key => {
    route = route.replace(`:${key}`, params[key]);
  });
  
  return route;
};

export const getPlanDetails = (planId) => {
  // Handle case-insensitive lookup
  const planKeys = Object.keys(config.PLANS);
  const foundKey = planKeys.find(key => 
    key.toLowerCase() === planId.toLowerCase() || 
    config.PLANS[key].id === planId
  );
  
  return foundKey ? config.PLANS[foundKey] : config.PLANS.FREE;
};

export const formatCurrency = (amount, currency = 'usd') => {
  if (amount === 'Custom' || amount === 0) {
    return amount === 0 ? 'Free' : 'Custom';
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

/**
 * Get remaining token lifetime in seconds
 * @param {string} token - JWT token
 * @returns {number} - Seconds until expiration
 */
export const getTokenLifetime = (token) => {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return 0;
  
  const now = Math.floor(Date.now() / 1000);
  return Math.max(0, decoded.exp - now);
};

/**
 * Check if token is expired
 * @param {string} token - JWT token
 * @returns {boolean}
 */
export const isTokenExpired = (token) => {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return true;
  
  return decoded.exp * 1000 < Date.now();
};

/**
 * Validate email format
 * @param {string} email - Email address to validate
 * @returns {boolean} - True if email is valid
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {object} - Validation result with isValid and message
 */
export const validatePassword = (password) => {
  if (!password) {
    return { isValid: false, message: 'Password is required' };
  }
  
  if (password.length < 8) {
    return { isValid: false, message: 'Password must be at least 8 characters long' };
  }
  
  if (!/(?=.*[a-z])/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one lowercase letter' };
  }
  
  if (!/(?=.*[A-Z])/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one uppercase letter' };
  }
  
  if (!/(?=.*\d)/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one number' };
  }
  
  return { isValid: true, message: 'Password is valid' };
};

// Development helpers
export const isDevelopment = () => {
  return import.meta.env.MODE === 'development';
};

export const isProduction = () => {
  return import.meta.env.MODE === 'production';
};

export const isStaging = () => {
  return import.meta.env.MODE === 'staging' || window.location.hostname.includes('staging');
};

export const logConfig = () => {
  if (isDevelopment()) {
    console.log('Current Configuration:', {
      API_BASE_URL: config.API_BASE_URL,
      FRONTEND_URL: config.FRONTEND_URL,
      MODE: import.meta.env.MODE,
      FEATURES: config.FEATURES,
      AUTH_ENDPOINTS: config.AUTH.ENDPOINTS
    });
  }
};

/**
 * Get environment-specific configuration
 * @returns {object} - Environment config
 */
export const getEnvironmentConfig = () => {
  if (isProduction()) {
    return {
      isProduction: true,
      isDevelopment: false,
      apiUrl: config.API_BASE_URL,
      logLevel: 'error',
      enableDebug: false
    };
  } else if (isStaging()) {
    return {
      isProduction: false,
      isDevelopment: false,
      isStaging: true,
      apiUrl: config.API_BASE_URL,
      logLevel: 'warn',
      enableDebug: true
    };
  } else {
    // Development
    return {
      isProduction: false,
      isDevelopment: true,
      apiUrl: config.API_BASE_URL,
      logLevel: 'debug',
      enableDebug: true
    };
  }
};

/**
 * Safe localStorage access with error handling
 * @param {string} key - Storage key
 * @param {any} defaultValue - Default value if key doesn't exist or error occurs
 * @returns {any} - Retrieved value or default
 */
export const safeLocalStorageGet = (key, defaultValue = null) => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : defaultValue;
  } catch (error) {
    console.error(`Error reading from localStorage key "${key}":`, error);
    return defaultValue;
  }
};

/**
 * Safe localStorage set with error handling
 * @param {string} key - Storage key
 * @param {any} value - Value to store
 * @returns {boolean} - True if successful
 */
export const safeLocalStorageSet = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Error writing to localStorage key "${key}":`, error);
    return false;
  }
};

/**
 * Safe localStorage remove with error handling
 * @param {string} key - Storage key
 * @returns {boolean} - True if successful
 */
export const safeLocalStorageRemove = (key) => {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Error removing from localStorage key "${key}":`, error);
    return false;
  }
};

// Initialize logging in development
if (isDevelopment()) {
  logConfig();
}

export default config;
