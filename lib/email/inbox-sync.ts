import 'server-only';

import { getImapConfig } from '@/lib/settings/email-inbox';
import { fetchRecentEmails } from '@/lib/email/imap-client';
import { classifyEmail } from '@/lib/email/email-grouping';
import { classifyImportance } from '@/lib/email/importance';
import { classifyEmailsWithAi } from '@/lib/email/ai-classify';
import {
  applyClassification,
  finishSyncRun,
  getInboxSyncState,
  listRuleClassifiedEmails,
  markBackfillComplete,
  markInboxSynced,
  recordSyncRun,
  upsertStoredEmails,
  type StoredEmailInput,
} from '@/lib/email/inbox-store';

export const BACKFILL_DAYS = 92;
const DAY_MS = 86_400_000;
const DAILY_OVERLAP_MS = 2 * DAY_MS;

export type SyncMode = 'backfill' | 'daily' | 'reclassify';

export type SyncResult = {
  mode: SyncMode;
  since: string;
  fetched: number;
  stored: number;
  ai_classified: number;
};

/**
 * Pulls mail from the practice inbox into inbox_emails.
 * - backfill: everything from the last three months (capped at 6000 messages).
 * - daily: everything since the last sync, with a two-day overlap so nothing is missed;
 *   the (mailbox, uid) unique key makes re-storing harmless.
 */
export async function runInboxSync(mode: SyncMode, triggeredBy: string, options: { limit?: number; timeBudgetMs?: number } = {}): Promise<SyncResult> {
  if (mode === 'reclassify') return reclassifyStoredEmails(triggeredBy, options);
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
        const row: StoredEmailInput = {
          mailbox,
          uid: email.uid,
          from_name: email.from || null,
          from_email: email.fromEmail || null,
          subject: email.subject || null,
          received_at: receivedAt,
          group_key: group,
          is_important: verdict.important,
          importance_reason: verdict.reason,
          classified_by: 'rules',
          sender_kind: null,
          message_id: email.messageId || null,
        };
        return row;
      });

    // Second opinion from the model, which knows what the sender organisations are.
    const aiVerdicts = await classifyEmailsWithAi(emails.map((email) => ({ uid: email.uid, from: email.from, fromEmail: email.fromEmail, subject: email.subject })));
    let aiClassified = 0;
    if (aiVerdicts) {
      rows.forEach((row) => {
        const verdict = aiVerdicts.get(row.uid);
        if (!verdict) return;
        row.group_key = verdict.group;
        row.is_important = verdict.important;
        row.importance_reason = verdict.reason || row.importance_reason;
        row.sender_kind = verdict.senderKind || null;
        row.classified_by = 'ai';
        aiClassified += 1;
      });
    }

    const stored = await upsertStoredEmails(rows);
    await markInboxSynced(now);
    if (mode === 'backfill') await markBackfillComplete(now);
    await finishSyncRun(runId, { fetched: emails.length, stored });
    return { mode, since: since.toISOString(), fetched: emails.length, stored, ai_classified: aiClassified };
  } catch (error) {
    await finishSyncRun(runId, { fetched: 0, stored: 0, error: error instanceof Error ? error.message : 'Sync failed' });
    throw error;
  }
}

/** Runs the model over stored emails that only have a rule-based verdict (for example, from a pull made before the AI pass existed). */
async function reclassifyStoredEmails(triggeredBy: string, options: { limit?: number; timeBudgetMs?: number }): Promise<SyncResult> {
  const now = new Date();
  const limit = Math.min(Math.max(options.limit ?? 800, 40), 3000);
  const deadline = Date.now() + (options.timeBudgetMs ?? 200_000);
  const runId = await recordSyncRun({ mode: 'reclassify', since: now, triggeredBy });
  try {
    let looked = 0;
    let updated = 0;
    // Work in slices so a partial run still commits progress and stays inside the function time limit.
    while (looked < limit && Date.now() < deadline) {
      const pending = await listRuleClassifiedEmails(Math.min(200, limit - looked));
      if (pending.length === 0) break;
      const verdicts = await classifyEmailsWithAi(
        pending.map((row) => ({ uid: row.uid, from: row.from_name || '', fromEmail: row.from_email || '', subject: row.subject || '' })),
      );
      if (!verdicts) throw new Error('Add an OpenAI API key in Settings to sort emails with AI');
      let sliceUpdated = 0;
      for (const row of pending) {
        const verdict = verdicts.get(row.uid);
        if (!verdict) continue;
        await applyClassification(row.id, {
          group_key: verdict.group,
          is_important: verdict.important,
          importance_reason: verdict.reason || row.importance_reason || '',
          sender_kind: verdict.senderKind || null,
          classified_by: 'ai',
        });
        sliceUpdated += 1;
      }
      looked += pending.length;
      updated += sliceUpdated;
      // If the model answered for none of them (outage), stop rather than spin on the same rows.
      if (sliceUpdated === 0) break;
    }
    await finishSyncRun(runId, { fetched: looked, stored: updated });
    return { mode: 'reclassify', since: now.toISOString(), fetched: looked, stored: updated, ai_classified: updated };
  } catch (error) {
    await finishSyncRun(runId, { fetched: 0, stored: 0, error: error instanceof Error ? error.message : 'Reclassify failed' });
    throw error;
  }
}
