import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/current-user';
import { assertRole } from '@/lib/auth/permissions';
import { writeAuditEntry } from '@/lib/audit/write-audit-entry';
import { sendResendEmail } from '@/lib/notifications/resend';
import { bodyLinesToText, renderNotificationEmailHtml } from '@/lib/notifications/email-template';

function ensureSettingsAdminAccess(userRole: string) {
  assertRole(userRole, ['CEO', 'Admin']);
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    ensureSettingsAdminAccess(user.role);

    const body = await request.json();
    const to = String(body.to || '').trim();

    if (!to || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
      return NextResponse.json({ error: 'Enter a valid email address to send the test to' }, { status: 400 });
    }

    const heading = 'Test email from Crown Dental Studio';
    const bodyLines = [
      'This is a test message from your Crown Dental Studio system.',
      'If you received this, your Resend API key and sending address are configured correctly, and patient notifications will be delivered.',
      'You can safely ignore this email.',
    ];

    const result = await sendResendEmail({
      to,
      subject: heading,
      html: renderNotificationEmailHtml(heading, bodyLines),
      text: bodyLinesToText(bodyLines),
    });

    await writeAuditEntry({
      actor: user,
      action: 'settings.notifications.test_sent',
      entityType: 'setting',
      entityId: 'notifications',
      metadata: { to, ok: result.ok, error: result.ok ? null : result.error },
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 502 });
    }

    return NextResponse.json({ data: { sent: true, id: result.id, to } });
  } catch (error) {
    console.error('Error sending test email:', error);
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send test email' },
      { status: 500 },
    );
  }
}
