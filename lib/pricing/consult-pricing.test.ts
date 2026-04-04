import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateConsultQuote } from './consult-pricing';

test('calculates consult pricing across business and after-hours windows', () => {
  assert.equal(calculateConsultQuote('2026-04-06T10:00:00+02:00').amount, 450);
  assert.equal(calculateConsultQuote('2026-04-06T16:30:00+02:00').amount, 750);
  assert.equal(calculateConsultQuote('2026-04-06T20:30:00+02:00').amount, 1000);
  assert.equal(calculateConsultQuote('2026-04-06T22:30:00+02:00').amount, 1500);
  assert.equal(calculateConsultQuote('2026-04-05T10:00:00+02:00').amount, 750);
  assert.equal(calculateConsultQuote('2026-04-05T14:00:00+02:00').amount, 1000);
  assert.equal(calculateConsultQuote('2026-04-05T18:00:00+02:00').amount, 1500);
});
