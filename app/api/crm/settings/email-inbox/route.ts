import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/current-user';
import { assertRole } from '@/lib/auth/permissions';
import { writeAuditEntry } from '@/lib/audit/write-audit-entry';
import { getImapConfigStatus, saveImapConfig } from '@/lib/settings/email-inbox';

function ensureSettingsAdminAccess(userRole: string) {
  assertRole(userRole, ['CEO', 'Admin']);
}

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    ensureSettingsAdminAccess(user.role);
    const data = await getImapConfigStatus();
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error fetching email inbox settings:', error);
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to fetch email inbox settings' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    ensureSettingsAdminAccess(user.role);

    const body = await request.json();
    const host = typeof body.host === 'string' ? body.host : undefined;
    const user_ = typeof body.user === 'string' ? body.user : undefined;
    const password = typeof body.password === 'string' ? body.password : undefined;
    const tls = typeof body.tls === 'boolean' ? body.tls : undefined;
    const mailbox = typeof body.mailbox === 'string' ? body.mailbox : undefined;
    const port =
      body.port === '' || body.port == null ? undefined : Number(body.port);

    if (port !== undefined && (!Number.isFinite(port) || port <= 0 || port > 65535)) {
      return NextResponse.json({ error: 'Enter a valid port number' }, { status: 400 });
    }

    if (
      host === undefined &&
      user_ === undefined &&
      password === undefined &&
      tls === undefined &&
      mailbox === undefined &&
      port === undefined
    ) {
      return NextResponse.json({ error: 'No settings provided' }, { status: 400 });
    }

    const data = await saveImapConfig(
      { host, user: user_, password, tls, mailbox, port: port ?? null },
      user.id,
    );

    await writeAuditEntry({
      actor: user,
      action: 'settings.email_inbox.updated',
      entityType: 'setting',
      entityId: 'email_inbox',
      metadata: { host: data.host, port: data.port, configured: data.configured },
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error saving email inbox settings:', error);
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save email inbox settings' },
      { status: 500 },
    );
  }
}
