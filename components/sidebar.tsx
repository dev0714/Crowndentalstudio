'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Users, Calendar, TrendingUp,
  FlaskConical, CreditCard, Shield, Activity, RefreshCcw,
  Zap, Package, UserCheck, Tag, Lock, LogOut, FileText, Settings2, Mail,
} from 'lucide-react';
import { logoutCurrentSession } from '@/lib/auth/session-client';
import { usePortalSession } from '@/lib/auth/portal-session-context';
import { Logo } from './logo';

const NAV_GROUPS = [
  {
    label: 'Core',
    items: [
      { label: 'Dashboard',     href: '/dashboard',     icon: LayoutDashboard },
      { label: 'Patients',      href: '/patients',      icon: Users },
      { label: 'Appointments',  href: '/appointments',  icon: Calendar },
      { label: 'Leads',         href: '/leads',         icon: TrendingUp },
      { label: 'Emails',        href: '/emails',        icon: Mail },
    ],
  },
  {
    label: 'Clinical',
    items: [
      { label: 'Lab Tracker',   href: '/lab',           icon: FlaskConical },
      { label: 'Recalls',       href: '/recalls',       icon: RefreshCcw },
      { label: 'Automation',    href: '/automation',    icon: Zap },
    ],
  },
  {
    label: 'Admin',
    items: [
      { label: 'Accounts',      href: '/accounts',      icon: CreditCard },
      { label: 'Compliance',    href: '/compliance',    icon: Shield },
      { label: 'Operations',    href: '/operations',    icon: Activity },
      { label: 'Stock Control', href: '/stock',         icon: Package },
      { label: 'HR',            href: '/hr',            icon: UserCheck },
      { label: 'Pricing',       href: '/pricing',       icon: Tag },
      { label: 'Settings',      href: '/settings',      icon: Settings2 },
      { label: 'Blog',          href: '/blogs',         icon: FileText },
      { label: 'Roles',         href: '/roles',         icon: Lock },
    ],
  },
];

function initials(name?: string | null) {
  if (!name) return 'U';
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser } = usePortalSession();

  const handleLogout = async () => {
    await logoutCurrentSession();
    router.replace('/auth/login');
  };

  return (
    <aside className="w-60 flex-shrink-0 flex flex-col bg-ink text-white min-h-screen border-r border-white/10">

      {/* Brand */}
      <Link href="/dashboard" className="flex items-center gap-3 px-5 py-5 border-b border-white/10 text-white hover:text-white">
        <Logo variant="icon" className="h-8 w-auto brightness-0 invert" />
        <div className="leading-none">
          <p className="font-display text-[19px] font-medium">Crown Dental Studio</p>
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/40 mt-1.5">Practice portal</p>
        </div>
      </Link>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map(({ label, href, icon: Icon }) => {
                const active = pathname === href || pathname.startsWith(`${href}/`);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={[
                      'flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-medium transition-colors border-l-2',
                      active
                        ? 'bg-white/[0.08] text-white border-teal-light'
                        : 'text-white/60 hover:text-white hover:bg-white/[0.05] border-transparent',
                    ].join(' ')}
                  >
                    <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-teal-light' : ''}`} />
                    <span className="flex-1 truncate">{label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-white/10 space-y-1">
        {currentUser && (
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-md bg-white/[0.06]">
            <div className="w-7 h-7 rounded-full bg-teal flex items-center justify-center flex-shrink-0 text-white font-semibold text-[11px]">
              {initials(currentUser.full_name)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-[12px] font-semibold truncate">{currentUser.full_name}</p>
              <p className="text-white/45 text-[10px] truncate">{currentUser.email}</p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-md text-[13px] font-medium text-white/45 hover:text-white hover:bg-white/[0.05] transition-colors"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
