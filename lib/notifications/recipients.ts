const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * Turns a free-text list of addresses (comma, semicolon or whitespace separated)
 * into a clean, lower-cased, de-duplicated list. Invalid entries are dropped.
 */
export function parseRecipientList(value: string | null | undefined): string[] {
  if (!value) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  value
    .split(/[,;\s]+/)
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry && EMAIL_PATTERN.test(entry))
    .forEach((entry) => {
      if (!seen.has(entry)) {
        seen.add(entry);
        result.push(entry);
      }
    });
  return result;
}

/** Entries from a free-text list that are not valid email addresses, for validation messages. */
export function findInvalidRecipients(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(/[,;\s]+/)
    .map((entry) => entry.trim())
    .filter((entry) => entry && !EMAIL_PATTERN.test(entry));
}
