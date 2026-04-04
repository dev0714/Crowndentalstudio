import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/current-user';

export async function GET() {
  const user = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const response = NextResponse.json({ user });
  response.headers.set('Cache-Control', 'no-store');

  return response;
}
