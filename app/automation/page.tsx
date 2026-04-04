'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { formatDateSA } from '@/lib/sa-formatting';
import type { AutomationQueue, AutomationQueueItem } from '@/lib/automation/automation-queue';
import type { AutomationEventFeed } from '@/lib/automation/automation-events';

const CONTACT_TYPES = ['call', 'email', 'sms', 'whatsapp', 'in_person'] as const;

type AutomationPageData = {
  queue: AutomationQueue;
  events: AutomationEventFeed;
};

type OutreachFormState = {
  contact_type: (typeof CONTACT_TYPES)[number];
  notes: string;
  outcome: string;
  source_kind: string;
  source_id: string;
};

function defaultFormState(item: AutomationQueueItem): OutreachFormState {
  return {
    contact_type: item.suggested_contact_type,
    notes: item.reason,
    outcome: item.suggested_outcome,
    source_kind: item.kind,
    source_id: item.id,
  };
}

function AutomationContent() {
  const [automation, setAutomation] = useState<AutomationPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [formState, setFormState] = useState<OutreachFormState | null>(null);

  const queue = automation?.queue || null;
  const events = automation?.events || null;
  const items = queue?.items || [];

  const loadQueue = async () => {
    const response = await fetch('/api/crm/automation', { credentials: 'include' });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload.error || 'Failed to load automation queue');
    }

    setAutomation(payload.data || null);
  };

  useEffect(() => {
    const run = async () => {
      try {
        await loadQueue();
      } catch (err) {
        console.error('[automation] Error fetching queue:', err);
        setError(err instanceof Error ? err.message : 'Failed to load automation queue');
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  const priorityCards = useMemo(
    () => [
      { label: 'Total Actions', value: queue?.summary.total ?? 0 },
      { label: 'High Priority', value: queue?.summary.high ?? 0 },
      { label: 'Medium Priority', value: queue?.summary.medium ?? 0 },
      { label: 'Low Priority', value: queue?.summary.low ?? 0 },
    ],
    [queue],
  );

  const categoryCards = useMemo(
    () => [
      { label: 'Recalls', value: queue?.summary.recalls ?? 0 },
      { label: 'Appointment Confirmations', value: queue?.summary.confirmations ?? 0 },
      { label: 'Compliance Gaps', value: queue?.summary.compliance ?? 0 },
      { label: 'Outreach Gaps', value: queue?.summary.outreach_gaps ?? 0 },
    ],
    [queue],
  );

  const eventCards = useMemo(
    () => [
      { label: 'Automation Events', value: events?.summary.total ?? 0 },
      { label: 'Inbound', value: events?.summary.inbound ?? 0 },
      { label: 'Outbound', value: events?.summary.outbound ?? 0 },
      { label: 'Resolved', value: events?.summary.resolved ?? 0 },
    ],
    [events],
  );

  const openForm = (item: AutomationQueueItem) => {
    setActiveItemId(item.id);
    setFormState(defaultFormState(item));
    setError(null);
  };

  const closeForm = () => {
    setActiveItemId(null);
    setFormState(null);
  };

  const updateFormState = (field: keyof OutreachFormState, value: string) => {
    setFormState((current) => (current ? { ...current, [field]: value } : current));
  };

  const submitOutreach = async (item: AutomationQueueItem) => {
    if (!formState) {
      return;
    }

    try {
      setSubmittingId(item.id);
      const response = await fetch('/api/crm/automation', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patient_id: item.patient_id,
            patient_name: item.patient_name,
            contact_type: formState.contact_type,
            notes: formState.notes,
            outcome: formState.outcome,
            source_kind: formState.source_kind,
            source_id: formState.source_id,
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to log outreach');
      }

      await loadQueue();
      closeForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log outreach');
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Automation Inbox</h1>
            <p className="text-slate-500 text-sm mt-0.5">Daily follow-up work pulled from recalls, appointments, and compliance gaps</p>
          </div>
          <Button asChild className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 border-0 shadow-md text-xs">
            <Link href="/patients">Open Patients</Link>
          </Button>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {priorityCards.map((card, i) => {
            const gradients = ['from-blue-600 to-cyan-500','from-rose-600 to-pink-500','from-amber-500 to-orange-500','from-emerald-600 to-teal-500'];
            return (
              <div key={card.label} className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradients[i % 4]} p-5 text-white shadow-md`}>
                <p className="text-3xl font-bold leading-none mb-1">{loading ? '-' : card.value}</p>
                <p className="text-xs font-semibold opacity-75">{card.label}</p>
                <div className="absolute -right-3 -bottom-3 w-14 h-14 rounded-full bg-white/10" />
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {categoryCards.map((card, i) => {
            const gradients = ['from-violet-600 to-purple-500','from-cyan-600 to-blue-500','from-teal-600 to-emerald-500','from-slate-600 to-slate-800'];
            return (
              <div key={card.label} className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradients[i % 4]} p-5 text-white shadow-md`}>
                <p className="text-3xl font-bold leading-none mb-1">{loading ? '-' : card.value}</p>
                <p className="text-xs font-semibold opacity-75">{card.label}</p>
                <div className="absolute -right-3 -bottom-3 w-14 h-14 rounded-full bg-white/10" />
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {eventCards.map((card, i) => {
            const gradients = ['from-blue-600 to-indigo-500','from-emerald-600 to-green-500','from-amber-600 to-yellow-500','from-rose-600 to-red-500'];
            return (
              <div key={card.label} className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradients[i % 4]} p-5 text-white shadow-md`}>
                <p className="text-3xl font-bold leading-none mb-1">{loading ? '-' : card.value}</p>
                <p className="text-xs font-semibold opacity-75">{card.label}</p>
                <div className="absolute -right-3 -bottom-3 w-14 h-14 rounded-full bg-white/10" />
              </div>
            );
          })}
        </div>

        <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4 px-6">
            <CardTitle className="text-base">Action Queue</CardTitle>
            <CardDescription className="text-xs">{loading ? 'Loading...' : `${items.length} actions ready to review`}</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="py-8 text-center text-slate-600">Loading automation queue...</p>
            ) : items.length > 0 ? (
              <div className="space-y-4">
                {items.map((item) => {
                  const isActive = activeItemId === item.id;
                  return (
                    <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-4 hover:border-blue-200 transition-colors">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className="rounded bg-slate-900 px-2 py-1 text-xs font-semibold text-white">
                              {item.kind.replace('-', ' ')}
                            </span>
                            <span
                              className={`rounded px-2 py-1 text-xs font-semibold ${
                                item.priority === 'high'
                                  ? 'bg-red-100 text-red-700'
                                  : item.priority === 'medium'
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-blue-100 text-blue-700'
                              }`}
                            >
                              {item.priority} priority
                            </span>
                          </div>
                          <p className="font-semibold text-slate-900">
                            <Link href={`/patients/${item.patient_id}`} className="hover:underline">
                              {item.patient_name}
                            </Link>
                          </p>
                          <p className="text-sm text-slate-600 mt-1">{item.title}</p>
                          <p className="text-sm text-slate-600">{item.reason}</p>
                          <p className="text-sm text-slate-500 mt-2">
                            Source: {item.source} | Due: {formatDateSA(item.due_date)}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">Suggested: {item.suggested_contact_type} | {item.suggested_outcome}</p>
                        </div>

                        <div className="flex flex-col items-start gap-2 lg:items-end">
                          <Button
                            onClick={() => openForm(item)}
                            className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 border-0 shadow-sm text-xs"
                            disabled={submittingId === item.id}
                          >
                            Log outreach
                          </Button>
                        </div>
                      </div>

                      {isActive && formState && (
                        <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <label className="space-y-2">
                              <span className="text-sm font-medium text-slate-700">Contact type</span>
                              <select
                                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                                value={formState.contact_type}
                                onChange={(event) => updateFormState('contact_type', event.target.value)}
                              >
                                {CONTACT_TYPES.map((type) => (
                                  <option key={type} value={type}>
                                    {type}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="space-y-2">
                              <span className="text-sm font-medium text-slate-700">Outcome</span>
                              <Input
                                value={formState.outcome}
                                onChange={(event) => updateFormState('outcome', event.target.value)}
                                placeholder="e.g. Left voicemail"
                              />
                            </label>
                          </div>

                          <div className="mt-4 grid grid-cols-1 gap-4">
                            <label className="space-y-2">
                              <span className="text-sm font-medium text-slate-700">Notes</span>
                              <Textarea
                                value={formState.notes}
                                onChange={(event) => updateFormState('notes', event.target.value)}
                                rows={4}
                              />
                            </label>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            <Button
                              onClick={() => submitOutreach(item)}
                              className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 border-0 shadow-sm"
                              disabled={submittingId === item.id}
                            >
                              {submittingId === item.id ? 'Saving...' : 'Save outreach'}
                            </Button>
                            <Button variant="outline" onClick={closeForm} disabled={submittingId === item.id}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="py-8 text-center text-slate-600">No automation items are currently due</p>
            )}
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4 px-6">
            <CardTitle className="text-base">Automation Feed</CardTitle>
            <CardDescription className="text-xs">{loading ? 'Loading...' : `${events?.items.length ?? 0} recent automation events`}</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="py-8 text-center text-slate-600">Loading automation feed...</p>
            ) : (events?.items.length ?? 0) > 0 ? (
              <div className="space-y-3">
                {events?.items.map((event) => (
                  <div key={event.id} className="rounded-lg border border-slate-200 bg-white p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded bg-slate-900 px-2 py-1 text-xs font-semibold text-white">{event.channel_label}</span>
                      <span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{event.direction_label}</span>
                      <span className="rounded bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">{event.status_label}</span>
                    </div>
                    <div className="mt-3 flex flex-col gap-1">
                      <p className="font-semibold text-slate-900">
                        {event.patient_name}
                      </p>
                      <p className="text-sm text-slate-700">{event.title}</p>
                      {event.message ? <p className="text-sm text-slate-600">{event.message}</p> : null}
                      <p className="text-xs text-slate-500">
                        Source: {event.source_system}
                        {event.source_kind ? ` | ${event.source_kind}` : ''}
                        {event.source_id ? ` | ${event.source_id}` : ''}
                        {' | '}
                        {formatDateSA(event.occurred_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-slate-600">No automation events have been logged yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function AutomationPage() {
  return (
    <DashboardLayout>
      <AutomationContent />
    </DashboardLayout>
  );
}
