/**
 * UAMS Smart Intelligent Multi-Tier Cache & Workspace Memory
 * Provides:
 * 1. Ultra-fast in-memory hot cache (0ms response time).
 * 2. Session-level persistence across page switches.
 * 3. Stale-While-Revalidate (SWR) background refreshes.
 * 4. Request deduplication for simultaneous calls.
 * 5. Automatic mutation-based cache invalidation.
 * 6. Workspace memory to preserve user selections, tabs, and drafts.
 */

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  expiresAt: number;
  staleUntil: number;
}

const STORAGE_PREFIX = "uams_cache:";
const WORKSPACE_PREFIX = "uams_ws:";
const DEFAULT_TTL_MS = 60 * 1000; // 1 minute fresh
const DEFAULT_STALE_MS = 5 * 60 * 1000; // 5 minutes stale grace period

class SmartCacheManager {
  private memoryCache = new Map<string, CacheEntry>();
  private inFlightRequests = new Map<string, Promise<any>>();
  private listeners = new Map<string, Set<(data: any) => void>>();

  constructor() {
    this.hydrateFromSession();
  }

  private isBrowser(): boolean {
    return typeof window !== "undefined";
  }

  private hydrateFromSession() {
    if (!this.isBrowser()) return;
    try {
      const keys = Object.keys(sessionStorage);
      const now = Date.now();
      for (const key of keys) {
        if (key.startsWith(STORAGE_PREFIX)) {
          const raw = sessionStorage.getItem(key);
          if (raw) {
            const entry: CacheEntry = JSON.parse(raw);
            if (entry.staleUntil > now) {
              const urlKey = key.slice(STORAGE_PREFIX.length);
              this.memoryCache.set(urlKey, entry);
            } else {
              sessionStorage.removeItem(key);
            }
          }
        }
      }
    } catch {
      // Ignore storage errors or quota issues
    }
  }

  public get<T = any>(key: string): { data: T; isStale: boolean } | null {
    if (!this.isBrowser()) return null;
    const now = Date.now();
    let entry = this.memoryCache.get(key);

    if (!entry) {
      try {
        const raw = sessionStorage.getItem(STORAGE_PREFIX + key);
        if (raw) {
          entry = JSON.parse(raw);
          if (entry && entry.staleUntil > now) {
            this.memoryCache.set(key, entry);
          } else {
            sessionStorage.removeItem(STORAGE_PREFIX + key);
            entry = undefined;
          }
        }
      } catch {
        entry = undefined;
      }
    }

    if (!entry) return null;

    if (now > entry.staleUntil) {
      this.delete(key);
      return null;
    }

    const isStale = now > entry.expiresAt;
    return { data: entry.data as T, isStale };
  }

  public set<T = any>(
    key: string,
    data: T,
    ttlMs: number = DEFAULT_TTL_MS,
    staleGraceMs: number = DEFAULT_STALE_MS
  ) {
    if (!this.isBrowser()) return;
    const now = Date.now();
    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      expiresAt: now + ttlMs,
      staleUntil: now + ttlMs + staleGraceMs,
    };

    this.memoryCache.set(key, entry);

    if (this.isBrowser()) {
      try {
        sessionStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(entry));
      } catch {
        // Storage might be full, silently fail or evict
      }
    }

    this.notify(key, data);
  }

  public delete(key: string) {
    this.memoryCache.delete(key);
    if (this.isBrowser()) {
      try {
        sessionStorage.removeItem(STORAGE_PREFIX + key);
      } catch {}
    }
  }

  public invalidate(pattern: string | RegExp) {
    const keysToDelete: string[] = [];

    this.memoryCache.forEach((_, key) => {
      if (typeof pattern === "string" ? key.includes(pattern) : pattern.test(key)) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach((key) => this.delete(key));

    if (this.isBrowser()) {
      try {
        const keys = Object.keys(sessionStorage);
        for (const k of keys) {
          if (k.startsWith(STORAGE_PREFIX)) {
            const rawKey = k.slice(STORAGE_PREFIX.length);
            if (typeof pattern === "string" ? rawKey.includes(pattern) : pattern.test(rawKey)) {
              sessionStorage.removeItem(k);
            }
          }
        }
      } catch {}
    }
  }

  public clear() {
    this.memoryCache.clear();
    this.inFlightRequests.clear();
    if (this.isBrowser()) {
      try {
        const keys = Object.keys(sessionStorage);
        for (const k of keys) {
          if (k.startsWith(STORAGE_PREFIX)) {
            sessionStorage.removeItem(k);
          }
        }
      } catch {}
    }
  }

  // Request deduplication
  public getInFlight<T>(key: string): Promise<T> | undefined {
    return this.inFlightRequests.get(key);
  }

  public setInFlight<T>(key: string, promise: Promise<T>) {
    this.inFlightRequests.set(key, promise);
  }

  public removeInFlight(key: string) {
    this.inFlightRequests.delete(key);
  }

  // Subscribe to updates
  public subscribe(key: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(callback);
    return () => {
      this.listeners.get(key)?.delete(callback);
    };
  }

  private notify(key: string, data: any) {
    const subs = this.listeners.get(key);
    if (subs) {
      subs.forEach((cb) => cb(data));
    }
  }

  // Workspace Memory (Persisting active selection, drafts, filters)
  public getWorkspace<T = any>(key: string, fallback: T): T {
    if (!this.isBrowser()) return fallback;
    try {
      const val = sessionStorage.getItem(WORKSPACE_PREFIX + key);
      return val !== null ? JSON.parse(val) : fallback;
    } catch {
      return fallback;
    }
  }

  public setWorkspace<T = any>(key: string, value: T) {
    if (!this.isBrowser()) return;
    try {
      sessionStorage.setItem(WORKSPACE_PREFIX + key, JSON.stringify(value));
    } catch {}
  }

  public clearWorkspace() {
    if (!this.isBrowser()) return;
    try {
      const keys = Object.keys(sessionStorage);
      for (const k of keys) {
        if (k.startsWith(WORKSPACE_PREFIX)) {
          sessionStorage.removeItem(k);
        }
      }
    } catch {}
  }
}

export const smartCache = new SmartCacheManager();
