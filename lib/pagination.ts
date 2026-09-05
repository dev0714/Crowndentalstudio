/** Pure pagination maths shared by list screens. */

/** "Showing from–to of count" numbers plus the total page count. */
export function describeRange(page: number, limit: number, count: number) {
  const pageCount = Math.max(1, Math.ceil(count / limit));
  if (count === 0) return { from: 0, to: 0, pageCount };
  const from = (page - 1) * limit + 1;
  const to = Math.min(count, page * limit);
  return { from, to, pageCount };
}

/**
 * Page numbers to show in a footer: always first and last, a window around the
 * current page, and 'gap' markers where pages are skipped.
 */
export function getPageWindow(page: number, pageCount: number, width = 5): Array<number | 'gap'> {
  if (pageCount <= width + 2) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }
  const half = Math.floor(width / 2);
  let start = Math.max(2, page - half);
  const end = Math.min(pageCount - 1, start + width - 1);
  start = Math.max(2, end - width + 1);

  const pages: Array<number | 'gap'> = [1];
  if (start > 2) pages.push('gap');
  for (let index = start; index <= end; index += 1) pages.push(index);
  if (end < pageCount - 1) pages.push('gap');
  pages.push(pageCount);
  return pages;
}

/** The items that belong on the given page of a client-side list. */
export function sliceForPage<T>(items: T[], page: number, pageSize: number): T[] {
  const safePage = Math.max(1, page);
  const start = (safePage - 1) * pageSize;
  return items.slice(start, start + pageSize);
}
