import { API_URL } from '../config';
import { useSession } from '../store/session';

/** An error response from the API: { error: { code, message, details? } }. */
export class ApiError extends Error {
  constructor(status, { code, message, details } = {}) {
    super(message ?? `Request failed with status ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.code = code ?? 'unknown';
    this.details = details;
  }
}

async function request(method, path, { params = {}, body, signal } = {}) {
  // Built by hand: React Native's URLSearchParams is incomplete
  const query = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
  const url = `${API_URL}${path}${query ? `?${query}` : ''}`;

  const { token } = useSession.getState();
  const response = await fetch(url, {
    method,
    signal,
    headers: {
      Accept: 'application/json',
      ...(body !== undefined && { 'Content-Type': 'application/json' }),
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = response.status === 204 ? null : await response.json().catch(() => null);

  // The session was signed out elsewhere or expired: forget it here too
  if (response.status === 401 && token) useSession.getState().signOut();
  if (!response.ok) throw new ApiError(response.status, json?.error);
  return json;
}

/** GET a JSON endpoint. Empty params (null, undefined, '') are left out. */
export const apiGet = (path, params, { signal } = {}) => request('GET', path, { params, signal });
export const apiPost = (path, body) => request('POST', path, { body });
export const apiPatch = (path, body) => request('PATCH', path, { body });
export const apiDelete = (path) => request('DELETE', path);
