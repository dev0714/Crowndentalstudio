import 'server-only';

import { supabaseServer } from '@/lib/supabase/server';
import { areLabNotificationsEnabled } from '@/lib/settings/notifications';
import { sendResendEmail } from '@/lib/notifications/resend';
import {
  buildLabStageNotification,
  labStageMessageToHtml,
  labStageMessageToText,
} from '@/lib/notifications/lab-stage-message';

type NotifyInput = {
  stage: string;
  patientId: string | null | undefined;
  caseType?: string | null;
  labName?: string | null;
  labCaseId: string;
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
        source_kind: 'lab_case_stage',
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
    // Never let logging failures affect the workflow update.
    console.error('Failed to log lab notification automation event:', error);
  }
}

// Sends a patient email when a lab case reaches a patient-relevant stage.
// Always resolves — notification failures must never break the workflow update.
export async function notifyPatientOfLabStage(input: NotifyInput): Promise<NotifyResult> {
  const message = buildLabStageNotification(input.stage, { caseType: input.caseType, labName: input.labName });
  if (!message) {
    return { attempted: false, sent: false, reason: 'Stage does not notify patients' };
  }

  let enabled = false;
  try {
    enabled = await areLabNotificationsEnabled();
  } catch (error) {
    console.error('Failed to read lab notification settings:', error);
    return { attempted: false, sent: false, reason: 'Could not read notification settings' };
  }

  if (!enabled) {
    return { attempted: false, sent: false, reason: 'Lab notifications are disabled' };
  }

  if (!input.patientId) {
    return { attempted: false, sent: false, reason: 'Lab case has no linked patient' };
  }

  const { data: patient, error } = await supabaseServer
    .from('patients')
    .select('first_name, last_name, email')
    .eq('id', input.patientId)
    .maybeSingle<{ first_name: string | null; last_name: string | null; email: string | null }>();

  if (error) {
    console.error('Failed to load patient for lab notification:', error);
    return { attempted: false, sent: false, reason: 'Could not load patient' };
  }

  const patientName = `${patient?.first_name || ''} ${patient?.last_name || ''}`.trim() || 'Patient';
  const email = patient?.email?.trim();

  // Rebuild the message with the patient's name now that we have it.
  const personalized = buildLabStageNotification(input.stage, {
    patientName,
    caseType: input.caseType,
    labName: input.labName,
  });
  const finalMessage = personalized || message;

  if (!email) {
    return { attempted: false, sent: false, reason: 'Patient has no email address' };
  }

  const result = await sendResendEmail({
    to: email,
    subject: finalMessage.subject,
    html: labStageMessageToHtml(finalMessage),
    text: labStageMessageToText(finalMessage),
  });

  await logAutomationEvent({
    patient_id: input.patientId,
    patient_name: patientName,
    status: result.ok ? 'sent' : 'failed',
    title: finalMessage.subject,
    message: result.ok ? labStageMessageToText(finalMessage) : `Failed to send: ${result.error}`,
    source_id: input.labCaseId,
    external_id: result.ok && result.id ? `resend:${result.id}` : null,
    created_by: input.actorUserId,
    metadata: { stage: input.stage, channel: 'email', to: email },
  });

  return result.ok
    ? { attempted: true, sent: true }
    : { attempted: true, sent: false, reason: result.error };
}
