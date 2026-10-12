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

export async function apiClient<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    const errorMsg = data?.error || data?.message || `HTTP ${response.status}: ${response.statusText}`;
    throw new ApiError(errorMsg, response.status, data);
  }

  return data;
}
