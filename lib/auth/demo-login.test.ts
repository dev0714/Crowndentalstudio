import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveDemoLoginUser } from './demo-login';

test('accepts the seeded demo credentials', () => {
  const user = resolveDemoLoginUser('test@crowndental.com', 'TestPassword1234!');

  assert.ok(user);
  assert.equal(user?.email, 'test@crowndental.com');
  assert.equal(user?.fullName, 'Test User');
  assert.equal(user?.role, 'CEO');
});

test('rejects invalid demo credentials', () => {
  const user = resolveDemoLoginUser('test@crowndental.com', 'wrong-password');

  assert.equal(user, null);
});
