import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';

const SESSION_COOKIE_NAME = 'crown_session';
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

type SessionPayload = {
  userId: string;
  email: string;
  fullName: string;
  role: string;
  exp: number;
};

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!secret) {
    throw new Error('Missing SESSION_SECRET or SUPABASE_SERVICE_ROLE_KEY for session signing.');
  }

  return secret;
}

function sign(value: string) {
  return createHmac('sha256', getSessionSecret()).update(value).digest('hex');
}

function encode(payload: SessionPayload) {
  const json = JSON.stringify(payload);
  const value = Buffer.from(json).toString('base64url');
  const signature = sign(value);
  return `${value}.${signature}`;
}

export function parseSessionToken(token: string): SessionPayload | null {
  const [value, signature] = token.split('.');

  if (!value || !signature) {
    return null;
  }

  const expectedSignature = sign(value);

  if (
    signature.length !== expectedSignature.length ||
    !timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as SessionPayload;

    if (!payload.exp || payload.exp < Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function createSessionToken(user: { id: string; email: string; fullName: string; role: string }) {
  return encode({
    userId: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    exp: Date.now() + SESSION_DURATION_MS,
  });
}

export async function getSessionFromCookies() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return token ? parseSessionToken(token) : null;
}

export function getSessionCookieName() {
  return SESSION_COOKIE_NAME;
}

export function getSessionMaxAgeSeconds() {
  return Math.floor(SESSION_DURATION_MS / 1000);
}
