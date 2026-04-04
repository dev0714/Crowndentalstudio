export function toCsv(rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escapeCell = (value: unknown) => {
    const text = String(value ?? '');
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };

  return [headers.join(','), ...rows.map((row) => headers.map((header) => escapeCell(row[header])).join(','))].join('\n');
}
