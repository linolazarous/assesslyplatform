// src/api/userApi.js
// =============================================
// Assessly Platform - User Management API
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
 * Fetch user profile
 * GET /api/v1/users/profile
 */
export async function fetchUserProfile() {
  const res = await fetch(`${API_BASE}/users/profile`, {
    method: "GET",
    headers: buildHeaders(),
  });
  return handleResponse(res, "Failed to fetch user profile");
}

/**
 * Fetch user's organizations
 * GET /api/v1/users/organizations
 */
export async function fetchOrganizations() {
  const res = await fetch(`${API_BASE}/users/organizations`, {
    method: "GET",
    headers: buildHeaders(),
  });
  return handleResponse(res, "Failed to fetch organizations");
}

/**
 * Switch organization context
 * POST /api/v1/users/switch-organization
 */
export async function switchOrganization(organizationId) {
  const res = await fetch(`${API_BASE}/users/switch-organization`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify({ organizationId }),
  });
  return handleResponse(res, "Failed to switch organization");
}

/**
 * Update user profile
 * PATCH /api/v1/users/profile
 */
export async function updateUserProfile(profileData) {
  const res = await fetch(`${API_BASE}/users/profile`, {
    method: "PATCH",
    headers: buildHeaders(),
    body: JSON.stringify(profileData),
  });
  return handleResponse(res, "Failed to update profile");
}
