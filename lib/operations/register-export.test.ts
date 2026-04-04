import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toCsv } from './register-export';

test('toCsv escapes commas and quotes', () => {
  const csv = toCsv([
    {
      name: 'John "Johnny" Smith',
      notes: 'Needs review, call back tomorrow',
    },
  ]);

  assert.match(csv, /"John ""Johnny"" Smith"/);
  assert.match(csv, /"Needs review, call back tomorrow"/);
});
