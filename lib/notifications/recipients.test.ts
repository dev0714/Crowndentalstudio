import assert from 'node:assert/strict';
import { test } from 'node:test';
import { findInvalidRecipients, parseRecipientList } from './recipients';

test('parseRecipientList splits on commas, semicolons and whitespace and de-duplicates', () => {
  assert.deepEqual(parseRecipientList('A@x.co.za, b@y.com;  a@X.co.za\n c@z.org'), ['a@x.co.za', 'b@y.com', 'c@z.org']);
  assert.deepEqual(parseRecipientList(''), []);
  assert.deepEqual(parseRecipientList(null), []);
});

test('parseRecipientList drops invalid entries and findInvalidRecipients reports them', () => {
  assert.deepEqual(parseRecipientList('good@x.com, not-an-email, also@bad'), ['good@x.com']);
  assert.deepEqual(findInvalidRecipients('good@x.com, not-an-email, also@bad'), ['not-an-email', 'also@bad']);
  assert.deepEqual(findInvalidRecipients('good@x.com'), []);
});
