/**
 * API client.
 * - Access token lives in memory only (never localStorage).
 * - The refresh token is an httpOnly cookie; on 401 TOKEN_EXPIRED we refresh once and retry.
 * - Errors are thrown as ApiRequestError with { status, code, message, details }.
 */
export const API_URL = (import.meta.env.VITE_API_URL || '/api/v1').replace(/\/$/, '');

let accessToken = null;
let refreshPromise = null;
const listeners = new Set();

export const setAccessToken = (token) => {
  accessToken = token || null;
};
export const getAccessToken = () => accessToken;

/** Subscribe to "session ended" events (e.g. refresh failed). */
export const onSessionEnded = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export class ApiRequestError extends Error {
  constructor({ status, code, message, details }) {
    super(message || 'Request failed');
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /** Map validation details to { field: message } for forms. */
  get fieldErrors() {
    return Object.fromEntries((this.details || []).filter((d) => d.path).map((d) => [d.path, d.message]));
  }
}

function buildUrl(path, query) {
  const url = `${API_URL}${path}`;
  if (!query) return url;
  const params = new URLSearchParams();
  Object.entries(query).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') params.set(k, v);
  });
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

export async function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_URL}/auth/refresh`, { method: 'POST', credentials: 'include' })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new ApiRequestError({ status: res.status, ...(body.error || {}) });
        setAccessToken(body.data.accessToken);
        return body.data;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

export async function request(method, path, { body, query, form, raw, retry = true, signal } = {}) {
  const headers = {};
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  let payload;
  if (form) payload = form; // FormData — browser sets the multipart boundary
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(buildUrl(path, query), { method, headers, body: payload, credentials: 'include', signal });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiRequestError({ status: 0, code: 'NETWORK_ERROR', message: 'Could not reach the server. Check your connection and try again.' });
  }

  if (raw && res.ok) return res;
  if (res.status === 204) return null;

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new ApiRequestError({ status: res.status, ...(json.error || { message: 'Request failed' }) });
    if (res.status === 401 && retry && ['TOKEN_EXPIRED', 'INVALID_TOKEN'].includes(error.code) && accessToken) {
      try {
        await refreshSession();
        return request(method, path, { body, query, form, raw, retry: false, signal });
      } catch {
        setAccessToken(null);
        listeners.forEach((fn) => fn());
      }
    }
    throw error;
  }
  return json; // { success, data, meta }
}

export const api = {
  get: (path, opts) => request('GET', path, opts),
  post: (path, body, opts) => request('POST', path, { ...opts, body }),
  patch: (path, body, opts) => request('PATCH', path, { ...opts, body }),
  del: (path, opts) => request('DELETE', path, opts),
  upload: (path, form, opts) => request('POST', path, { ...opts, form }),
};

/** Convenience: unwrap `.data`. */
export const getData = async (path, opts) => (await api.get(path, opts)).data;
