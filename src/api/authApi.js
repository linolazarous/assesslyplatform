// src/api/authApi.js
import api, { API_ENDPOINTS, TokenManager } from './index';

/**
 * Authentication API Service
 * Returns { success, data, message }
 */

// ===================== HELPERS =====================

const handleError = (error, fallback) => {
  const apiError = error.response?.data;
  return {
    success: false,
    message: apiError?.message || fallback,
    status: error.response?.status,
    code: apiError?.code,
  };
};

// ===================== AUTH =====================

export const register = async (data) => {
  try {
    const res = await api.post(API_ENDPOINTS.AUTH.REGISTER, data);

    if (res.data?.token) {
      TokenManager.setTokens(res.data.token, res.data.refreshToken);
    }

    return res.data;
  } catch (e) {
    return handleError(e, 'Registration failed');
  }
};

export const login = async (credentials) => {
  try {
    const res = await api.post(API_ENDPOINTS.AUTH.LOGIN, credentials);

    if (res.data?.token) {
      TokenManager.setTokens(res.data.token, res.data.refreshToken);
    }

    return res.data;
  } catch (e) {
    TokenManager.clearAll();
    return handleError(e, 'Invalid credentials');
  }
};

export const logout = async () => {
  try {
    await api.post(API_ENDPOINTS.AUTH.LOGOUT);
  } catch (_) {
    /* ignore */
  } finally {
    TokenManager.clearAll();
  }

  return { success: true };
};

// ===================== PASSWORD =====================

export const forgotPassword = async (data) =>
  api.post(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, data).then(r => r.data);

export const resetPassword = async (data) =>
  api.post(API_ENDPOINTS.AUTH.RESET_PASSWORD, data).then(r => r.data);

// ===================== PROFILE =====================

export const getProfile = async () =>
  api.get(API_ENDPOINTS.AUTH.ME).then(r => r.data);

// ===================== TOKEN =====================

export const refreshToken = async (refreshToken) => {
  try {
    const res = await api.post(API_ENDPOINTS.AUTH.REFRESH, { refreshToken });

    if (res.data?.token) {
      TokenManager.setTokens(res.data.token, res.data.refreshToken);
    }

    return res.data;
  } catch (e) {
    TokenManager.clearAll();
    return handleError(e, 'Session expired');
  }
};

// ===================== GOOGLE OAUTH =====================

export const getGoogleOAuthUrl = () => {
  const base =
    import.meta.env.VITE_API_BASE_URL ||
    'https://assesslyplatform-t49h.onrender.com';
  return `${base}/api/v1/auth/google`;
};

export const handleGoogleCallback = async (code) => {
  try {
    const res = await api.get(`/auth/google/callback?code=${code}`);

    if (res.data?.token) {
      TokenManager.setTokens(res.data.token, res.data.refreshToken);
    }

    return res.data;
  } catch (e) {
    return handleError(e, 'Google authentication failed');
  }
};

// ===================== AUTH STATUS =====================

export const checkAuthStatus = async () => {
  const token = TokenManager.getToken();

  if (!token) {
    return {
      success: false,
      data: { authenticated: false, user: null },
    };
  }

  try {
    const profile = await getProfile();
    return {
      success: true,
      data: { authenticated: true, user: profile.data },
    };
  } catch {
    TokenManager.clearAll();
    return {
      success: false,
      data: { authenticated: false, user: null },
    };
  }
};

// ===================== DEFAULT EXPORT =====================

export default {
  register,
  login,
  logout,
  forgotPassword,
  resetPassword,
  getProfile,
  refreshToken,
  getGoogleOAuthUrl,
  handleGoogleCallback,
  checkAuthStatus,
};
