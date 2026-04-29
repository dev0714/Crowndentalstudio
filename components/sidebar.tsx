'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Users, Calendar, TrendingUp,
  FlaskConical, CreditCard, Shield, Activity, RefreshCcw,
  Zap, Package, UserCheck, Tag, Lock, LogOut, ChevronRight, FileText,
} from 'lucide-react';
import { logoutCurrentSession } from '@/lib/auth/session-client';
import { usePortalSession } from '@/lib/auth/portal-session-context';

const NAV_GROUPS = [
  {
    label: 'Core',
    items: [
      { label: 'Dashboard',     href: '/dashboard',     icon: LayoutDashboard },
      { label: 'Patients',      href: '/patients',      icon: Users },
      { label: 'Appointments',  href: '/appointments',  icon: Calendar },
      { label: 'Leads',         href: '/leads',         icon: TrendingUp },
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
    <aside className="w-60 flex-shrink-0 flex flex-col bg-gradient-to-b from-slate-950 via-[#0f1e3d] to-slate-950 min-h-screen shadow-xl">

      {/* Brand */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg flex-shrink-0">
          <span className="text-white font-black text-sm">C</span>
        </div>
        <div>
          <p className="text-white font-bold text-sm leading-none">Crown Dental</p>
          <p className="text-white/40 text-[10px] mt-0.5">Studio CRM</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="px-3 mb-1 text-[10px] font-bold uppercase tracking-widest text-white/25">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map(({ label, href, icon: Icon }) => {
                const active = pathname === href || pathname.startsWith(`${href}/`);
                return (
                  <Link key={href} href={href}>
                    <div
                      className={[
                        'flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all cursor-pointer',
                        active
                          ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/10 text-cyan-300 border border-cyan-500/20'
                          : 'text-white/55 hover:text-white/90 hover:bg-white/[0.07]',
                      ].join(' ')}
                    >
                      <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-cyan-400' : ''}`} />
                      <span className="flex-1 truncate">{label}</span>
                      {active && <ChevronRight className="w-3 h-3 text-cyan-400/60 flex-shrink-0" />}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-white/10 space-y-2">
        {currentUser && (
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/[0.06]">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center flex-shrink-0 text-white font-bold text-[11px]">
              {initials(currentUser.full_name)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-[12px] font-semibold truncate">{currentUser.full_name}</p>
              <p className="text-white/40 text-[10px] truncate">{currentUser.email}</p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-[13px] font-medium text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
