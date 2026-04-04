'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateSA } from '@/lib/sa-formatting';

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
  };
};

function RecallsContent() {
  const [queue, setQueue] = useState<RecallQueue | null>(null);
  const [loading, setLoading] = useState(true);
  const [schedulingId, setSchedulingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const items = queue?.items || [];

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Recalls & Treatment Reviews</h1>
            <p className="text-slate-500 text-sm mt-0.5">Track routine recalls, treatment reviews, and procedure follow-ups</p>
          </div>
          <Button asChild className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 border-0 shadow-md text-xs">
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
            { label: 'Total Queue', value: queue?.summary.total ?? 0, gradient: 'from-blue-600 to-cyan-500' },
            { label: 'Routine Recalls', value: queue?.summary.routine ?? 0, gradient: 'from-violet-600 to-purple-500' },
            { label: 'Treatment Reviews', value: queue?.summary.treatment ?? 0, gradient: 'from-emerald-600 to-teal-500' },
            { label: 'Procedure Reviews', value: queue?.summary.procedures ?? 0, gradient: 'from-amber-500 to-orange-500' },
            { label: 'Lab Follow-ups', value: queue?.summary.lab ?? 0, gradient: 'from-cyan-600 to-blue-500' },
            { label: 'Overdue', value: queue?.summary.overdue ?? 0, gradient: 'from-rose-600 to-pink-500' },
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
            <CardTitle className="text-base">Recall Queue</CardTitle>
            <CardDescription className="text-xs">{loading ? 'Loading...' : `${items.length} items ready to action`}</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-slate-600 py-8 text-center">Loading recall queue...</p>
            ) : items.length > 0 ? (
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-4 hover:border-blue-200 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex flex-wrap gap-2 items-center mb-2">
                          <span className="text-xs font-semibold px-2 py-1 rounded-full bg-blue-600 text-white">
                            {item.kind.replace('-', ' ')}
                          </span>
                          <span
                            className={`text-xs font-semibold px-2 py-1 rounded ${
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
                        <p className="text-sm text-slate-600 mt-1">{item.reason}</p>
                        <p className="text-sm text-slate-500 mt-2">
                          Last activity: {formatDateSA(item.last_activity_date)} | Due: {formatDateSA(item.due_date)}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {item.source_label} | {item.days_overdue > 0 ? `${item.days_overdue} days overdue` : 'Due now'}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Button
                          onClick={() => scheduleRecall(item)}
                          className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 border-0 shadow-sm text-xs"
                          disabled={schedulingId === item.id}
                        >
                          {schedulingId === item.id ? 'Scheduling...' : 'Schedule Follow-up'}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-600 py-8 text-center">No recalls or treatment reviews are currently due</p>
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
