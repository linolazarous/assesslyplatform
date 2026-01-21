// frontend/src/config.js
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
    
    // API Endpoints - Updated to match backend endpoints
    ENDPOINTS: {
      LOGIN: '/auth/login',
      REGISTER: '/auth/register',
      LOGOUT: '/auth/logout',
      REFRESH: '/auth/refresh',
      ME: '/auth/me',
      VERIFY_EMAIL: '/auth/verify-email',
      FORGOT_PASSWORD: '/auth/forgot-password',
      RESET_PASSWORD: '/auth/reset-password',
      RESEND_VERIFICATION: '/auth/resend-verification'
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
    
    // API Service URLs
    API: {
      // Authentication
      AUTH: {
        LOGIN: '/auth/login',
        REGISTER: '/auth/register',
        LOGOUT: '/auth/logout',
        REFRESH: '/auth/refresh',
        ME: '/auth/me',
        VERIFY_EMAIL: '/auth/verify-email',
        FORGOT_PASSWORD: '/auth/forgot-password',
        RESET_PASSWORD: '/auth/reset-password',
        RESEND_VERIFICATION: '/auth/resend-verification'
      },
      
      // Assessments
      ASSESSMENTS: {
        BASE: '/assessments',
        DETAIL: '/assessments/:id',
        QUESTIONS: '/assessments/:id/questions',
        SETTINGS: '/assessments/:id/settings',
        QUESTION_DETAIL: '/assessments/:assessmentId/questions/:questionId'
      },
      
      // Candidates
      CANDIDATES: {
        BASE: '/candidates',
        DETAIL: '/candidates/:id'
      },
      
      // Organization
      ORGANIZATION: {
        BASE: '/organizations/me'
      },
      
      // User
      USER: {
        PROFILE: '/users/me',
        PASSWORD: '/users/me/password'
      },
      
      // Dashboard
      DASHBOARD: {
        STATS: '/dashboard/stats'
      },
      
      // Subscriptions
      SUBSCRIPTIONS: {
        CHECKOUT: '/subscriptions/checkout',
        ME: '/subscriptions/me',
        CANCEL: '/subscriptions/cancel',
        PLANS: '/plans',
        UPGRADE: '/subscriptions/upgrade' // Note: This doesn't exist in backend, uses checkout instead
      },
      
      // Payments
      PAYMENTS: {
        INTENT: '/payments/intent',
        HISTORY: '/billing/history'
      },
      
      // Webhooks
      WEBHOOKS: {
        STRIPE: '/webhooks/stripe'
      },
      
      // Public endpoints
      PUBLIC: {
        CONTACT: '/contact',
        DEMO: '/demo'
      },
      
      // Health
      HEALTH: '/health'
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

export const getFullUrl = (endpoint) => {
  // Remove leading slash if present in endpoint
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
  return `${config.API_BASE_URL}/${cleanEndpoint}`;
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
  const planKey = planId.toUpperCase();
  return config.PLANS[planKey] || config.PLANS.FREE;
};

export const formatCurrency = (amount, currency = 'usd') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

// Development helpers
export const isDevelopment = () => {
  return import.meta.env.MODE === 'development';
};

export const isProduction = () => {
  return import.meta.env.MODE === 'production';
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

// Initialize logging in development
if (isDevelopment()) {
  logConfig();
}

export default config;
