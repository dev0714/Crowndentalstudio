'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateSA } from '@/lib/sa-formatting';
import { PaginationFooter } from '@/components/pagination-footer';
import { describeRange, sliceForPage } from '@/lib/pagination';

type RecallKind = 'routine-recall' | 'treatment-review' | 'procedure-review' | 'lab-follow-up';

type RecallQueueItem = {
  id: string;
  kind: RecallKind;
  patient_id: string;
  patient_name: string;
  source_id: string;
  source_label: string;
  due_date: string;
  last_activity_date: string;
  days_overdue: number;
  priority: 'high' | 'medium' | 'low';
  reason: string;
};

type RecallQueue = {
  items: RecallQueueItem[];
  summary: {
    total: number;
    routine: number;
    treatment: number;
    procedures: number;
    lab: number;
    overdue: number;
    booked?: number;
  };
};

const KIND_LABEL: Record<RecallKind, string> = {
  'routine-recall': 'Routine recall',
  'treatment-review': 'Treatment review',
  'procedure-review': 'Procedure review',
  'lab-follow-up': 'Lab follow-up',
};

const KIND_CHIP: Record<RecallKind, string> = {
  'routine-recall': 'bg-navy-800 text-white',
  'treatment-review': 'bg-teal text-white',
  'procedure-review': 'bg-[#b8742e] text-white',
  'lab-follow-up': 'bg-[#3f4c7a] text-white',
};

const PRIORITY_CHIP: Record<'high' | 'medium' | 'low', string> = {
  high: 'bg-red-50 text-red-700 border-red-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  low: 'bg-slate-50 text-slate-600 border-slate-200',
};

function RecallsContent() {
  const [queue, setQueue] = useState<RecallQueue | null>(null);
  const [loading, setLoading] = useState(true);
  const [schedulingId, setSchedulingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [kindFilter, setKindFilter] = useState<RecallKind | 'all'>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const loadQueue = async () => {
    const response = await fetch('/api/crm/recalls', { credentials: 'include' });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload.error || 'Failed to load recall queue');
    }

    setQueue(payload.data || null);
  };

  useEffect(() => {
    const run = async () => {
      try {
        await loadQueue();
      } catch (err) {
        console.error('[v0] Error fetching recall queue:', err);
        setError(err instanceof Error ? err.message : 'Failed to load recall queue');
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  const scheduleRecall = async (item: RecallQueueItem) => {
    try {
      setSchedulingId(item.id);
      const response = await fetch('/api/crm/recalls', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: item.patient_id,
          kind: item.kind,
          due_date: item.due_date ? item.due_date.slice(0, 10) : new Date().toISOString().slice(0, 10),
          notes: `Scheduled from ${item.kind.replace('-', ' ')} queue`,
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to schedule recall');
      }

      await loadQueue();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to schedule recall');
    } finally {
      setSchedulingId(null);
    }
  };

  const allItems = queue?.items || [];
  const items = kindFilter === 'all' ? allItems : allItems.filter((item) => item.kind === kindFilter);
  const { pageCount } = describeRange(page, pageSize, items.length);
  const currentPage = Math.min(page, pageCount);
  const visibleItems = sliceForPage<RecallQueueItem>(items, currentPage, pageSize);
  const changeKind = (kind: RecallKind | 'all') => {
    setKindFilter(kind);
    setPage(1);
  };
  const changePageSize = (size: number) => {
    setPageSize(size);
    setPage(1);
  };
  const kindCounts: Array<{ kind: RecallKind | 'all'; label: string; count: number }> = [
    { kind: 'all', label: 'All', count: allItems.length },
    { kind: 'routine-recall', label: KIND_LABEL['routine-recall'], count: queue?.summary.routine ?? 0 },
    { kind: 'treatment-review', label: KIND_LABEL['treatment-review'], count: queue?.summary.treatment ?? 0 },
    { kind: 'procedure-review', label: KIND_LABEL['procedure-review'], count: queue?.summary.procedures ?? 0 },
    { kind: 'lab-follow-up', label: KIND_LABEL['lab-follow-up'], count: queue?.summary.lab ?? 0 },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Recalls & Treatment Reviews</h1>
            <p className="text-slate-500 text-sm mt-0.5">Track routine recalls, treatment reviews, and procedure follow-ups</p>
          </div>
          <Button asChild className="bg-navy-800 hover:bg-ink border-0 shadow-md text-xs">
            <Link href="/patients">Open Patients</Link>
          </Button>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {[
            { label: 'Total Queue', value: queue?.summary.total ?? 0, gradient: 'from-navy-800 to-ink' },
            { label: 'Routine Recalls', value: queue?.summary.routine ?? 0, gradient: 'from-[#3f4c7a] to-[#2c365c]' },
            { label: 'Treatment Reviews', value: queue?.summary.treatment ?? 0, gradient: 'from-teal to-[#0b6f71]' },
            { label: 'Procedure Reviews', value: queue?.summary.procedures ?? 0, gradient: 'from-[#b8742e] to-[#8f5a22]' },
            { label: 'Lab Follow-ups', value: queue?.summary.lab ?? 0, gradient: 'from-[#5b6b7f] to-[#3b4653]' },
            { label: 'Overdue', value: queue?.summary.overdue ?? 0, gradient: 'from-[#9f2f2f] to-[#6f1d1d]' },
          ].map((stat) => (
            <div key={stat.label} className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${stat.gradient} p-5 text-white shadow-md`}>
              <p className="text-3xl font-bold leading-none mb-1">{loading ? '-' : stat.value}</p>
              <p className="text-xs font-semibold opacity-75">{stat.label}</p>
              <div className="absolute -right-3 -bottom-3 w-14 h-14 rounded-full bg-white/10" />
            </div>
          ))}
        </div>

        <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4 px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base">Recall Queue</CardTitle>
                <CardDescription className="text-xs">
                  {loading
                    ? 'Loading...'
                    : `${allItems.length} ready to action${queue?.summary.booked ? ` · ${queue.summary.booked} already booked in` : ''}`}
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {kindCounts.map((entry) => (
                  <button
                    key={entry.kind}
                    type="button"
                    onClick={() => changeKind(entry.kind)}
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-colors ${
                      kindFilter === entry.kind ? 'bg-ink text-white border-ink' : 'bg-white text-slate-600 border-slate-200 hover:border-teal/40'
                    }`}
                  >
                    {entry.label} ({entry.count})
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-slate-600 py-8 text-center">Loading recall queue...</p>
            ) : visibleItems.length > 0 ? (
              <div className="space-y-3">
                {visibleItems.map((item) => (
                  <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-4 hover:border-teal/30 transition-colors">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap gap-1.5 items-center mb-2">
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${KIND_CHIP[item.kind]}`}>
                            {KIND_LABEL[item.kind]}
                          </span>
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${PRIORITY_CHIP[item.priority]}`}>
                            {item.priority} priority
                          </span>
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${item.days_overdue > 0 ? 'bg-red-50 text-red-600 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                            {item.days_overdue > 0 ? `${item.days_overdue}d overdue` : 'Due now'}
                          </span>
                        </div>
                        <p className="font-semibold text-ink">
                          <Link href={`/patients/${item.patient_id}`} className="hover:text-teal hover:underline">
                            {item.patient_name}
                          </Link>
                        </p>
                        <p className="text-sm text-slate-600 mt-1">{item.reason}</p>
                        <p className="text-xs text-slate-500 mt-2">
                          {item.source_label}
                          {item.last_activity_date ? ` · last activity ${formatDateSA(item.last_activity_date)}` : ''}
                          {item.due_date ? ` · due ${formatDateSA(item.due_date)}` : ''}
                        </p>
                      </div>
                      <Button
                        onClick={() => scheduleRecall(item)}
                        className="bg-navy-800 hover:bg-ink border-0 shadow-sm text-xs w-full sm:w-auto"
                        disabled={schedulingId === item.id}
                      >
                        {schedulingId === item.id ? 'Scheduling...' : 'Schedule Follow-up'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-600 py-8 text-center">
                {kindFilter === 'all' ? 'No recalls or reviews are currently due' : `No ${KIND_LABEL[kindFilter as RecallKind].toLowerCase()} items are due`}
              </p>
            )}
            {!loading && (
              <PaginationFooter
                page={currentPage}
                pageSize={pageSize}
                count={items.length}
                onPageChange={setPage}
                onPageSizeChange={changePageSize}
                noun="items"
                className="-mx-6 -mb-6 mt-4"
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function RecallsPage() {
  return (
    <DashboardLayout>
      <RecallsContent />
    </DashboardLayout>
  );
}
