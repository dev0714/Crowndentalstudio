import { NextRequest, NextResponse } from 'next/server';
import { shouldUseSecureCookie } from '@/lib/auth/cookie-security';
import { getSessionCookieName } from '@/lib/auth/session';

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ message: 'Logged out' });

  response.cookies.set({
    name: getSessionCookieName(),
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: shouldUseSecureCookie(request),
    path: '/',
    maxAge: 0,
  });
  response.headers.set('Cache-Control', 'no-store');

  return response;
}
