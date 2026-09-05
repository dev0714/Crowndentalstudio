'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { monthGrid, type WorkItem, type WorkItemKind } from '@/lib/dashboard/work-calendar';
import { formatZAR } from '@/lib/sa-formatting';

const KIND_LABEL: Record<WorkItemKind, string> = {
  appointment: 'Appointment',
  lab: 'Lab due',
  invoice: 'Invoice due',
  recall: 'Recall',
};

const KIND_DOT: Record<WorkItemKind, string> = {
  appointment: 'bg-navy-800',
  lab: 'bg-teal',
  invoice: 'bg-[#b8742e]',
  recall: 'bg-[#5b6b7f]',
};

const KIND_CHIP: Record<WorkItemKind, string> = {
  appointment: 'bg-navy-800/10 text-ink',
  lab: 'bg-teal-soft text-[#0b6f71]',
  invoice: 'bg-amber-50 text-[#8f5a22]',
  recall: 'bg-slate-100 text-slate-700',
};

const STATUS_CHIP: Record<WorkItem['status'], string> = {
  upcoming: 'bg-slate-50 text-slate-500 border-slate-200',
  due: 'bg-amber-50 text-amber-700 border-amber-200',
  overdue: 'bg-red-50 text-red-600 border-red-200',
  done: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  past: 'bg-slate-50 text-slate-400 border-slate-200',
};

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function prettyDay(key: string) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
}

/** One dated piece of work, used in the day panel and the outstanding list. */
export function WorkItemRow({ item, showDate = false }: { item: WorkItem; showDate?: boolean }) {
  return (
    <Link
      href={item.href}
      className="flex items-start gap-3 px-4 py-2.5 hover:bg-cream/60 transition-colors"
    >
      <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${KIND_DOT[item.kind]}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-ink truncate">{item.patient_name}</p>
        <p className="text-xs text-slate-600 truncate">
          {item.title}
          {item.amount != null ? ` · ${formatZAR(item.amount)}` : ''}
          {item.detail && item.kind !== 'recall' ? ` · ${item.detail}` : ''}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <span className="text-[11px] text-slate-500">
          {showDate ? item.date.slice(5).replace('-', '/') : ''}
          {item.time ? `${showDate ? ' ' : ''}${item.time}` : ''}
        </span>
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${STATUS_CHIP[item.status]}`}>
          {item.status === 'past' ? 'past' : item.status}
        </span>
      </div>
    </Link>
  );
}

export function WorkCalendar({ items, today, loading }: { items: WorkItem[]; today: string; loading: boolean }) {
  const [year, monthIndex] = useMemo(() => {
    const [y, m] = today.split('-').map(Number);
    return [y || new Date().getFullYear(), (m || new Date().getMonth() + 1) - 1];
  }, [today]);
  const [view, setView] = useState({ year, monthIndex });
  const [selected, setSelected] = useState(today);

  const byDay = useMemo<Record<string, WorkItem[]>>(() => {
    const map: Record<string, WorkItem[]> = {};
    items.forEach((item) => {
      (map[item.date] ||= []).push(item);
    });
    return map;
  }, [items]);

  const cells = useMemo<ReturnType<typeof monthGrid>>(() => monthGrid(view.year, view.monthIndex), [view]);
  const monthKey = `${view.year}-${String(view.monthIndex + 1).padStart(2, '0')}`;
  const monthItems = items.filter((item) => item.date.startsWith(monthKey));
  const monthOverdue = monthItems.filter((item) => item.status === 'overdue').length;
  const selectedItems: WorkItem[] = byDay[selected] || [];

  const shift = (delta: number) => {
    setView((current) => {
      const date = new Date(Date.UTC(current.year, current.monthIndex + delta, 1));
      return { year: date.getUTCFullYear(), monthIndex: date.getUTCMonth() };
    });
  };
  const goToday = () => {
    setView({ year, monthIndex });
    setSelected(today);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 sm:px-6 py-4 border-b border-slate-100">
        <div>
          <h2 className="font-bold text-slate-900 text-sm">Work calendar</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {loading ? 'Loading…' : `${monthItems.length} item${monthItems.length === 1 ? '' : 's'} this month${monthOverdue ? ` · ${monthOverdue} overdue` : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => shift(-1)} aria-label="Previous month" className="p-1.5 rounded-full border border-slate-200 text-slate-500 hover:text-ink hover:border-teal/40">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="min-w-[9.5rem] text-center text-sm font-semibold text-ink">{MONTHS[view.monthIndex]} {view.year}</span>
          <button type="button" onClick={() => shift(1)} aria-label="Next month" className="p-1.5 rounded-full border border-slate-200 text-slate-500 hover:text-ink hover:border-teal/40">
            <ChevronRight className="w-4 h-4" />
          </button>
          <button type="button" onClick={goToday} className="ml-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border border-slate-200 text-slate-600 hover:border-teal/40 hover:text-ink">
            Today
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 px-4 sm:px-6 py-2 border-b border-slate-100 bg-slate-50/60">
        {(Object.keys(KIND_LABEL) as WorkItemKind[]).map((kind) => (
          <span key={kind} className="inline-flex items-center gap-1.5 text-[11px] text-slate-500">
            <span className={`w-2 h-2 rounded-full ${KIND_DOT[kind]}`} />
            {KIND_LABEL[kind]}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5 text-[11px] text-red-600 ml-auto">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          Overdue
        </span>
      </div>

      {/* Grid */}
      <div className="px-2 sm:px-4 pt-3 pb-2">
        <div className="grid grid-cols-7 mb-1">
          {WEEKDAYS.map((day) => (
            <div key={day} className="text-center text-[10px] font-semibold uppercase tracking-wider text-slate-400 py-1">{day}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell) => {
            const dayItems: WorkItem[] = byDay[cell.key] || [];
            const overdue = dayItems.some((item) => item.status === 'overdue');
            const isToday = cell.key === today;
            const isSelected = cell.key === selected;
            return (
              <button
                key={cell.key}
                type="button"
                onClick={() => setSelected(cell.key)}
                className={`relative flex flex-col items-start rounded-lg border p-1 sm:p-1.5 min-h-[3.25rem] sm:min-h-[4.75rem] text-left transition-colors ${
                  isSelected ? 'border-teal bg-teal-soft/60' : overdue ? 'border-red-200 bg-red-50/40 hover:bg-red-50' : 'border-slate-100 hover:bg-cream/60'
                } ${cell.inMonth ? '' : 'opacity-40'}`}
              >
                <span className={`text-[11px] font-semibold w-5 h-5 flex items-center justify-center rounded-full ${isToday ? 'bg-ink text-white' : 'text-slate-600'}`}>
                  {cell.day}
                </span>
                {/* Phones: dots. Larger screens: up to two chips plus a count. */}
                {dayItems.length > 0 && (
                  <>
                    <span className="flex sm:hidden flex-wrap gap-0.5 mt-1">
                      {dayItems.slice(0, 4).map((item) => (
                        <span key={item.id} className={`w-1.5 h-1.5 rounded-full ${item.status === 'overdue' ? 'bg-red-500' : KIND_DOT[item.kind]}`} />
                      ))}
                    </span>
                    <span className="hidden sm:flex flex-col gap-0.5 mt-1 w-full">
                      {dayItems.slice(0, 2).map((item) => (
                        <span
                          key={item.id}
                          className={`text-[10px] leading-tight px-1 py-0.5 rounded truncate w-full ${item.status === 'overdue' ? 'bg-red-50 text-red-700' : KIND_CHIP[item.kind]}`}
                        >
                          {item.time ? `${item.time} ` : ''}{item.patient_name.split(' ')[0]}
                        </span>
                      ))}
                      {dayItems.length > 2 && (
                        <span className="text-[10px] text-slate-400 px-1">+{dayItems.length - 2} more</span>
                      )}
                    </span>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day */}
      <div className="border-t border-slate-100">
        <div className="px-4 sm:px-6 py-2.5 bg-slate-50/60 flex items-center justify-between">
          <p className="text-xs font-semibold text-ink">{prettyDay(selected)}{selected === today ? ' · Today' : ''}</p>
          <p className="text-[11px] text-slate-500">{selectedItems.length} item{selectedItems.length === 1 ? '' : 's'}</p>
        </div>
        {selectedItems.length > 0 ? (
          <div className="divide-y divide-slate-50 max-h-72 overflow-y-auto">
            {selectedItems.map((item) => <WorkItemRow key={item.id} item={item} />)}
          </div>
        ) : (
          <p className="px-6 py-6 text-center text-xs text-slate-400">Nothing scheduled or due on this day</p>
        )}
      </div>
    </div>
  );
}
