import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildBankStatementMatches,
  buildDebtBuckets,
  buildPaymentReminderSchedule,
  buildSpecialInvoiceDraft,
} from './billing-ledger';

test('matches bank statement lines to invoices by invoice number or amount', () => {
  const matches = buildBankStatementMatches(
    [
      { id: 'line-1', statement_date: '2026-04-04', description: 'EFT INV-1001 payment', reference: 'INV-1001', amount: 2500 },
      { id: 'line-2', statement_date: '2026-04-04', description: 'Cash deposit', reference: 'UNKNOWN', amount: 900 },
    ],
    [
      { id: 'inv-1', invoice_number: 'INV-1001', patient_id: 'p1', total_amount: 2500, paid_amount: 0, invoice_date: '2026-04-01', due_date: '2026-04-03', status: 'Issued' },
      { id: 'inv-2', invoice_number: 'INV-2002', patient_id: 'p2', total_amount: 1200, paid_amount: 300, invoice_date: '2026-03-28', due_date: '2026-04-01', status: 'Partially Paid' },
    ],
  );

  assert.equal(matches[0].matched_invoice_id, 'inv-1');
  assert.equal(matches[0].match_confidence, 'high');
  assert.equal(matches[1].matched_invoice_id, null);
  assert.equal(matches[1].match_confidence, 'unmatched');
});

test('builds debt buckets from invoice ageing and balances', () => {
  const buckets = buildDebtBuckets(
    [
      { id: 'inv-1', invoice_number: 'INV-1001', patient_id: 'p1', total_amount: 1000, paid_amount: 0, invoice_date: '2026-04-01', due_date: '2026-04-03', status: 'Issued' },
      { id: 'inv-2', invoice_number: 'INV-1002', patient_id: 'p2', total_amount: 2000, paid_amount: 500, invoice_date: '2026-03-28', due_date: '2026-03-30', status: 'Partially Paid' },
      { id: 'inv-3', invoice_number: 'INV-1003', patient_id: 'p3', total_amount: 1500, paid_amount: 0, invoice_date: '2026-03-01', due_date: '2026-03-14', status: 'Overdue' },
    ],
    '2026-04-04T00:00:00.000Z',
  );

  assert.equal(buckets.totalOutstanding, 4000);
  assert.equal(buckets.day1to2.count, 1);
  assert.equal(buckets.day3to6.count, 1);
  assert.equal(buckets.day21Plus.count, 1);
});

test('schedules reminders on day 1, 3, 7, 14, and 21 without duplicating sent steps', () => {
  const reminders = buildPaymentReminderSchedule(
    [
      { id: 'inv-1', invoice_number: 'INV-1001', patient_id: 'p1', total_amount: 1000, paid_amount: 0, invoice_date: '2026-04-01', due_date: '2026-04-03', status: 'Issued' },
      { id: 'inv-2', invoice_number: 'INV-1002', patient_id: 'p2', total_amount: 2000, paid_amount: 500, invoice_date: '2026-03-28', due_date: '2026-03-30', status: 'Partially Paid' },
    ],
    [
      { id: 'rem-1', invoice_id: 'inv-2', patient_id: 'p2', reminder_day: 1, reminder_type: 'payment', status: 'sent', created_at: '2026-04-02T00:00:00.000Z' },
    ],
    '2026-04-04T00:00:00.000Z',
  );

  assert.equal(reminders.due.length, 2);
  assert.equal(reminders.due[0].invoice_id, 'inv-1');
  assert.equal(reminders.due[0].reminder_day, 1);
  assert.equal(reminders.due[1].invoice_id, 'inv-2');
  assert.equal(reminders.due[1].reminder_day, 3);
});

test('builds deposit and cancellation fee invoice drafts', () => {
  const deposit = buildSpecialInvoiceDraft({
    kind: 'deposit',
    patient_id: 'p1',
    patient_name: 'Ada Mthembu',
    amount: 500,
    description: 'Deposit for crown work',
  });
  const cancellation = buildSpecialInvoiceDraft({
    kind: 'cancellation_fee',
    patient_id: 'p2',
    patient_name: 'Ben Molefe',
    amount: 750,
    description: 'Late cancellation fee',
  });

  assert.match(deposit.invoice_number, /^DEP-/);
  assert.match(cancellation.invoice_number, /^CAN-/);
  assert.equal(deposit.items[0].description, 'Deposit for crown work');
  assert.equal(cancellation.items[0].description, 'Late cancellation fee');
});
