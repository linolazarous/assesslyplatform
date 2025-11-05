// =============================================
// Assessly Frontend - Contact API
// =============================================
// Uses /api/v1/contact routes defined in backend
// Handles fetch, update, delete, and form submission
// Compatible with production Render setup
// =============================================

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://assesslyplatform-t49h.onrender.com';
const API_V1_BASE = `${API_BASE}/api/v1`;

async function handleResponse(res, defaultMsg) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: defaultMsg }));
    throw new Error(body.message || defaultMsg);
  }
  return res.json();
}

// Fetch all contact messages (admin)
export async function fetchMessages() {
  const res = await fetch(`${API_V1_BASE}/contact-messages`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });
  return handleResponse(res, 'Failed to fetch messages');
}

// Update contact message status
export async function updateMessageStatus(id, payload) {
  const res = await fetch(`${API_V1_BASE}/contact-messages/${id}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse(res, 'Failed to update message');
}

// Delete a contact message
export async function deleteMessage(id) {
  const res = await fetch(`${API_V1_BASE}/contact-messages/${id}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });
  return handleResponse(res, 'Failed to delete message');
}

// Submit contact form (public endpoint)
export async function submitContactForm(formData) {
  const res = await fetch(`${API_V1_BASE}/contact`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Send origin for explicit CORS validation
      'Origin': window.location.origin,
    },
    body: JSON.stringify(formData),
  });
  return handleResponse(res, 'Failed to submit contact form');
}
