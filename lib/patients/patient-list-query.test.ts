import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildPatientSearchFilter, parseListParams } from './patient-list-query';

test('parseListParams clamps page and limit and trims search', () => {
  assert.deepEqual(parseListParams(new URLSearchParams('')), { page: 1, limit: 10, search: '' });
  assert.deepEqual(parseListParams(new URLSearchParams('page=0&limit=5000&search=%20ann%20')), { page: 1, limit: 1000, search: 'ann' });
  assert.deepEqual(parseListParams(new URLSearchParams('page=abc&limit=-3')), { page: 1, limit: 1, search: '' });
  assert.deepEqual(parseListParams(new URLSearchParams('page=3&limit=20')), { page: 3, limit: 20, search: '' });
});

test('buildPatientSearchFilter covers name, email and phone and strips filter syntax', () => {
  assert.equal(
    buildPatientSearchFilter('ann'),
    'first_name.ilike.%ann%,last_name.ilike.%ann%,email.ilike.%ann%,phone.ilike.%ann%',
  );
  assert.equal(buildPatientSearchFilter('a,b(c)%'), 'first_name.ilike.%abc%,last_name.ilike.%abc%,email.ilike.%abc%,phone.ilike.%abc%');
  assert.equal(buildPatientSearchFilter('   '), null);
  assert.equal(buildPatientSearchFilter(',()'), null);
});
