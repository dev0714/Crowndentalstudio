import { LAB_WORKFLOW_STAGE } from '@/lib/workflows/status-definitions';

export type LabStageMessage = {
  subject: string;
  heading: string;
  bodyLines: string[];
};

export type LabStageMessageContext = {
  patientName?: string | null;
  caseType?: string | null;
  labName?: string | null;
};

const PRACTICE_NAME = 'Crown Dental Studio';

function greeting(patientName?: string | null) {
  const name = patientName?.trim();
  return name ? `Hi ${name},` : 'Hi there,';
}

function caseDescription(caseType?: string | null) {
  const type = caseType?.trim();
  return type ? `your ${type.toLowerCase()}` : 'your dental work';
}

// Returns the patient-facing message for stages that are meaningful to the patient,
// or null for internal stages that should not trigger a notification.
export function buildLabStageNotification(
  stage: string,
  ctx: LabStageMessageContext = {},
): LabStageMessage | null {
  const work = caseDescription(ctx.caseType);
  const lab = ctx.labName?.trim();

  switch (stage) {
    case LAB_WORKFLOW_STAGE.AT_LAB:
      return {
        subject: `Update on ${work} — now at the lab`,
        heading: `${caseDescription(ctx.caseType).replace(/^your/, 'Your')} is at the lab`,
        bodyLines: [
          greeting(ctx.patientName),
          `This is a quick update from ${PRACTICE_NAME}. ${work.replace(/^your/, 'Your')} has been collected from ${PRACTICE_NAME} and is now${lab ? ` at ${lab}` : ' at the lab'} being made.`,
          `We'll let you know as soon as it's ready and back with us so we can arrange your next visit.`,
          `Thank you,\n${PRACTICE_NAME}`,
        ],
      };
    case LAB_WORKFLOW_STAGE.DELIVERED_TO_STUDIO:
      return {
        subject: `${work.replace(/^your/, 'Your')} is back at ${PRACTICE_NAME}`,
        heading: `${work.replace(/^your/, 'Your')} has arrived`,
        bodyLines: [
          greeting(ctx.patientName),
          `Good news from ${PRACTICE_NAME}. ${work.replace(/^your/, 'Your')} has been delivered back to us and is ready for you.`,
          `Please contact us, or wait for our call, to arrange a convenient time to come in.`,
          `Thank you,\n${PRACTICE_NAME}`,
        ],
      };
    default:
      return null;
  }
}

export function labStageMessageToHtml(message: LabStageMessage) {
  const paragraphs = message.bodyLines
    .map(
      (line) =>
        `<p style="margin:0 0 16px;color:#334155;font-size:15px;line-height:1.6;">${line
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/\n/g, '<br />')}</p>`,
    )
    .join('');

  return `<!doctype html>
<html>
  <body style="margin:0;background:#f1f5f9;padding:24px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
      <tr>
        <td style="background:linear-gradient(90deg,#2563eb,#0891b2);padding:24px 28px;">
          <h1 style="margin:0;color:#ffffff;font-size:18px;font-weight:700;">${message.heading}</h1>
        </td>
      </tr>
      <tr>
        <td style="padding:28px;">${paragraphs}</td>
      </tr>
    </table>
  </body>
</html>`;
}

export function labStageMessageToText(message: LabStageMessage) {
  return message.bodyLines.join('\n\n');
}
