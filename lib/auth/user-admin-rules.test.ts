import assert from 'node:assert/strict';
import { test } from 'node:test';
import { canChangeUser, isPortalRole, validatePassword } from './user-admin-rules';

const me = { id: 'me', role: 'Admin', is_active: true };
const other = { id: 'u2', role: 'Reception', is_active: true };
const onlyCeo = { id: 'ceo', role: 'CEO', is_active: true };

test('you cannot delete, demote or deactivate yourself', () => {
  assert.equal(canChangeUser({ actorId: 'me', target: me, deleting: true, otherActiveAdmins: 3 }).ok, false);
  assert.equal(canChangeUser({ actorId: 'me', target: me, nextRole: 'Doctor', otherActiveAdmins: 3 }).ok, false);
  assert.equal(canChangeUser({ actorId: 'me', target: me, nextActive: false, otherActiveAdmins: 3 }).ok, false);
  // Editing your own name or keeping your role is fine.
  assert.equal(canChangeUser({ actorId: 'me', target: me, nextRole: 'Admin', nextActive: true, otherActiveAdmins: 0 }).ok, true);
});

test('the last active administrator is protected', () => {
  assert.equal(canChangeUser({ actorId: 'me', target: onlyCeo, nextRole: 'Doctor', otherActiveAdmins: 0 }).ok, false);
  assert.equal(canChangeUser({ actorId: 'me', target: onlyCeo, nextActive: false, otherActiveAdmins: 0 }).ok, false);
  assert.equal(canChangeUser({ actorId: 'me', target: onlyCeo, deleting: true, otherActiveAdmins: 0 }).ok, false);
  // With another admin around, all of those are allowed.
  assert.equal(canChangeUser({ actorId: 'me', target: onlyCeo, deleting: true, otherActiveAdmins: 1 }).ok, true);
  // Moving CEO to Admin keeps an administrator, so it is allowed even when alone.
  assert.equal(canChangeUser({ actorId: 'me', target: onlyCeo, nextRole: 'Admin', otherActiveAdmins: 0 }).ok, true);
});

test('ordinary staff changes pass', () => {
  assert.deepEqual(canChangeUser({ actorId: 'me', target: other, nextRole: 'Doctor', nextActive: false, otherActiveAdmins: 0 }), { ok: true });
  assert.deepEqual(canChangeUser({ actorId: 'me', target: other, deleting: true, otherActiveAdmins: 0 }), { ok: true });
});

test('role and password validation', () => {
  assert.equal(isPortalRole('Doctor'), true);
  assert.equal(isPortalRole('Owner'), false);
  assert.equal(validatePassword('short'), 'Password must be at least 8 characters');
  assert.equal(validatePassword('longenough1'), null);
});
