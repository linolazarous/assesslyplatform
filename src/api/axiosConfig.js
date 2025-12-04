// src/api/axiosConfig.js
import axios from 'axios';

// Create axios instance with default configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Content-Type': 'application/json',
    'X-Platform': 'Assessly-Platform',
    'X-Version': '1.0.0',
  },
});

// Request interceptor for adding authentication token
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage (or your auth context)
    const token = localStorage.getItem('accessToken') || 
                  localStorage.getItem('token') || 
                  sessionStorage.getItem('accessToken');
    
    // If token exists, add it to the headers
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add organization context if available
    const organizationId = localStorage.getItem('currentOrganizationId');
    if (organizationId) {
      config.headers['X-Organization-Id'] = organizationId;
    }

    // Add tenant context for multi-tenancy
    const tenantId = localStorage.getItem('tenantId') || 
                     process.env.REACT_APP_TENANT_ID;
    if (tenantId) {
      config.headers['X-Tenant-Id'] = tenantId;
    }

    // Log request in development mode
    if (process.env.NODE_ENV === 'development') {
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, {
        data: config.data,
        params: config.params,
        headers: config.headers,
      });
    }

    return config;
  },
  (error) => {
    // Handle request error
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

// Response interceptor for handling errors globally
api.interceptors.response.use(
  (response) => {
    // Log response in development mode
    if (process.env.NODE_ENV === 'development') {
      console.log(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url}`, {
        status: response.status,
        data: response.data,
      });
    }

    // Handle success responses
    return response;
  },
  (error) => {
    // Handle response errors
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      const { status, data } = error.response;
      const url = error.config?.url;
      const method = error.config?.method?.toUpperCase();

      console.error(`[API Error] ${method} ${url} - Status: ${status}`, {
        error: data,
        headers: error.response.headers,
      });

      // Handle specific status codes
      switch (status) {
        case 400:
          // Bad Request
          console.error('Bad Request:', data.message || 'Invalid request format');
          break;

        case 401:
          // Unauthorized - Token expired or invalid
          console.error('Unauthorized - Token invalid or expired');
          // Clear auth tokens
          localStorage.removeItem('accessToken');
          localStorage.removeItem('token');
          sessionStorage.removeItem('accessToken');
          
          // Redirect to login if not already there
          if (!window.location.pathname.includes('/login') && 
              !window.location.pathname.includes('/auth')) {
            window.location.href = '/login?session=expired';
          }
          break;

        case 403:
          // Forbidden - User doesn't have permission
          console.error('Forbidden - Insufficient permissions');
          // You can show a notification or redirect
          break;

        case 404:
          // Not Found
          console.error('Resource not found:', url);
          break;

        case 409:
          // Conflict - Resource already exists
          console.error('Conflict:', data.message || 'Resource already exists');
          break;

        case 422:
          // Unprocessable Entity - Validation error
          console.error('Validation Error:', data.errors || data.message);
          break;

        case 429:
          // Too Many Requests - Rate limiting
          console.error('Rate limited - Too many requests');
          // You can implement retry logic or show a message
          break;

        case 500:
          // Internal Server Error
          console.error('Server Error:', data.message || 'Internal server error');
          break;

        case 502:
          // Bad Gateway
          console.error('Bad Gateway - Server is down or maintenance');
          break;

        case 503:
          // Service Unavailable
          console.error('Service Unavailable - Server is temporarily unavailable');
          break;

        case 504:
          // Gateway Timeout
          console.error('Gateway Timeout - Server took too long to respond');
          break;

        default:
          console.error(`HTTP Error ${status}:`, data.message || 'Unknown error');
      }

      // Create a standardized error object
      const apiError = new Error(data?.message || `HTTP ${status}: ${error.message}`);
      apiError.status = status;
      apiError.data = data;
      apiError.url = url;
      apiError.method = method;

      return Promise.reject(apiError);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('[API Network Error] No response received:', error.request);
      
      const networkError = new Error('Network error - Unable to reach server');
      networkError.isNetworkError = true;
      networkError.request = error.request;
      
      return Promise.reject(networkError);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('[API Setup Error]', error.message);
      return Promise.reject(error);
    }
  }
);

// Helper functions for common API operations
export const apiHelpers = {
  /**
   * Upload file with progress tracking
   * @param {string} url - API endpoint
   * @param {File} file - File to upload
   * @param {Function} onProgress - Progress callback
   * @param {Object} additionalData - Additional form data
   * @returns {Promise} Upload response
   */
  uploadFile: async (url, file, onProgress = null, additionalData = {}) => {
    const formData = new FormData();
    formData.append('file', file);
    
    // Append additional data
    Object.keys(additionalData).forEach(key => {
      formData.append(key, additionalData[key]);
    });

    const config = {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      },
    };

    return api.post(url, formData, config);
  },

  /**
   * Download file from API
   * @param {string} url - API endpoint
   * @param {string} filename - Suggested filename for download
   * @returns {Promise} Download promise
   */
  downloadFile: async (url, filename = 'download') => {
    const response = await api.get(url, {
      responseType: 'blob',
    });

    // Create download link
    const blob = new Blob([response.data]);
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  },

  /**
   * Cancel request using cancel token
   * @returns {Object} Cancel token and cancel function
   */
  createCancelToken: () => {
    const source = axios.CancelToken.source();
    return {
      token: source.token,
      cancel: source.cancel,
    };
  },

  /**
   * Retry failed request with exponential backoff
   * @param {Function} requestFn - Function that returns axios promise
   * @param {number} maxRetries - Maximum number of retries
   * @param {number} delay - Initial delay in ms
   * @returns {Promise} Request promise
   */
  retryRequest: async (requestFn, maxRetries = 3, delay = 1000) => {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        if (attempt === maxRetries || 
            (error.response && error.response.status < 500)) {
          throw error;
        }
        
        // Wait before retrying (exponential backoff)
        const waitTime = delay * Math.pow(2, attempt);
        console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${waitTime}ms`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  },

  /**
   * Handle API errors in a user-friendly way
   * @param {Error} error - API error
   * @returns {Object} User-friendly error message
   */
  getErrorMessage: (error) => {
    if (error.isNetworkError) {
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
      default:
        return {
          title: 'Error',
          message: error.message || 'An unexpected error occurred.',
          severity: 'error',
        };
    }
  },
};

// Add helper functions to the api instance
Object.assign(api, apiHelpers);

// Export the configured axios instance
export default api;

// Also export as named export for flexibility
export { api as axiosInstance, apiHelpers };
