import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { sendResendEmail } from '@/lib/notifications/resend';
import { getResendFromEmail } from '@/lib/settings/notifications';
import { bodyLinesToText, renderNotificationEmailHtml } from '@/lib/notifications/email-template';

export const runtime = 'nodejs';

const MAX = { name: 120, email: 200, phone: 40, service: 120, date: 40, message: 3000 };

function clean(value: unknown, max: number) {
  return String(value ?? '').trim().slice(0, max);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    // Honeypot: real visitors never fill this hidden field.
    if (clean(body.company, 50)) {
      return NextResponse.json({ data: { ok: true } });
    }

    const name = clean(body.name, MAX.name);
    const email = clean(body.email, MAX.email);
    const phone = clean(body.phone, MAX.phone);
    const service = clean(body.service, MAX.service);
    const date = clean(body.date, MAX.date);
    const message = clean(body.message, MAX.message);

    if (!name || !message || (!phone && !email)) {
      return NextResponse.json({ error: 'Please give us your name, a phone number or email, and a message.' }, { status: 400 });
    }
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json({ error: 'That email address doesn’t look right.' }, { status: 400 });
    }

    const [first_name, ...rest] = name.split(/\s+/);
    const last_name = rest.join(' ');
    const notes = [
      date ? `Preferred date: ${date}` : null,
      message,
      'Submitted via the website contact form.',
    ].filter(Boolean).join('\n\n');

    const { data, error } = await supabaseServer
      .from('leads')
      .insert([{
        first_name,
        last_name,
        email: email || null,
        phone: phone || null,
        source: 'Website',
        service_interested: service || null,
        status: 'New',
        notes,
      }])
      .select('id')
      .single();

    if (error) {
      console.error('Contact form lead insert failed:', error);
      return NextResponse.json({ error: 'We couldn’t save your message. Please call us on 081 207 8621.' }, { status: 500 });
    }

    // Tell the practice — best effort, never blocks the visitor.
    try {
      const to = process.env.CONTACT_NOTIFY_EMAIL || (await getResendFromEmail());
      if (to) {
        const heading = `New website enquiry from ${name}`;
        const lines = [
          `${name} sent a message through the website contact form.`,
          [phone && `Phone: ${phone}`, email && `Email: ${email}`, service && `Interested in: ${service}`, date && `Preferred date: ${date}`].filter(Boolean).join('\n'),
          message,
          'This enquiry has been added to Leads in the CRM.',
        ];
        await sendResendEmail({ to, subject: heading, html: renderNotificationEmailHtml(heading, lines), text: bodyLinesToText(lines) });
      }
    } catch (notifyError) {
      console.error('Contact form notification failed:', notifyError);
    }

    return NextResponse.json({ data: { ok: true, id: data?.id } }, { status: 201 });
  } catch (error) {
    console.error('Contact form error:', error);
    return NextResponse.json({ error: 'Something went wrong. Please call us on 081 207 8621.' }, { status: 500 });
  }
}
