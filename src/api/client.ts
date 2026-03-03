const BASE =
  import.meta.env.VITE_API_URL ??
  (typeof window !== 'undefined' ? '' : 'http://localhost:3000');

function resolve(path: string): string {
  if (BASE && path.startsWith('/')) return `${BASE.replace(/\/$/, '')}${path}`;
  return path;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = resolve(path);
  const res = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(err.message ?? `HTTP ${res.status}`);
  }
  const text = await res.text();
  if (!text || !text.trim()) {
    throw new Error('Empty response from server');
  }
  return JSON.parse(text) as T;
}

export function getApiBase(): string {
  return (
    BASE ||
    (typeof window !== 'undefined'
      ? window.location.origin
      : 'http://localhost:3000')
  );
}

/** Socket.io URL. Same as API base so the browser sends the HttpOnly auth cookie (same-origin or proxy). */
export function getSocketUrl(): string {
  if (import.meta.env.VITE_WS_URL !== undefined)
    return import.meta.env.VITE_WS_URL;
  return getApiBase();
}
