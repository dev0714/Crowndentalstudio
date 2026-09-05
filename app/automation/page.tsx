'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDateSA } from '@/lib/sa-formatting';
import { PaginationFooter } from '@/components/pagination-footer';
import { describeRange, sliceForPage } from '@/lib/pagination';
import type { AutomationQueue, AutomationQueueItem } from '@/lib/automation/automation-queue';
import type { AutomationEventFeed } from '@/lib/automation/automation-events';

const CONTACT_TYPES = ['call', 'email', 'sms', 'whatsapp', 'in_person'] as const;

type KindGroup = 'all' | 'recalls' | 'confirmations' | 'compliance' | 'outreach';
type PriorityFilter = 'all' | 'high' | 'medium' | 'low';

const KIND_GROUP_OF: Record<string, KindGroup> = {
  'routine-recall': 'recalls',
  'treatment-review': 'recalls',
  'procedure-review': 'recalls',
  'lab-follow-up': 'recalls',
  'appointment-confirmation': 'confirmations',
  'missing-popia-consent': 'compliance',
  'missing-signed-consent': 'compliance',
  'outreach-gap': 'outreach',
};

const KIND_LABEL: Record<string, string> = {
  'routine-recall': 'Routine recall',
  'treatment-review': 'Treatment review',
  'procedure-review': 'Procedure review',
  'lab-follow-up': 'Lab follow-up',
  'appointment-confirmation': 'Appointment confirmation',
  'missing-popia-consent': 'POPIA consent',
  'missing-signed-consent': 'Signed consent',
  'outreach-gap': 'Outreach gap',
};

const GROUP_CHIP: Record<KindGroup, string> = {
  all: 'bg-ink text-white',
  recalls: 'bg-navy-800 text-white',
  confirmations: 'bg-teal text-white',
  compliance: 'bg-[#b8742e] text-white',
  outreach: 'bg-[#5b6b7f] text-white',
};

const PRIORITY_CHIP: Record<'high' | 'medium' | 'low', string> = {
  high: 'bg-red-50 text-red-700 border-red-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  low: 'bg-slate-50 text-slate-600 border-slate-200',
};

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
  const [groupFilter, setGroupFilter] = useState<KindGroup>('all');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [feedPage, setFeedPage] = useState(1);
  const [feedPageSize, setFeedPageSize] = useState(10);
  const [activeTab, setActiveTab] = useState<'queue' | 'feed'>('queue');

  const queue = automation?.queue || null;
  const events = automation?.events || null;
  const allItems = queue?.items || [];
  const items = allItems.filter(
    (item) =>
      (groupFilter === 'all' || KIND_GROUP_OF[item.kind] === groupFilter) &&
      (priorityFilter === 'all' || item.priority === priorityFilter),
  );
  const { pageCount } = describeRange(page, pageSize, items.length);
  const currentPage = Math.min(page, pageCount);
  const visibleItems = sliceForPage<AutomationQueueItem>(items, currentPage, pageSize);
  const feedItems = events?.items || [];
  const { pageCount: feedPageCount } = describeRange(feedPage, feedPageSize, feedItems.length);
  const currentFeedPage = Math.min(feedPage, feedPageCount);
  const visibleFeed = sliceForPage(feedItems, currentFeedPage, feedPageSize);

  const changeGroup = (group: KindGroup) => {
    setGroupFilter(group);
    setPage(1);
  };
  const changePriority = (priority: PriorityFilter) => {
    setPriorityFilter(priority);
    setPage(1);
  };
  const changePageSize = (size: number) => {
    setPageSize(size);
    setPage(1);
  };
  const changeFeedPageSize = (size: number) => {
    setFeedPageSize(size);
    setFeedPage(1);
  };

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
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Automation Inbox</h1>
            <p className="text-slate-500 text-sm mt-0.5">Daily follow-up work pulled from recalls, appointments, and compliance gaps</p>
          </div>
          <Button asChild className="bg-navy-800 hover:bg-ink border-0 shadow-md text-xs">
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
            const gradients = ['from-navy-800 to-ink', 'from-[#9f2f2f] to-[#6f1d1d]', 'from-[#b8742e] to-[#8f5a22]', 'from-[#5b6b7f] to-[#3b4653]'];
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
            const gradients = ['from-[#3f4c7a] to-[#2c365c]', 'from-teal to-[#0b6f71]', 'from-[#b8742e] to-[#8f5a22]', 'from-[#5b6b7f] to-[#3b4653]'];
            return (
              <div key={card.label} className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradients[i % 4]} p-5 text-white shadow-md`}>
                <p className="text-3xl font-bold leading-none mb-1">{loading ? '-' : card.value}</p>
                <p className="text-xs font-semibold opacity-75">{card.label}</p>
                <div className="absolute -right-3 -bottom-3 w-14 h-14 rounded-full bg-white/10" />
              </div>
            );
          })}
        </div>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'queue' | 'feed')}>
          <TabsList className="h-auto bg-white border border-slate-200 rounded-full p-1 gap-0.5 mb-3">
            <TabsTrigger value="queue" className="rounded-full px-4 py-1.5 text-xs font-semibold text-slate-500 data-[state=active]:bg-ink data-[state=active]:text-white data-[state=active]:shadow-none">
              Action queue
              <span className="ml-1.5 text-[10px] font-bold opacity-70">{loading ? '' : allItems.length}</span>
            </TabsTrigger>
            <TabsTrigger value="feed" className="rounded-full px-4 py-1.5 text-xs font-semibold text-slate-500 data-[state=active]:bg-ink data-[state=active]:text-white data-[state=active]:shadow-none">
              Automation feed
              <span className="ml-1.5 text-[10px] font-bold opacity-70">{loading ? '' : feedItems.length}</span>
            </TabsTrigger>
          </TabsList>

        <TabsContent value="queue">
        <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4 px-6">
            <div className="flex flex-col gap-3">
              <div>
                <CardTitle className="text-base">Action Queue</CardTitle>
                <CardDescription className="text-xs">
                  {loading ? 'Loading...' : items.length === allItems.length ? `${allItems.length} actions ready to review` : `${items.length} of ${allItems.length} actions`}
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {([
                  ['all', 'All', allItems.length],
                  ['recalls', 'Recalls', queue?.summary.recalls ?? 0],
                  ['confirmations', 'Confirmations', queue?.summary.confirmations ?? 0],
                  ['compliance', 'Compliance', queue?.summary.compliance ?? 0],
                  ['outreach', 'Outreach gaps', queue?.summary.outreach_gaps ?? 0],
                ] as Array<[KindGroup, string, number]>).map(([group, label, count]) => (
                  <button
                    key={group}
                    type="button"
                    onClick={() => changeGroup(group)}
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-colors ${
                      groupFilter === group ? 'bg-ink text-white border-ink' : 'bg-white text-slate-600 border-slate-200 hover:border-teal/40'
                    }`}
                  >
                    {label} ({count})
                  </button>
                ))}
                <span className="mx-1 h-4 w-px bg-slate-200 hidden sm:block" />
                {(['all', 'high', 'medium', 'low'] as PriorityFilter[]).map((priority) => (
                  <button
                    key={priority}
                    type="button"
                    onClick={() => changePriority(priority)}
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-colors ${
                      priorityFilter === priority ? 'bg-ink text-white border-ink' : 'bg-white text-slate-600 border-slate-200 hover:border-teal/40'
                    }`}
                  >
                    {priority === 'all' ? 'Any priority' : `${priority[0].toUpperCase()}${priority.slice(1)}`}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="py-8 text-center text-slate-600">Loading automation queue...</p>
            ) : visibleItems.length > 0 ? (
              <div className="space-y-4">
                {visibleItems.map((item) => {
                  const isActive = activeItemId === item.id;
                  return (
                    <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-4 hover:border-teal/30 transition-colors">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 mb-2">
                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${GROUP_CHIP[KIND_GROUP_OF[item.kind] || 'all']}`}>
                              {KIND_LABEL[item.kind] || item.kind.replace(/-/g, ' ')}
                            </span>
                            <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${PRIORITY_CHIP[item.priority]}`}>
                              {item.priority} priority
                            </span>
                            {item.days_overdue > 0 && (
                              <span className="rounded-full border px-2 py-0.5 text-[11px] font-semibold bg-red-50 text-red-600 border-red-200">
                                {item.days_overdue}d overdue
                              </span>
                            )}
                          </div>
                          <p className="font-semibold text-ink">
                            <Link href={`/patients/${item.patient_id}`} className="hover:text-teal hover:underline">
                              {item.patient_name}
                            </Link>
                          </p>
                          <p className="text-sm text-slate-700 mt-1">{item.title}</p>
                          <p className="text-sm text-slate-600">{item.reason}</p>
                          <p className="text-xs text-slate-500 mt-2">
                            {item.source}
                            {item.last_activity_date ? ` · last activity ${formatDateSA(item.last_activity_date)}` : ''}
                            {item.due_date ? ` · due ${formatDateSA(item.due_date)}` : ''}
                            {` · suggested ${item.suggested_contact_type.replace('_', ' ')}`}
                          </p>
                        </div>

                        <Button
                          onClick={() => (isActive ? closeForm() : openForm(item))}
                          variant={isActive ? 'outline' : 'default'}
                          className={`text-xs w-full sm:w-auto ${isActive ? 'border-slate-200' : 'bg-navy-800 hover:bg-ink border-0 shadow-sm'}`}
                          disabled={submittingId === item.id}
                        >
                          {isActive ? 'Cancel' : 'Log outreach'}
                        </Button>
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
                              className="bg-navy-800 hover:bg-ink border-0 shadow-sm"
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
              <p className="py-8 text-center text-slate-600">
                {allItems.length === 0 ? 'No automation items are currently due' : 'No actions match these filters'}
              </p>
            )}
            {!loading && (
              <PaginationFooter
                page={currentPage}
                pageSize={pageSize}
                count={items.length}
                onPageChange={setPage}
                onPageSizeChange={changePageSize}
                noun="actions"
                className="-mx-6 -mb-6 mt-4"
              />
            )}
          </CardContent>
        </Card>
        </TabsContent>

        <TabsContent value="feed">
        <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4 px-6">
            <CardTitle className="text-base">Automation Feed</CardTitle>
            <CardDescription className="text-xs">
              {loading
                ? 'Loading...'
                : `${events?.summary.total ?? 0} recent events · ${events?.summary.inbound ?? 0} inbound · ${events?.summary.outbound ?? 0} outbound · ${events?.summary.resolved ?? 0} resolved`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="py-8 text-center text-slate-600">Loading automation feed...</p>
            ) : (events?.items.length ?? 0) > 0 ? (
              <div className="space-y-3">
                {visibleFeed.map((event) => (
                  <div key={event.id} className="rounded-lg border border-slate-200 bg-white p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-navy-800 px-2 py-0.5 text-[11px] font-semibold text-white">{event.channel_label}</span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">{event.direction_label}</span>
                      <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">{event.status_label}</span>
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
            {!loading && feedItems.length > 0 && (
              <PaginationFooter
                page={currentFeedPage}
                pageSize={feedPageSize}
                count={feedItems.length}
                onPageChange={setFeedPage}
                onPageSizeChange={changeFeedPageSize}
                noun="events"
                className="-mx-6 -mb-6 mt-3"
              />
            )}
          </CardContent>
        </Card>
        </TabsContent>
        </Tabs>
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
