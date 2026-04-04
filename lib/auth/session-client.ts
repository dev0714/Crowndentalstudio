import type { PublicAuthUser } from './public-user';

export async function fetchCurrentSessionUser(): Promise<PublicAuthUser | null> {
  const response = await fetch('/api/auth/me', {
    credentials: 'include',
    cache: 'no-store',
  });

  if (!response.ok) {
    return null;
  }

  const payload = await response.json().catch(() => null);
  return payload?.user ?? null;
}

export async function logoutCurrentSession() {
  const response = await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include',
    cache: 'no-store',
  });

  return response.ok;
}
