// src/api/contactApi.js
// =============================================
// Assessly Platform - Contact API Service
// =============================================
// Matches backend: POST /api/v1/contact (public) and admin endpoints
// Base URL: https://assesslyplatform-t49h.onrender.com/api/v1
// =============================================

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://assesslyplatform-t49h.onrender.com/api/v1";

// Centralized API response handler with error handling
async function handleResponse(res, defaultMsg) {
  const contentType = res.headers.get('content-type');
  
  if (!res.ok) {
    let errorMessage = defaultMsg;
    
    if (contentType && contentType.includes('application/json')) {
      try {
        const errorData = await res.json();
        // Use the API's error structure
        errorMessage = errorData.message || 
                      errorData.error || 
                      `HTTP ${res.status}: ${res.statusText}`;
      } catch (e) {
        errorMessage = `HTTP ${res.status}: ${res.statusText}`;
      }
    }
    
    throw new Error(errorMessage);
  }
  
  if (contentType && contentType.includes('application/json')) {
    const data = await res.json();
    // Ensure response follows the API's success structure
    if (data.success === false) {
      throw new Error(data.message || defaultMsg);
    }
    return data;
  }
  
  return { success: true, message: defaultMsg };
}

// Get authentication token from storage
function getAuthToken() {
  return localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
}

// Build headers with authentication if available
function buildHeaders(includeAuth = false, contentType = 'application/json') {
  const headers = {
    'Content-Type': contentType,
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
 * =============================================
 * PUBLIC ENDPOINTS (No authentication required)
 * =============================================
 */

/**
 * Submit a contact form (Public endpoint)
 * POST /api/v1/contact
 * 
 * @param {Object} formData - Contact form data
 * @param {string} formData.name - Full name
 * @param {string} formData.email - Email address
 * @param {string} formData.subject - Message subject
 * @param {string} formData.message - Message content
 * @param {string} [formData.organization] - Organization name (optional)
 * @param {string} [formData.phone] - Phone number (optional)
 * @returns {Promise<Object>} Response with success status and message
 */
export async function submitContactForm(formData) {
  const res = await fetch(`${API_BASE}/contact`, {
    method: "POST",
    headers: buildHeaders(false),
    body: JSON.stringify(formData),
  });
  
  return handleResponse(res, "Failed to submit contact form");
}

/**
 * =============================================
 * ADMIN ENDPOINTS (Authentication required)
 * =============================================
 */

/**
 * Fetch all contact messages (Admin only)
 * GET /api/v1/contact
 * Requires: Admin authentication
 * 
 * @param {Object} [options] - Query options
 * @param {number} [options.page=1] - Page number
 * @param {number} [options.limit=20] - Items per page
 * @param {string} [options.status] - Filter by status (e.g., 'pending', 'resolved')
 * @returns {Promise<Object>} Paginated contact messages
 */
export async function fetchMessages(options = {}) {
  const { page = 1, limit = 20, status, search } = options;
  
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  
  if (status) params.append('status', status);
  if (search) params.append('search', search);
  
  const queryString = params.toString() ? `?${params.toString()}` : '';
  
  const res = await fetch(`${API_BASE}/contact${queryString}`, {
    method: "GET",
    headers: buildHeaders(true),
  });
  
  return handleResponse(res, "Failed to fetch contact messages");
}

/**
 * Get a specific contact message (Admin only)
 * GET /api/v1/contact/:id
 * Requires: Admin authentication
 * 
 * @param {string} id - Message ID
 * @returns {Promise<Object>} Contact message details
 */
export async function getMessageById(id) {
  const res = await fetch(`${API_BASE}/contact/${id}`, {
    method: "GET",
    headers: buildHeaders(true),
  });
  
  return handleResponse(res, "Failed to fetch message details");
}

/**
 * Update contact message status (Admin only)
 * PATCH /api/v1/contact/:id
 * Requires: Admin authentication
 * 
 * @param {string} id - Message ID
 * @param {Object} payload - Update data
 * @param {string} [payload.status] - New status ('pending', 'in_progress', 'resolved', 'closed')
 * @param {string} [payload.notes] - Admin notes
 * @param {string} [payload.assignedTo] - User ID of admin assigned to handle
 * @returns {Promise<Object>} Updated message
 */
export async function updateMessageStatus(id, payload) {
  const res = await fetch(`${API_BASE}/contact/${id}`, {
    method: "PATCH",
    headers: buildHeaders(true),
    body: JSON.stringify(payload),
  });
  
  return handleResponse(res, "Failed to update message");
}

/**
 * Delete a contact message (Admin only)
 * DELETE /api/v1/contact/:id
 * Requires: Admin authentication
 * 
 * @param {string} id - Message ID
 * @returns {Promise<Object>} Success response
 */
export async function deleteMessage(id) {
  const res = await fetch(`${API_BASE}/contact/${id}`, {
    method: "DELETE",
    headers: buildHeaders(true),
  });
  
  return handleResponse(res, "Failed to delete message");
}

/**
 * =============================================
 * ANALYTICS & REPORTS (Admin only)
 * =============================================
 */

/**
 * Get contact form analytics (Admin only)
 * GET /api/v1/contact/analytics
 * Requires: Admin authentication
 * 
 * @param {Object} [options] - Date range options
 * @param {string} [options.startDate] - Start date (ISO 8601)
 * @param {string} [options.endDate] - End date (ISO 8601)
 * @returns {Promise<Object>} Analytics data
 */
export async function getContactAnalytics(options = {}) {
  const params = new URLSearchParams();
  if (options.startDate) params.append('startDate', options.startDate);
  if (options.endDate) params.append('endDate', options.endDate);
  
  const queryString = params.toString() ? `?${params.toString()}` : '';
  
  const res = await fetch(`${API_BASE}/contact/analytics${queryString}`, {
    method: "GET",
    headers: buildHeaders(true),
  });
  
  return handleResponse(res, "Failed to fetch contact analytics");
}

/**
 * Export contact messages (Admin only)
 * GET /api/v1/contact/export
 * Requires: Admin authentication
 * 
 * @param {Object} [options] - Export options
 * @param {string} [options.format='csv'] - Export format ('csv' or 'json')
 * @param {string} [options.startDate] - Start date filter
 * @param {string} [options.endDate] - End date filter
 * @returns {Promise<Blob>} Exported file
 */
export async function exportContactMessages(options = {}) {
  const params = new URLSearchParams();
  params.append('format', options.format || 'csv');
  if (options.startDate) params.append('startDate', options.startDate);
  if (options.endDate) params.append('endDate', options.endDate);
  
  const queryString = `?${params.toString()}`;
  
  const res = await fetch(`${API_BASE}/contact/export${queryString}`, {
    method: "GET",
    headers: buildHeaders(true),
  });
  
  if (!res.ok) {
    throw new Error(`Failed to export messages: ${res.statusText}`);
  }
  
  return await res.blob();
}

/**
 * =============================================
 * UTILITY FUNCTIONS
 * =============================================
 */

/**
 * Get available contact status options
 * Useful for frontend dropdowns/selectors
 * 
 * @returns {Array<Object>} Status options with label and value
 */
export function getContactStatusOptions() {
  return [
    { value: 'pending', label: 'Pending', color: 'orange' },
    { value: 'in_progress', label: 'In Progress', color: 'blue' },
    { value: 'resolved', label: 'Resolved', color: 'green' },
    { value: 'closed', label: 'Closed', color: 'gray' },
  ];
}

/**
 * Validate contact form data client-side
 * 
 * @param {Object} formData - Contact form data
 * @returns {Object} Validation result
 * @returns {boolean} result.isValid - Whether data is valid
 * @returns {Array<string>} result.errors - Array of error messages
 */
export function validateContactForm(formData) {
  const errors = [];
  
  if (!formData.name || formData.name.trim().length < 2) {
    errors.push('Name must be at least 2 characters long');
  }
  
  if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
    errors.push('Valid email is required');
  }
  
  if (!formData.subject || formData.subject.trim().length < 5) {
    errors.push('Subject must be at least 5 characters long');
  }
  
  if (!formData.message || formData.message.trim().length < 10) {
    errors.push('Message must be at least 10 characters long');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

export default {
  // Public endpoints
  submitContactForm,
  
  // Admin endpoints
  fetchMessages,
  getMessageById,
  updateMessageStatus,
  deleteMessage,
  
  // Analytics
  getContactAnalytics,
  exportContactMessages,
  
  // Utilities
  getContactStatusOptions,
  validateContactForm,
};
