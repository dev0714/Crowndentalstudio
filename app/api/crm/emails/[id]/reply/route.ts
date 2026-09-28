import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/current-user';
import { writeAuditEntry } from '@/lib/audit/write-audit-entry';
import { supabaseServer } from '@/lib/supabase/server';
import { sendResendEmail } from '@/lib/notifications/resend';
import { getResendFromEmail } from '@/lib/settings/notifications';
import { escapeText, htmlToText } from '@/lib/email/mime';
import { getStoredEmailById, recordReply } from '@/lib/email/inbox-store';
import { formatDateTimeSA } from '@/lib/sa-formatting';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function quoteOriginal(text: string) {
  return text
    .split('\n')
    .slice(0, 200)
    .map((line) => `> ${line}`)
    .join('\n');
}

/** Sends a reply to a stored email from the practice's Resend address and records it. */
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await context.params;
    if (!UUID.test(id)) return NextResponse.json({ error: 'Invalid email id' }, { status: 400 });

    const email = await getStoredEmailById(id);
    if (!email) return NextResponse.json({ error: 'Email not found' }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const to = String(body.to || email.from_email || '').trim().toLowerCase();
    const subject = String(body.subject || '').trim() || `Re: ${email.subject || ''}`.trim();
    const message = String(body.body || '').trim();

    if (!EMAIL.test(to)) return NextResponse.json({ error: 'Enter a valid recipient email address' }, { status: 400 });
    if (!message) return NextResponse.json({ error: 'Write a message before sending' }, { status: 400 });
    if (message.length > 20000) return NextResponse.json({ error: 'The reply is too long' }, { status: 400 });

    const original = email.body_text || (email.body_html ? htmlToText(email.body_html) : '');
    const attribution = `On ${formatDateTimeSA(email.received_at)}, ${email.from_name || email.from_email || 'they'} wrote:`;
    const text = original ? `${message}\n\n${attribution}\n${quoteOriginal(original)}` : message;
    const html = [
      `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:14px;line-height:1.6;color:#0b1f3a;white-space:pre-wrap;word-break:break-word">${escapeText(message)}</div>`,
      original
        ? `<div style="margin-top:20px;color:#5b6b7f;font-size:13px">${escapeText(attribution)}</div><blockquote style="margin:6px 0 0;padding-left:12px;border-left:3px solid #e6e1d8;color:#5b6b7f;font-size:13px;white-space:pre-wrap;word-break:break-word">${escapeText(original.split('\n').slice(0, 200).join('\n'))}</blockquote>`
        : '',
    ].join('');

    const fromAddress = await getResendFromEmail();
    const headers: Record<string, string> = {};
    if (email.message_id) {
      headers['In-Reply-To'] = email.message_id;
      headers['References'] = email.message_id;
    }

    const result = await sendResendEmail({
      to,
      subject,
      html,
      text,
      headers,
      ...(fromAddress ? { replyTo: fromAddress } : {}),
    });

    const reply = await recordReply({
      emailId: id,
      to,
      subject,
      body: message,
      resendId: result.ok ? result.id : null,
      sentBy: user.id,
      sentByName: user.full_name || user.email || null,
      error: result.ok ? null : result.error,
    });

    if (result.ok) {
      try {
        await supabaseServer.from('automation_events').insert([
          {
            patient_id: null,
            patient_name: email.from_name || to,
            channel: 'email',
            direction: 'outbound',
            status: 'sent',
            title: subject,
            message,
            source_system: 'crm',
            source_kind: 'inbox_reply',
            source_id: id,
            external_id: result.id,
            occurred_at: new Date().toISOString(),
            payload: { to, in_reply_to: email.message_id || null },
            created_by: user.id,
            updated_by: user.id,
          },
        ]);
      } catch (eventError) {
        console.warn('[inbox] Failed to log reply event:', eventError);
      }
    }

    await writeAuditEntry({
      actor: user,
      action: result.ok ? 'inbox.reply_sent' : 'inbox.reply_failed',
      entityType: 'inbox_email',
      entityId: id,
      metadata: { to, subject, ok: result.ok, error: result.ok ? null : result.error },
    });

    if (!result.ok) {
      return NextResponse.json({ error: `Could not send the reply: ${result.error}`, data: { reply } }, { status: 502 });
    }
    return NextResponse.json({ data: { reply } }, { status: 201 });
  } catch (error) {
    console.error('Error sending reply:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to send reply' }, { status: 500 });
  }
}
