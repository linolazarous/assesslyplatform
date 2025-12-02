// src/api/notificationApi.js
// =============================================
// Assessly Platform - Notifications API
// =============================================

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://assesslyplatform-t49h.onrender.com/api/v1";

async function handleResponse(res, defaultMsg) {
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ message: defaultMsg }));
    throw new Error(errorData.message || defaultMsg);
  }
  return res.json();
}

function getAuthToken() {
  return localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
}

function buildHeaders(includeAuth = true) {
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
 * Fetch user notifications
 * GET /api/v1/notifications
 */
export async function fetchNotifications(params = {}) {
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      queryParams.append(key, value.toString());
    }
  });
  
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
  
  const res = await fetch(`${API_BASE}/notifications${queryString}`, {
    method: "GET",
    headers: buildHeaders(),
  });
  return handleResponse(res, "Failed to fetch notifications");
}

/**
 * Mark notification as read
 * PATCH /api/v1/notifications/:id/read
 */
export async function markNotificationAsRead(notificationId) {
  const res = await fetch(`${API_BASE}/notifications/${notificationId}/read`, {
    method: "PATCH",
    headers: buildHeaders(),
  });
  return handleResponse(res, "Failed to mark notification as read");
}

/**
 * Mark all notifications as read
 * POST /api/v1/notifications/read-all
 */
export async function markAllNotificationsAsRead() {
  const res = await fetch(`${API_BASE}/notifications/read-all`, {
    method: "POST",
    headers: buildHeaders(),
  });
  return handleResponse(res, "Failed to mark all notifications as read");
}
