// src/api/api.js
import axios from 'axios';

// Determine base URL based on environment
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://assesslyplatform-t49h.onrender.com/api/v1';

// Create axios instance with default configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request interceptor for adding auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add organization context for multi-tenancy
    const organizationId = localStorage.getItem('organizationId');
    if (organizationId) {
      config.headers['X-Organization-Id'] = organizationId;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling common errors
api.interceptors.response.use(
  (response) => {
    // Transform response data to consistent format
    if (response.data) {
      return {
        ...response,
        data: {
          success: true,
          ...response.data,
        },
      };
    }
    return response;
  },
  (error) => {
    // Handle common error scenarios
    if (error.response) {
      const { status, data } = error.response;
      
      // Handle token expiration
      if (status === 401) {
        // Clear stored tokens
        localStorage.removeItem('accessToken');
        sessionStorage.removeItem('accessToken');
        
        // Redirect to login if not already there
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login?session=expired';
        }
      }
      
      // Handle rate limiting
      if (status === 429) {
        console.warn('Rate limit exceeded:', data.message);
      }
      
      // Handle server errors
      if (status >= 500) {
        console.error('Server error:', data.message);
      }
      
      // Transform error response to consistent format
      return Promise.reject({
        ...error,
        response: {
          ...error.response,
          data: {
            success: false,
            message: data?.message || 'An error occurred',
            code: data?.code || `HTTP_${status}`,
            errors: data?.errors || null,
            ...data,
          },
        },
      });
    }
    
    // Handle network errors
    if (error.message === 'Network Error') {
      return Promise.reject({
        response: {
          data: {
            success: false,
            message: 'Network error. Please check your connection.',
            code: 'NETWORK_ERROR',
          },
        },
      });
    }
    
    // Handle timeouts
    if (error.code === 'ECONNABORTED') {
      return Promise.reject({
        response: {
          data: {
            success: false,
            message: 'Request timeout. Please try again.',
            code: 'TIMEOUT',
          },
        },
      });
    }
    
    return Promise.reject(error);
  }
);

// Helper function for file uploads
api.upload = async (url, file, data = {}, config = {}) => {
  const formData = new FormData();
  formData.append('file', file);
  
  Object.keys(data).forEach(key => {
    formData.append(key, data[key]);
  });
  
  return api.post(url, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    ...config,
  });
};

// Helper function for file download
api.download = async (url, params = {}, filename = 'download') => {
  const response = await api.get(url, {
    params,
    responseType: 'blob',
  });
  
  // Create download link
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
  
  return response;
};

export default api;
