import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildLabWorkflowSnapshot,
  deriveLabWorkflowStage,
  LAB_WORKFLOW_EVENT_TYPE,
  labStatusForWorkflowStage,
  resolveLabWorkflowUpdate,
} from './lab-workflow';
import { LAB_WORKFLOW_STAGE } from '@/lib/workflows/status-definitions';

describe('lab workflow', () => {
  it('tracks a case through the four tracker stages', () => {
    const collected = resolveLabWorkflowUpdate(LAB_WORKFLOW_EVENT_TYPE.COLLECTED_FROM_STUDIO, {});
    assert.equal(collected.patch.workflow_stage, LAB_WORKFLOW_STAGE.COLLECTED_FROM_STUDIO);
    assert.equal(collected.patch.status, 'In Progress');
    assert.equal(collected.patch.collected_at != null, true);

    const atLab = resolveLabWorkflowUpdate(LAB_WORKFLOW_EVENT_TYPE.AT_LAB, {});
    assert.equal(atLab.patch.workflow_stage, LAB_WORKFLOW_STAGE.AT_LAB);
    assert.equal(atLab.patch.status, 'In Progress');

    const delivered = resolveLabWorkflowUpdate(LAB_WORKFLOW_EVENT_TYPE.DELIVERED_TO_STUDIO, {});
    assert.equal(delivered.patch.workflow_stage, LAB_WORKFLOW_STAGE.DELIVERED_TO_STUDIO);
    assert.equal(delivered.patch.status, 'Delivered');
  });

  it('sorts events into a timeline and closes the case once delivered to the studio', () => {
    const snapshot = buildLabWorkflowSnapshot(
      {
        id: 'case-1',
        patient_id: 'patient-1',
        case_type: 'crown',
        workflow_stage: LAB_WORKFLOW_STAGE.DELIVERED_TO_STUDIO,
      },
      [
        {
          id: 'event-2',
          lab_case_id: 'case-1',
          event_type: LAB_WORKFLOW_EVENT_TYPE.DELIVERED_TO_STUDIO,
          event_at: '2026-04-01T09:00:00.000Z',
        },
        {
          id: 'event-1',
          lab_case_id: 'case-1',
          event_type: LAB_WORKFLOW_EVENT_TYPE.AT_LAB,
          event_at: '2026-03-31T10:00:00.000Z',
        },
      ],
    );

    assert.equal(snapshot.current_stage, LAB_WORKFLOW_STAGE.DELIVERED_TO_STUDIO);
    assert.equal(snapshot.is_closed, true);
    assert.equal(snapshot.timeline[0].label, 'At Lab');
    assert.equal(snapshot.timeline[1].label, 'Delivered to Crown Dental Studio');
  });

  it('maps legacy workflow stages onto the four tracker stages', () => {
    assert.equal(
      deriveLabWorkflowStage({ id: 'a', patient_id: 'p', case_type: 'crown', workflow_stage: 'Created' }),
      LAB_WORKFLOW_STAGE.NEW_PATIENT,
    );
    assert.equal(
      deriveLabWorkflowStage({ id: 'b', patient_id: 'p', case_type: 'crown', workflow_stage: 'In production' }),
      LAB_WORKFLOW_STAGE.AT_LAB,
    );
    assert.equal(
      deriveLabWorkflowStage({ id: 'c', patient_id: 'p', case_type: 'crown', workflow_stage: 'Fitted to patient' }),
      LAB_WORKFLOW_STAGE.DELIVERED_TO_STUDIO,
    );
    assert.equal(
      deriveLabWorkflowStage({ id: 'd', patient_id: 'p', case_type: 'crown', status: 'In Progress' }),
      LAB_WORKFLOW_STAGE.AT_LAB,
    );
  });

  it('derives the case status from each tracker stage', () => {
    assert.equal(labStatusForWorkflowStage(LAB_WORKFLOW_STAGE.NEW_PATIENT), 'Received');
    assert.equal(labStatusForWorkflowStage(LAB_WORKFLOW_STAGE.COLLECTED_FROM_STUDIO), 'In Progress');
    assert.equal(labStatusForWorkflowStage(LAB_WORKFLOW_STAGE.AT_LAB), 'In Progress');
    assert.equal(labStatusForWorkflowStage(LAB_WORKFLOW_STAGE.DELIVERED_TO_STUDIO), 'Delivered');
  });
});
