import 'server-only';

import { supabaseServer } from '@/lib/supabase/server';
import { sendResendEmail } from '@/lib/notifications/resend';
import { bodyLinesToText, renderNotificationEmailHtml } from '@/lib/notifications/email-template';

const PRACTICE_NAME = 'Crown Dental Studio';

export type PatientMessageDelivery = {
  channel: string;
  status: 'sent' | 'failed' | 'recorded';
  detail: string;
};

type DeliverInput = {
  channel: string;
  content: string;
  patientId: string;
  actorUserId: string | null;
};

async function logAutomationEvent(row: {
  patient_id: string;
  patient_name: string;
  status: 'sent' | 'failed';
  title: string;
  message: string;
  external_id: string | null;
  created_by: string | null;
  metadata: Record<string, unknown>;
}) {
  try {
    await supabaseServer.from('automation_events').insert([
      {
        patient_id: row.patient_id,
        patient_name: row.patient_name,
        channel: 'email',
        direction: 'outbound',
        status: row.status,
        title: row.title,
        message: row.message,
        source_system: 'crm',
        source_kind: 'patient_message',
        source_id: row.patient_id,
        external_id: row.external_id,
        occurred_at: new Date().toISOString(),
        resolved_at: row.status === 'sent' ? new Date().toISOString() : null,
        payload: {},
        metadata: row.metadata,
        created_by: row.created_by,
      },
    ]);
  } catch (error) {
    console.error('Failed to log patient message automation event:', error);
  }
}

// Actually delivers a patient message when the channel supports it.
// Only 'email' can be sent (via Resend); other channels are recorded for the log only.
// Always resolves — delivery failures must never break recording the message.
export async function deliverPatientMessage(input: DeliverInput): Promise<PatientMessageDelivery> {
  const channel = (input.channel || '').toLowerCase();
  const content = input.content?.trim() || '';

  if (channel !== 'email') {
    return {
      channel,
      status: 'recorded',
      detail: 'Recorded in the patient log. No sending provider is connected for this channel yet.',
    };
  }

  if (!content) {
    return { channel, status: 'failed', detail: 'Message content is empty' };
  }

  const { data: patient, error } = await supabaseServer
    .from('patients')
    .select('first_name, last_name, email')
    .eq('id', input.patientId)
    .maybeSingle<{ first_name: string | null; last_name: string | null; email: string | null }>();

  if (error) {
    console.error('Failed to load patient for message delivery:', error);
    return { channel, status: 'failed', detail: 'Could not load the patient record' };
  }

  const patientName = `${patient?.first_name || ''} ${patient?.last_name || ''}`.trim() || 'Patient';
  const email = patient?.email?.trim();

  if (!email) {
    return { channel, status: 'failed', detail: 'Patient has no email address on file' };
  }

  const heading = `A message from ${PRACTICE_NAME}`;
  const bodyLines = [
    `Hi ${patientName.split(' ')[0] || 'there'},`,
    content,
    `Thank you,\n${PRACTICE_NAME}`,
  ];

  const result = await sendResendEmail({
    to: email,
    subject: heading,
    html: renderNotificationEmailHtml(heading, bodyLines),
    text: bodyLinesToText(bodyLines),
  });

  await logAutomationEvent({
    patient_id: input.patientId,
    patient_name: patientName,
    status: result.ok ? 'sent' : 'failed',
    title: heading,
    message: result.ok ? content : `Failed to send: ${result.error}`,
    external_id: result.ok && result.id ? `resend:${result.id}` : null,
    created_by: input.actorUserId,
    metadata: { channel: 'email', to: email },
  });

  return result.ok
    ? { channel, status: 'sent', detail: `Sent to ${email}` }
    : { channel, status: 'failed', detail: result.error };
}
