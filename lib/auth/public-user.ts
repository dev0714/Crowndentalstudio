import type { User } from '@/lib/types/crm';

export type PublicAuthUser = Pick<User, 'id' | 'email' | 'full_name' | 'role'>;

export type PublicAuthSource = Pick<User, 'id' | 'email' | 'full_name' | 'role'>;

export function toPublicAuthUser(user: PublicAuthSource): PublicAuthUser {
  return {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    role: user.role,
  };
}
