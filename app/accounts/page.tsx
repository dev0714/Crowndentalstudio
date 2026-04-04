'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { OperationsRiskStrip } from '@/components/operations-risk-strip';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { formatDateSA, formatZAR } from '@/lib/sa-formatting';
import { calcAuthorizationShortfall, calcInvoiceShortfall } from '@/lib/billing/authorization-summary';
import {
  CLAIM_STATUS,
  INVOICE_STATUS,
  MEDICAL_AID_AUTHORIZATION_STATUS,
} from '@/lib/workflows/status-definitions';
import type {
  BankStatementMatch,
  BillingInvoice,
  DebtBucketSummary,
  PaymentReminderLog,
  ReminderQueueItem,
  ReminderSchedule,
  SpecialInvoiceKind,
  MedicalAidAuthorization,
} from '@/lib/types/crm';

type PatientOption = { id: string; label: string };
type MedicalAidClaim = {
  id: string;
  patient_name: string;
  claim_number: string;
  amount_claimed: number;
  amount_approved: number | null;
  claim_date: string;
  status: string;
};
type BillingResponse = {
  invoices: BillingInvoice[];
  statementLines: BankStatementMatch[];
  reminders: PaymentReminderLog[];
  debtBuckets: DebtBucketSummary;
  reminderSchedule: ReminderSchedule;
};

const EMPTY_BUCKETS: DebtBucketSummary = {
  totalOutstanding: 0,
  current: { count: 0, amount: 0 },
  day1to2: { count: 0, amount: 0 },
  day3to6: { count: 0, amount: 0 },
  day7to13: { count: 0, amount: 0 },
  day14to20: { count: 0, amount: 0 },
  day21Plus: { count: 0, amount: 0 },
};
const EMPTY_SCHEDULE: ReminderSchedule = { due: [], sentDaysByInvoiceId: {} };
const BUCKETS: Array<{ key: keyof Omit<DebtBucketSummary, 'totalOutstanding'>; label: string }> = [
  { key: 'current', label: 'Current' },
  { key: 'day1to2', label: 'Day 1-2' },
  { key: 'day3to6', label: 'Day 3-6' },
  { key: 'day7to13', label: 'Day 7-13' },
  { key: 'day14to20', label: 'Day 14-20' },
  { key: 'day21Plus', label: 'Day 21+' },
];

function AccountsContent() {
  const [billing, setBilling] = useState<BillingResponse | null>(null);
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [claims, setClaims] = useState<MedicalAidClaim[]>([]);
  const [authorizations, setAuthorizations] = useState<MedicalAidAuthorization[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [bankForm, setBankForm] = useState({
    statement_date: new Date().toISOString().slice(0, 10),
    description: '',
    reference: '',
    amount: '',
    bank_account: '',
    notes: '',
  });
  const [specialForm, setSpecialForm] = useState<{
    kind: SpecialInvoiceKind;
    patient_id: string;
    patient_name: string;
    amount: string;
    description: string;
    due_date: string;
  }>({
    kind: 'deposit',
    patient_id: '',
    patient_name: '',
    amount: '',
    description: '',
    due_date: new Date().toISOString().slice(0, 10),
  });

  const loadData = async () => {
    const [billingRes, patientsRes, claimsRes, authsRes] = await Promise.all([
      fetch('/api/crm/billing', { credentials: 'include' }),
      fetch('/api/crm/patients?limit=1000&page=1', { credentials: 'include' }),
      fetch('/api/crm/medical-aid-claims?limit=1000&page=1', { credentials: 'include' }),
      fetch('/api/crm/medical-aid-authorizations?limit=1000&page=1', { credentials: 'include' }),
    ]);

    const billingJson = await billingRes.json().catch(() => ({}));
    const patientsJson = await patientsRes.json().catch(() => ({}));
    const claimsJson = await claimsRes.json().catch(() => ({}));
    const authsJson = await authsRes.json().catch(() => ({}));

    if (!billingRes.ok) throw new Error(billingJson.error || 'Failed to load billing data');
    if (!patientsRes.ok) throw new Error(patientsJson.error || 'Failed to load patients');
    if (!claimsRes.ok) throw new Error(claimsJson.error || 'Failed to load medical aid claims');
    if (!authsRes.ok) throw new Error(authsJson.error || 'Failed to load medical aid authorizations');

    setBilling(billingJson.data || null);
    setPatients((patientsJson.data || []).map((patient: { id: string; first_name: string; last_name: string }) => ({
      id: patient.id,
      label: `${patient.first_name} ${patient.last_name}`.trim(),
    })));
    setClaims(claimsJson.data || []);
    setAuthorizations(authsJson.data || []);
  };

  useEffect(() => {
    (async () => {
      try {
        await loadData();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load billing data');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load billing data');
    } finally {
      setLoading(false);
    }
  };

  const postBillingAction = async (payload: Record<string, unknown>, okMessage: string) => {
    setSubmitting(String(payload.action || 'billing'));
    setError(null);
    setNotice(null);
    try {
      const res = await fetch('/api/crm/billing', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Billing action failed');
      setNotice(json.warning || okMessage);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Billing action failed');
    } finally {
      setSubmitting(null);
    }
  };

  const invoices = billing?.invoices || [];
  const statementLines = billing?.statementLines || [];
  const reminderQueue = billing?.reminderSchedule?.due || EMPTY_SCHEDULE.due;
  const debtBuckets = billing?.debtBuckets || EMPTY_BUCKETS;

  const totalRevenue = invoices.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);
  const paidInvoices = invoices.filter((inv) => inv.status === INVOICE_STATUS.PAID).reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);
  const totalShortfall = invoices.reduce((sum, inv) => sum + calcInvoiceShortfall(inv), 0);
  const outstandingInvoices = invoices.filter((inv) => calcInvoiceShortfall(inv) > 0).length;
  const partialInvoices = invoices.filter((inv) => inv.status === INVOICE_STATUS.PARTIALLY_PAID).length;
  const unpaidInvoices = invoices.filter(
    (inv) => calcInvoiceShortfall(inv) > 0 && inv.status !== INVOICE_STATUS.PARTIALLY_PAID,
  ).length;
  const submittedClaims = claims.filter((claim) => claim.status === CLAIM_STATUS.SUBMITTED || claim.status === CLAIM_STATUS.UNDER_REVIEW).length;
  const approvedClaims = claims.filter((claim) => claim.status === CLAIM_STATUS.APPROVED).length;
  const pendingAuthorizations = authorizations.filter((auth) => auth.status === MEDICAL_AID_AUTHORIZATION_STATUS.PENDING || auth.status === MEDICAL_AID_AUTHORIZATION_STATUS.NEEDS_REVIEW).length;
  const approvedAuthorizations = authorizations.filter((auth) => auth.status === MEDICAL_AID_AUTHORIZATION_STATUS.APPROVED).length;
  const totalAuthorized = authorizations.reduce((sum, auth) => sum + Number(auth.authorized_amount || 0), 0);
  const authShortfall = authorizations.reduce((sum, auth) => sum + calcAuthorizationShortfall(auth), 0);

  const statusColor = (status: string) => {
    switch (status) {
      case INVOICE_STATUS.PAID:
        return 'bg-green-100 text-green-700';
      case INVOICE_STATUS.OVERDUE:
        return 'bg-red-100 text-red-700';
      case INVOICE_STATUS.PARTIALLY_PAID:
        return 'bg-amber-100 text-amber-700';
      case INVOICE_STATUS.ISSUED:
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const handleBankSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await postBillingAction({ action: 'import_statement_line', ...bankForm, amount: Number(bankForm.amount || 0) }, 'Bank statement line imported');
    setBankForm({
      statement_date: new Date().toISOString().slice(0, 10),
      description: '',
      reference: '',
      amount: '',
      bank_account: '',
      notes: '',
    });
  };

  const handleSpecialSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const selected = patients.find((patient) => patient.id === specialForm.patient_id);
    await postBillingAction(
      {
        action: 'create_special_invoice',
        kind: specialForm.kind,
        patient_id: specialForm.patient_id,
        patient_name: specialForm.patient_name || selected?.label || '',
        amount: Number(specialForm.amount || 0),
        description: specialForm.description,
        due_date: specialForm.due_date,
      },
      'Special invoice created',
    );
    setSpecialForm((current) => ({ ...current, amount: '', description: '' }));
  };

  const handleReminder = async (item: ReminderQueueItem) => {
    await postBillingAction(
      {
        action: 'log_reminder',
        invoice_id: item.invoice_id,
        patient_id: item.patient_id,
        reminder_day: item.reminder_day,
        reminder_type: 'payment',
        status: 'sent',
        sent_at: new Date().toISOString(),
        notes: `Logged from accounts queue for ${item.invoice_number}`,
      },
      `Reminder logged for ${item.invoice_number}`,
    );
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-5">
        <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Accounts & Billing</h1>
            <p className="text-slate-500 text-sm mt-0.5">Invoices, debt aging, bank matching, reminders, and special billing actions</p>
          </div>
          <div className="text-xs text-slate-400 font-medium">{loading ? 'Loading...' : `${invoices.length} invoices · ${reminderQueue.length} reminders due`}</div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Total Revenue', value: loading ? '-' : formatZAR(totalRevenue), note: 'All invoices', gradient: 'from-blue-600 to-cyan-500' },
            { label: 'Paid Invoices', value: loading ? '-' : formatZAR(paidInvoices), note: `${invoices.filter((inv) => inv.status === INVOICE_STATUS.PAID).length} paid`, gradient: 'from-emerald-600 to-teal-500' },
            { label: 'Outstanding Debt', value: loading ? '-' : formatZAR(debtBuckets.totalOutstanding), note: loading ? '-' : `${outstandingInvoices} outstanding`, gradient: 'from-rose-600 to-pink-500' },
          ].map((card) => (
            <div key={card.label} className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${card.gradient} p-5 text-white shadow-md`}>
              <p className="text-2xl font-bold leading-none mb-1">{card.value}</p>
              <p className="text-xs font-semibold opacity-75">{card.label}</p>
              <p className="text-xs opacity-60 mt-0.5">{card.note}</p>
              <div className="absolute -right-3 -bottom-3 w-14 h-14 rounded-full bg-white/10" />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {BUCKETS.map(({ key, label }, i) => {
            const gradients = ['from-slate-600 to-slate-800','from-blue-600 to-cyan-500','from-amber-500 to-orange-400','from-orange-600 to-red-500','from-red-600 to-rose-500','from-rose-700 to-pink-600'];
            return (
              <div key={key} className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradients[i]} p-4 text-white shadow-md`}>
                <p className="text-xl font-bold leading-none mb-1">{loading ? '-' : formatZAR(debtBuckets[key].amount)}</p>
                <p className="text-xs font-semibold opacity-75">{label}</p>
                <p className="text-[10px] opacity-60 mt-0.5">{loading ? '-' : `${debtBuckets[key].count} inv`}</p>
                <div className="absolute -right-2 -bottom-2 w-10 h-10 rounded-full bg-white/10" />
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { label: 'Medical Aid Claims', value: loading ? '-' : String(claims.length), note: `${submittedClaims} pending, ${approvedClaims} approved`, gradient: 'from-violet-600 to-purple-500' },
            { label: 'Claimed Value', value: loading ? '-' : formatZAR(claims.reduce((sum, claim) => sum + Number(claim.amount_claimed || 0), 0)), note: 'All submitted claims', gradient: 'from-cyan-600 to-blue-500' },
          ].map((card) => (
            <div key={card.label} className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${card.gradient} p-5 text-white shadow-md`}>
              <p className="text-2xl font-bold leading-none mb-1">{card.value}</p>
              <p className="text-xs font-semibold opacity-75">{card.label}</p>
              <p className="text-xs opacity-60 mt-0.5">{card.note}</p>
              <div className="absolute -right-3 -bottom-3 w-14 h-14 rounded-full bg-white/10" />
            </div>
          ))}
        </div>

        <OperationsRiskStrip variant="accounts" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { label: 'Pending Authorizations', value: loading ? '-' : String(pendingAuthorizations), note: `${approvedAuthorizations} approved`, gradient: 'from-amber-500 to-orange-500' },
            { label: 'Authorization Value', value: loading ? '-' : formatZAR(totalAuthorized), note: loading ? '-' : `${formatZAR(authShortfall)} shortfall`, gradient: 'from-teal-600 to-emerald-500' },
          ].map((card) => (
            <div key={card.label} className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${card.gradient} p-5 text-white shadow-md`}>
              <p className="text-2xl font-bold leading-none mb-1">{card.value}</p>
              <p className="text-xs font-semibold opacity-75">{card.label}</p>
              <p className="text-xs opacity-60 mt-0.5">{card.note}</p>
              <div className="absolute -right-3 -bottom-3 w-14 h-14 rounded-full bg-white/10" />
            </div>
          ))}
        </div>

        {notice && <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg"><p className="text-emerald-700">{notice}</p></div>}
        {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg"><p className="text-red-700">{error}</p></div>}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4 px-6"><CardTitle className="text-base">Import Bank Statement Line</CardTitle><CardDescription className="text-xs">Match incoming bank payments to invoices and record them immediately.</CardDescription></CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleBankSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label htmlFor="statement_date">Statement date</Label><Input id="statement_date" type="date" value={bankForm.statement_date} onChange={(e) => setBankForm((c) => ({ ...c, statement_date: e.target.value }))} /></div>
                  <div className="space-y-2"><Label htmlFor="amount">Amount</Label><Input id="amount" type="number" step="0.01" value={bankForm.amount} onChange={(e) => setBankForm((c) => ({ ...c, amount: e.target.value }))} placeholder="0.00" /></div>
                </div>
                <div className="space-y-2"><Label htmlFor="description">Description</Label><Input id="description" value={bankForm.description} onChange={(e) => setBankForm((c) => ({ ...c, description: e.target.value }))} placeholder="Bank statement narration" /></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label htmlFor="reference">Reference</Label><Input id="reference" value={bankForm.reference} onChange={(e) => setBankForm((c) => ({ ...c, reference: e.target.value }))} placeholder="Payment reference" /></div>
                  <div className="space-y-2"><Label htmlFor="bank_account">Bank account</Label><Input id="bank_account" value={bankForm.bank_account} onChange={(e) => setBankForm((c) => ({ ...c, bank_account: e.target.value }))} placeholder="Clinic bank account" /></div>
                </div>
                <div className="space-y-2"><Label htmlFor="notes">Notes</Label><Textarea id="notes" value={bankForm.notes} onChange={(e) => setBankForm((c) => ({ ...c, notes: e.target.value }))} placeholder="Optional note" /></div>
                <Button type="submit" disabled={Boolean(submitting)} className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 border-0 shadow-md">{submitting === 'import_statement_line' ? 'Importing...' : 'Import and Match'}</Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4 px-6"><CardTitle className="text-base">Create Deposit or Cancellation Fee Invoice</CardTitle><CardDescription className="text-xs">Issue special invoices without leaving accounts.</CardDescription></CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleSpecialSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="kind">Invoice type</Label>
                    <select id="kind" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={specialForm.kind} onChange={(e) => setSpecialForm((c) => ({ ...c, kind: e.target.value as SpecialInvoiceKind }))}>
                      <option value="deposit">Deposit</option>
                      <option value="cancellation_fee">Cancellation fee</option>
                    </select>
                  </div>
                  <div className="space-y-2"><Label htmlFor="due_date">Due date</Label><Input id="due_date" type="date" value={specialForm.due_date} onChange={(e) => setSpecialForm((c) => ({ ...c, due_date: e.target.value }))} /></div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="patient_id">Patient</Label>
                  <select id="patient_id" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={specialForm.patient_id} onChange={(e) => { const selected = patients.find((p) => p.id === e.target.value); setSpecialForm((c) => ({ ...c, patient_id: e.target.value, patient_name: selected?.label || '' })); }}>
                    <option value="">Select a patient</option>
                    {patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.label}</option>)}
                  </select>
                </div>
                <div className="space-y-2"><Label htmlFor="patient_name">Patient name</Label><Input id="patient_name" value={specialForm.patient_name} onChange={(e) => setSpecialForm((c) => ({ ...c, patient_name: e.target.value }))} placeholder="Patient name" /></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label htmlFor="special_amount">Amount</Label><Input id="special_amount" type="number" step="0.01" value={specialForm.amount} onChange={(e) => setSpecialForm((c) => ({ ...c, amount: e.target.value }))} placeholder="0.00" /></div>
                  <div className="space-y-2"><Label htmlFor="description_special">Description</Label><Input id="description_special" value={specialForm.description} onChange={(e) => setSpecialForm((c) => ({ ...c, description: e.target.value }))} placeholder="Deposit or cancellation description" /></div>
                </div>
                <Button type="submit" disabled={Boolean(submitting)} className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 border-0 shadow-md">{submitting === 'create_special_invoice' ? 'Creating...' : 'Create Special Invoice'}</Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4 px-6"><CardTitle className="text-base">Payment Reminder Queue</CardTitle><CardDescription>{loading ? 'Loading...' : `${reminderQueue.length} reminders due from the day 1 / 3 / 7 / 14 / 21 schedule`}</CardDescription></CardHeader>
          <CardContent>
            {loading ? <div className="text-center py-8"><p className="text-slate-600">Loading reminders...</p></div> : reminderQueue.length > 0 ? (
              <div className="overflow-x-auto"><table className="w-full"><thead className="border-b-2 border-slate-200"><tr><th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-400">Invoice</th><th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-400">Patient</th><th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-400">Day</th><th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-400">Overdue</th><th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-400">Outstanding</th><th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-400">Actions</th></tr></thead><tbody>{reminderQueue.map((item) => <tr key={`${item.invoice_id}-${item.reminder_day}`} className="border-b border-slate-100 hover:bg-blue-50/40 transition-colors"><td className="py-3 px-4 font-medium text-slate-900">{item.invoice_number}</td><td className="py-3 px-4 text-slate-600">{item.patient_name}</td><td className="py-3 px-4 text-slate-600">Day {item.reminder_day}</td><td className="py-3 px-4 text-slate-600">{item.overdue_days} days</td><td className="py-3 px-4 text-slate-600">{formatZAR(item.outstanding_amount)}</td><td className="py-3 px-4"><Button variant="outline" size="sm" onClick={() => handleReminder(item)} disabled={Boolean(submitting)}>{submitting === 'log_reminder' ? 'Logging...' : 'Mark Sent'}</Button></td></tr>)}</tbody></table></div>
            ) : <div className="text-center py-8 text-slate-600">No reminders are due right now</div>}
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4 px-6"><CardTitle className="text-base">Recent Bank Statement Matches</CardTitle><CardDescription>{loading ? 'Loading...' : `${statementLines.length} imported statement lines`}</CardDescription></CardHeader>
          <CardContent>
            {loading ? <div className="text-center py-8"><p className="text-slate-600">Loading bank statement lines...</p></div> : statementLines.length > 0 ? (
              <div className="overflow-x-auto"><table className="w-full"><thead className="border-b-2 border-slate-200"><tr><th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-400">Date</th><th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-400">Description</th><th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-400">Amount</th><th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-400">Match</th><th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-400">Reason</th></tr></thead><tbody>{statementLines.map((line) => <tr key={line.id} className="border-b border-slate-100 hover:bg-blue-50/40 transition-colors"><td className="py-3 px-4 text-slate-600">{formatDateSA(line.statement_date)}</td><td className="py-3 px-4 text-slate-900">{line.description}</td><td className="py-3 px-4 text-slate-600">{formatZAR(line.amount)}</td><td className="py-3 px-4 text-slate-600">{line.matched_invoice_number || 'Unmatched'} ({line.match_confidence})</td><td className="py-3 px-4 text-slate-600">{line.match_reason}</td></tr>)}</tbody></table></div>
            ) : <div className="text-center py-8 text-slate-600">No bank statement lines imported yet</div>}
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4 px-6"><CardTitle className="text-base">Medical Aid Authorizations</CardTitle><CardDescription>{loading ? 'Loading...' : `${authorizations.length} authorizations`}</CardDescription></CardHeader>
          <CardContent>
            {loading ? <div className="text-center py-8"><p className="text-slate-600">Loading authorizations...</p></div> : <div className="overflow-x-auto"><table className="w-full"><thead className="border-b-2 border-slate-200"><tr><th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-400">Procedure</th><th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-400">Patient</th><th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-400">Scheme</th><th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-400">Auth Ref</th><th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-400">Status</th><th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-400">Shortfall</th></tr></thead><tbody>{authorizations.length > 0 ? authorizations.map((authorization) => <tr key={authorization.id} className="border-b border-slate-100 hover:bg-blue-50/40 transition-colors"><td className="py-3 px-4 font-medium text-slate-900">{authorization.procedure_name}</td><td className="py-3 px-4 text-slate-600">{authorization.patient_name || authorization.patient_id}</td><td className="py-3 px-4 text-slate-600">{authorization.scheme_name || '-'}</td><td className="py-3 px-4 text-slate-600">{authorization.authorization_reference || '-'}</td><td className="py-3 px-4"><span className="text-xs font-semibold px-2 py-1 rounded bg-slate-100 text-slate-700">{authorization.status}</span></td><td className="py-3 px-4 text-slate-600">{formatZAR(calcAuthorizationShortfall(authorization))}</td></tr>) : <tr><td colSpan={6} className="py-8 text-center text-slate-600">No medical aid authorizations found</td></tr>}</tbody></table></div>}
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4 px-6"><CardTitle className="text-base">Invoices</CardTitle><CardDescription className="text-xs">{loading ? 'Loading...' : `${invoices.length} invoices, ${outstandingInvoices} need collection`}</CardDescription></CardHeader>
          <CardContent>
            {loading ? <div className="text-center py-8"><p className="text-slate-600">Loading invoices...</p></div> : <div className="overflow-x-auto"><table className="w-full"><thead className="border-b-2 border-slate-200"><tr><th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-400">Invoice #</th><th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-400">Patient</th><th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-400">Amount</th><th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-400">Paid</th><th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-400">Status</th><th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-400">Collection Flag</th><th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-400">Due Date</th></tr></thead><tbody>{invoices.length > 0 ? invoices.map((invoice) => { const balance = calcInvoiceShortfall(invoice); const collectionFlag = balance <= 0 ? 'Settled' : invoice.status === INVOICE_STATUS.PARTIALLY_PAID ? 'Partially paid' : 'Unpaid'; return <tr key={invoice.id} className="border-b border-slate-100 hover:bg-blue-50/40 transition-colors"><td className="py-3 px-4 font-medium text-slate-900">{invoice.invoice_number}</td><td className="py-3 px-4 text-slate-600">{invoice.patient_name || invoice.patient_id}</td><td className="py-3 px-4 font-medium text-slate-900">{formatZAR(Number(invoice.total_amount || 0))}</td><td className="py-3 px-4 text-slate-600">{formatZAR(Number(invoice.paid_amount || 0))}</td><td className="py-3 px-4"><span className={`text-xs font-semibold px-2 py-1 rounded ${statusColor(invoice.status || 'Issued')}`}>{invoice.status}</span></td><td className="py-3 px-4 text-slate-600">{collectionFlag}</td><td className="py-3 px-4 text-slate-600">{formatDateSA(invoice.due_date || invoice.invoice_date || '')}</td></tr>; }) : <tr><td colSpan={7} className="py-8 text-center text-slate-600">No invoices found</td></tr>}</tbody></table></div>}
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4 px-6"><CardTitle className="text-base">Medical Aid Claims</CardTitle><CardDescription className="text-xs">{loading ? 'Loading...' : `${claims.length} claims`}</CardDescription></CardHeader>
          <CardContent>
            {loading ? <div className="text-center py-8"><p className="text-slate-600">Loading claims...</p></div> : <div className="overflow-x-auto"><table className="w-full"><thead className="border-b-2 border-slate-200"><tr><th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-400">Claim #</th><th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-400">Patient</th><th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-400">Claimed</th><th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-400">Approved</th><th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-400">Status</th><th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-400">Date</th></tr></thead><tbody>{claims.length > 0 ? claims.map((claim) => <tr key={claim.id} className="border-b border-slate-100 hover:bg-blue-50/40 transition-colors"><td className="py-3 px-4 font-medium text-slate-900">{claim.claim_number}</td><td className="py-3 px-4 text-slate-600">{claim.patient_name}</td><td className="py-3 px-4 text-slate-600">{formatZAR(Number(claim.amount_claimed || 0))}</td><td className="py-3 px-4 text-slate-600">{claim.amount_approved == null ? '-' : formatZAR(Number(claim.amount_approved))}</td><td className="py-3 px-4"><span className={`text-xs font-semibold px-2 py-1 rounded ${claim.status === CLAIM_STATUS.APPROVED ? 'bg-green-100 text-green-700' : claim.status === CLAIM_STATUS.REJECTED ? 'bg-red-100 text-red-700' : claim.status === CLAIM_STATUS.PAID ? 'bg-slate-400 text-white' : 'bg-amber-100 text-amber-700'}`}>{claim.status}</span></td><td className="py-3 px-4 text-slate-600">{formatDateSA(claim.claim_date)}</td></tr>) : <tr><td colSpan={6} className="py-8 text-center text-slate-600">No medical aid claims found</td></tr>}</tbody></table></div>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function AccountsPage() {
  return <DashboardLayout><AccountsContent /></DashboardLayout>;
}
