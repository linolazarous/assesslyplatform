// Use the V1 API base URL for contact endpoints
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://assesslyplatform-t49h.onrender.com';
const API_V1_BASE = `${API_BASE}/api/v1`;

export async function fetchMessages() {
  const res = await fetch(`${API_V1_BASE}/contact-messages`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!res.ok) throw new Error('Failed to fetch messages');
  return res.json();
}

export async function updateMessageStatus(id, payload) {
  const res = await fetch(`${API_V1_BASE}/contact-messages/${id}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(body.message || 'Failed to update message');
  }
  return res.json();
}

export async function deleteMessage(id) {
  const res = await fetch(`${API_V1_BASE}/contact-messages/${id}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(body.message || 'Failed to delete');
  }
  return res.json();
}

// New function to submit contact form
export async function submitContactForm(formData) {
  const res = await fetch(`${API_V1_BASE}/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData),
  });
  
  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(body.message || 'Failed to submit contact form');
  }
  return res.json();
}
