'use client';

import { useEffect, useState, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Search, Bell, ChevronRight } from 'lucide-react';
import { Sidebar } from './sidebar';
import { fetchCurrentSessionUser } from '@/lib/auth/session-client';
import { isPortalRoute } from '@/lib/auth/portal-navigation';
import { PortalSessionProvider } from '@/lib/auth/portal-session-context';
import type { PublicAuthUser } from '@/lib/auth/public-user';

interface PatientResult {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
}

function TopBar({ currentUser }: { currentUser: PublicAuthUser | null }) {
  const router = useRouter();
  const [query, setQuery]           = useState('');
  const [results, setResults]       = useState<PatientResult[]>([]);
  const [searching, setSearching]   = useState(false);
  const [showDrop, setShowDrop]     = useState(false);
  const searchRef                   = useRef<HTMLDivElement>(null);
  const debounceRef                 = useRef<ReturnType<typeof setTimeout>>();

  /* close on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDrop(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* debounced search */
  useEffect(() => {
    if (!query.trim()) { setResults([]); setShowDrop(false); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `/api/crm/patients?limit=8&search=${encodeURIComponent(query)}`,
          { credentials: 'include' },
        );
        if (res.ok) {
          const payload = await res.json();
          setResults(payload.data || []);
          setShowDrop(true);
        }
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const initials = (name?: string | null) =>
    name ? name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() : 'U';

  return (
    <header className="flex-shrink-0 h-14 flex items-center gap-3 px-5 bg-white border-b border-slate-200 shadow-sm z-30">

      {/* Patient search */}
      <div ref={searchRef} className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search patients by name or email..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setShowDrop(true)}
          className="w-full pl-9 pr-9 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-400 focus:bg-white transition-all"
        />
        {searching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        )}

        {/* Dropdown */}
        {showDrop && results.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50">
            <div className="px-4 py-2 border-b border-slate-100 bg-slate-50">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                {results.length} patient{results.length !== 1 ? 's' : ''} found
              </p>
            </div>
            {results.map((patient) => (
              <button
                key={patient.id}
                onClick={() => {
                  router.push(`/patients/${patient.id}`);
                  setQuery('');
                  setShowDrop(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 transition-colors text-left group"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center flex-shrink-0 text-white text-[11px] font-bold shadow-sm">
                  {patient.first_name?.[0]}{patient.last_name?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 group-hover:text-blue-700 truncate">
                    {patient.first_name} {patient.last_name}
                  </p>
                  {patient.email && (
                    <p className="text-xs text-slate-500 truncate">{patient.email}</p>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-400 flex-shrink-0" />
              </button>
            ))}
            <div className="px-4 py-2 border-t border-slate-100 bg-slate-50">
              <button
                onClick={() => {
                  router.push(`/patients?search=${encodeURIComponent(query)}`);
                  setShowDrop(false);
                }}
                className="text-[12px] text-blue-600 font-semibold hover:text-blue-700 transition-colors"
              >
                View all results →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-2 ml-auto">
        <button className="relative p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors">
          <Bell className="w-[1.1rem] h-[1.1rem]" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
        </button>

        {currentUser && (
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200 ml-1">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-[11px] shadow-sm">
              {initials(currentUser.full_name)}
            </div>
            <div className="hidden sm:block leading-none">
              <p className="text-[12px] font-semibold text-slate-900">{currentUser.full_name}</p>
              <p className="text-[11px] text-slate-500">{currentUser.role}</p>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [currentUser, setCurrentUser] = useState<PublicAuthUser | null>(null);
  const isDashboardRoute = isPortalRoute(pathname);

  useEffect(() => {
    if (!isDashboardRoute) {
      setAuthChecked(false);
      setCurrentUser(null);
      return;
    }

    const validateSession = async () => {
      try {
        const user = await fetchCurrentSessionUser();
        if (!user) { router.replace('/auth/login'); return; }
        setCurrentUser(user);
      } catch {
        router.replace('/auth/login');
        return;
      }
      setAuthChecked(true);
    };

    validateSession();
  }, [isDashboardRoute, router]);

  if (!isDashboardRoute) {
    return <>{children}</>;
  }

  if (!authChecked) {
    return null;
  }

  return (
    <PortalSessionProvider currentUser={currentUser}>
      <div className="flex h-screen bg-[#f1f5f9] overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <TopBar currentUser={currentUser} />
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </div>
    </PortalSessionProvider>
  );
}
