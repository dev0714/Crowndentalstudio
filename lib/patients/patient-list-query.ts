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

export { describeRange, getPageWindow } from '@/lib/pagination';
