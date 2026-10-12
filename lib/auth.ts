import { apiFetch } from './api';
import { smartCache } from './cache';

export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'STUDENT' | 'DOCTOR' | 'ADMIN';
  status: string;
}

export async function loginUser(email: string, password: string): Promise<User> {
  const res = await apiFetch<{ success: boolean; data: { token: string; _id: string; name: string; email: string; role: any; status: string } }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  if (res.data?.token) {
    localStorage.setItem('uams_access_token', res.data.token);
    const user: User = {
      _id: res.data._id,
      name: res.data.name,
      email: res.data.email,
      role: res.data.role,
      status: res.data.status,
    };
    localStorage.setItem('uams_user', JSON.stringify(user));
    return user;
  }
  throw new Error('فشل تسجيل الدخول');
}

export async function logoutUser(): Promise<void> {
  await apiFetch('/auth/logout', { method: 'POST' }).catch(() => {});
  localStorage.removeItem('uams_access_token');
  localStorage.removeItem('uams_user');
  smartCache.clear();
  smartCache.clearWorkspace();
}

export function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('uams_user');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
