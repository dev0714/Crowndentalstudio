import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  daysAtStage, daysUntilDue, describeDue, isRecentlyClosed, matchesCaseSearch, nextLabStage, sortBoardCases,
} from './lab-board';

const now = new Date('2026-09-05T10:00:00');

test('nextLabStage walks the four columns and stops at delivered', () => {
  assert.equal(nextLabStage('New patient'), 'Collected from Crown Dental Studio');
  assert.equal(nextLabStage('Collected from Crown Dental Studio'), 'At Lab');
  assert.equal(nextLabStage('At Lab'), 'Delivered to Crown Dental Studio');
  assert.equal(nextLabStage('Delivered to Crown Dental Studio'), null);
  assert.equal(nextLabStage('Something else'), null);
});

test('daysUntilDue and describeDue', () => {
  assert.equal(daysUntilDue('2026-09-05', now), 0);
  assert.equal(daysUntilDue('2026-09-03', now), -2);
  assert.equal(daysUntilDue('2026-09-08', now), 3);
  assert.equal(daysUntilDue(null, now), null);
  assert.deepEqual(describeDue('2026-09-03', now), { tone: 'overdue', text: '2d overdue' });
  assert.deepEqual(describeDue('2026-09-05', now), { tone: 'today', text: 'Due today' });
  assert.deepEqual(describeDue('2026-09-06', now), { tone: 'soon', text: 'Due tomorrow' });
  assert.deepEqual(describeDue('2026-09-20', now), { tone: 'normal', text: 'Due in 15d' });
  assert.deepEqual(describeDue('', now), { tone: 'none', text: 'No due date' });
});

test('daysAtStage uses the latest timeline entry', () => {
  const labCase = { id: '1', workflow_snapshot: { timeline: [{ event_at: '2026-08-30T09:00:00' }, { event_at: '2026-09-02T09:00:00' }] } };
  assert.equal(daysAtStage(labCase, now), 3);
  assert.equal(daysAtStage({ id: '2' }, now), null);
});

test('isRecentlyClosed keeps the last week on the board', () => {
  assert.equal(isRecentlyClosed({ id: '1', closed_at: '2026-09-01' }, now), true);
  assert.equal(isRecentlyClosed({ id: '2', closed_at: '2026-08-01' }, now), false);
  assert.equal(isRecentlyClosed({ id: '3' }, now), true);
});

test('sortBoardCases puts overdue first, undated last, delivered newest first', () => {
  const open = [
    { id: 'a', due_date: '2026-09-10' },
    { id: 'b', due_date: null },
    { id: 'c', due_date: '2026-09-01' },
    { id: 'd', due_date: '2026-09-05' },
  ];
  assert.deepEqual(sortBoardCases(open, now).map((item) => item.id), ['c', 'd', 'a', 'b']);
  const closed = [
    { id: 'x', closed_at: '2026-09-01', workflow_snapshot: { is_closed: true } },
    { id: 'y', closed_at: '2026-09-04', workflow_snapshot: { is_closed: true } },
  ];
  assert.deepEqual(sortBoardCases(closed, now).map((item) => item.id), ['y', 'x']);
});

test('matchesCaseSearch searches the useful fields', () => {
  const labCase = { id: '1', patient_name: 'Mischka Sham', case_number: 'LC-0012', case_type: 'Braces', lab_name: 'Ridge Lab', shade: 'A2' };
  assert.equal(matchesCaseSearch(labCase, 'sham'), true);
  assert.equal(matchesCaseSearch(labCase, '0012'), true);
  assert.equal(matchesCaseSearch(labCase, 'ridge'), true);
  assert.equal(matchesCaseSearch(labCase, 'a2'), true);
  assert.equal(matchesCaseSearch(labCase, 'crown'), false);
  assert.equal(matchesCaseSearch(labCase, '  '), true);
});
