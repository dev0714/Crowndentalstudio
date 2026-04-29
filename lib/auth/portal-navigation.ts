export const PORTAL_NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Patients', href: '/patients' },
  { label: 'Appointments', href: '/appointments' },
  { label: 'Leads', href: '/leads' },
  { label: 'Lab Tracker', href: '/lab' },
  { label: 'Accounts', href: '/accounts' },
  { label: 'Compliance', href: '/compliance' },
  { label: 'Operations', href: '/operations' },
  { label: 'Recalls', href: '/recalls' },
  { label: 'Automation', href: '/automation' },
  { label: 'Stock Control', href: '/stock' },
  { label: 'HR', href: '/hr' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Blog', href: '/blogs' },
  { label: 'Settings', href: '/settings' },
  { label: 'Roles', href: '/roles' },
] as const;

export function isPortalRoute(pathname: string) {
  return PORTAL_NAV_ITEMS.some(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
  );
}
