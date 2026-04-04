import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildRiskSignals } from './risk-signals';

test('buildRiskSignals only emits active exceptions', () => {
  const signals = buildRiskSignals({
    outstandingConsentCount: 1,
    overdueLabCount: 0,
    overdueInvoiceCount: 2,
    staleRecallCount: 0,
  });

  assert.equal(signals.length, 2);
  assert.equal(signals[0].key, 'missing-consent');
  assert.equal(signals[1].key, 'unpaid-invoices');
});
