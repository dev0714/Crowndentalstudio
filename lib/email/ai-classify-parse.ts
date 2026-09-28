import type { EmailGroupKey } from '@/lib/email/email-grouping';

export type AiVerdict = {
  uid: string;
  group: EmailGroupKey;
  important: boolean;
  reason: string;
  senderKind: string;
};

const GROUPS = new Set<EmailGroupKey>(['appointments', 'lab', 'accounts', 'suppliers', 'patient_enquiries', 'marketing', 'personal', 'other']);

/** Parses the model's JSON reply into verdicts, dropping anything malformed or off-list. */
export function parseAiVerdicts(content: string, allowedUids: string[]): AiVerdict[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return [];
  }
  const items = Array.isArray(parsed) ? parsed : Array.isArray((parsed as { emails?: unknown })?.emails) ? (parsed as { emails: unknown[] }).emails : [];
  const allowed = new Set(allowedUids);
  const seen = new Set<string>();
  const verdicts: AiVerdict[] = [];
  for (const raw of items) {
    if (!raw || typeof raw !== 'object') continue;
    const item = raw as Record<string, unknown>;
    const uid = String(item.uid ?? '');
    const group = String(item.group ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_') as EmailGroupKey;
    if (!allowed.has(uid) || seen.has(uid) || !GROUPS.has(group)) continue;
    seen.add(uid);
    verdicts.push({
      uid,
      group,
      important: item.important === true || String(item.important).toLowerCase() === 'true',
      reason: String(item.reason ?? '').trim().slice(0, 160),
      senderKind: String(item.sender_kind ?? '').trim().slice(0, 80),
    });
  }
  return verdicts;
}
