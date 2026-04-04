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

    assert.equal(result.summary.total, 5);
    assert.equal(result.summary.high, 3);
    assert.equal(result.summary.medium, 1);
    assert.equal(result.summary.low, 1);
    assert.equal(result.items[0].kind, 'routine-recall');
    assert.equal(result.items[1].kind, 'missing-signed-consent');
    assert.equal(result.items[2].kind, 'missing-popia-consent');
    assert.equal(result.items[3].kind, 'appointment-confirmation');
    assert.equal(result.items[4].kind, 'outreach-gap');
  });
});
