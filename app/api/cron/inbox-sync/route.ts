import { NextRequest, NextResponse } from 'next/server';
import { runInboxSync } from '@/lib/email/inbox-sync';
import { getInboxSyncState } from '@/lib/email/inbox-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Daily pull of the practice inbox, scheduled in vercel.json. Vercel sends
 * `Authorization: Bearer <CRON_SECRET>` when that environment variable is set;
 * without the secret configured the route refuses to run.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET is not configured' }, { status: 500 });
  }
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const state = await getInboxSyncState();
    // The first scheduled run on a fresh install does the full backfill; after that it is incremental.
    const mode = state.backfill_completed_at ? 'daily' : 'backfill';
    const result = await runInboxSync(mode, 'cron');
    // Anything still sorted by rules only (e.g. after an AI outage) gets the model's verdict now.
    const after = await getInboxSyncState();
    const reclassified = after.awaiting_ai > 0 ? await runInboxSync('reclassify', 'cron', { limit: 600, timeBudgetMs: 150_000 }).catch(() => null) : null;
    return NextResponse.json({ data: { ...result, reclassified } });
  } catch (error) {
    console.error('Scheduled inbox sync failed:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Inbox sync failed' }, { status: 502 });
  }
}
