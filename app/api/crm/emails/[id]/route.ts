import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/current-user';
import { getImapConfig } from '@/lib/settings/email-inbox';
import { fetchEmailBody } from '@/lib/email/imap-client';
import { parseMimeMessage, sanitizeEmailHtml } from '@/lib/email/mime';
import { getStoredEmailById, listReplies, saveEmailBody } from '@/lib/email/inbox-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** One stored email with its body, fetched from the mail server the first time it is opened. */
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await context.params;
    if (!UUID.test(id)) return NextResponse.json({ error: 'Invalid email id' }, { status: 400 });

    let email = await getStoredEmailById(id);
    if (!email) return NextResponse.json({ error: 'Email not found' }, { status: 404 });

    const refresh = new URL(request.url).searchParams.get('refresh') === '1';
    let bodyError: string | null = null;
    if (!email.body_fetched_at || refresh) {
      const config = await getImapConfig();
      if (!config) {
        bodyError = 'Email inbox is not configured. Add your IMAP details in Settings.';
      } else {
        try {
          const { raw } = await fetchEmailBody(config, email.uid);
          const parsed = parseMimeMessage(raw);
          await saveEmailBody(id, { text: parsed.text, html: parsed.html, hasAttachments: parsed.hasAttachments, messageId: parsed.messageId });
          email = (await getStoredEmailById(id)) || email;
        } catch (imapError) {
          console.error('Fetching email body failed:', imapError);
          bodyError = imapError instanceof Error ? imapError.message : 'Could not fetch the message from the mail server';
        }
      }
    }

    const replies = await listReplies(id);

    return NextResponse.json({
      data: {
        email: {
          id: email.id,
          uid: email.uid,
          from: email.from_name || email.from_email || '',
          fromEmail: email.from_email || '',
          subject: email.subject || '(no subject)',
          date: email.received_at,
          group: email.group_key,
          important: email.is_important,
          reason: email.importance_reason || '',
          senderKind: email.sender_kind || '',
          hasAttachments: email.has_attachments,
          bodyFetchedAt: email.body_fetched_at,
        },
        body: {
          text: email.body_text || '',
          html: email.body_html ? sanitizeEmailHtml(email.body_html) : '',
        },
        body_error: bodyError,
        replies,
      },
    });
  } catch (error) {
    console.error('Error loading email:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to load email' }, { status: 500 });
  }
}
