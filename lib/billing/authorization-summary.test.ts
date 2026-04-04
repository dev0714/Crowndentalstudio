import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcAuthorizationShortfall, calcInvoiceShortfall } from './authorization-summary';

test('calculates invoice shortfall from total and paid', () => {
  assert.equal(calcInvoiceShortfall({ total_amount: 1250, paid_amount: 400 }), 850);
});

test('prefers explicit patient shortfall when present', () => {
  assert.equal(calcAuthorizationShortfall({ patient_shortfall_amount: 300, authorized_amount: 900 }), 300);
});

