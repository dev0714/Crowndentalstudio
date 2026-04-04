'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { formatZAR } from '@/lib/sa-formatting';

type OperationsPayload = {
  summary: {
    totalPatients: number;
    activePatients: number;
    openLeads: number;
    openLabCases: number;
    outstandingBalance: number;
    overdueInvoices: number;
    todayAppointments: number;
    outstandingConsentCount: number;
    overdueLabCount: number;
    staleRecallCount: number;
    lowStockCount: number;
  };
  risks: {
    counts: Record<string, number>;
  };
};

type Variant = 'dashboard' | 'accounts' | 'lab' | 'compliance' | 'leads' | 'stock' | 'operations';

const VARIANT_CARDS: Record<Variant, Array<{ title: string; value: (payload: OperationsPayload) => string; note: string }>> = {
  dashboard: [
    { title: 'Open Work', value: (payload) => String((payload.summary.openLabCases || 0) + (payload.summary.openLeads || 0)), note: 'Leads + lab' },
    { title: 'Risk Flags', value: (payload) => String(Object.values(payload.risks.counts || {}).reduce((sum, value) => sum + Number(value || 0), 0)), note: 'Exceptions' },
    { title: 'Outstanding Balance', value: (payload) => formatZAR(payload.summary.outstandingBalance || 0), note: 'AR exposure' },
  ],
  accounts: [
    { title: 'Overdue Invoices', value: (payload) => String(payload.summary.overdueInvoices || 0), note: 'Collections queue' },
    { title: 'Outstanding Balance', value: (payload) => formatZAR(payload.summary.outstandingBalance || 0), note: 'Balance due' },
    { title: 'Consent Gaps', value: (payload) => String(payload.summary.outstandingConsentCount || 0), note: 'Patient compliance' },
  ],
  lab: [
    { title: 'Open Lab Cases', value: (payload) => String(payload.summary.openLabCases || 0), note: 'Work in progress' },
    { title: 'Overdue Lab', value: (payload) => String(payload.summary.overdueLabCount || 0), note: 'Due date risk' },
    { title: 'Recall Due', value: (payload) => String(payload.summary.staleRecallCount || 0), note: 'Follow-up queue' },
  ],
  compliance: [
    { title: 'Consent Gaps', value: (payload) => String(payload.summary.outstandingConsentCount || 0), note: 'POPIA / comms' },
    { title: 'Signed Records', value: (payload) => String((payload.summary.totalPatients || 0) - (payload.summary.outstandingConsentCount || 0)), note: 'Recorded patients' },
    { title: 'Risk Flags', value: (payload) => String(Object.values(payload.risks.counts || {}).reduce((sum, value) => sum + Number(value || 0), 0)), note: 'Review queue' },
  ],
  leads: [
    { title: 'Open Leads', value: (payload) => String(payload.summary.openLeads || 0), note: 'Needs follow-up' },
    { title: 'Today Appointments', value: (payload) => String(payload.summary.todayAppointments || 0), note: 'Booked today' },
    { title: 'Recall Due', value: (payload) => String(payload.summary.staleRecallCount || 0), note: 'Warm patients' },
  ],
  stock: [
    { title: 'Low Stock', value: (payload) => String(payload.summary.lowStockCount || 0), note: 'Reorder or expiry' },
    { title: 'Risk Flags', value: (payload) => String(Object.values(payload.risks.counts || {}).reduce((sum, value) => sum + Number(value || 0), 0)), note: 'Operational risk' },
    { title: 'Open Work', value: (payload) => String((payload.summary.openLabCases || 0) + (payload.summary.openLeads || 0)), note: 'Practice load' },
  ],
  operations: [
    { title: 'Open Lab Cases', value: (payload) => String(payload.summary.openLabCases || 0), note: 'Work in progress' },
    { title: 'Today Appointments', value: (payload) => String(payload.summary.todayAppointments || 0), note: 'Scheduled today' },
    { title: 'Risk Flags', value: (payload) => String(Object.values(payload.risks.counts || {}).reduce((sum, value) => sum + Number(value || 0), 0)), note: 'Operational alerts' },
  ],
};

export function OperationsRiskStrip({ variant }: { variant: Variant }) {
  const [payload, setPayload] = useState<OperationsPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch('/api/crm/operations', { credentials: 'include' });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error || 'Failed to load operations data');
        setPayload(body.data || null);
      } catch (error) {
        console.error('[operations-risk-strip] Failed to load:', error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const cards = VARIANT_CARDS[variant];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {cards.map((card) => (
        <Card key={card.title} className="border border-slate-200 shadow-lg">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-600">{card.title}</p>
            <p className="text-3xl font-bold text-slate-900">{loading ? '-' : card.value(payload || { summary: {}, risks: { counts: {} } } as OperationsPayload)}</p>
            <p className="text-xs text-slate-500 mt-2">{card.note}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
