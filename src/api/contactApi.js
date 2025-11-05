// =============================================
// Assessly Frontend - Contact API
// =============================================
// Matches backend route: /api/v1/contact
// Supports both production and local environments
// =============================================

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://assesslyplatform-t49h.onrender.com";
const API_V1_BASE = `${API_BASE}/api/v1/contact`;

async function handleResponse(res, defaultMsg) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: defaultMsg }));
    throw new Error(body.message || defaultMsg);
  }
  return res.json();
}

// Fetch all contact messages (Admin)
export async function fetchMessages() {
  const res = await fetch(`${API_V1_BASE}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  return handleResponse(res, "Failed to fetch messages");
}

// Update contact message status (Admin)
export async function updateMessageStatus(id, payload) {
  const res = await fetch(`${API_V1_BASE}/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse(res, "Failed to update message");
}

// Delete a contact message (Admin)
export async function deleteMessage(id) {
  const res = await fetch(`${API_V1_BASE}/${id}`, {
    method: "DELETE",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  return handleResponse(res, "Failed to delete message");
}

// Submit public contact form (User)
export async function submitContactForm(formData) {
  const res = await fetch(`${API_V1_BASE}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Origin": window.location.origin, // Helps backend debug CORS
    },
    body: JSON.stringify(formData),
  });
  return handleResponse(res, "Failed to submit contact form");
}
