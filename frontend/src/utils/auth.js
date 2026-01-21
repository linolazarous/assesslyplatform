import axios from 'axios';
import config, { 
  getAuthToken, setAuthToken, getRefreshToken, setRefreshToken, 
  setUser, clearAuthData, isAuthenticated 
} from '../config.js';

// Create axios instance with interceptors
const api = axios.create({
  baseURL: config.API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Try to refresh token
        const refreshToken = getRefreshToken();
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const response = await axios.post(`${config.API_BASE_URL}${config.AUTH.ENDPOINTS.REFRESH}`, {
          refresh_token: refreshToken,
        });

        const { access_token, refresh_token } = response.data;

        // Update tokens
        setAuthToken(access_token);
        setRefreshToken(refresh_token);

        // Retry original request
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return axios(originalRequest);
      } catch (refreshError) {
        // Refresh failed, logout user
        clearAuthData();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth utilities
export const login = async (email, password) => {
  try {
    const response = await api.post(config.AUTH.ENDPOINTS.LOGIN, { email, password });
    
    if (response.data.access_token) {
      // Store tokens
      setAuthToken(response.data.access_token);
      setRefreshToken(response.data.refresh_token);
      
      // Store user data
      if (response.data.user) {
        setUser(response.data.user);
      }
      
      return response.data;
    }
    
    throw new Error('No access token received');
  } catch (error) {
    const errorData = error.response?.data || error.message;
    throw new Error(typeof errorData === 'object' ? errorData.detail || 'Login failed' : errorData);
  }
};

export const register = async (userData) => {
  try {
    const response = await api.post(config.AUTH.ENDPOINTS.REGISTER, userData);
    
    if (response.data.access_token) {
      // Store tokens
      setAuthToken(response.data.access_token);
      setRefreshToken(response.data.refresh_token);
      
      // Store user data
      if (response.data.user) {
        setUser(response.data.user);
      }
      
      return response.data;
    }
    
    throw new Error('No access token received');
  } catch (error) {
    const errorData = error.response?.data || error.message;
    throw new Error(typeof errorData === 'object' ? errorData.detail || 'Registration failed' : errorData);
  }
};

export const logout = async () => {
  try {
    // Call backend logout if endpoint exists
    await api.post(config.AUTH.ENDPOINTS.LOGOUT);
  } catch (error) {
    // Silently fail if logout endpoint doesn't exist
    console.log('Backend logout endpoint not available');
  } finally {
    clearAuthData();
  }
};

export const getCurrentUser = () => {
  return getUser();
};

export { isAuthenticated, clearAuthData, getAuthHeaders };

export default api;
