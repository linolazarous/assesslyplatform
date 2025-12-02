// src/api/userActivityApi.js
// =============================================
// Assessly Platform - User Activity API Service
// =============================================
// Matches backend: GET /api/v1/activities
// Part of "User Activities" in API documentation
// =============================================

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://assesslyplatform-t49h.onrender.com/api/v1";

// Reuse the handleResponse and buildHeaders from contactApi.js or create a shared utility
async function handleResponse(res, defaultMsg) {
  const contentType = res.headers.get('content-type');
  
  if (!res.ok) {
    let errorMessage = defaultMsg;
    
    if (contentType && contentType.includes('application/json')) {
      try {
        const errorData = await res.json();
        errorMessage = errorData.message || errorData.error || `HTTP ${res.status}: ${res.statusText}`;
      } catch (e) {
        errorMessage = `HTTP ${res.status}: ${res.statusText}`;
      }
    }
    
    throw new Error(errorMessage);
  }
  
  if (contentType && contentType.includes('application/json')) {
    const data = await res.json();
    if (data.success === false) {
      throw new Error(data.message || defaultMsg);
    }
    return data;
  }
  
  return { success: true, message: defaultMsg };
}

function getAuthToken() {
  return localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
}

function buildHeaders(includeAuth = false) {
  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (includeAuth) {
    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  
  return headers;
}

/**
 * Fetch user activities
 * GET /api/v1/activities
 * 
 * @param {Object} params - Query parameters
 * @param {number} params.limit - Number of activities to return
 * @param {string} params.organizationId - Filter by organization
 * @param {string} params.userId - Filter by user
 * @param {string} params.activityType - Filter by activity type
 * @param {string} params.timeRange - Time range filter
 * @param {number} params.page - Page number for pagination
 * @returns {Promise<Object>} User activities
 */
export async function fetchUserActivities(params = {}) {
  const queryParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      queryParams.append(key, value.toString());
    }
  });
  
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
  
  const res = await fetch(`${API_BASE}/activities${queryString}`, {
    method: "GET",
    headers: buildHeaders(true),
  });
  
  return handleResponse(res, "Failed to fetch user activities");
}

/**
 * Fetch user activity analytics
 * GET /api/v1/activities/analytics
 * 
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} Activity analytics
 */
export async function fetchUserActivityAnalytics(params = {}) {
  const queryParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && key !== 'limit' && key !== 'page') {
      queryParams.append(key, value.toString());
    }
  });
  
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
  
  const res = await fetch(`${API_BASE}/activities/analytics${queryString}`, {
    method: "GET",
    headers: buildHeaders(true),
  });
  
  return handleResponse(res, "Failed to fetch activity analytics");
}

/**
 * Export user activities
 * GET /api/v1/activities/export
 * 
 * @param {Object} params - Export parameters
 * @param {string} params.format - Export format (csv, json)
 * @param {string} params.startDate - Start date filter
 * @param {string} params.endDate - End date filter
 * @returns {Promise<Blob>} Exported file
 */
export async function exportUserActivities(params = {}) {
  const queryParams = new URLSearchParams({
    format: params.format || 'csv',
  });
  
  if (params.startDate) queryParams.append('startDate', params.startDate);
  if (params.endDate) queryParams.append('endDate', params.endDate);
  if (params.organizationId) queryParams.append('organizationId', params.organizationId);
  
  const queryString = `?${queryParams.toString()}`;
  
  const res = await fetch(`${API_BASE}/activities/export${queryString}`, {
    method: "GET",
    headers: buildHeaders(true),
  });
  
  if (!res.ok) {
    throw new Error(`Failed to export activities: ${res.statusText}`);
  }
  
  return await res.blob();
}

export default {
  fetchUserActivities,
  fetchUserActivityAnalytics,
  exportUserActivities,
};
