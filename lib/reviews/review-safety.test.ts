import { test } from 'node:test';
import assert from 'node:assert/strict';
import { needsManagerFollowUp, shouldPromptForReview } from './review-safety';

test('allows public review prompts only after a happy outcome', () => {
  assert.equal(shouldPromptForReview({ feedback_type: 'satisfaction', outcome: 'happy' }), true);
  assert.equal(shouldPromptForReview({ feedback_type: 'complaint', outcome: 'complaint_logged' }), false);
  assert.equal(needsManagerFollowUp({ feedback_type: 'complaint', outcome: 'needs_follow_up' }), true);
});
