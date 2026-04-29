import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/current-user';
import { assertRole } from '@/lib/auth/permissions';
import { writeAuditEntry } from '@/lib/audit/write-audit-entry';
import { getOpenAiApiKeyStatus, saveOpenAiApiKey } from '@/lib/settings/openai-key';

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
    const data = await getOpenAiApiKeyStatus();
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error fetching OpenAI settings:', error);
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to fetch OpenAI settings' }, { status: 500 });
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
    const apiKey = String(body.openai_api_key || '').trim();

    if (!apiKey) {
      return NextResponse.json({ error: 'OpenAI API key is required' }, { status: 400 });
    }

    const data = await saveOpenAiApiKey(apiKey, user.id);
    await writeAuditEntry({
      actor: user,
      action: 'settings.openai_api_key.updated',
      entityType: 'setting',
      entityId: 'openai_api_key',
      metadata: { configured: true },
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error saving OpenAI settings:', error);
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to save OpenAI settings' }, { status: 500 });
  }
}
