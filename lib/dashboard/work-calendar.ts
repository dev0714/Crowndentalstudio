import { LAB_WORKFLOW_STAGE } from '@/lib/workflows/status-definitions';
import { deriveLabWorkflowStage, type LabWorkflowCase } from '@/lib/lab/lab-workflow';
import type { RecallQueueItem } from '@/lib/recalls/recall-queue';

export const SA_TIME_ZONE = 'Africa/Johannesburg';

export type WorkItemKind = 'appointment' | 'lab' | 'invoice' | 'recall';
export type WorkItemStatus = 'upcoming' | 'due' | 'overdue' | 'done' | 'past';

export type WorkItem = {
  id: string;
  kind: WorkItemKind;
  /** Calendar day in Africa/Johannesburg, YYYY-MM-DD. */
  date: string;
  /** HH:mm in Africa/Johannesburg for timed items, else null. */
  time: string | null;
  title: string;
  detail: string;
  patient_id: string | null;
  patient_name: string;
  href: string;
  status: WorkItemStatus;
  amount: number | null;
};

export type WorkCalendar = {
  items: WorkItem[];
  byDay: Record<string, WorkItem[]>;
  outstanding: WorkItem[];
  today: WorkItem[];
  counts: { appointments: number; lab: number; invoices: number; recalls: number; outstanding: number };
};

export type CalendarAppointment = {
  id: string;
  patient_id: string | null;
  appointment_date: string | null;
  appointment_type?: string | null;
  status?: string | null;
  duration_minutes?: number | null;
};

export type CalendarInvoice = {
  id: string;
  patient_id: string | null;
  invoice_number?: string | null;
  due_date?: string | null;
  invoice_date?: string | null;
  status?: string | null;
  total_amount?: number | null;
  paid_amount?: number | null;
};

const INACTIVE_APPOINTMENT_STATUSES = new Set(['cancelled', 'canceled', 'no show', 'no-show', 'no_show']);
const IGNORED_INVOICE_STATUSES = new Set(['cancelled', 'draft', 'paid']);

function partsInZone(iso: string, timeZone: string) {
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return null;
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(time));
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  const hour = get('hour') === '24' ? '00' : get('hour');
  return { date: `${get('year')}-${get('month')}-${get('day')}`, time: `${hour}:${get('minute')}` };
}

/** YYYY-MM-DD for an ISO timestamp or plain date string, in South African local time. */
export function toDateKey(value: string | null | undefined, timeZone = SA_TIME_ZONE): string {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return partsInZone(value, timeZone)?.date ?? '';
}

/** HH:mm for an ISO timestamp in South African local time; null for plain dates. */
export function toTimeKey(value: string | null | undefined, timeZone = SA_TIME_ZONE): string | null {
  if (!value || /^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return partsInZone(value, timeZone)?.time ?? null;
}

function statusForDate(date: string, today: string, done: boolean): WorkItemStatus {
  if (done) return 'done';
  if (date < today) return 'overdue';
  if (date === today) return 'due';
  return 'upcoming';
}

export function buildWorkCalendar(
  input: {
    appointments: CalendarAppointment[];
    labCases: LabWorkflowCase[];
    invoices: CalendarInvoice[];
    recallItems: RecallQueueItem[];
    patientNames: Record<string, string>;
  },
  today: string,
): WorkCalendar {
  const items: WorkItem[] = [];
  const nameOf = (patientId: string | null | undefined) => (patientId && input.patientNames[patientId]) || 'Unknown patient';

  input.appointments.forEach((appointment) => {
    const status = (appointment.status || '').trim().toLowerCase();
    if (INACTIVE_APPOINTMENT_STATUSES.has(status)) return;
    const date = toDateKey(appointment.appointment_date);
    if (!date) return;
    const completed = status === 'completed';
    let itemStatus: WorkItemStatus = statusForDate(date, today, completed);
    // A past appointment that was not marked completed is history, not outstanding work.
    if (itemStatus === 'overdue') itemStatus = 'past';
    items.push({
      id: `appointment:${appointment.id}`,
      kind: 'appointment',
      date,
      time: toTimeKey(appointment.appointment_date),
      title: appointment.appointment_type || 'Appointment',
      detail: appointment.status ? `${appointment.status}${appointment.duration_minutes ? ` · ${appointment.duration_minutes} min` : ''}` : '',
      patient_id: appointment.patient_id,
      patient_name: nameOf(appointment.patient_id),
      href: '/appointments',
      status: itemStatus,
      amount: null,
    });
  });

  input.labCases.forEach((labCase) => {
    const stage = deriveLabWorkflowStage(labCase);
    if (stage === LAB_WORKFLOW_STAGE.DELIVERED_TO_STUDIO) return;
    const date = toDateKey(labCase.expected_return_date || labCase.due_date);
    if (!date) return;
    items.push({
      id: `lab:${labCase.id}`,
      kind: 'lab',
      date,
      time: null,
      title: `${labCase.case_type || 'Lab case'}${labCase.lab_name ? ` · ${labCase.lab_name}` : ''}`,
      detail: stage,
      patient_id: labCase.patient_id,
      patient_name: labCase.patient_name || nameOf(labCase.patient_id),
      href: '/lab',
      status: statusForDate(date, today, false),
      amount: null,
    });
  });

  input.invoices.forEach((invoice) => {
    const status = (invoice.status || '').trim().toLowerCase();
    if (IGNORED_INVOICE_STATUSES.has(status)) return;
    const balance = Number(invoice.total_amount || 0) - Number(invoice.paid_amount || 0);
    if (balance <= 0) return;
    const date = toDateKey(invoice.due_date || invoice.invoice_date);
    if (!date) return;
    items.push({
      id: `invoice:${invoice.id}`,
      kind: 'invoice',
      date,
      time: null,
      title: `Invoice ${invoice.invoice_number || ''}`.trim(),
      detail: invoice.status || 'Unpaid',
      patient_id: invoice.patient_id,
      patient_name: nameOf(invoice.patient_id),
      href: '/accounts',
      status: statusForDate(date, today, false),
      amount: balance,
    });
  });

  input.recallItems.forEach((item) => {
    const date = toDateKey(item.due_date);
    if (!date) return;
    items.push({
      id: `recall:${item.id}`,
      kind: 'recall',
      date,
      time: null,
      title: item.kind.replace(/-/g, ' ').replace(/^\w/, (c) => c.toUpperCase()),
      detail: item.reason,
      patient_id: item.patient_id,
      patient_name: item.patient_name,
      href: '/recalls',
      status: statusForDate(date, today, false),
      amount: null,
    });
  });

  items.sort((a, b) => (a.date === b.date ? (a.time || '').localeCompare(b.time || '') : a.date.localeCompare(b.date)));

  const byDay: Record<string, WorkItem[]> = {};
  items.forEach((item) => {
    (byDay[item.date] ||= []).push(item);
  });

  const outstanding = items.filter((item) => item.status === 'overdue');

  return {
    items,
    byDay,
    outstanding,
    today: byDay[today] || [],
    counts: {
      appointments: items.filter((item) => item.kind === 'appointment').length,
      lab: items.filter((item) => item.kind === 'lab').length,
      invoices: items.filter((item) => item.kind === 'invoice').length,
      recalls: items.filter((item) => item.kind === 'recall').length,
      outstanding: outstanding.length,
    },
  };
}

/** Days of the month grid, Monday-first, padded with adjacent-month days. */
export function monthGrid(year: number, monthIndex: number): Array<{ key: string; day: number; inMonth: boolean }> {
  const first = new Date(Date.UTC(year, monthIndex, 1));
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const lead = (first.getUTCDay() + 6) % 7; // Monday = 0
  const cells: Array<{ key: string; day: number; inMonth: boolean }> = [];
  const total = Math.ceil((lead + daysInMonth) / 7) * 7;
  for (let index = 0; index < total; index += 1) {
    const date = new Date(Date.UTC(year, monthIndex, index - lead + 1));
    cells.push({
      key: date.toISOString().slice(0, 10),
      day: date.getUTCDate(),
      inMonth: date.getUTCMonth() === monthIndex,
    });
  }
  return cells;
}
