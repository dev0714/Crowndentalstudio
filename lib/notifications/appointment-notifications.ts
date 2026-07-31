import 'server-only';

import { supabaseServer } from '@/lib/supabase/server';
import { areAppointmentNotificationsEnabled } from '@/lib/settings/notifications';
import { sendResendEmail } from '@/lib/notifications/resend';
import {
  appointmentMessageToHtml,
  appointmentMessageToText,
  buildAppointmentNotification,
  type AppointmentNotificationKind,
} from '@/lib/notifications/appointment-message';

type NotifyInput = {
  kind: AppointmentNotificationKind;
  appointmentId: string;
  patientId: string | null | undefined;
  appointmentDate?: string | null;
  appointmentType?: string | null;
  durationMinutes?: number | null;
  roomNumber?: string | null;
  actorUserId: string | null;
};

export type NotifyResult = {
  attempted: boolean;
  sent: boolean;
  reason?: string;
};

async function logAutomationEvent(row: {
  patient_id: string | null;
  patient_name: string;
  status: 'sent' | 'failed';
  title: string;
  message: string;
  source_id: string;
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
        source_kind: 'appointment',
        source_id: row.source_id,
        external_id: row.external_id,
        occurred_at: new Date().toISOString(),
        resolved_at: row.status === 'sent' ? new Date().toISOString() : null,
        payload: {},
        metadata: row.metadata,
        created_by: row.created_by,
      },
    ]);
  } catch (error) {
    console.error('Failed to log appointment notification automation event:', error);
  }
}

// Emails a patient when their appointment is booked, rescheduled or cancelled.
// Always resolves — notification failures must never break the appointment write.
export async function notifyPatientOfAppointment(input: NotifyInput): Promise<NotifyResult> {
  let enabled = false;
  try {
    enabled = await areAppointmentNotificationsEnabled();
  } catch (error) {
    console.error('Failed to read appointment notification settings:', error);
    return { attempted: false, sent: false, reason: 'Could not read notification settings' };
  }

  if (!enabled) {
    return { attempted: false, sent: false, reason: 'Appointment notifications are disabled' };
  }

  if (!input.patientId) {
    return { attempted: false, sent: false, reason: 'Appointment has no linked patient' };
  }

  const { data: patient, error } = await supabaseServer
    .from('patients')
    .select('first_name, last_name, email')
    .eq('id', input.patientId)
    .maybeSingle<{ first_name: string | null; last_name: string | null; email: string | null }>();

  if (error) {
    console.error('Failed to load patient for appointment notification:', error);
    return { attempted: false, sent: false, reason: 'Could not load patient' };
  }

  const patientName = `${patient?.first_name || ''} ${patient?.last_name || ''}`.trim() || 'Patient';
  const email = patient?.email?.trim();

  const message = buildAppointmentNotification(input.kind, {
    patientName,
    appointmentDate: input.appointmentDate,
    appointmentType: input.appointmentType,
    durationMinutes: input.durationMinutes,
    roomNumber: input.roomNumber,
  });

  if (!email) {
    return { attempted: false, sent: false, reason: 'Patient has no email address' };
  }

  const result = await sendResendEmail({
    to: email,
    subject: message.subject,
    html: appointmentMessageToHtml(message),
    text: appointmentMessageToText(message),
  });

  await logAutomationEvent({
    patient_id: input.patientId,
    patient_name: patientName,
    status: result.ok ? 'sent' : 'failed',
    title: message.subject,
    message: result.ok ? appointmentMessageToText(message) : `Failed to send: ${result.error}`,
    source_id: input.appointmentId,
    external_id: result.ok && result.id ? `resend:${result.id}` : null,
    created_by: input.actorUserId,
    metadata: { kind: input.kind, channel: 'email', to: email },
  });

  return result.ok
    ? { attempted: true, sent: true }
    : { attempted: true, sent: false, reason: result.error };
}
