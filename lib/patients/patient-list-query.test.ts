import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildPatientSearchFilter, describeRange, getPageWindow, parseListParams } from './patient-list-query';

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

test('describeRange reports the visible slice and page count', () => {
  assert.deepEqual(describeRange(1, 20, 21), { from: 1, to: 20, pageCount: 2 });
  assert.deepEqual(describeRange(2, 20, 21), { from: 21, to: 21, pageCount: 2 });
  assert.deepEqual(describeRange(1, 20, 0), { from: 0, to: 0, pageCount: 1 });
  assert.deepEqual(describeRange(3, 10, 30), { from: 21, to: 30, pageCount: 3 });
});

test('getPageWindow lists every page when few, else windows with gaps', () => {
  assert.deepEqual(getPageWindow(1, 1), [1]);
  assert.deepEqual(getPageWindow(3, 7), [1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual(getPageWindow(1, 20), [1, 2, 3, 4, 5, 6, 'gap', 20]);
  assert.deepEqual(getPageWindow(10, 20), [1, 'gap', 8, 9, 10, 11, 12, 'gap', 20]);
  assert.deepEqual(getPageWindow(20, 20), [1, 'gap', 15, 16, 17, 18, 19, 20]);
});
