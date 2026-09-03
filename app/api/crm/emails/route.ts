import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/current-user';
import { getImapConfig } from '@/lib/settings/email-inbox';
import { fetchRecentEmails } from '@/lib/email/imap-client';
import { groupEmails } from '@/lib/email/email-grouping';
import { summarizeEmailDigest } from '@/lib/email/summarize';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const HOURS_48_MS = 48 * 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const config = await getImapConfig();
    if (!config) {
      return NextResponse.json(
        { error: 'Email inbox is not configured. Add your IMAP details in Settings.' },
        { status: 400 },
      );
    }

    const { searchParams } = new URL(request.url);
    const hours = Math.min(Math.max(Number(searchParams.get('hours')) || 48, 1), 168);
    const since = new Date(Date.now() - (hours === 48 ? HOURS_48_MS : hours * 60 * 60 * 1000));
    const wantSummary = searchParams.get('summarize') === '1';

    let emails;
    try {
      emails = await fetchRecentEmails(config, since);
    } catch (imapError) {
      console.error('IMAP fetch failed:', imapError);
      return NextResponse.json(
        { error: `Could not reach the mail server: ${imapError instanceof Error ? imapError.message : 'unknown error'}` },
        { status: 502 },
      );
    }

    const groups = groupEmails(emails);

    let digest = null;
    let summaryError: string | null = null;
    if (wantSummary) {
      try {
        digest = await summarizeEmailDigest(groups);
      } catch (aiError) {
        console.error('Email summary failed:', aiError);
        summaryError = aiError instanceof Error ? aiError.message : 'Failed to summarize emails';
      }
    }

    return NextResponse.json({
      data: {
        since: since.toISOString(),
        total: emails.length,
        groups,
        digest,
        summary_error: summaryError,
      },
    });
  } catch (error) {
    console.error('Error loading emails:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load emails' },
      { status: 500 },
    );
  }
}
