import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/current-user';
import { writeAuditEntry } from '@/lib/audit/write-audit-entry';
import { runInboxSync, type SyncMode } from '@/lib/email/inbox-sync';
import { getInboxSyncState } from '@/lib/email/inbox-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// A three-month backfill can take a few minutes on a busy mailbox.
export const maxDuration = 300;

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ data: await getInboxSyncState() });
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const mode: SyncMode = body.mode === 'backfill' ? 'backfill' : 'daily';

    const result = await runInboxSync(mode, `user:${user.id}`);

    await writeAuditEntry({
      actor: user,
      action: mode === 'backfill' ? 'inbox.backfilled' : 'inbox.synced',
      entityType: 'setting',
      entityId: 'inbox',
      metadata: result,
    });

    return NextResponse.json({ data: { ...result, sync: await getInboxSyncState() } });
  } catch (error) {
    console.error('Inbox sync failed:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Inbox sync failed' }, { status: 502 });
  }
}
