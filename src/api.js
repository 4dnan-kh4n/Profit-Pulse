import { API_URL } from './config.js';

export class ApiError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// One place for every API call, so errors reach people in plain language.
export async function apiRequest(path, { method = 'GET', body, token } = {}) {
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Could not reach the Profit Pulse server. Check your internet connection, make sure the server is running, and try again.');
  }
  let data = null;
  try { data = await response.json(); } catch { /* The reply was not JSON. */ }
  if (!response.ok) {
    if (response.status === 401 && token) {
      localStorage.removeItem('profit-pulse-token');
      localStorage.removeItem('profit-pulse-user');
      window.dispatchEvent(new Event('profit-pulse-auth-expired'));
    }
    throw new ApiError(data?.message || 'Something went wrong. Please try again.', response.status);
  }
  if (data === null) throw new ApiError('The server sent a reply we could not read. Please try again.', response.status);
  return data;
}
