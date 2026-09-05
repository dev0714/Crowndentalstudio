import assert from 'node:assert/strict';
import { test } from 'node:test';
import { describeRange, getPageWindow, sliceForPage } from './pagination';

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

test('sliceForPage returns the rows for a page and tolerates bad pages', () => {
  const items = Array.from({ length: 15 }, (_, index) => index + 1);
  assert.deepEqual(sliceForPage(items, 1, 10), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.deepEqual(sliceForPage(items, 2, 10), [11, 12, 13, 14, 15]);
  assert.deepEqual(sliceForPage(items, 3, 10), []);
  assert.deepEqual(sliceForPage(items, 0, 10), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.deepEqual(sliceForPage([], 1, 10), []);
});
