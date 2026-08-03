import {
  bodyLinesToText,
  renderNotificationEmailHtml,
} from '@/lib/notifications/email-template';

export type AppointmentNotificationKind = 'booked' | 'rescheduled' | 'cancelled';

export type AppointmentMessage = {
  subject: string;
  heading: string;
  bodyLines: string[];
};

export type AppointmentMessageContext = {
  patientName?: string | null;
  appointmentDate?: string | null;
  appointmentType?: string | null;
  durationMinutes?: number | null;
  roomNumber?: string | null;
};

const PRACTICE_NAME = 'Crown Dental Studio';
const TIME_ZONE = 'Africa/Johannesburg';

function greeting(patientName?: string | null) {
  const name = patientName?.trim();
  return name ? `Hi ${name},` : 'Hi there,';
}

// Formats an ISO timestamp as e.g. "Friday, 31 July 2026 at 14:30" in SA time.
export function formatAppointmentWhen(iso?: string | null) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  const day = new Intl.DateTimeFormat('en-ZA', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: TIME_ZONE,
  }).format(date);

  const time = new Intl.DateTimeFormat('en-ZA', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: TIME_ZONE,
  }).format(date);

  return `${day} at ${time}`;
}

function detailLines(ctx: AppointmentMessageContext) {
  const lines: string[] = [];
  const when = formatAppointmentWhen(ctx.appointmentDate);
  if (when) lines.push(`When: ${when}`);
  if (ctx.appointmentType?.trim()) lines.push(`Type: ${ctx.appointmentType.trim()}`);
  if (ctx.durationMinutes && ctx.durationMinutes > 0) lines.push(`Duration: ${ctx.durationMinutes} minutes`);
  if (ctx.roomNumber?.trim()) lines.push(`Room: ${ctx.roomNumber.trim()}`);
  return lines.join('\n');
}

export function buildAppointmentNotification(
  kind: AppointmentNotificationKind,
  ctx: AppointmentMessageContext = {},
): AppointmentMessage {
  const details = detailLines(ctx);
  const when = formatAppointmentWhen(ctx.appointmentDate);

  switch (kind) {
    case 'rescheduled':
      return {
        subject: `Your appointment at ${PRACTICE_NAME} has been updated`,
        heading: 'Your appointment has been updated',
        bodyLines: [
          greeting(ctx.patientName),
          `Your appointment at ${PRACTICE_NAME} has been updated to a new time.`,
          details,
          `If this time does not suit you, please contact us and we'll gladly rearrange.`,
          `Thank you,\n${PRACTICE_NAME}`,
        ].filter(Boolean),
      };
    case 'cancelled':
      return {
        subject: `Your appointment at ${PRACTICE_NAME} has been cancelled`,
        heading: 'Your appointment has been cancelled',
        bodyLines: [
          greeting(ctx.patientName),
          `Your appointment at ${PRACTICE_NAME}${when ? ` on ${when}` : ''} has been cancelled.`,
          `If you'd like to rebook, please contact us and we'll find a new time that works for you.`,
          `Thank you,\n${PRACTICE_NAME}`,
        ].filter(Boolean),
      };
    case 'booked':
    default:
      return {
        subject: `Your appointment at ${PRACTICE_NAME} is booked`,
        heading: 'Your appointment is booked',
        bodyLines: [
          greeting(ctx.patientName),
          `Your appointment at ${PRACTICE_NAME} has been booked. Here are the details:`,
          details,
          `If you need to change or cancel, just contact us. We look forward to seeing you.`,
          `Thank you,\n${PRACTICE_NAME}`,
        ].filter(Boolean),
      };
  }
}

export function appointmentMessageToHtml(message: AppointmentMessage) {
  return renderNotificationEmailHtml(message.heading, message.bodyLines);
}

export function appointmentMessageToText(message: AppointmentMessage) {
  return bodyLinesToText(message.bodyLines);
}
