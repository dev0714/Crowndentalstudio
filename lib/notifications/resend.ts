import 'server-only';

import { getResendApiKey, getResendFromEmail } from '@/lib/settings/notifications';

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type SendEmailResult =
  | { ok: true; id: string | null }
  | { ok: false; error: string };

export async function sendResendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const [apiKey, fromEmail] = await Promise.all([getResendApiKey(), getResendFromEmail()]);

  if (!apiKey) {
    return { ok: false, error: 'Resend API key is not configured' };
  }
  if (!fromEmail) {
    return { ok: false, error: 'Notification from-address is not configured' };
  }
  if (!input.to) {
    return { ok: false, error: 'Recipient has no email address' };
  }

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message =
        (payload as { message?: string; error?: string }).message ||
        (payload as { error?: string }).error ||
        `Resend responded with ${response.status}`;
      return { ok: false, error: message };
    }

    return { ok: true, id: (payload as { id?: string }).id || null };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Failed to reach Resend' };
  }
}
