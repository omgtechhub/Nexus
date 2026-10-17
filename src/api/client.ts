// Relative by default, so the API is addressed on whatever origin the page is
// already served from and Vite's `/api` proxy forwards it to the backend.
//
// The default used to be an absolute http://localhost:5000/api. That is only
// correct while the sole client is the machine running the server: open the app
// from a phone or a forwarded port and the browser dials its OWN port 5000,
// the fetch rejects, and every catalogue page renders its error state. The
// plain-http URL is also mixed content on an https page, so it never leaves
// the browser at all.
//
// Set VITE_API_URL to an absolute URL only when the API really is on another
// origin — a production build served from a different host than the backend.
const rawApiUrl = import.meta.env.VITE_API_URL || '/api';
export const BASE_URL = rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl.replace(/\/+$/, '')}/api`;

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Notified when the server rejects a request as unauthenticated.
 *
 * There was no global handling at all: an expired session turned every query
 * on the page into an error state, so the user saw a dashboard full of "could
 * not load" panels with no indication that they had simply been signed out and
 * no way to act on it. `AppContext` subscribes to this and clears the local
 * session, which puts the route guards back in charge.
 */
type UnauthorizedHandler = () => void;

let onUnauthorized: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  onUnauthorized = handler;
}

/**
 * How long to wait before giving up on a request.
 *
 * There was no timeout, so a hung connection left the UI spinning for ever
 * with no error and no way back. Speech transcription is the one genuinely
 * slow endpoint, so it gets its own allowance.
 */
const DEFAULT_TIMEOUT_MS = 20_000;
const SLOW_ENDPOINT_TIMEOUT_MS = 120_000;

function timeoutFor(endpoint: string): number {
  return /\/(voice|transcribe|assistant)\b/.test(endpoint)
    ? SLOW_ENDPOINT_TIMEOUT_MS
    : DEFAULT_TIMEOUT_MS;
}

export async function apiClient<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  // Respect a caller's own signal if it passed one; otherwise impose ours.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutFor(endpoint));

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
      signal: options.signal ?? controller.signal,
    });
  } catch (err: any) {
    clearTimeout(timer);

    if (err?.name === 'AbortError') {
      throw new ApiError('The server took too long to respond. Please try again.', 408);
    }
    // A network failure is not an application error, and saying "HTTP 0"
    // helps nobody.
    throw new ApiError('Could not reach the server. Check your connection.', 0);
  } finally {
    clearTimeout(timer);
  }

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    if (response.status === 401) {
      // The session is gone. Tell the app once, rather than letting every
      // in-flight query surface its own failure.
      onUnauthorized?.();
    }

    const errorMsg = data?.error || data?.message || `HTTP ${response.status}: ${response.statusText}`;
    throw new ApiError(errorMsg, response.status, data);
  }

  return data;
}
