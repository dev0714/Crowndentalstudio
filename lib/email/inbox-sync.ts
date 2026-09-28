import 'server-only';

import { getImapConfig } from '@/lib/settings/email-inbox';
import { fetchRecentEmails } from '@/lib/email/imap-client';
import { classifyEmail } from '@/lib/email/email-grouping';
import { classifyImportance } from '@/lib/email/importance';
import {
  finishSyncRun,
  getInboxSyncState,
  markBackfillComplete,
  markInboxSynced,
  recordSyncRun,
  upsertStoredEmails,
  type StoredEmailInput,
} from '@/lib/email/inbox-store';

export const BACKFILL_DAYS = 92;
const DAY_MS = 86_400_000;
const DAILY_OVERLAP_MS = 2 * DAY_MS;

export type SyncMode = 'backfill' | 'daily';

export type SyncResult = {
  mode: SyncMode;
  since: string;
  fetched: number;
  stored: number;
};

/**
 * Pulls mail from the practice inbox into inbox_emails.
 * - backfill: everything from the last three months (capped at 6000 messages).
 * - daily: everything since the last sync, with a two-day overlap so nothing is missed;
 *   the (mailbox, uid) unique key makes re-storing harmless.
 */
export async function runInboxSync(mode: SyncMode, triggeredBy: string): Promise<SyncResult> {
  const config = await getImapConfig();
  if (!config) {
    throw new Error('Email inbox is not configured. Add your IMAP details in Settings.');
  }

  const now = new Date();
  let since: Date;
  if (mode === 'backfill') {
    since = new Date(now.getTime() - BACKFILL_DAYS * DAY_MS);
  } else {
    const state = await getInboxSyncState();
    const last = state.last_synced_at ? new Date(state.last_synced_at).getTime() : Number.NaN;
    since = Number.isNaN(last) ? new Date(now.getTime() - 7 * DAY_MS) : new Date(last - DAILY_OVERLAP_MS);
  }

  const runId = await recordSyncRun({ mode, since, triggeredBy });
  try {
    const emails = await fetchRecentEmails(config, since, { max: mode === 'backfill' ? 6000 : 1000 });
    const mailbox = `${config.user}/${config.mailbox}`;
    const rows: StoredEmailInput[] = emails
      .filter((email) => email.uid)
      .map((email) => {
        const group = classifyEmail(email);
        const verdict = classifyImportance(email, group);
        const receivedAt = email.date && !Number.isNaN(new Date(email.date).getTime()) ? new Date(email.date).toISOString() : now.toISOString();
        return {
          mailbox,
          uid: email.uid,
          from_name: email.from || null,
          from_email: email.fromEmail || null,
          subject: email.subject || null,
          received_at: receivedAt,
          group_key: group,
          is_important: verdict.important,
          importance_reason: verdict.reason,
        };
      });

    const stored = await upsertStoredEmails(rows);
    await markInboxSynced(now);
    if (mode === 'backfill') await markBackfillComplete(now);
    await finishSyncRun(runId, { fetched: emails.length, stored });
    return { mode, since: since.toISOString(), fetched: emails.length, stored };
  } catch (error) {
    await finishSyncRun(runId, { fetched: 0, stored: 0, error: error instanceof Error ? error.message : 'Sync failed' });
    throw error;
  }
}
