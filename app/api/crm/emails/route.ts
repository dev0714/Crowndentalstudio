import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/current-user';
import { getImapConfig } from '@/lib/settings/email-inbox';
import { EMAIL_GROUP_LABELS, type EmailGroupKey, type EmailGroupSummary } from '@/lib/email/email-grouping';
import { summarizeEmailDigest } from '@/lib/email/summarize';
import { getInboxSyncState, queryStoredEmails, type StoredEmail } from '@/lib/email/inbox-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SA_OFFSET = '+02:00';
const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

function todayKey() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Johannesburg' }).format(new Date());
}

function shiftKey(key: string, days: number) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function toApiEmail(row: StoredEmail) {
  return {
    id: row.id,
    uid: row.uid,
    from: row.from_name || row.from_email || '',
    fromEmail: row.from_email || '',
    subject: row.subject || '(no subject)',
    date: row.received_at,
    group: row.group_key,
    important: row.is_important,
    reason: row.importance_reason || '',
    senderKind: row.sender_kind || '',
    classifiedBy: row.classified_by || 'rules',
  };
}

const GROUP_ORDER: EmailGroupKey[] = ['lab', 'appointments', 'accounts', 'suppliers', 'patient_enquiries', 'marketing', 'other'];

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const config = await getImapConfig();
    if (!config) {
      return NextResponse.json({ error: 'Email inbox is not configured. Add your IMAP details in Settings.' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const today = todayKey();
    const toKey = DAY_KEY.test(searchParams.get('to') || '') ? String(searchParams.get('to')) : today;
    const fromKey = DAY_KEY.test(searchParams.get('from') || '') ? String(searchParams.get('from')) : shiftKey(toKey, -1);
    if (fromKey > toKey) {
      return NextResponse.json({ error: 'The from date must be on or before the to date' }, { status: 400 });
    }
    const from = new Date(`${fromKey}T00:00:00.000${SA_OFFSET}`);
    const to = new Date(`${toKey}T23:59:59.999${SA_OFFSET}`);
    const wantSummary = searchParams.get('summarize') === '1';

    const [rows, sync] = await Promise.all([queryStoredEmails({ from, to }), getInboxSyncState()]);
    const emails = rows.map(toApiEmail);
    const important = emails.filter((email) => email.important);

    const groupsOf = (list: typeof emails): EmailGroupSummary[] =>
      GROUP_ORDER.map((key) => ({
        key,
        label: EMAIL_GROUP_LABELS[key],
        count: list.filter((email) => email.group === key).length,
        emails: list.filter((email) => email.group === key),
      })).filter((group) => group.count > 0);

    let digest = null;
    let summaryError: string | null = null;
    if (wantSummary && important.length > 0) {
      const periodLabel = fromKey === toKey ? `${fromKey}` : `${fromKey} to ${toKey}`;
      try {
        digest = await summarizeEmailDigest(groupsOf(important.slice(0, 150)), periodLabel);
      } catch (aiError) {
        console.error('Email summary failed:', aiError);
        summaryError = aiError instanceof Error ? aiError.message : 'Failed to summarize emails';
      }
    }

    return NextResponse.json({
      data: {
        from: fromKey,
        to: toKey,
        today,
        total: emails.length,
        important_total: important.length,
        emails,
        digest,
        summary_error: summaryError,
        sync,
      },
    });
  } catch (error) {
    console.error('Error loading emails:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to load emails' }, { status: 500 });
  }
}
