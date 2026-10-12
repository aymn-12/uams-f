import { smartCache } from './cache';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export interface RequestOptions extends RequestInit {
  token?: string;
  skipCache?: boolean;
  ttlMs?: number;
  swr?: boolean;
}

export async function apiFetch<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  const isGet = method === 'GET';
  const isCacheable =
    isGet &&
    !options.skipCache &&
    !endpoint.includes('/auth/') &&
    !endpoint.includes('/live') &&
    options.cache !== 'no-store';

  // 1. Check cache for GET requests
  if (isCacheable) {
    const cached = smartCache.get<T>(endpoint);
    if (cached) {
      if (!cached.isStale) {
        return cached.data;
      }
      // If stale and SWR is enabled (default true), revalidate in background
      if (options.swr !== false) {
        executeNetworkFetch<T>(endpoint, options, isCacheable).catch(() => {});
        return cached.data;
      }
    }

    // 2. Request deduplication for simultaneous calls
    const inFlight = smartCache.getInFlight<T>(endpoint);
    if (inFlight) {
      return inFlight;
    }
  }

  // 3. Execute network request
  const fetchPromise = executeNetworkFetch<T>(endpoint, options, isCacheable);

  if (isCacheable) {
    smartCache.setInFlight(endpoint, fetchPromise);
  }

  try {
    return await fetchPromise;
  } finally {
    if (isCacheable) {
      smartCache.removeInFlight(endpoint);
    }
  }
}

async function executeNetworkFetch<T = any>(
  endpoint: string,
  options: RequestOptions,
  isCacheable: boolean
): Promise<T> {
  const { token, headers = {}, skipCache, ttlMs, swr, ...rest } = options;

  const isFormData = typeof FormData !== 'undefined' && rest.body instanceof FormData;
  const defaultHeaders: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    'X-Requested-With': 'XMLHttpRequest',
    'X-CSRF-Protection': '1',
  };

  const storedToken = typeof window !== 'undefined' ? localStorage.getItem('uams_access_token') : null;
  const activeToken = token || storedToken;

  if (activeToken) {
    defaultHeaders['Authorization'] = `Bearer ${activeToken}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...rest,
    headers: {
      ...defaultHeaders,
      ...(headers as Record<string, string>),
    },
    credentials: 'include',
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 401 && typeof window !== 'undefined' && !endpoint.includes('/auth/')) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        return apiFetch<T>(endpoint, options);
      }
    }
    throw new Error(data.message || 'حدث خطأ في الاتصال بالخادم');
  }

  const method = (options.method || 'GET').toUpperCase();

  // On successful GET, store in cache
  if (isCacheable) {
    smartCache.set(endpoint, data, ttlMs);
  } else if (method !== 'GET') {
    // On mutations (POST, PUT, DELETE, PATCH), invalidate related caches
    handleAutoInvalidation(endpoint);
  }

  return data;
}

function handleAutoInvalidation(endpoint: string) {
  if (endpoint.includes('/attendance')) {
    smartCache.invalidate('attendance');
    smartCache.invalidate('dashboards');
  }
  if (endpoint.includes('/exams') || endpoint.includes('/grades')) {
    smartCache.invalidate('exams');
    smartCache.invalidate('grades');
    smartCache.invalidate('dashboards');
  }
  if (endpoint.includes('/materials')) {
    smartCache.invalidate('materials');
    smartCache.invalidate('dashboards');
  }
  if (endpoint.includes('/assignments')) {
    smartCache.invalidate('assignments');
    smartCache.invalidate('dashboards');
  }
  if (endpoint.includes('/questions')) {
    smartCache.invalidate('questions');
    smartCache.invalidate('dashboards');
  }
  if (endpoint.includes('/academic') || endpoint.includes('/sections')) {
    smartCache.invalidate('academic');
    smartCache.invalidate('sections');
    smartCache.invalidate('dashboards');
  }
  if (endpoint.includes('/announcements')) {
    smartCache.invalidate('announcements');
    smartCache.invalidate('dashboards');
  }
  if (endpoint.includes('/users')) {
    smartCache.invalidate('users');
    smartCache.invalidate('dashboards');
  }
  if (endpoint.includes('/schedule')) {
    smartCache.invalidate('schedule');
    smartCache.invalidate('dashboards');
  }
}

let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh-token`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-Protection': '1',
        },
      });

      if (!res.ok) {
        localStorage.removeItem('uams_access_token');
        localStorage.removeItem('uams_user');
        smartCache.clear();
        return false;
      }

      const json = await res.json().catch(() => ({}));
      const newToken = json.data?.token || json.accessToken;

      if (newToken) {
        localStorage.setItem('uams_access_token', newToken);
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}
