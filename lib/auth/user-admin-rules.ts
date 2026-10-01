export const PORTAL_ROLES = ['CEO', 'Reception', 'Doctor', 'Admin'] as const;
export type PortalRole = (typeof PORTAL_ROLES)[number];
export const ADMIN_ROLES: ReadonlySet<string> = new Set(['CEO', 'Admin']);

export type UserChangeInput = {
  /** The signed-in user making the change. */
  actorId: string;
  /** The user being changed, as stored today. */
  target: { id: string; role: string; is_active: boolean };
  /** The requested new values; omit a field to leave it alone. */
  nextRole?: string;
  nextActive?: boolean;
  /** Whether the change deletes the user outright. */
  deleting?: boolean;
  /** Count of active CEO/Admin users excluding the target. */
  otherActiveAdmins: number;
};

export type UserChangeVerdict = { ok: true } | { ok: false; reason: string };

export function isPortalRole(value: unknown): value is PortalRole {
  return typeof value === 'string' && (PORTAL_ROLES as readonly string[]).includes(value);
}

/**
 * Guards against the two mistakes that lock a practice out of its own portal:
 * changing your own access, and removing the last administrator.
 */
export function canChangeUser(input: UserChangeInput): UserChangeVerdict {
  const { actorId, target, nextRole, nextActive, deleting, otherActiveAdmins } = input;
  const isSelf = actorId === target.id;
  const roleChanges = nextRole !== undefined && nextRole !== target.role;
  const deactivates = nextActive === false && target.is_active;

  if (isSelf && deleting) return { ok: false, reason: 'You cannot delete your own account' };
  if (isSelf && roleChanges) return { ok: false, reason: 'You cannot change your own role' };
  if (isSelf && deactivates) return { ok: false, reason: 'You cannot deactivate your own account' };

  const targetIsActiveAdmin = ADMIN_ROLES.has(target.role) && target.is_active;
  const losesAdmin = targetIsActiveAdmin && (deleting || deactivates || (roleChanges && !ADMIN_ROLES.has(String(nextRole))));
  if (losesAdmin && otherActiveAdmins === 0) {
    return { ok: false, reason: 'This is the last active CEO or Admin account; add another administrator first' };
  }

  return { ok: true };
}

export function validatePassword(password: unknown): string | null {
  if (typeof password !== 'string') return 'Password must be text';
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (password.length > 128) return 'Password is too long';
  return null;
}
