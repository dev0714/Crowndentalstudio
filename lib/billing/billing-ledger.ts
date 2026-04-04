export type BillingInvoice = {
  id: string;
  invoice_number: string;
  patient_id: string;
  patient_name?: string | null;
  invoice_date?: string | null;
  due_date?: string | null;
  total_amount?: number | null;
  paid_amount?: number | null;
  status?: string | null;
};

export type BankStatementLine = {
  id: string;
  statement_date: string;
  description: string;
  reference?: string | null;
  amount: number;
  direction?: 'credit' | 'debit' | string | null;
  bank_account?: string | null;
  matched_invoice_id?: string | null;
  matched_invoice_number?: string | null;
  match_confidence?: 'high' | 'medium' | 'low' | 'unmatched';
  notes?: string | null;
};

export type PaymentReminderLog = {
  id: string;
  invoice_id: string;
  patient_id: string;
  reminder_day: number;
  reminder_type: 'payment' | 'deposit' | 'cancellation';
  status: 'sent' | 'queued' | 'failed';
  created_at: string;
};

export type DebtBucket = {
  count: number;
  amount: number;
};

export type DebtBucketSummary = {
  totalOutstanding: number;
  current: DebtBucket;
  day1to2: DebtBucket;
  day3to6: DebtBucket;
  day7to13: DebtBucket;
  day14to20: DebtBucket;
  day21Plus: DebtBucket;
};

export type BankStatementMatch = BankStatementLine & {
  matched_invoice_id: string | null;
  matched_invoice_number: string | null;
  match_confidence: 'high' | 'medium' | 'low' | 'unmatched';
  match_reason: string;
};

export type ReminderQueueItem = {
  invoice_id: string;
  invoice_number: string;
  patient_id: string;
  patient_name: string;
  reminder_day: number;
  due_date: string;
  overdue_days: number;
  outstanding_amount: number;
};

export type ReminderSchedule = {
  due: ReminderQueueItem[];
  sentDaysByInvoiceId: Record<string, number[]>;
};

export type SpecialInvoiceKind = 'deposit' | 'cancellation_fee';

export type SpecialInvoiceDraft = {
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  subtotal: number;
  discount: number;
  tax: number;
  total_amount: number;
  paid_amount: number;
  status: 'Issued';
  medical_aid_claim: boolean;
  title: string;
  items: Array<{ description: string; quantity: number; unit_price: number; total: number }>;
};

function toTime(value: string | null | undefined) {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
}

function dayKey(value: string | null | undefined) {
  const time = toTime(value);
  return time == null ? '' : new Date(time).toISOString().slice(0, 10);
}

function daysBetween(from: string | null | undefined, toIso: string) {
  const start = toTime(from);
  const end = toTime(toIso);
  if (start == null || end == null) return null;
  return Math.floor((end - start) / (24 * 60 * 60 * 1000));
}

function outstandingAmount(invoice: BillingInvoice) {
  return Math.max(0, Number(invoice.total_amount || 0) - Number(invoice.paid_amount || 0));
}

function pickReminderDay(overdueDays: number, sentDays: number[]) {
  const schedule = [1, 3, 7, 14, 21];
  return schedule.find((day) => overdueDays >= day && !sentDays.includes(day)) || null;
}

function normalizeReferenceText(value: string | null | undefined) {
  return String(value || '').toUpperCase().trim();
}

function findInvoiceNumberFromText(value: string) {
  const match = normalizeReferenceText(value).match(/INV-\d+/);
  return match ? match[0] : null;
}

function bucketForDays(daysOverdue: number) {
  if (daysOverdue >= 21) return 'day21Plus';
  if (daysOverdue >= 14) return 'day14to20';
  if (daysOverdue >= 7) return 'day7to13';
  if (daysOverdue >= 3) return 'day3to6';
  if (daysOverdue >= 1) return 'day1to2';
  return 'current';
}

function createBucketSummary(): DebtBucketSummary {
  return {
    totalOutstanding: 0,
    current: { count: 0, amount: 0 },
    day1to2: { count: 0, amount: 0 },
    day3to6: { count: 0, amount: 0 },
    day7to13: { count: 0, amount: 0 },
    day14to20: { count: 0, amount: 0 },
    day21Plus: { count: 0, amount: 0 },
  };
}

export function buildDebtBuckets(invoices: BillingInvoice[], nowIso = new Date().toISOString()): DebtBucketSummary {
  const summary = createBucketSummary();

  invoices.forEach((invoice) => {
    const balance = outstandingAmount(invoice);
    if (balance <= 0) return;

    summary.totalOutstanding += balance;
    const overdueDays = daysBetween(invoice.due_date || invoice.invoice_date || nowIso, nowIso) || 0;
    const bucketKey = bucketForDays(overdueDays);
    summary[bucketKey].count += 1;
    summary[bucketKey].amount += balance;
  });

  return summary;
}

export function buildBankStatementMatches(lines: BankStatementLine[], invoices: BillingInvoice[]): BankStatementMatch[] {
  const invoiceByNumber = new Map(invoices.map((invoice) => [invoice.invoice_number.toUpperCase(), invoice]));
  const invoiceByOutstandingAmount = new Map<number, BillingInvoice[]>();

  invoices.forEach((invoice) => {
    const balance = outstandingAmount(invoice);
    if (!invoiceByOutstandingAmount.has(balance)) {
      invoiceByOutstandingAmount.set(balance, []);
    }
    invoiceByOutstandingAmount.get(balance)?.push(invoice);
  });

  return lines.map((line) => {
    const fromText = findInvoiceNumberFromText(`${line.description} ${line.reference || ''}`);
    const exactInvoice = fromText ? invoiceByNumber.get(fromText) : null;
    if (exactInvoice) {
      return {
        ...line,
        matched_invoice_id: exactInvoice.id,
        matched_invoice_number: exactInvoice.invoice_number,
        match_confidence: 'high',
        match_reason: `Matched invoice number ${exactInvoice.invoice_number}`,
      };
    }

    const amountMatches = invoiceByOutstandingAmount.get(Number(line.amount || 0)) || [];
    if (amountMatches.length === 1) {
      return {
        ...line,
        matched_invoice_id: amountMatches[0].id,
        matched_invoice_number: amountMatches[0].invoice_number,
        match_confidence: 'medium',
        match_reason: `Matched unique outstanding amount ${line.amount}`,
      };
    }

    return {
      ...line,
      matched_invoice_id: null,
      matched_invoice_number: null,
      match_confidence: 'unmatched',
      match_reason: 'No unique invoice match found',
    };
  });
}

export function buildPaymentReminderSchedule(
  invoices: BillingInvoice[],
  reminderLogs: PaymentReminderLog[],
  nowIso = new Date().toISOString(),
): ReminderSchedule {
  const sentDaysByInvoiceId: Record<string, number[]> = {};

  reminderLogs.forEach((log) => {
    if (log.status !== 'sent') return;
    sentDaysByInvoiceId[log.invoice_id] = [...(sentDaysByInvoiceId[log.invoice_id] || []), log.reminder_day].sort((a, b) => a - b);
  });

  const due = invoices
    .filter((invoice) => outstandingAmount(invoice) > 0)
    .map((invoice) => {
      const overdueDays = daysBetween(invoice.due_date || invoice.invoice_date || nowIso, nowIso) || 0;
      const reminderDay = pickReminderDay(overdueDays, sentDaysByInvoiceId[invoice.id] || []);
      if (reminderDay == null) {
        return null;
      }

      return {
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        patient_id: invoice.patient_id,
        patient_name: invoice.patient_name || '',
        reminder_day: reminderDay,
        due_date: dayKey(invoice.due_date || invoice.invoice_date || nowIso),
        overdue_days: overdueDays,
        outstanding_amount: outstandingAmount(invoice),
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      const left = a as ReminderQueueItem;
      const right = b as ReminderQueueItem;
      if (left.reminder_day !== right.reminder_day) {
        return left.reminder_day - right.reminder_day;
      }
      return right.overdue_days - left.overdue_days;
    }) as ReminderQueueItem[];

  return { due, sentDaysByInvoiceId };
}

export function buildSpecialInvoiceDraft(input: {
  kind: SpecialInvoiceKind;
  patient_id: string;
  patient_name: string;
  amount: number;
  description: string;
  due_date?: string | null;
}): SpecialInvoiceDraft {
  const prefix = input.kind === 'deposit' ? 'DEP' : 'CAN';
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const invoiceNumber = `${prefix}-${Date.now()}`;
  const amount = Number(input.amount || 0);

  return {
    invoice_number: invoiceNumber,
    invoice_date: today,
    due_date: input.due_date || today,
    subtotal: amount,
    discount: 0,
    tax: 0,
    total_amount: amount,
    paid_amount: 0,
    status: 'Issued',
    medical_aid_claim: false,
    title: input.kind === 'deposit' ? `Deposit invoice for ${input.patient_name}` : `Cancellation fee invoice for ${input.patient_name}`,
    items: [
      {
        description: input.description,
        quantity: 1,
        unit_price: amount,
        total: amount,
      },
    ],
  };
}
