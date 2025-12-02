// src/api/organizationApi.js
// =============================================
// Assessly Platform - Organization Management API
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
 * Verify user access to a specific organization
 * GET /api/v1/organizations/:id/access
 */
export async function verifyOrganizationAccess(organizationId) {
  const res = await fetch(`${API_BASE}/organizations/${organizationId}/access`, {
    method: "GET",
    headers: buildHeaders(),
  });
  return handleResponse(res, "Failed to verify organization access");
}

/**
 * Get current organization details
 * GET /api/v1/organizations/:id
 */
export async function getCurrentOrganization(organizationId) {
  const res = await fetch(`${API_BASE}/organizations/${organizationId}`, {
    method: "GET",
    headers: buildHeaders(),
  });
  return handleResponse(res, "Failed to fetch organization details");
}

/**
 * Check subscription status for an organization
 * GET /api/v1/organizations/:id/subscription
 */
export async function checkSubscriptionStatus(organizationId) {
  const res = await fetch(`${API_BASE}/organizations/${organizationId}/subscription`, {
    method: "GET",
    headers: buildHeaders(),
  });
  return handleResponse(res, "Failed to check subscription status");
}

/**
 * Get user's organizations
 * GET /api/v1/organizations/my
 */
export async function getUserOrganizations() {
  const res = await fetch(`${API_BASE}/organizations/my`, {
    method: "GET",
    headers: buildHeaders(),
  });
  return handleResponse(res, "Failed to fetch user organizations");
}

/**
 * Create a new organization (Super Admin only)
 * POST /api/v1/organizations
 */
export async function createOrganization(organizationData) {
  const res = await fetch(`${API_BASE}/organizations`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(organizationData),
  });
  return handleResponse(res, "Failed to create organization");
}

/**
 * Update organization
 * PATCH /api/v1/organizations/:id
 */
export async function updateOrganization(organizationId, updateData) {
  const res = await fetch(`${API_BASE}/organizations/${organizationId}`, {
    method: "PATCH",
    headers: buildHeaders(),
    body: JSON.stringify(updateData),
  });
  return handleResponse(res, "Failed to update organization");
}
