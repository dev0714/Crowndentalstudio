/**
 * Pure helpers for the paginated, searchable patient list.
 * Shared by the API route (parsing + filter) and the Patients page (footer maths).
 */

export const PATIENT_LIST_MAX_LIMIT = 1000;
export const PATIENT_LIST_DEFAULT_LIMIT = 10;

export type PatientListParams = { page: number; limit: number; search: string };

function toInt(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** Reads page / limit / search from a query string, clamping to safe ranges. */
export function parseListParams(searchParams: URLSearchParams): PatientListParams {
  const page = Math.max(1, toInt(searchParams.get('page'), 1));
  const limit = Math.min(PATIENT_LIST_MAX_LIMIT, Math.max(1, toInt(searchParams.get('limit'), PATIENT_LIST_DEFAULT_LIMIT)));
  const search = (searchParams.get('search') ?? '').trim();
  return { page, limit, search };
}

/**
 * Builds the PostgREST `.or()` filter for a free-text search across name, email and phone.
 * Characters that are part of the filter grammar are stripped so user input cannot break it.
 */
export function buildPatientSearchFilter(term: string): string | null {
  const cleaned = term.replace(/[,()%\\]/g, '').trim();
  if (!cleaned) return null;
  const pattern = `%${cleaned}%`;
  return ['first_name', 'last_name', 'email', 'phone'].map((column) => `${column}.ilike.${pattern}`).join(',');
}

/** "Showing from–to of count" numbers plus the total page count. */
export function describeRange(page: number, limit: number, count: number) {
  const pageCount = Math.max(1, Math.ceil(count / limit));
  if (count === 0) return { from: 0, to: 0, pageCount };
  const from = (page - 1) * limit + 1;
  const to = Math.min(count, page * limit);
  return { from, to, pageCount };
}

/**
 * Page numbers to show in the footer: always first and last, a window around the
 * current page, and 'gap' markers where pages are skipped.
 */
export function getPageWindow(page: number, pageCount: number, width = 5): Array<number | 'gap'> {
  if (pageCount <= width + 2) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }
  const half = Math.floor(width / 2);
  let start = Math.max(2, page - half);
  let end = Math.min(pageCount - 1, start + width - 1);
  start = Math.max(2, end - width + 1);

  const pages: Array<number | 'gap'> = [1];
  if (start > 2) pages.push('gap');
  for (let index = start; index <= end; index += 1) pages.push(index);
  if (end < pageCount - 1) pages.push('gap');
  pages.push(pageCount);
  return pages;
}
