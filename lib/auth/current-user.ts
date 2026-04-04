import { getSessionFromCookies } from './session';
import { toPublicAuthUser, type PublicAuthUser } from './public-user';

export async function getAuthenticatedUser(): Promise<PublicAuthUser | null> {
  const session = await getSessionFromCookies();

  if (!session) {
    return null;
  }

  if (!session.userId || !session.email || !session.fullName || !session.role) {
    return null;
  }

  return toPublicAuthUser({
    id: session.userId,
    email: session.email,
    full_name: session.fullName,
    role: session.role,
  });
}
