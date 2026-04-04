import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSessionToken, parseSessionToken } from './session';

test('creates and parses a self-contained session token', () => {
  const token = createSessionToken({
    id: 'user-1',
    email: 'test@crowndental.com',
    fullName: 'Test User',
    role: 'CEO',
  });

  const parsed = parseSessionToken(token);

  assert.ok(parsed);
  assert.equal(parsed?.userId, 'user-1');
  assert.equal(parsed?.email, 'test@crowndental.com');
  assert.equal(parsed?.fullName, 'Test User');
  assert.equal(parsed?.role, 'CEO');
});
