import 'server-only';

import { supabaseServer } from '@/lib/supabase/server';
import type { EmailGroupKey } from '@/lib/email/email-grouping';

export type StoredEmail = {
  id: string;
  uid: string;
  from_name: string | null;
  from_email: string | null;
  subject: string | null;
  received_at: string;
  group_key: EmailGroupKey;
  is_important: boolean;
  importance_reason: string | null;
};

export type StoredEmailInput = Omit<StoredEmail, 'id'> & { mailbox: string };

export const INBOX_LAST_SYNCED_SETTING = 'inbox_last_synced_at';
export const INBOX_BACKFILL_DONE_SETTING = 'inbox_backfill_completed_at';

const UPSERT_CHUNK = 500;

export async function upsertStoredEmails(rows: StoredEmailInput[]) {
  let stored = 0;
  for (let index = 0; index < rows.length; index += UPSERT_CHUNK) {
    const chunk = rows.slice(index, index + UPSERT_CHUNK).map((row) => ({ ...row, updated_at: new Date().toISOString() }));
    const { error, count } = await supabaseServer
      .from('inbox_emails')
      .upsert(chunk, { onConflict: 'mailbox,uid', ignoreDuplicates: false, count: 'exact' });
    if (error) throw new Error(error.message);
    stored += count ?? chunk.length;
  }
  return stored;
}

export async function queryStoredEmails(input: { from: Date; to: Date; limit?: number }) {
  const { data, error } = await supabaseServer
    .from('inbox_emails')
    .select('id, uid, from_name, from_email, subject, received_at, group_key, is_important, importance_reason')
    .gte('received_at', input.from.toISOString())
    .lte('received_at', input.to.toISOString())
    .order('received_at', { ascending: false })
    .limit(input.limit ?? 2000);
  if (error) throw new Error(error.message);
  return (data || []) as StoredEmail[];
}

export async function countStoredEmails() {
  const { count, error } = await supabaseServer.from('inbox_emails').select('id', { count: 'exact', head: true });
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function oldestStoredEmailDate() {
  const { data } = await supabaseServer.from('inbox_emails').select('received_at').order('received_at', { ascending: true }).limit(1).maybeSingle();
  return (data as { received_at?: string } | null)?.received_at || null;
}

async function readSetting(key: string) {
  const { data, error } = await supabaseServer.from('settings').select('setting_value').eq('setting_key', key).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as { setting_value?: string | null } | null)?.setting_value || null;
}

async function writeSetting(key: string, value: string, description: string) {
  const { error } = await supabaseServer
    .from('settings')
    .upsert([{ setting_key: key, setting_value: value, setting_type: 'text', description, updated_at: new Date().toISOString() }], { onConflict: 'setting_key' });
  if (error) throw new Error(error.message);
}

export async function getInboxSyncState() {
  const [lastSyncedAt, backfillCompletedAt, total, oldest, lastRun] = await Promise.all([
    readSetting(INBOX_LAST_SYNCED_SETTING),
    readSetting(INBOX_BACKFILL_DONE_SETTING),
    countStoredEmails(),
    oldestStoredEmailDate(),
    supabaseServer.from('inbox_sync_runs').select('mode, started_at, finished_at, fetched, stored, error').order('started_at', { ascending: false }).limit(1).maybeSingle(),
  ]);
  return {
    last_synced_at: lastSyncedAt,
    backfill_completed_at: backfillCompletedAt,
    stored_total: total,
    oldest_stored_at: oldest,
    last_run: (lastRun.data as Record<string, unknown> | null) || null,
  };
}

export async function markInboxSynced(at: Date) {
  await writeSetting(INBOX_LAST_SYNCED_SETTING, at.toISOString(), 'When the practice inbox was last pulled into the CRM');
}

export async function markBackfillComplete(at: Date) {
  await writeSetting(INBOX_BACKFILL_DONE_SETTING, at.toISOString(), 'When the three-month inbox backfill finished');
}

export async function recordSyncRun(input: { mode: string; since: Date; triggeredBy: string }) {
  const { data, error } = await supabaseServer
    .from('inbox_sync_runs')
    .insert([{ mode: input.mode, since: input.since.toISOString(), triggered_by: input.triggeredBy }])
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  return (data as { id: string }).id;
}

export async function finishSyncRun(id: string, result: { fetched: number; stored: number; error?: string | null }) {
  await supabaseServer
    .from('inbox_sync_runs')
    .update({ finished_at: new Date().toISOString(), fetched: result.fetched, stored: result.stored, error: result.error || null })
    .eq('id', id);
}
