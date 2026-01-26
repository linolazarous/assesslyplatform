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
    SESSION_KEY: 'session_id', // NEW: Session ID storage key
    
    // API Endpoints - UPDATED: Added /api prefix to match backend
    ENDPOINTS: {
      // Authentication
      LOGIN: '/api/auth/login',
      REGISTER: '/api/auth/register',
      LOGOUT: '/api/auth/logout',
      REFRESH: '/api/auth/refresh',
      ME: '/api/auth/me',
      VERIFY_EMAIL: '/api/auth/verify-email',
      FORGOT_PASSWORD: '/api/auth/forgot-password',
      RESET_PASSWORD: '/api/auth/reset-password',
      RESEND_VERIFICATION: '/api/auth/resend-verification',
      
      // NEW: Two-Factor Authentication
      SETUP_2FA: '/api/auth/2fa/setup',
      VERIFY_2FA: '/api/auth/2fa/verify',
      DISABLE_2FA: '/api/auth/2fa/disable',
      VERIFY_2FA_LOGIN: '/api/auth/2fa/login',
      
      // NEW: Session Management
      GET_SESSIONS: '/api/auth/sessions',
      TERMINATE_SESSION: '/api/auth/sessions/:sessionId',
      TERMINATE_ALL_SESSIONS: '/api/auth/sessions/terminate-all',
      
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
      VERIFY_EMAIL: '/verify-email/:token',
      TWO_FACTOR_SETUP: '/settings/security/2fa',
      TWO_FACTOR_VERIFY: '/verify-2fa',
      
      // Dashboard
      DASHBOARD: '/dashboard',
      
      // Assessments
      ASSESSMENTS: '/assessments',
      ASSESSMENT_DETAIL: '/assessments/:id',
      CREATE_ASSESSMENT: '/assessments/new',
      ASSESSMENT_QUESTIONS: '/assessments/:id/questions',
      ASSESSMENT_SETTINGS: '/assessments/:id/settings',
      
      // Candidates
      CANDIDATES: '/candidates',
      CANDIDATE_DETAIL: '/candidates/:id',
      CANDIDATE_RESULTS: '/candidates/:id/results',
      
      // Organization
      ORGANIZATION: '/organization',
      
      // Settings
      SETTINGS: '/settings',
      PROFILE: '/settings/profile',
      BILLING: '/settings/billing',
      SECURITY: '/settings/security',
      SESSIONS: '/settings/security/sessions',
      
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
    TWO_FACTOR_AUTH: import.meta.env.VITE_ENABLE_2FA === 'true',
    FREE_TIER: true,
    BASIC_TIER: true,
    PROFESSIONAL_TIER: true,
    ENTERPRISE_TIER: true,
    
    // NEW: Feature toggles for new endpoints
    ENABLE_SESSION_MANAGEMENT: true,
    ENABLE_ASSESSMENT_PUBLISH: true,
    ENABLE_ASSESSMENT_DUPLICATE: true,
    ENABLE_CANDIDATE_RESEND: true,
    ENABLE_CANDIDATE_RESULTS: true
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
        RESEND_VERIFICATION: '/api/auth/resend-verification',
        
        // NEW: Two-Factor Authentication
        SETUP_2FA: '/api/auth/2fa/setup',
        VERIFY_2FA: '/api/auth/2fa/verify',
        DISABLE_2FA: '/api/auth/2fa/disable',
        VERIFY_2FA_LOGIN: '/api/auth/2fa/login',
        
        // NEW: Session Management
        GET_SESSIONS: '/api/auth/sessions',
        TERMINATE_SESSION: '/api/auth/sessions/:sessionId',
        TERMINATE_ALL_SESSIONS: '/api/auth/sessions/terminate-all'
      },
      
      // Assessments
      ASSESSMENTS: {
        BASE: '/api/assessments',
        DETAIL: '/api/assessments/:id',
        QUESTIONS: '/api/assessments/:id/questions',
        QUESTION_DETAIL: '/api/assessments/:assessmentId/questions/:questionId',
        SETTINGS: '/api/assessments/:id/settings',
        PUBLISH: '/api/assessments/:id/publish',
        DUPLICATE: '/api/assessments/:id/duplicate'
      },
      
      // Candidates
      CANDIDATES: {
        BASE: '/api/candidates',
        DETAIL: '/api/candidates/:id',
        RESEND_INVITATION: '/api/candidates/:id/resend',
        RESULTS: '/api/candidates/:id/results',
        NOTIFY_RESULTS: '/api/candidates/:id/results/notify'
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
        UPGRADE: '/api/subscriptions/upgrade',
        PLANS: '/api/plans'
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
        HEALTH: '/api/health',
        STATUS: '/api/status'
      },
      
      // System endpoints
      SYSTEM: {
        ROOT: '/api/',
        STATUS: '/api/status',
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
        questions: 100,
        canPublishAssessments: false,
        canDuplicateAssessments: false,
        canExportResults: false,
        hasAPIAccess: false,
        maxSessions: 3
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
        'API access',
        'Session management'
      ],
      limits: {
        candidates: 500,
        assessments: 50,
        questions: 5000,
        canPublishAssessments: true,
        canDuplicateAssessments: true,
        canExportResults: true,
        hasAPIAccess: true,
        maxSessions: 5
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
        'Custom branding',
        'Two-factor authentication',
        'Advanced session management'
      ],
      limits: {
        candidates: 'unlimited',
        assessments: 'unlimited',
        questions: 'unlimited',
        canPublishAssessments: true,
        canDuplicateAssessments: true,
        canExportResults: true,
        hasAPIAccess: true,
        maxSessions: 10,
        twoFactorAuth: true
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
        'Advanced security features',
        'Unlimited sessions',
        'SSO integration'
      ],
      limits: {
        candidates: 'unlimited',
        assessments: 'unlimited',
        questions: 'unlimited',
        canPublishAssessments: true,
        canDuplicateAssessments: true,
        canExportResults: true,
        hasAPIAccess: true,
        maxSessions: 'unlimited',
        twoFactorAuth: true,
        ssoEnabled: true
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
  
  // Session Configuration
  SESSION: {
    MAX_SESSIONS_FREE: 3,
    MAX_SESSIONS_BASIC: 5,
    MAX_SESSIONS_PRO: 10,
    SESSION_TIMEOUT_MINUTES: 30 * 24 * 60, // 30 days
    INACTIVITY_TIMEOUT_MINUTES: 60, // 1 hour
    REFRESH_THRESHOLD_SECONDS: 300 // 5 minutes
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
    },
    INVITATION_EXPIRY_DAYS: 30
  },
  
  // Two-Factor Authentication Configuration
  TWO_FACTOR: {
    TOTP_STEP: 30, // Time step in seconds
    TOKEN_LENGTH: 6,
    BACKUP_CODE_COUNT: 10,
    BACKUP_CODE_LENGTH: 16
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

// NEW: Session ID functions
export const getSessionId = () => {
  try {
    return localStorage.getItem(config.AUTH.SESSION_KEY);
  } catch (error) {
    console.error('Error getting session ID:', error);
    return null;
  }
};

export const setSessionId = (sessionId) => {
  try {
    if (!sessionId) {
      console.warn('Attempting to set empty session ID');
      return;
    }
    localStorage.setItem(config.AUTH.SESSION_KEY, sessionId);
  } catch (error) {
    console.error('Error setting session ID:', error);
  }
};

export const removeSessionId = () => {
  try {
    localStorage.removeItem(config.AUTH.SESSION_KEY);
  } catch (error) {
    console.error('Error removing session ID:', error);
  }
};

// Alias for backward compatibility (used by auth.js)
export const clearSessionId = () => {
  removeSessionId();
};

export const clearAuthData = () => {
  try {
    removeAuthToken();
    removeRefreshToken();
    removeUser();
    removeSessionId();
    
    // Clear any other auth-related data
    localStorage.removeItem('auth_redirect');
    localStorage.removeItem('last_login_time');
    localStorage.removeItem('session_start');
    localStorage.removeItem('two_factor_temp_token');
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
        return false;
      }
      
      return true;
    } catch (parseError) {
      console.warn('Unable to parse token payload, assuming valid');
      return true;
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

/**
 * Get authentication headers for API requests
 * @param {object} additionalHeaders - Additional headers to include
 * @returns {object} - Headers object with token and session ID
 */
export const getAuthHeaders = (additionalHeaders = {}) => {
  const token = getAuthToken();
  const sessionId = getSessionId();
  const headers = {
    'Content-Type': 'application/json',
    ...additionalHeaders
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  if (sessionId) {
    headers['X-Session-ID'] = sessionId;
  }
  
  return headers;
};

/**
 * Get full URL for API endpoints
 * @param {string} endpoint - API endpoint
 * @returns {string} - Full URL
 */
export const getFullUrl = (endpoint) => {
  if (endpoint.startsWith('http')) {
    return endpoint;
  }
  
  const cleanEndpoint = endpoint.replace(/^\/api\/api\//, '/api/');
  return `${config.API_BASE_URL}${cleanEndpoint}`;
};

/**
 * Get API endpoint from config with parameters replaced
 * @param {string} servicePath - Service path (e.g., 'AUTH.LOGIN')
 * @param {object} params - Parameters to replace in endpoint
 * @returns {string} - Formatted endpoint
 */
export const getApiEndpoint = (servicePath, params = {}) => {
  try {
    const pathParts = servicePath.split('.');
    let endpointObj = config.SERVICES.API;
    
    for (const part of pathParts) {
      if (endpointObj[part]) {
        endpointObj = endpointObj[part];
      } else {
        console.error(`Endpoint not found: ${servicePath}`);
        return '';
      }
    }
    
    let endpoint = endpointObj;
    
    if (typeof endpoint === 'string') {
      Object.keys(params).forEach(key => {
        endpoint = endpoint.replace(`:${key}`, params[key]);
      });
    }
    
    return endpoint;
  } catch (error) {
    console.error(`Error getting API endpoint ${servicePath}:`, error);
    return '';
  }
};

/**
 * Get application route with parameters replaced
 * @param {string} routeKey - Route key from config.APP.ROUTES
 * @param {object} params - Parameters to replace in route
 * @returns {string} - Formatted route
 */
export const getRoute = (routeKey, params = {}) => {
  if (!config.APP.ROUTES[routeKey]) {
    console.error(`Route key "${routeKey}" not found in config.APP.ROUTES`);
    return '/';
  }
  
  let route = config.APP.ROUTES[routeKey];
  
  Object.keys(params).forEach(key => {
    route = route.replace(`:${key}`, params[key]);
  });
  
  return route;
};

/**
 * Get plan details by plan ID
 * @param {string} planId - Plan ID
 * @returns {object} - Plan details
 */
export const getPlanDetails = (planId) => {
  const planKeys = Object.keys(config.PLANS);
  const foundKey = planKeys.find(key => 
    key.toLowerCase() === planId.toLowerCase() || 
    config.PLANS[key].id === planId
  );
  
  return foundKey ? config.PLANS[foundKey] : config.PLANS.FREE;
};

/**
 * Format currency amount
 * @param {number|string} amount - Amount to format
 * @param {string} currency - Currency code
 * @returns {string} - Formatted currency
 */
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
 * Check if feature is enabled
 * @param {string} feature - Feature name
 * @returns {boolean}
 */
export const isFeatureEnabled = (feature) => {
  return config.FEATURES[feature] === true;
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

/**
 * Validate 2FA token
 * @param {string} token - 2FA token
 * @returns {boolean} - True if token is valid format
 */
export const isValid2FAToken = (token) => {
  return /^\d{6}$/.test(token);
};

/**
 * Generate backup codes
 * @param {number} count - Number of codes to generate
 * @param {number} length - Length of each code
 * @returns {string[]} - Array of backup codes
 */
export const generateBackupCodes = (count = 10, length = 16) => {
  const codes = [];
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  
  for (let i = 0; i < count; i++) {
    let code = '';
    for (let j = 0; j < length; j++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    codes.push(code);
  }
  
  return codes;
};

// Environment helpers
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
      enableDebug: false,
      enableAnalytics: true,
      enableErrorReporting: true
    };
  } else if (isStaging()) {
    return {
      isProduction: false,
      isDevelopment: false,
      isStaging: true,
      apiUrl: config.API_BASE_URL,
      logLevel: 'warn',
      enableDebug: true,
      enableAnalytics: true,
      enableErrorReporting: true
    };
  } else {
    // Development
    return {
      isProduction: false,
      isDevelopment: true,
      apiUrl: config.API_BASE_URL,
      logLevel: 'debug',
      enableDebug: true,
      enableAnalytics: false,
      enableErrorReporting: false
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

/**
 * Get maximum sessions allowed for current user plan
 * @param {string} planId - User's plan ID
 * @returns {number} - Maximum sessions allowed
 */
export const getMaxSessions = (planId) => {
  const plan = getPlanDetails(planId);
  return plan.limits.maxSessions || config.SESSION.MAX_SESSIONS_FREE;
};

/**
 * Get user permissions based on subscription plan
 * @param {string} planId - User's plan ID
 * @returns {object} - User permissions
 */
export const getUserPermissions = (planId) => {
  const plan = getPlanDetails(planId);
  return {
    canPublishAssessments: plan.limits.canPublishAssessments,
    canDuplicateAssessments: plan.limits.canDuplicateAssessments,
    canExportResults: plan.limits.canExportResults,
    hasAPIAccess: plan.limits.hasAPIAccess,
    twoFactorAuth: plan.limits.twoFactorAuth || false,
    ssoEnabled: plan.limits.ssoEnabled || false,
    maxSessions: plan.limits.maxSessions,
    maxAssessments: plan.limits.assessments,
    maxCandidates: plan.limits.candidates,
    maxQuestions: plan.limits.questions
  };
};

// Initialize logging in development
if (isDevelopment()) {
  logConfig();
}

export default config;
