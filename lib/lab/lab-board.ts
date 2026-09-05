import { LAB_WORKFLOW_STAGE } from '@/lib/workflows/status-definitions';

/** The minimum a board card needs; the page's LabCase type satisfies it. */
export type LabBoardCase = {
  id: string;
  case_number?: string | null;
  patient_name?: string | null;
  case_type?: string | null;
  lab_name?: string | null;
  shade?: string | null;
  due_date?: string | null;
  closed_at?: string | null;
  updated_at?: string | null;
  workflow_stage?: string | null;
  workflow_snapshot?: { is_closed?: boolean; timeline?: Array<{ event_at: string }> } | null;
};

export const LAB_BOARD_STAGES = [
  LAB_WORKFLOW_STAGE.NEW_PATIENT,
  LAB_WORKFLOW_STAGE.COLLECTED_FROM_STUDIO,
  LAB_WORKFLOW_STAGE.AT_LAB,
  LAB_WORKFLOW_STAGE.DELIVERED_TO_STUDIO,
] as const;

/** Verb shown on the one-tap button that moves a card to the next column. */
export const NEXT_STAGE_ACTION: Record<string, string> = {
  [LAB_WORKFLOW_STAGE.NEW_PATIENT]: 'Mark collected',
  [LAB_WORKFLOW_STAGE.COLLECTED_FROM_STUDIO]: 'Send to lab',
  [LAB_WORKFLOW_STAGE.AT_LAB]: 'Mark delivered',
};

export function nextLabStage(stage: string): string | null {
  const index = LAB_BOARD_STAGES.indexOf(stage as (typeof LAB_BOARD_STAGES)[number]);
  if (index === -1 || index === LAB_BOARD_STAGES.length - 1) return null;
  return LAB_BOARD_STAGES[index + 1];
}

const DAY_MS = 86_400_000;

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
}

function parseDate(value: string | null | undefined) {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
}

/** Whole days from today until the due date; negative when overdue; null without a date. */
export function daysUntilDue(dueDate: string | null | undefined, now: Date): number | null {
  const due = parseDate(dueDate);
  if (due == null) return null;
  return Math.round((startOfDay(new Date(due)) - startOfDay(now)) / DAY_MS);
}

export type DueTone = 'overdue' | 'today' | 'soon' | 'normal' | 'none';

/** Short human label for a due date, and a tone the UI can colour by. */
export function describeDue(dueDate: string | null | undefined, now: Date): { tone: DueTone; text: string } {
  const days = daysUntilDue(dueDate, now);
  if (days == null) return { tone: 'none', text: 'No due date' };
  if (days < 0) return { tone: 'overdue', text: `${Math.abs(days)}d overdue` };
  if (days === 0) return { tone: 'today', text: 'Due today' };
  if (days === 1) return { tone: 'soon', text: 'Due tomorrow' };
  if (days <= 3) return { tone: 'soon', text: `Due in ${days}d` };
  return { tone: 'normal', text: `Due in ${days}d` };
}

/** Whole days since the case last changed stage (latest timeline entry), or null. */
export function daysAtStage(labCase: LabBoardCase, now: Date): number | null {
  const timeline = labCase.workflow_snapshot?.timeline ?? [];
  let latest: number | null = null;
  for (const entry of timeline) {
    const time = parseDate(entry.event_at);
    if (time != null && (latest == null || time > latest)) latest = time;
  }
  if (latest == null) return null;
  return Math.max(0, Math.floor((now.getTime() - latest) / DAY_MS));
}

export function isClosed(labCase: LabBoardCase) {
  return labCase.workflow_snapshot?.is_closed === true;
}

/** Delivered cases fall off the board after `days` unless "show all" is on. */
export function isRecentlyClosed(labCase: LabBoardCase, now: Date, days = 7): boolean {
  const closedAt = parseDate(labCase.closed_at) ?? parseDate(labCase.updated_at);
  if (closedAt == null) return true;
  return now.getTime() - closedAt <= days * DAY_MS;
}

/**
 * Open columns: overdue first (most overdue at the top), then soonest due, undated last.
 * Delivered column: most recently closed first.
 */
export function sortBoardCases<T extends LabBoardCase>(cases: T[], now: Date): T[] {
  return [...cases].sort((a, b) => {
    const aClosed = isClosed(a);
    const bClosed = isClosed(b);
    if (aClosed && bClosed) {
      const aTime = parseDate(a.closed_at) ?? parseDate(a.updated_at) ?? 0;
      const bTime = parseDate(b.closed_at) ?? parseDate(b.updated_at) ?? 0;
      return bTime - aTime;
    }
    const aDays = daysUntilDue(a.due_date, now);
    const bDays = daysUntilDue(b.due_date, now);
    if (aDays == null && bDays == null) return 0;
    if (aDays == null) return 1;
    if (bDays == null) return -1;
    return aDays - bDays;
  });
}

/** Case-insensitive match on patient, case number, type, lab and shade. */
export function matchesCaseSearch(labCase: LabBoardCase, term: string): boolean {
  const needle = term.trim().toLowerCase();
  if (!needle) return true;
  return [labCase.patient_name, labCase.case_number, labCase.case_type, labCase.lab_name, labCase.shade]
    .some((value) => (value ?? '').toLowerCase().includes(needle));
}
