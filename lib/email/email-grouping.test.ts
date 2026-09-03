import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { classifyEmail, groupEmails } from './email-grouping';

function email(subject: string, fromEmail: string, from = 'Sender') {
  return { uid: '1', from, fromEmail, subject, date: '2026-08-11T09:00:00.000Z' };
}

describe('email grouping', () => {
  it('classifies lab, appointment, accounts, supplier and enquiry mail', () => {
    assert.equal(classifyEmail(email('Zirconia crown ready for collection', 'lab@ridge.co.za')), 'lab');
    assert.equal(classifyEmail(email('Appointment reminder for tomorrow', 'noreply@booking.com')), 'appointments');
    assert.equal(classifyEmail(email('Invoice #4821 outstanding', 'accounts@supplier.com')), 'accounts');
    assert.equal(classifyEmail(email('Your order has been dispatched', 'sales@dental-supply.com')), 'suppliers');
    assert.equal(classifyEmail(email('Question about my toothache', 'jane@gmail.com')), 'patient_enquiries');
  });

  it('routes automated senders to marketing unless clearly operational', () => {
    assert.equal(classifyEmail(email('Our December newsletter', 'newsletter@brand.com')), 'marketing');
    // Automated sender but clearly a lab message stays in lab
    assert.equal(classifyEmail(email('Crown case update', 'noreply@lab.com')), 'lab');
  });

  it('falls back to other when nothing matches', () => {
    assert.equal(classifyEmail(email('Hello there', 'someone@gmail.com')), 'other');
  });

  it('groups a batch and only returns non-empty groups, with counts', () => {
    const groups = groupEmails([
      email('Crown ready', 'lab@x.com'),
      email('Bridge impression', 'lab@y.com'),
      email('Appointment confirmed', 'book@x.com'),
      email('Random note', 'a@b.com'),
    ]);

    const byKey = Object.fromEntries(groups.map((g) => [g.key, g.count]));
    assert.equal(byKey.lab, 2);
    assert.equal(byKey.appointments, 1);
    assert.equal(byKey.other, 1);
    assert.equal(groups.some((g) => g.key === 'marketing'), false);
    // total across groups equals input
    assert.equal(groups.reduce((sum, g) => sum + g.count, 0), 4);
  });
});
