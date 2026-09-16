'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, CheckCircle2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { WorkItemRow } from '@/components/work-calendar';
import type { WorkItem } from '@/lib/dashboard/work-calendar';

const MAX_SHOWN = 8;

/** Top-bar bell: a live count of work past its date, with the newest items in a dropdown. */
export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<WorkItem[] | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/crm/dashboard', { credentials: 'include' });
      const payload = await response.json().catch(() => ({}));
      if (response.ok) {
        setItems((payload.data?.calendar?.outstanding as WorkItem[] | undefined) || []);
      }
    } catch {
      /* the bell is best-effort; a failed refresh keeps the last list */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const count = items?.length ?? 0;

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) load();
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={count > 0 ? `${count} items past due` : 'Notifications'}
          className="relative p-2 text-muted-ink hover:text-ink hover:bg-cream rounded-full transition-colors"
        >
          <Bell className="w-[1.1rem] h-[1.1rem]" />
          {count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
              {count > 99 ? '99+' : count}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-[360px] max-w-[calc(100vw-1.5rem)] p-0 rounded-2xl border-slate-200 shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/60">
          <div>
            <p className="text-sm font-semibold text-ink">Needs attention</p>
            <p className="text-[11px] text-slate-500">
              {items == null || loading ? 'Checking…' : count === 0 ? 'Nothing is past its date' : `${count} item${count === 1 ? '' : 's'} past due`}
            </p>
          </div>
          <Link href="/dashboard" onClick={() => setOpen(false)} className="text-[11px] font-semibold text-teal hover:text-ink">
            Dashboard →
          </Link>
        </div>
        {count > 0 ? (
          <div className="divide-y divide-slate-50 max-h-[60vh] overflow-y-auto" onClick={() => setOpen(false)}>
            {(items || []).slice(0, MAX_SHOWN).map((item) => (
              <WorkItemRow key={item.id} item={item} showDate />
            ))}
            {count > MAX_SHOWN && (
              <Link href="/dashboard" className="block px-4 py-2.5 text-center text-[12px] font-semibold text-teal hover:bg-cream/60">
                See all {count} on the dashboard
              </Link>
            )}
          </div>
        ) : (
          items != null && (
            <div className="px-4 py-6 flex items-center gap-2 text-xs text-emerald-700">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              All lab work, invoices and recalls are on time
            </div>
          )
        )}
      </PopoverContent>
    </Popover>
  );
}
