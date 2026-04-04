import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildLabWorkflowSnapshot,
  LAB_WORKFLOW_EVENT_TYPE,
  resolveLabWorkflowUpdate,
} from './lab-workflow';

describe('lab workflow', () => {
  it('sorts events and flags cases that still need a recall after collection', () => {
    const snapshot = buildLabWorkflowSnapshot(
      {
        id: 'case-1',
        patient_id: 'patient-1',
        case_type: 'crown',
        workflow_stage: 'Fitted to patient',
        patient_collected_at: '2026-04-01T09:00:00.000Z',
      },
      [
        {
          id: 'event-2',
          lab_case_id: 'case-1',
          event_type: LAB_WORKFLOW_EVENT_TYPE.PATIENT_COLLECTED,
          event_at: '2026-04-01T09:00:00.000Z',
        },
        {
          id: 'event-1',
          lab_case_id: 'case-1',
          event_type: LAB_WORKFLOW_EVENT_TYPE.READY_FOR_COLLECTION,
          event_at: '2026-03-31T10:00:00.000Z',
        },
      ],
    );

    assert.equal(snapshot.current_stage, 'Fitted to patient');
    assert.equal(snapshot.requires_recall, true);
    assert.equal(snapshot.can_close, false);
    assert.equal(snapshot.timeline[0].label, 'Ready for collection');
    assert.equal(snapshot.timeline[1].label, 'Patient collected');
  });

  it('refuses to close a case until patient satisfaction is confirmed', () => {
    assert.throws(() => resolveLabWorkflowUpdate(LAB_WORKFLOW_EVENT_TYPE.CASE_CLOSED, { patient_happy: false }));

    const update = resolveLabWorkflowUpdate(LAB_WORKFLOW_EVENT_TYPE.CASE_CLOSED, { patient_happy: true });
    assert.equal(update.patch.closed_at != null, true);
    assert.equal(update.patch.workflow_stage, 'Completed');
    assert.equal(update.metadata.patient_happy, true);
  });
});
