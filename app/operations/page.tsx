'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatDateSA, formatZAR } from '@/lib/sa-formatting';
import { toCsv } from '@/lib/operations/register-export';
import { PORTAL_NAV_ITEMS } from '@/lib/auth/portal-navigation';
import { RISK_SEVERITY } from '@/lib/workflows/status-definitions';

type PublicUser = {
  id: string;
  full_name: string;
  email: string;
  role: 'CEO' | 'Reception' | 'Doctor' | 'Admin';
};

type RegisterRow = {
  id: string;
  label: string;
  patient_id?: string | null;
  patient_name?: string;
  status?: string;
  date?: string;
  owner?: string;
  source?: string;
  details?: string;
};

type OperationsPayload = {
  summary: {
    totalPatients: number;
    activePatients: number;
    todayAppointments: number;
    overdueInvoices: number;
    outstandingBalance: number;
    openLabCases: number;
    openLeads: number;
    outstandingConsentCount: number;
    overdueLabCount: number;
    overdueInvoiceCount: number;
    staleRecallCount: number;
    lowStockCount: number;
  };
  registers: Record<'leads' | 'lab' | 'consents' | 'accounts' | 'recalls' | 'stock' | 'incidents', RegisterRow[]>;
  patientTimeline: Array<{ id: string; label: string; description: string; event_at: string; patient_name?: string; source?: string }>;
  risks: {
    counts: Record<string, number>;
    signals: Array<{ key: string; label: string; severity: 'low' | 'medium' | 'high' }>;
  };
};

const REGISTER_LABELS: Record<keyof OperationsPayload['registers'], string> = {
  leads: 'Leads',
  lab: 'Lab',
  consents: 'Consents',
  accounts: 'Accounts',
  recalls: 'Recalls',
  stock: 'Stock',
  incidents: 'Incidents',
};

function OperationsPageContent() {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [payload, setPayload] = useState<OperationsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeRegister, setActiveRegister] = useState<keyof OperationsPayload['registers']>('leads');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    const load = async () => {
      try {
        const [meResponse, operationsResponse] = await Promise.all([
          fetch('/api/auth/me', { credentials: 'include' }),
          fetch('/api/crm/operations', { credentials: 'include' }),
        ]);

        const mePayload = await meResponse.json().catch(() => ({}));
        if (!meResponse.ok) {
          throw new Error(mePayload.error || 'Unable to load session');
        }

        const operationsPayload = await operationsResponse.json().catch(() => ({}));
        if (!operationsResponse.ok) {
          throw new Error(operationsPayload.error || 'Unable to load operations overview');
        }

        setUser(mePayload.user || null);
        setPayload(operationsPayload.data || null);
      } catch (err) {
        console.error('[operations] Failed to load overview:', err);
        setError(err instanceof Error ? err.message : 'Failed to load operations overview');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const activeRows = payload?.registers?.[activeRegister] || [];
  const filteredRows = activeRows.filter((row) => {
    const searchable = `${row.label} ${row.patient_name || ''} ${row.status || ''} ${row.source || ''} ${row.details || ''}`.toLowerCase();
    const statusMatch = statusFilter === 'all' || (row.status || '').toLowerCase().includes(statusFilter.toLowerCase());
    return searchable.includes(search.toLowerCase()) && statusMatch;
  });

  const exportActiveRows = () => {
    const csv = toCsv(filteredRows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeRegister}-register.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const summary = payload?.summary;
  const risks = payload?.risks.signals || [];
  const riskCounts = payload?.risks.counts || {};

  const rolePanels = user?.role === 'CEO'
    ? [
        { title: 'Revenue Watch', value: formatZAR(summary?.outstandingBalance || 0), note: 'Outstanding balance' },
        { title: 'Patient Base', value: String(summary?.activePatients || 0), note: 'Active patients' },
        { title: 'Operational Load', value: String((summary?.openLabCases || 0) + (summary?.openLeads || 0)), note: 'Open work items' },
      ]
    : user?.role === 'Reception'
      ? [
          { title: 'Open Leads', value: String(summary?.openLeads || 0), note: 'Needs follow-up' },
          { title: 'Today Appointments', value: String(summary?.todayAppointments || 0), note: 'Scheduled today' },
          { title: 'Recall / Consent Risks', value: String((riskCounts.staleRecallCount || 0) + (riskCounts.outstandingConsentCount || 0)), note: 'Needs action' },
        ]
      : user?.role === 'Doctor'
        ? [
            { title: 'Open Lab Cases', value: String(summary?.openLabCases || 0), note: 'Clinical follow-up' },
            { title: 'Consent Gaps', value: String(riskCounts.outstandingConsentCount || 0), note: 'Before treatment' },
            { title: 'Recall Due', value: String(riskCounts.staleRecallCount || 0), note: 'Follow-up queue' },
          ]
        : [
            { title: 'Overdue Invoices', value: String(summary?.overdueInvoices || 0), note: 'Billing attention' },
            { title: 'Outstanding Balance', value: formatZAR(summary?.outstandingBalance || 0), note: 'AR exposure' },
            { title: 'Low Stock', value: String(riskCounts.lowStockCount || 0), note: 'Inventory risk' },
          ];

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Operations Control Center</h1>
            <p className="text-slate-500 text-sm mt-0.5">Role-aware dashboards, registers, timelines, and risk signals</p>
            {user && <p className="text-xs text-slate-400 mt-1">Signed in as {user.full_name} ({user.role})</p>}
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wider text-slate-400 font-bold">Navigation</p>
            <p className="text-sm text-slate-700">{PORTAL_NAV_ITEMS.length} portal sections available</p>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Patients', value: loading ? '-' : String(summary?.totalPatients ?? 0), note: `Active ${summary?.activePatients ?? 0}`, gradient: 'from-blue-600 to-cyan-500' },
            { label: 'Open Work', value: loading ? '-' : String((summary?.openLabCases || 0) + (summary?.openLeads || 0)), note: 'Leads + lab cases', gradient: 'from-violet-600 to-purple-500' },
            { label: 'Outstanding Balance', value: loading ? '-' : formatZAR(summary?.outstandingBalance || 0), note: 'Accounts exposure', gradient: 'from-rose-600 to-pink-500' },
            { label: 'Risk Signals', value: loading ? '-' : String(risks.length), note: 'Actionable exceptions', gradient: 'from-amber-500 to-orange-500' },
          ].map((card) => (
            <div key={card.label} className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${card.gradient} p-5 text-white shadow-md`}>
              <p className="text-3xl font-bold leading-none mb-1">{card.value}</p>
              <p className="text-xs font-semibold opacity-75">{card.label}</p>
              <p className="text-xs opacity-60 mt-0.5">{card.note}</p>
              <div className="absolute -right-3 -bottom-3 w-14 h-14 rounded-full bg-white/10" />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {rolePanels.map((panel, i) => {
            const gradients = ['from-emerald-600 to-teal-500','from-cyan-600 to-blue-500','from-slate-600 to-slate-800'];
            return (
              <div key={panel.title} className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradients[i % 3]} p-5 text-white shadow-md`}>
                <p className="text-3xl font-bold leading-none mb-1">{loading ? '-' : panel.value}</p>
                <p className="text-xs font-semibold opacity-75">{panel.title}</p>
                <p className="text-xs opacity-60 mt-0.5">{panel.note}</p>
                <div className="absolute -right-3 -bottom-3 w-14 h-14 rounded-full bg-white/10" />
              </div>
            );
          })}
        </div>

        <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4 px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">Registers</CardTitle>
                <CardDescription className="text-xs">Generated operational registers with export support</CardDescription>
              </div>
              <div className="flex gap-2">
                {Object.entries(REGISTER_LABELS).map(([key, label]) => (
                  <Button
                    key={key}
                    variant={activeRegister === key ? 'default' : 'outline'}
                    size="sm"
                    className={activeRegister === key ? 'bg-gradient-to-r from-blue-600 to-cyan-600 border-0 text-white text-xs' : 'text-xs'}
                    onClick={() => {
                      setActiveRegister(key as keyof OperationsPayload['registers']);
                      setStatusFilter('all');
                      setSearch('');
                    }}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col md:flex-row gap-3">
              <Input placeholder="Search register" value={search} onChange={(e) => setSearch(e.target.value)} />
              <Input placeholder="Status filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} />
              <Button onClick={exportActiveRows} className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 border-0 shadow-md text-xs">
                Export CSV
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b-2 border-slate-200">
                  <tr>
                    <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-400">Label</th>
                    <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-400">Patient</th>
                    <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-400">Status</th>
                    <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-400">Date</th>
                    <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-400">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length > 0 ? (
                    filteredRows.map((row) => (
                      <tr key={row.id} className="border-b border-slate-100 hover:bg-blue-50/40 transition-colors">
                        <td className="py-3 px-4 text-slate-900 font-medium">{row.label}</td>
                        <td className="py-3 px-4 text-slate-600">{row.patient_name || row.patient_id || '-'}</td>
                        <td className="py-3 px-4 text-slate-600">{row.status || '-'}</td>
                        <td className="py-3 px-4 text-slate-600">{row.date ? formatDateSA(row.date) : '-'}</td>
                        <td className="py-3 px-4 text-slate-600">{row.source || '-'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-600">
                        No rows found for this register
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4 px-6">
              <CardTitle className="text-base">Patient Audit Timeline</CardTitle>
              <CardDescription className="text-xs">Most recent operational events</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-slate-600 py-6 text-center">Loading timeline...</p>
              ) : payload?.patientTimeline?.length ? (
                <div className="space-y-3">
                  {payload.patientTimeline.slice(0, 8).map((entry) => (
                    <div key={entry.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-medium text-slate-900">{entry.label}</p>
                          <p className="text-sm text-slate-600">{entry.description || entry.source || 'Timeline event'}</p>
                          {entry.patient_name && <p className="text-xs text-slate-500 mt-1">{entry.patient_name}</p>}
                        </div>
                        <span className="text-xs text-slate-500">{formatDateSA(entry.event_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-600 py-6 text-center">No timeline events available</p>
              )}
            </CardContent>
          </Card>

          <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4 px-6">
              <CardTitle className="text-base">Risk Signals</CardTitle>
              <CardDescription className="text-xs">Operational exceptions needing attention</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-slate-600 py-6 text-center">Loading risks...</p>
              ) : risks.length ? (
                <div className="space-y-3">
                  {risks.map((risk) => (
                    <div key={risk.key} className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
                      <div>
                        <p className="font-medium text-slate-900">{risk.label}</p>
                        <p className="text-xs text-slate-500 mt-1">{risk.key}</p>
                      </div>
                      <span
                        className={`text-xs font-semibold px-2 py-1 rounded ${
                          risk.severity === RISK_SEVERITY.HIGH
                            ? 'bg-red-100 text-red-700'
                            : risk.severity === RISK_SEVERITY.MEDIUM
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {risk.severity}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-600 py-6 text-center">No active risk signals</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function OperationsPage() {
  return (
    <DashboardLayout>
      <OperationsPageContent />
    </DashboardLayout>
  );
}
