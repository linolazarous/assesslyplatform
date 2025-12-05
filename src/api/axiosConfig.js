// src/api/axiosConfig.js
import axios from 'axios';

// Determine base URL based on environment
// Use Vite environment variables (import.meta.env) for Vite projects
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://assesslyplatform-t49h.onrender.com/api/v1';

// Validate environment variables in production
if (import.meta.env.PROD && !import.meta.env.VITE_API_URL) {
  console.warn('VITE_API_URL is not set in production environment');
}

// Create axios instance with default configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Platform': 'Assessly-Platform',
    'X-Version': import.meta.env.VITE_APP_VERSION || '1.0.0',
  },
  validateStatus: (status) => {
    // Consider status codes less than 500 as successful for error handling
    return status < 500;
  },
});

// Request interceptor for adding auth token and organization context
api.interceptors.request.use(
  (config) => {
    // Get token from storage
    const token = localStorage.getItem('accessToken') || 
                  sessionStorage.getItem('accessToken');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add organization context for multi-tenancy
    const organizationId = localStorage.getItem('organizationId') ||
                          sessionStorage.getItem('organizationId');
    
    if (organizationId) {
      config.headers['X-Organization-Id'] = organizationId;
    }
    
    // Add tenant context for B2B SaaS
    const tenantId = localStorage.getItem('tenantId') ||
                     sessionStorage.getItem('tenantId');
    
    if (tenantId) {
      config.headers['X-Tenant-Id'] = tenantId;
    }
    
    // Add request ID for tracing
    config.headers['X-Request-Id'] = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Log request in development
    if (import.meta.env.DEV) {
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, {
        headers: config.headers,
        data: config.data,
        params: config.params,
      });
    }
    
    return config;
  },
  (error) => {
    console.error('[API Request Interceptor Error]', error);
    return Promise.reject(error);
  }
);

// Response interceptor for handling common errors and formatting
api.interceptors.response.use(
  (response) => {
    // Log response in development
    if (import.meta.env.DEV) {
      console.log(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url}`, {
        status: response.status,
        data: response.data,
        headers: response.headers,
      });
    }
    
    // Handle successful responses with consistent format
    if (response.status >= 200 && response.status < 300) {
      return {
        ...response,
        data: {
          success: true,
          data: response.data?.data || response.data,
          message: response.data?.message || 'Request successful',
          meta: response.data?.meta || {},
          ...response.data,
        },
      };
    }
    
    // Handle non-2xx but non-error responses
    return response;
  },
  (error) => {
    // Log error in development
    if (import.meta.env.DEV) {
      console.error('[API Response Error]', error);
    }
    
    // Handle common error scenarios
    if (error.response) {
      const { status, data, config } = error.response;
      const url = config?.url;
      const method = config?.method?.toUpperCase();
      
      console.error(`[API Error] ${method} ${url} - Status: ${status}`, data);
      
      // Handle token expiration/authentication errors
      if (status === 401) {
        // Clear stored tokens
        localStorage.removeItem('accessToken');
        sessionStorage.removeItem('accessToken');
        localStorage.removeItem('organizationId');
        sessionStorage.removeItem('organizationId');
        
        // Only redirect if not already on login page
        const isLoginPage = window.location.pathname.includes('/login') ||
                           window.location.pathname.includes('/auth');
        
        if (!isLoginPage) {
          // Store current location for redirect back after login
          sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
          window.location.href = '/auth?mode=login&session=expired';
        }
      }
      
      // Handle access denied/forbidden
      if (status === 403) {
        // You can show a notification or redirect to access denied page
        console.error('Access denied: Insufficient permissions');
      }
      
      // Handle rate limiting
      if (status === 429) {
        const retryAfter = error.response.headers['retry-after'];
        console.warn(`Rate limited. Retry after: ${retryAfter || 'unknown'} seconds`);
      }
      
      // Handle server errors
      if (status >= 500) {
        // Log to error tracking service
        console.error(`Server error ${status}:`, data?.message || 'Internal server error');
      }
      
      // Transform error response to consistent format
      const formattedError = {
        success: false,
        status: status,
        message: data?.message || 
                data?.error || 
                getDefaultErrorMessage(status),
        code: data?.code || `HTTP_${status}`,
        errors: data?.errors || null,
        timestamp: new Date().toISOString(),
        path: url,
        method: method,
        ...data,
      };
      
      return Promise.reject(formattedError);
    }
    
    // Handle network errors
    if (error.message === 'Network Error' || !error.response) {
      const networkError = {
        success: false,
        status: 0,
        message: 'Network error. Please check your internet connection.',
        code: 'NETWORK_ERROR',
        timestamp: new Date().toISOString(),
      };
      
      return Promise.reject(networkError);
    }
    
    // Handle timeouts
    if (error.code === 'ECONNABORTED') {
      const timeoutError = {
        success: false,
        status: 408,
        message: 'Request timeout. The server took too long to respond.',
        code: 'TIMEOUT',
        timestamp: new Date().toISOString(),
      };
      
      return Promise.reject(timeoutError);
    }
    
    // Handle other errors
    return Promise.reject({
      success: false,
      status: error.status || 500,
      message: error.message || 'An unexpected error occurred',
      code: 'UNKNOWN_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
);

// Helper function to get default error messages
const getDefaultErrorMessage = (status) => {
  const messages = {
    400: 'Bad request. Please check your input.',
    401: 'Unauthorized. Please log in again.',
    403: 'Access denied. You do not have permission.',
    404: 'Resource not found.',
    409: 'Conflict. Resource already exists.',
    422: 'Validation error. Please check your input.',
    429: 'Too many requests. Please try again later.',
    500: 'Internal server error. Please try again later.',
    502: 'Bad gateway. The server is temporarily unavailable.',
    503: 'Service unavailable. Please try again later.',
    504: 'Gateway timeout. The server took too long to respond.',
  };
  
  return messages[status] || 'An error occurred';
};

// Helper functions for common API operations
const apiHelpers = {
  /**
   * Upload file with progress tracking
   * @param {string} endpoint - API endpoint
   * @param {File} file - File to upload
   * @param {Object} data - Additional form data
   * @param {Function} onProgress - Progress callback (0-100)
   * @param {Object} config - Additional axios config
   * @returns {Promise} Upload response
   */
  upload: async (endpoint, file, data = {}, onProgress = null, config = {}) => {
    const formData = new FormData();
    formData.append('file', file);
    
    // Append additional data
    Object.keys(data).forEach(key => {
      if (Array.isArray(data[key])) {
        data[key].forEach((item, index) => {
          formData.append(`${key}[${index}]`, item);
        });
      } else {
        formData.append(key, data[key]);
      }
    });
    
    const uploadConfig = {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      },
      timeout: 120000, // 2 minutes for large files
      ...config,
    };
    
    try {
      const response = await api.post(endpoint, formData, uploadConfig);
      return response;
    } catch (error) {
      console.error('File upload failed:', error);
      throw error;
    }
  },

  /**
   * Download file from API
   * @param {string} endpoint - API endpoint
   * @param {Object} params - Query parameters
   * @param {string} filename - Download filename
   * @param {Object} config - Additional axios config
   * @returns {Promise} Download response
   */
  download: async (endpoint, params = {}, filename = 'download', config = {}) => {
    const downloadConfig = {
      responseType: 'blob',
      params,
      timeout: 60000, // 1 minute for downloads
      ...config,
    };
    
    try {
      const response = await api.get(endpoint, downloadConfig);
      
      // Extract filename from headers if available
      const contentDisposition = response.headers['content-disposition'];
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?(.+)"?/);
        if (match && match[1]) {
          filename = match[1];
        }
      }
      
      // Get content type
      const contentType = response.headers['content-type'] || 'application/octet-stream';
      
      // Create blob
      const blob = new Blob([response.data], { type: contentType });
      
      // Create download URL
      const downloadUrl = window.URL.createObjectURL(blob);
      
      // Create and trigger download link
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      link.style.display = 'none';
      link.setAttribute('aria-hidden', 'true');
      
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
      }, 100);
      
      return response;
      
    } catch (error) {
      console.error('File download failed:', error);
      throw error;
    }
  },

  /**
   * API health check
   * @returns {Promise} Health check response
   */
  healthCheck: async () => {
    try {
      const response = await api.get('/health', {
        timeout: 5000,
        skipAuth: true, // Custom header to skip auth in interceptor
      });
      return {
        healthy: response.status === 200,
        timestamp: new Date().toISOString(),
        responseTime: response.headers['x-response-time'],
        version: response.data?.version,
      };
    } catch (error) {
      return {
        healthy: false,
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  },

  /**
   * Cancel token generator for request cancellation
   * @returns {Object} Cancel token source
   */
  createCancelToken: () => {
    return axios.CancelToken.source();
  },

  /**
   * Retry request with exponential backoff
   * @param {Function} requestFn - Function that returns axios promise
   * @param {number} maxRetries - Maximum retry attempts
   * @param {number} baseDelay - Base delay in milliseconds
   * @returns {Promise} Request promise
   */
  retry: async (requestFn, maxRetries = 3, baseDelay = 1000) => {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        if (attempt === maxRetries || 
            (error.status && error.status < 500 && error.status !== 429)) {
          throw error;
        }
        
        // Exponential backoff with jitter
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 100;
        console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay.toFixed(0)}ms`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  },

  /**
   * Handle API errors in a user-friendly way
   * @param {Error} error - API error
   * @returns {Object} User-friendly error message
   */
  getErrorMessage: (error) => {
    if (error.code === 'NETWORK_ERROR' || error.status === 0) {
      return {
        title: 'Network Error',
        message: 'Unable to connect to server. Please check your internet connection.',
        severity: 'error',
      };
    }

    switch (error.status) {
      case 401:
        return {
          title: 'Session Expired',
          message: 'Your session has expired. Please log in again.',
          severity: 'warning',
          action: 'login',
        };
      case 403:
        return {
          title: 'Access Denied',
          message: 'You do not have permission to perform this action.',
          severity: 'error',
        };
      case 404:
        return {
          title: 'Not Found',
          message: 'The requested resource was not found.',
          severity: 'warning',
        };
      case 409:
        return {
          title: 'Conflict',
          message: 'This resource already exists or has been modified.',
          severity: 'warning',
        };
      case 422:
        return {
          title: 'Validation Error',
          message: 'Please check your input and try again.',
          severity: 'warning',
          errors: error.errors,
        };
      case 429:
        return {
          title: 'Too Many Requests',
          message: 'Please wait a moment before trying again.',
          severity: 'info',
        };
      case 500:
        return {
          title: 'Server Error',
          message: 'An internal server error occurred. Our team has been notified.',
          severity: 'error',
        };
      case 502:
      case 503:
      case 504:
        return {
          title: 'Service Unavailable',
          message: 'The server is temporarily unavailable. Please try again later.',
          severity: 'error',
        };
      default:
        return {
          title: 'Error',
          message: error.message || 'An unexpected error occurred.',
          severity: 'error',
        };
    }
  },

  /**
   * Set authentication tokens
   * @param {string} accessToken - Access token
   * @param {string} refreshToken - Refresh token (optional)
   * @param {boolean} rememberMe - Store in localStorage (true) or sessionStorage (false)
   */
  setAuthTokens: (accessToken, refreshToken = null, rememberMe = true) => {
    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem('accessToken', accessToken);
    if (refreshToken) {
      storage.setItem('refreshToken', refreshToken);
    }
  },

  /**
   * Clear authentication tokens
   */
  clearAuthTokens: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('refreshToken');
  },

  /**
   * Set organization context
   * @param {string} organizationId - Organization ID
   * @param {boolean} persist - Store in localStorage (true) or sessionStorage (false)
   */
  setOrganization: (organizationId, persist = true) => {
    const storage = persist ? localStorage : sessionStorage;
    storage.setItem('organizationId', organizationId);
  },

  /**
   * Clear organization context
   */
  clearOrganization: () => {
    localStorage.removeItem('organizationId');
    sessionStorage.removeItem('organizationId');
  },
};

// Add helper functions to the api instance
Object.assign(api, apiHelpers);

// Export the configured api instance
export default api;

// Also export helpers for direct usage if needed
export { apiHelpers };
