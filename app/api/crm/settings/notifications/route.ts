import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/current-user';
import { assertRole } from '@/lib/auth/permissions';
import { writeAuditEntry } from '@/lib/audit/write-audit-entry';
import { getNotificationSettingsStatus, saveNotificationSettings } from '@/lib/settings/notifications';

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
    const data = await getNotificationSettingsStatus();
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error fetching notification settings:', error);
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to fetch notification settings' }, { status: 500 });
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
    const apiKey = typeof body.resend_api_key === 'string' ? body.resend_api_key : undefined;
    const fromEmail = typeof body.from_email === 'string' ? body.from_email : undefined;
    const labNotificationsEnabled =
      typeof body.lab_notifications_enabled === 'boolean' ? body.lab_notifications_enabled : undefined;

    if (fromEmail !== undefined && fromEmail.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(fromEmail.trim())) {
      return NextResponse.json({ error: 'Enter a valid from email address' }, { status: 400 });
    }

    if (apiKey === undefined && fromEmail === undefined && labNotificationsEnabled === undefined) {
      return NextResponse.json({ error: 'No settings provided' }, { status: 400 });
    }

    const data = await saveNotificationSettings(
      { apiKey, fromEmail, labNotificationsEnabled },
      user.id,
    );

    await writeAuditEntry({
      actor: user,
      action: 'settings.notifications.updated',
      entityType: 'setting',
      entityId: 'notifications',
      metadata: {
        resend_key_changed: Boolean(apiKey && apiKey.trim()),
        from_email_changed: fromEmail !== undefined,
        lab_notifications_enabled: data.lab_notifications_enabled,
      },
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error saving notification settings:', error);
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save notification settings' },
      { status: 500 },
    );
  }
}
