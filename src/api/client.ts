// ── HTTP client: fetch wrapper with auth, CSRF, timeout handling ──

const BASE = '';

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  timeout?: number;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  suppressRedirect?: boolean;
}

let csrfToken = '';

export function setCsrfToken(token: string) { csrfToken = token; }

function buildHeaders(extra?: Record<string, string>): Headers {
  const h = new Headers(extra);
  h.set('Content-Type', 'application/json');
  if (csrfToken) h.set('X-CSRF-Token', csrfToken);
  return h;
}

export async function apiRequest<T = unknown>(
  path: string,
  opts: RequestOptions = {},
): Promise<T> {
  const { method = 'GET', body, timeout = 30000, headers: extraHeaders, signal } = opts;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  if (signal) {
    signal.addEventListener('abort', () => controller.abort());
  }

  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: buildHeaders(extraHeaders),
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'include',
      signal: controller.signal,
    });

    if (res.status === 401 && !opts.suppressRedirect) {
      window.location.href = '/login';
      throw new Error('Unauthorized');
    }

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      const message = (errBody as Record<string, string>).error || res.statusText;
      throw new ApiError(res.status, message);
    }

    const text = await res.text();
    return text ? JSON.parse(text) as T : ({} as T);
  } catch (e) {
    if (e instanceof ApiError) throw e;
    if ((e as Error).name === 'AbortError') {
      throw new ApiError(408, 'Request timed out');
    }
    throw new ApiError(0, (e as Error).message || 'Network error');
  } finally {
    clearTimeout(timer);
  }
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function apiGet<T = unknown>(path: string, opts?: RequestOptions) {
  return apiRequest<T>(path, { ...opts, method: 'GET' });
}

export function apiPost<T = unknown>(path: string, body?: unknown, opts?: RequestOptions) {
  return apiRequest<T>(path, { ...opts, method: 'POST', body });
}

export function apiPut<T = unknown>(path: string, body?: unknown, opts?: RequestOptions) {
  return apiRequest<T>(path, { ...opts, method: 'PUT', body });
}

export function apiPatch<T = unknown>(path: string, body?: unknown, opts?: RequestOptions) {
  return apiRequest<T>(path, { ...opts, method: 'PATCH', body });
}

export function apiDelete<T = unknown>(path: string, opts?: RequestOptions) {
  return apiRequest<T>(path, { ...opts, method: 'DELETE' });
}
