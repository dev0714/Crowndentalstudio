import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildAutomationEventFeed } from './automation-events';

describe('buildAutomationEventFeed', () => {
  it('sorts the newest events first and summarizes status counts', () => {
    const result = buildAutomationEventFeed([
      {
        id: 'event-1',
        patient_id: 'patient-1',
        patient_name: 'Ada Mthembu',
        channel: 'whatsapp',
        direction: 'outbound',
        status: 'sent',
        subject: 'Recall reminder',
        message: 'Please confirm your appointment',
        source_kind: 'automation',
        source_id: 'queue-1',
        occurred_at: '2026-04-03T10:00:00.000Z',
        created_at: '2026-04-03T10:00:00.000Z',
      },
      {
        id: 'event-2',
        patient_id: 'patient-1',
        patient_name: 'Ada Mthembu',
        channel: 'email',
        direction: 'inbound',
        status: 'received',
        subject: 'Patient reply',
        message: 'I can make it tomorrow',
        source_kind: 'n8n',
        source_id: 'msg-2',
        occurred_at: '2026-04-04T09:00:00.000Z',
        created_at: '2026-04-04T09:00:00.000Z',
      },
    ]);

    assert.equal(result.summary.total, 2);
    assert.equal(result.summary.inbound, 1);
    assert.equal(result.summary.outbound, 1);
    assert.equal(result.summary.sent, 1);
    assert.equal(result.summary.received, 1);
    assert.equal(result.items[0].id, 'event-2');
    assert.equal(result.items[0].patient_name, 'Ada Mthembu');
    assert.equal(result.items[0].channel_label, 'Email');
    assert.equal(result.items[0].direction_label, 'Inbound');
  });
});
