export function hasRole(userRole: string, allowed: string[]) {
  return allowed.includes(userRole);
}

export function assertRole(userRole: string, allowed: string[]) {
  if (!hasRole(userRole, allowed)) {
    throw new Error('Forbidden');
  }
}
