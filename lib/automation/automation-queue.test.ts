import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildAutomationQueue } from './automation-queue';

describe('buildAutomationQueue', () => {
  it('builds a ranked queue with summary counts', () => {
    const result = buildAutomationQueue(
      [
        { id: 'p1', first_name: 'Ada', last_name: 'Mthembu', created_at: '2025-01-01T00:00:00.000Z' },
      ],
      [
        {
          id: 'a1',
          patient_id: 'p1',
          appointment_date: '2026-04-05T08:00:00.000Z',
          status: 'Scheduled',
        },
      ],
      [
        {
          id: 'c1',
          patient_id: 'p1',
          popia_consent: false,
          whatsapp_consent: true,
          call_recording_consent: false,
          email_consent: false,
          sms_consent: false,
          marketing_consent: false,
          updated_at: '2026-04-04T00:00:00.000Z',
        },
      ],
      [],
      [
        {
          id: 'pc1',
          patient_id: 'p1',
          contact_type: 'call',
          contact_date: '2026-03-01T10:00:00.000Z',
          outcome: 'No answer',
        },
      ],
      [
        {
          id: 'r1',
          kind: 'routine-recall',
          patient_id: 'p1',
          patient_name: 'Ada Mthembu',
          source_id: 'a1',
          source_label: 'Completed appointment',
          due_date: '2026-04-01T00:00:00.000Z',
          last_activity_date: '2025-10-01T00:00:00.000Z',
          days_overdue: 3,
          priority: 'high',
          reason: 'Routine recall is overdue',
        },
      ],
      '2026-04-04T00:00:00.000Z',
    );

    // The patient is booked in tomorrow, so no outreach gap is raised.
    assert.equal(result.summary.total, 4);
    assert.equal(result.summary.high, 3);
    assert.equal(result.summary.medium, 1);
    assert.equal(result.summary.low, 0);
    assert.equal(result.items[0].kind, 'routine-recall');
    assert.equal(result.items[1].kind, 'missing-signed-consent');
    assert.equal(result.items[2].kind, 'missing-popia-consent');
    assert.equal(result.items[3].kind, 'appointment-confirmation');
    assert.equal(result.items[2].due_date, '2026-04-04T00:00:00.000Z');
  });

  it('raises an outreach gap only when nothing has happened for 30 days', () => {
    const quiet = buildAutomationQueue(
      [{ id: 'p2', first_name: 'Bo', last_name: 'Naidoo', created_at: '2026-01-01T00:00:00.000Z' }],
      [{ id: 'a2', patient_id: 'p2', appointment_date: '2026-02-10T08:00:00.000Z', status: 'Scheduled' }],
      [{ id: 'c2', patient_id: 'p2', popia_consent: true }],
      [{ id: 's2', patient_id: 'p2', consent_type: 'treatment', signed_date: '2026-01-02' }],
      [],
      [],
      '2026-04-04T00:00:00.000Z',
    );
    assert.equal(quiet.summary.total, 1);
    assert.equal(quiet.items[0].kind, 'outreach-gap');
    assert.equal(quiet.items[0].source, 'Appointments');
    assert.equal(quiet.items[0].days_overdue, 22);
    assert.equal(quiet.items[0].due_date, '2026-03-12T08:00:00.000Z');

    const recent = buildAutomationQueue(
      [{ id: 'p3', first_name: 'Cy', last_name: 'Dlamini', created_at: '2026-03-20T00:00:00.000Z' }],
      [],
      [{ id: 'c3', patient_id: 'p3', popia_consent: true }],
      [{ id: 's3', patient_id: 'p3', consent_type: 'treatment', signed_date: '2026-03-20' }],
      [],
      [],
      '2026-04-04T00:00:00.000Z',
    );
    assert.equal(recent.summary.total, 0);
  });

  it('ignores inactive patients entirely', () => {
    const result = buildAutomationQueue(
      [{ id: 'p4', first_name: 'Di', last_name: 'Khoza', created_at: '2025-01-01T00:00:00.000Z', status: 'Archived' }],
      [],
      [],
      [],
      [],
      [],
      '2026-04-04T00:00:00.000Z',
    );
    assert.equal(result.summary.total, 0);
  });
});
