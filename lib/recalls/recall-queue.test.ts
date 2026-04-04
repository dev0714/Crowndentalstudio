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

  assert.equal(queue.items.length, 1);
  assert.equal(queue.items[0].kind, 'treatment-review');
  assert.equal(queue.items[0].patient_name, 'Ben Jones');
});
