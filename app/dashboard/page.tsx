'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/dashboard-layout';
import { formatZAR, formatDateSA } from '@/lib/sa-formatting';
import { usePortalSession } from '@/lib/auth/portal-session-context';
import { OperationsRiskStrip } from '@/components/operations-risk-strip';
import { WorkCalendar, WorkItemRow } from '@/components/work-calendar';
import type { WorkCalendar as WorkCalendarData } from '@/lib/dashboard/work-calendar';
import { Users, Calendar, CreditCard, FlaskConical, AlertTriangle, ArrowUpRight, Clock, CheckCircle2 } from 'lucide-react';

type DashboardSummary = {
  totalPatients: number;
  newPatientsThisMonth: number;
  appointmentsToday: number;
  appointmentsUpcoming: number;
  outstandingBalance: number;
  overdueInvoices: number;
  openLabCases: number;
  overdueLabCases: number;
};

type DashboardPayload = {
  today: string;
  summary: DashboardSummary;
  calendar: WorkCalendarData;
};

const STAT_STYLE = [
  { icon: Users, gradient: 'from-navy-800 to-ink', badge: 'bg-white/15 text-white' },
  { icon: Calendar, gradient: 'from-[#3f4c7a] to-[#2c365c]', badge: 'bg-white/15 text-white' },
  { icon: CreditCard, gradient: 'from-[#b8742e] to-[#8f5a22]', badge: 'bg-white/15 text-white' },
  { icon: FlaskConical, gradient: 'from-teal to-[#0b6f71]', badge: 'bg-white/15 text-white' },
];

function statCards(summary: DashboardSummary | null) {
  const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? '' : 's'}`;
  return [
    {
      title: 'Active Patients',
      value: summary ? String(summary.totalPatients) : '–',
      sub: summary ? `+${summary.newPatientsThisMonth} this month` : '',
      href: '/patients',
    },
    {
      title: 'Appointments Today',
      value: summary ? String(summary.appointmentsToday) : '–',
      sub: summary ? `${summary.appointmentsUpcoming} upcoming` : '',
      href: '/appointments',
    },
    {
      title: 'Outstanding',
      value: summary ? formatZAR(summary.outstandingBalance) : '–',
      sub: summary ? plural(summary.overdueInvoices, 'overdue invoice') : '',
      href: '/accounts',
    },
    {
      title: 'Lab Cases Active',
      value: summary ? String(summary.openLabCases) : '–',
      sub: summary ? plural(summary.overdueLabCases, 'past due date') : '',
      href: '/lab',
    },
  ];
}

function DashboardContent() {
  const { currentUser: user } = usePortalSession();
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch('/api/crm/dashboard', { credentials: 'include' });
        const payload = await response.json().catch(() => ({}));
        if (cancelled) return;
        if (!response.ok) throw new Error(payload.error || 'Failed to load dashboard');
        setData(payload.data as DashboardPayload);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-slate-500 text-sm">Please sign in to view the dashboard.</p>
      </div>
    );
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const today = new Date().toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' });
  const todayKey = data?.today || new Date().toISOString().slice(0, 10);
  const calendar = data?.calendar;
  const outstanding = calendar?.outstanding || [];
  const cards = statCards(data?.summary || null);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">

      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{greeting}, {user.full_name?.split(' ')[0]}</h1>
          <p className="text-slate-500 text-sm mt-0.5 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {today}
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          All systems operational
        </span>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((stat, index) => {
          const style = STAT_STYLE[index];
          const Icon = style.icon;
          return (
            <Link
              key={stat.title}
              href={stat.href}
              className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${style.gradient} p-5 text-white shadow-lg hover:shadow-xl transition-shadow`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-9 h-9 rounded-xl ${style.badge} flex items-center justify-center`}>
                  <Icon className="w-5 h-5" />
                </div>
                <ArrowUpRight className="w-4 h-4 opacity-50" />
              </div>
              <p className="text-3xl font-bold leading-none mb-1">{loading ? '–' : stat.value}</p>
              <p className="text-xs font-semibold opacity-75 leading-none mb-0.5">{stat.title}</p>
              <p className="text-[11px] opacity-55">{loading ? ' ' : stat.sub}</p>
              <div className="absolute -right-4 -bottom-4 w-20 h-20 rounded-full bg-white/10" />
              <div className="absolute -right-1 -bottom-8 w-12 h-12 rounded-full bg-white/10" />
            </Link>
          );
        })}
      </div>

      {/* Risk strip */}
      <OperationsRiskStrip variant="dashboard" />

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Work calendar */}
        <div className="lg:col-span-2">
          <WorkCalendar items={calendar?.items || []} today={todayKey} loading={loading} />
        </div>

        {/* Quick overview */}
        <div className="space-y-4">
          {/* Outstanding work */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <h2 className="font-bold text-slate-900 text-sm">Outstanding work</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {loading ? 'Loading…' : outstanding.length === 0 ? 'Nothing is past its date' : `${outstanding.length} item${outstanding.length === 1 ? '' : 's'} past due`}
                </p>
              </div>
              <AlertTriangle className={`w-4 h-4 ${outstanding.length > 0 ? 'text-red-500' : 'text-slate-300'}`} />
            </div>
            {outstanding.length > 0 ? (
              <div className="divide-y divide-slate-50 max-h-[26rem] overflow-y-auto">
                {outstanding.map((item) => <WorkItemRow key={item.id} item={item} showDate />)}
              </div>
            ) : (
              !loading && (
                <div className="px-5 py-6 flex items-center gap-2 text-xs text-emerald-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  All lab work, invoices and recalls are on time
                </div>
              )
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-900 text-sm">Account Summary</h2>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-1">Role</p>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-soft text-ink text-xs font-bold border border-hairline">
                  {user.role}
                </span>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-1">Email</p>
                <p className="text-sm font-medium text-slate-900 break-all">{user.email}</p>
              </div>
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <p className="text-xs font-semibold text-emerald-700">All systems operational</p>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Last checked {formatDateSA(new Date())}
                </p>
              </div>
            </div>
          </div>

          {/* Quick links */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-ink">
              <p className="font-bold text-sm text-white">Quick Actions</p>
              <p className="text-white/75 text-xs mt-1">Jump to common tasks</p>
            </div>
            <div className="p-5">
            <div className="space-y-2">
              {[
                { label: 'Add New Patient', href: '/patients/add' },
                { label: 'Book Appointment', href: '/appointments' },
                { label: 'View Lab Cases', href: '/lab' },
              ].map(({ label, href }) => (
                <a
                  key={href}
                  href={href}
                  className="flex items-center justify-between w-full px-3 py-2 rounded-xl bg-slate-50 hover:bg-cream transition-colors text-sm font-semibold text-slate-800 border border-slate-200 hover:border-teal/30"
                >
                  {label}
                  <ArrowUpRight className="w-3.5 h-3.5 text-teal" />
                </a>
              ))}
            </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <DashboardContent />
    </DashboardLayout>
  );
}
