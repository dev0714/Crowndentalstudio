import type { NextRequest } from 'next/server';

export function shouldUseSecureCookie(request: NextRequest) {
  const hostname = request.nextUrl.hostname.toLowerCase();
  const protocol = request.nextUrl.protocol.toLowerCase();

  if (protocol !== 'https:') {
    return false;
  }

  return !['localhost', '127.0.0.1', '::1'].includes(hostname);
}
