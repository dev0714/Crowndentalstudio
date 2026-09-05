import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildWorkCalendar, monthGrid, toDateKey, toTimeKey } from './work-calendar';

test('toDateKey and toTimeKey convert to South African local time', () => {
  assert.equal(toDateKey('2026-07-31T22:30:00Z'), '2026-08-01');
  assert.equal(toTimeKey('2026-07-31T12:30:00Z'), '14:30');
  assert.equal(toDateKey('2026-04-10'), '2026-04-10');
  assert.equal(toTimeKey('2026-04-10'), null);
  assert.equal(toDateKey(null), '');
});

test('buildWorkCalendar classifies work by day and picks out what is outstanding', () => {
  const calendar = buildWorkCalendar(
    {
      appointments: [
        { id: 'a1', patient_id: 'p1', appointment_date: '2026-09-05T07:00:00Z', appointment_type: 'Consult', status: 'Scheduled', duration_minutes: 30 },
        { id: 'a2', patient_id: 'p1', appointment_date: '2026-08-01T07:00:00Z', appointment_type: 'Consult', status: 'Scheduled' },
        { id: 'a3', patient_id: 'p1', appointment_date: '2026-09-06T07:00:00Z', appointment_type: 'Consult', status: 'Cancelled' },
      ],
      labCases: [
        { id: 'l1', patient_id: 'p1', case_type: 'Crown', lab_name: 'Ridge', workflow_stage: 'At Lab', due_date: '2026-08-20' },
        { id: 'l2', patient_id: 'p1', case_type: 'Crown', lab_name: 'Ridge', workflow_stage: 'Delivered to Crown Dental Studio', due_date: '2026-08-20' },
      ],
      invoices: [
        { id: 'i1', patient_id: 'p1', invoice_number: 'INV-1', due_date: '2026-09-10', status: 'Issued', total_amount: 500, paid_amount: 100 },
        { id: 'i2', patient_id: 'p1', invoice_number: 'INV-2', due_date: '2026-08-10', status: 'Paid', total_amount: 500, paid_amount: 500 },
      ],
      recallItems: [
        {
          id: 'routine:p1', kind: 'routine-recall', patient_id: 'p1', patient_name: 'Ann Lee', source_id: 'p1', source_label: 'Patient record',
          due_date: '2026-08-30T00:00:00.000Z', last_activity_date: '', days_overdue: 6, priority: 'low', reason: 'Six-month recall',
        },
      ],
      patientNames: { p1: 'Ann Lee' },
    },
    '2026-09-05',
  );

  assert.deepEqual(calendar.items.map((item) => `${item.kind}:${item.date}:${item.status}`), [
    'appointment:2026-08-01:past',
    'lab:2026-08-20:overdue',
    'recall:2026-08-30:overdue',
    'appointment:2026-09-05:due',
    'invoice:2026-09-10:upcoming',
  ]);
  assert.equal(calendar.items[3].time, '09:00');
  assert.equal(calendar.outstanding.length, 2);
  assert.equal(calendar.today.length, 1);
  assert.equal(calendar.byDay['2026-09-10'][0].amount, 400);
  assert.deepEqual(calendar.counts, { appointments: 2, lab: 1, invoices: 1, recalls: 1, outstanding: 2 });
});

test('monthGrid starts on Monday and pads to whole weeks', () => {
  const grid = monthGrid(2026, 8); // September 2026 starts on a Tuesday
  assert.equal(grid.length, 35);
  assert.equal(grid[0].key, '2026-08-31');
  assert.equal(grid[0].inMonth, false);
  assert.equal(grid[1].key, '2026-09-01');
  assert.equal(grid[grid.length - 1].key, '2026-10-04');
});
