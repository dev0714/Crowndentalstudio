'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateSA } from '@/lib/sa-formatting';

type TimelineEntry = {
  id: string;
  label: string;
  description: string;
  event_at: string;
  patient_name?: string;
  source?: string;
};

export function PatientAuditTimeline({ patientId }: { patientId: string }) {
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch(`/api/crm/operations?patientId=${patientId}`, { credentials: 'include' });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(body.error || 'Failed to load patient timeline');
        }
        setEntries(body.data?.patientTimeline || []);
      } catch (error) {
        console.error('[patient-audit-timeline] Failed to load:', error);
      } finally {
        setLoading(false);
      }
    };

    if (patientId) {
      load();
    }
  }, [patientId]);

  return (
    <Card className="border border-slate-200 shadow-lg">
      <CardHeader>
        <CardTitle>Audit Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-slate-600 py-6 text-center">Loading timeline...</p>
        ) : entries.length > 0 ? (
          <div className="space-y-3">
            {entries.slice(0, 8).map((entry) => (
              <div key={entry.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-slate-900">{entry.label}</p>
                    <p className="text-sm text-slate-600">{entry.description || entry.source || 'Timeline event'}</p>
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
  );
}
