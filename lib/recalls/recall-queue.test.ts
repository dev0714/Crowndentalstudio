import test from 'node:test';
import assert from 'node:assert/strict';

import { buildRecallQueue } from './recall-queue';

test('buildRecallQueue marks long-dormant patients as routine recall due', () => {
  const queue = buildRecallQueue(
    [
      { id: 'p1', first_name: 'Ana', last_name: 'Smith', created_at: '2025-01-01T00:00:00Z' },
    ],
    [
      {
        id: 'a1',
        patient_id: 'p1',
        appointment_date: '2025-02-01T09:00:00Z',
        status: 'Completed',
      },
    ],
    [],
    [],
    [],
    '2025-08-01T00:00:00Z',
  );

  assert.equal(queue.items.length, 1);
  assert.equal(queue.items[0].kind, 'routine-recall');
  assert.equal(queue.items[0].patient_id, 'p1');
});

test('buildRecallQueue includes overdue treatment reviews', () => {
  const queue = buildRecallQueue(
    [
      { id: 'p2', first_name: 'Ben', last_name: 'Jones', created_at: '2025-01-01T00:00:00Z' },
    ],
    [],
    [
      {
        id: 't1',
        patient_id: 'p2',
        plan_name: 'Whitening',
        description: 'Whitening treatment',
        accepted: true,
        accepted_date: '2025-01-01',
        issued_date: '2025-01-01',
      },
    ],
    [],
    [],
    '2025-08-01T00:00:00Z',
  );

  // The patient also qualifies for a six-month routine recall, so look for the review specifically.
  const review = queue.items.find((item) => item.kind === 'treatment-review');
  assert.ok(review);
  assert.equal(review.patient_name, 'Ben Jones');
  assert.equal(review.due_date, '2025-01-31T00:00:00.000Z');
  assert.equal(queue.summary.treatment, 1);
});

test('buildRecallQueue reports the real due date and treats any past attended appointment as the last visit', () => {
  const queue = buildRecallQueue(
    [{ id: 'p3', first_name: 'Cara', last_name: 'Ngwenya', created_at: '2024-01-01T00:00:00Z' }],
    [{ id: 'a2', patient_id: 'p3', appointment_date: '2025-01-10T09:00:00Z', status: 'Scheduled' }],
    [],
    [],
    [],
    '2025-08-01T00:00:00Z',
  );

  assert.equal(queue.items.length, 1);
  assert.equal(queue.items[0].source_label, 'Last appointment');
  assert.equal(queue.items[0].last_activity_date, '2025-01-10T09:00:00.000Z');
  assert.equal(queue.items[0].due_date, '2025-07-09T09:00:00.000Z');
  assert.equal(queue.items[0].days_overdue, 22);
});

test('buildRecallQueue skips patients who already have an upcoming appointment', () => {
  const queue = buildRecallQueue(
    [{ id: 'p4', first_name: 'Dan', last_name: 'Pillay', created_at: '2024-01-01T00:00:00Z' }],
    [
      { id: 'a3', patient_id: 'p4', appointment_date: '2025-08-20T09:00:00Z', status: 'Scheduled' },
      { id: 'a4', patient_id: 'p4', appointment_date: '2025-08-25T09:00:00Z', status: 'Cancelled' },
    ],
    [],
    [],
    [],
    '2025-08-01T00:00:00Z',
  );

  assert.equal(queue.items.length, 0);
  assert.equal(queue.summary.booked, 1);
});

test('buildRecallQueue ignores cancelled appointments when finding the last visit', () => {
  const queue = buildRecallQueue(
    [{ id: 'p5', first_name: 'Eve', last_name: 'Naidoo', created_at: '2024-01-01T00:00:00Z' }],
    [{ id: 'a5', patient_id: 'p5', appointment_date: '2025-07-01T09:00:00Z', status: 'Cancelled' }],
    [],
    [],
    [],
    '2025-08-01T00:00:00Z',
  );

  assert.equal(queue.items.length, 1);
  assert.equal(queue.items[0].source_label, 'Patient record');
});
