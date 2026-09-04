import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/current-user';
import { assertRole } from '@/lib/auth/permissions';
import { writeAuditEntry } from '@/lib/audit/write-audit-entry';
import { getImapConfig } from '@/lib/settings/email-inbox';
import { testImapConnection } from '@/lib/email/imap-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function ensureSettingsAdminAccess(userRole: string) {
  assertRole(userRole, ['CEO', 'Admin']);
}

export async function POST() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    ensureSettingsAdminAccess(user.role);

    const config = await getImapConfig();
    if (!config) {
      return NextResponse.json(
        { error: 'Save your IMAP host, username and password first, then test.' },
        { status: 400 },
      );
    }

    let result;
    try {
      result = await testImapConnection(config);
    } catch (imapError) {
      const message = imapError instanceof Error ? imapError.message : 'Could not connect to the mail server';
      await writeAuditEntry({
        actor: user,
        action: 'settings.email_inbox.test',
        entityType: 'setting',
        entityId: 'email_inbox',
        metadata: { ok: false, error: message },
      });
      return NextResponse.json({ error: message }, { status: 502 });
    }

    await writeAuditEntry({
      actor: user,
      action: 'settings.email_inbox.test',
      entityType: 'setting',
      entityId: 'email_inbox',
      metadata: { ok: true, host: config.host, mailbox: config.mailbox },
    });

    return NextResponse.json({
      data: {
        ok: true,
        host: config.host,
        mailbox: config.mailbox,
        message_count: result.messageCount,
      },
    });
  } catch (error) {
    console.error('Error testing email inbox connection:', error);
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to test connection' },
      { status: 500 },
    );
  }
}
