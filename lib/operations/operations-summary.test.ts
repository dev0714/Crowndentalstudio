import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildOperationsSummary } from './operations-summary';

test('buildOperationsSummary counts the core operational buckets', () => {
  const summary = buildOperationsSummary({
    patients: [{ status: 'Active' }, { status: 'Inactive' }],
    appointments: [{ status: 'Scheduled', appointment_date: '2026-04-04T09:00:00Z' }],
    invoices: [{ status: 'Overdue', total_amount: 1000, paid_amount: 250 }],
    labCases: [{ status: 'Ready' }],
    leads: [{ status: 'New' }, { status: 'Converted' }],
  });

  assert.equal(summary.totalPatients, 2);
  assert.equal(summary.activePatients, 1);
  assert.equal(summary.todayAppointments, 1);
  assert.equal(summary.overdueInvoices, 1);
  assert.equal(summary.outstandingBalance, 750);
  assert.equal(summary.openLabCases, 1);
  assert.equal(summary.openLeads, 1);
});
