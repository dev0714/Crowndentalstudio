'use client';

import { DashboardLayout } from '@/components/dashboard-layout';
import { formatZAR, formatDateSA } from '@/lib/sa-formatting';
import { usePortalSession } from '@/lib/auth/portal-session-context';
import { OperationsRiskStrip } from '@/components/operations-risk-strip';
import { Users, Calendar, CreditCard, FlaskConical, TrendingUp, ArrowUpRight, Clock, CheckCircle2 } from 'lucide-react';

const STAT_CONFIG = [
  {
    title: 'Total Patients',
    value: '245',
    sub: '+12 this month',
    icon: Users,
    gradient: 'from-blue-600 to-cyan-500',
    badge: 'bg-blue-500/20 text-blue-100',
  },
  {
    title: 'Appointments Today',
    value: '8',
    sub: '2 pending confirmation',
    icon: Calendar,
    gradient: 'from-violet-600 to-purple-500',
    badge: 'bg-violet-500/20 text-violet-100',
  },
  {
    title: 'Outstanding',
    value: formatZAR(5240),
    sub: 'Medical aid pending',
    icon: CreditCard,
    gradient: 'from-amber-500 to-orange-500',
    badge: 'bg-amber-500/20 text-amber-100',
  },
  {
    title: 'Lab Cases Active',
    value: '12',
    sub: 'Ready in ~3 days',
    icon: FlaskConical,
    gradient: 'from-emerald-600 to-teal-500',
    badge: 'bg-emerald-500/20 text-emerald-100',
  },
];

const ACTIVITY = [
  { name: 'Thabo Nkosi',      action: 'Appointment completed',  time: '9:15 AM',  status: 'done' },
  { name: 'Priya Govender',   action: 'Checkup scheduled',      time: '10:00 AM', status: 'upcoming' },
  { name: 'James Williams',   action: 'Invoice sent — R1 200',  time: '10:45 AM', status: 'invoice' },
  { name: 'Ayesha Patel',     action: 'Lab case updated',       time: '11:30 AM', status: 'lab' },
  { name: 'Michael van Zyl',  action: 'Appointment confirmed',  time: '12:00 PM', status: 'done' },
];

const statusDot: Record<string, string> = {
  done:     'bg-emerald-400',
  upcoming: 'bg-blue-400',
  invoice:  'bg-amber-400',
  lab:      'bg-violet-400',
};

function DashboardContent() {
  const { currentUser: user } = usePortalSession();

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

  return (
    <div className="p-6 lg:p-8 space-y-6">

      {/* Page header */}
      <div className="flex items-start justify-between">
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

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CONFIG.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.title}
              className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${stat.gradient} p-5 text-white shadow-lg`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-9 h-9 rounded-xl ${stat.badge} flex items-center justify-center`}>
                  <Icon className="w-5 h-5" />
                </div>
                <ArrowUpRight className="w-4 h-4 opacity-50" />
              </div>
              <p className="text-3xl font-bold leading-none mb-1">{stat.value}</p>
              <p className="text-xs font-semibold opacity-75 leading-none mb-0.5">{stat.title}</p>
              <p className="text-[11px] opacity-55">{stat.sub}</p>
              {/* Decorative circle */}
              <div className="absolute -right-4 -bottom-4 w-20 h-20 rounded-full bg-white/10" />
              <div className="absolute -right-1 -bottom-8 w-12 h-12 rounded-full bg-white/10" />
            </div>
          );
        })}
      </div>

      {/* Risk strip */}
      <OperationsRiskStrip variant="dashboard" />

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div>
              <h2 className="font-bold text-slate-900 text-sm">Today&apos;s Activity</h2>
              <p className="text-xs text-slate-500 mt-0.5">Latest appointments and updates</p>
            </div>
            <TrendingUp className="w-4 h-4 text-slate-400" />
          </div>
          <div className="divide-y divide-slate-50">
            {ACTIVITY.map((item, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-3.5 hover:bg-slate-50 transition-colors">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center flex-shrink-0 text-slate-700 text-[11px] font-bold">
                  {item.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{item.name}</p>
                  <p className="text-xs text-slate-500 truncate">{item.action}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-slate-400">{item.time}</span>
                  <span className={`w-2 h-2 rounded-full ${statusDot[item.status]}`} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick overview */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-900 text-sm">Account Summary</h2>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-1">Role</p>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100">
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
            <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-blue-600 to-cyan-500">
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
                  className="flex items-center justify-between w-full px-3 py-2 rounded-xl bg-slate-50 hover:bg-blue-50 transition-colors text-sm font-semibold text-slate-800 border border-slate-200 hover:border-blue-200"
                >
                  {label}
                  <ArrowUpRight className="w-3.5 h-3.5 text-blue-600" />
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
