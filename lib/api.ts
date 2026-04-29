'use client';

/**
 * Client-side fetch helper that auto-attaches `x-user-id` header from the
 * locally-stored user (set by AuthModal). Use this everywhere on the client
 * instead of raw `fetch` so server routes know who is asking.
 */
export function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('pm_user') : null;
    if (raw) {
      const u = JSON.parse(raw) as { id?: string };
      if (u.id) headers.set('x-user-id', u.id);
    }
  } catch {
    /* ignore */
  }
  return fetch(input, { ...init, headers });
}

export interface StoredUser {
  id: string;
  name: string;
  email: string;
  plan?: string;
  role?: string;
}

export function getStoredUser(): StoredUser | null {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('pm_user') : null;
    if (!raw) return null;
    return JSON.parse(raw) as StoredUser;
  } catch {
    return null;
  }
}

export function setStoredUser(u: StoredUser | null): void {
  try {
    if (!u) localStorage.removeItem('pm_user');
    else localStorage.setItem('pm_user', JSON.stringify(u));
    window.dispatchEvent(new CustomEvent('pm-user-change'));
  } catch {
    /* ignore */
  }
}

export function isPro(u: { plan?: string; role?: string } | null | undefined): boolean {
  if (!u) return false;
  return u.role === 'admin' || u.plan === 'pro' || u.plan === 'family';
}
