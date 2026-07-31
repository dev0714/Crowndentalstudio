import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  appointmentMessageToHtml,
  appointmentMessageToText,
  buildAppointmentNotification,
  formatAppointmentWhen,
} from './appointment-message';

describe('appointment notifications', () => {
  it('formats the appointment time in SA time', () => {
    // 2026-07-31 12:30 UTC → 14:30 in Africa/Johannesburg (UTC+2)
    const when = formatAppointmentWhen('2026-07-31T12:30:00.000Z');
    assert.match(when, /31 July 2026/);
    assert.match(when, /14:30/);
  });

  it('builds a booking confirmation with the details', () => {
    const message = buildAppointmentNotification('booked', {
      patientName: 'Mischka Sham',
      appointmentDate: '2026-07-31T12:30:00.000Z',
      appointmentType: 'Consult',
      durationMinutes: 30,
      roomNumber: '2',
    });

    assert.match(message.subject, /booked/i);
    const text = appointmentMessageToText(message);
    assert.match(text, /Hi Mischka Sham,/);
    assert.match(text, /Type: Consult/);
    assert.match(text, /Duration: 30 minutes/);
    assert.match(text, /Room: 2/);
    assert.match(text, /14:30/);
  });

  it('builds reschedule and cancellation messages', () => {
    const rescheduled = buildAppointmentNotification('rescheduled', {
      patientName: 'Nadeem Patel',
      appointmentDate: '2026-07-03T08:00:00.000Z',
      appointmentType: 'Consult',
    });
    assert.match(rescheduled.subject, /updated/i);
    assert.match(appointmentMessageToText(rescheduled), /updated to a new time/i);

    const cancelled = buildAppointmentNotification('cancelled', {
      patientName: 'Nadeem Patel',
      appointmentDate: '2026-07-03T08:00:00.000Z',
    });
    assert.match(cancelled.subject, /cancelled/i);
    assert.match(appointmentMessageToText(cancelled), /cancelled/i);
  });

  it('escapes HTML in the rendered email', () => {
    const message = buildAppointmentNotification('booked', {
      patientName: 'A & B <x>',
      appointmentDate: '2026-07-31T12:30:00.000Z',
      appointmentType: 'Consult',
    });
    const html = appointmentMessageToHtml(message);
    assert.match(html, /&amp;/);
    assert.match(html, /&lt;x&gt;/);
    assert.doesNotMatch(html, /<x>/);
  });

  it('omits missing detail lines gracefully', () => {
    const message = buildAppointmentNotification('booked', { patientName: 'Solo' });
    const text = appointmentMessageToText(message);
    assert.match(text, /Hi Solo,/);
    assert.doesNotMatch(text, /Room:/);
    assert.doesNotMatch(text, /When:/);
  });
});
