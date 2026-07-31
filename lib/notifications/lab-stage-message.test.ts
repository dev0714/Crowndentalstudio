import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildLabStageNotification,
  labStageMessageToHtml,
  labStageMessageToText,
} from './lab-stage-message';
import { LAB_WORKFLOW_STAGE } from '@/lib/workflows/status-definitions';

describe('lab stage notifications', () => {
  it('builds an "at lab" message naming the patient, work and lab', () => {
    const message = buildLabStageNotification(LAB_WORKFLOW_STAGE.AT_LAB, {
      patientName: 'Mischka Sham',
      caseType: 'Braces',
      labName: 'Ridge Lab',
    });

    assert.ok(message);
    assert.match(message!.subject, /at the lab/i);
    const text = labStageMessageToText(message!);
    assert.match(text, /Hi Mischka Sham,/);
    assert.match(text, /Ridge Lab/);
    assert.match(text, /Crown Dental Studio/);
  });

  it('builds a "delivered back" message', () => {
    const message = buildLabStageNotification(LAB_WORKFLOW_STAGE.DELIVERED_TO_STUDIO, {
      patientName: 'Roshan Abdulla',
      caseType: 'Crown',
    });

    assert.ok(message);
    assert.match(labStageMessageToText(message!), /delivered back|has arrived|ready/i);
  });

  it('does not notify for internal stages', () => {
    assert.equal(buildLabStageNotification(LAB_WORKFLOW_STAGE.NEW_PATIENT, {}), null);
    assert.equal(buildLabStageNotification(LAB_WORKFLOW_STAGE.COLLECTED_FROM_STUDIO, {}), null);
  });

  it('escapes HTML and renders paragraphs', () => {
    const message = buildLabStageNotification(LAB_WORKFLOW_STAGE.AT_LAB, {
      patientName: 'A & B <script>',
      caseType: 'Crown',
    });
    const html = labStageMessageToHtml(message!);
    assert.match(html, /&amp;/);
    assert.match(html, /&lt;script&gt;/);
    assert.doesNotMatch(html, /<script>/);
  });

  it('falls back gracefully when name and case type are missing', () => {
    const message = buildLabStageNotification(LAB_WORKFLOW_STAGE.AT_LAB, {});
    assert.ok(message);
    assert.match(labStageMessageToText(message!), /Hi there,/);
    assert.match(labStageMessageToText(message!), /your dental work/i);
  });
});
