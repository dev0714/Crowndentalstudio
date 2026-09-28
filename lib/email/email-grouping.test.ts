import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { classifyEmail, groupEmails } from './email-grouping';

function email(subject: string, fromEmail: string, from = 'Sender') {
  return { uid: '1', from, fromEmail, subject, date: '2026-08-11T09:00:00.000Z' };
}

describe('email grouping', () => {
  it('recognises senders by domain before reading the subject', () => {
    assert.equal(classifyEmail(email('🎂 Celebrate your connection', 'messages-noreply@linkedin.com')), 'personal');
    assert.equal(classifyEmail(email('Your booking is confirmed at hotel', 'noreply@booking.com')), 'personal');
    assert.equal(classifyEmail(email('Your Bolt ride on Friday', 'receipts@bolt.eu')), 'personal');
    assert.equal(classifyEmail(email('Ad-hoc Payment Confirmation', 'alerts@investec.co.za')), 'accounts');
    assert.equal(classifyEmail(email('Daily Action Report', 'reports@mediswitch.co.za')), 'accounts');
    assert.equal(classifyEmail(email('Pharmacy expanding role', 'newsletters@media24.com')), 'marketing');
    assert.equal(classifyEmail(email('Update your privacy settings', 'info@e.godaddy.com')), 'marketing');
    assert.equal(classifyEmail(email('Call for competition submissions', 'news@sada.co.za')), 'marketing');
  });

  it('never files other dental businesses or the CRM vendor as patient enquiries', () => {
    assert.equal(classifyEmail(email('Will you be in Dubai this January?', 'kateryna@roott.dental')), 'marketing');
    assert.equal(classifyEmail(email('Invest in Your Smile', 'hello@enamel.clinic')), 'marketing');
    assert.equal(classifyEmail(email('Re: Support Ticket TK-1 — Patient communication', 'leads@notification.leadsync.co.za')), 'other');
    assert.equal(classifyEmail(email('Mr Patel Ismail', 'crowndentalstudio09@gmail.com')), 'other');
  });

  it('keeps supplier invoices with suppliers but their promotions in marketing', () => {
    assert.equal(classifyEmail(email('Invoice INV-2201', 'accounts@kzndental.co.za')), 'suppliers');
    assert.equal(classifyEmail(email('🚨 MELAG MADNESS 20% off', 'promo@wright-millners.co.za')), 'marketing');
  });

  it('classifies lab, appointment, accounts, supplier and enquiry mail by subject', () => {
    assert.equal(classifyEmail(email('Zirconia crown ready for collection', 'lab@ridge.co.za')), 'lab');
    assert.equal(classifyEmail(email('Appointment for my son next week', 'mum@gmail.com')), 'appointments');
    assert.equal(classifyEmail(email('Invoice #4821 outstanding', 'accounts@supplier.com')), 'accounts');
    assert.equal(classifyEmail(email('Your order has been dispatched', 'sales@dental-supply.com')), 'suppliers');
    assert.equal(classifyEmail(email('Question about my toothache', 'jane@gmail.com')), 'patient_enquiries');
  });

  it('routes automated senders to marketing unless clearly operational', () => {
    assert.equal(classifyEmail(email('Our December newsletter', 'newsletter@brand.com')), 'marketing');
    assert.equal(classifyEmail(email('Invite your loved ones to your Family profile', 'noreply@uber.com')), 'personal');
    assert.equal(classifyEmail(email('Crown case update', 'noreply@lab.com')), 'lab');
  });

  it('falls back to other when nothing matches', () => {
    assert.equal(classifyEmail(email('Hello there', 'someone@gmail.com')), 'other');
  });

  it('groups a batch and only returns non-empty groups, with counts', () => {
    const groups = groupEmails([
      email('Crown ready', 'lab@ridgelab.co.za'),
      email('Bridge impression', 'tech@prolab.co.za'),
      email('Appointment for Thursday', 'jo@gmail.com'),
      email('Random note', 'a@b.com'),
    ]);
    const byKey = Object.fromEntries(groups.map((g) => [g.key, g.count]));
    assert.equal(byKey.lab, 2);
    assert.equal(byKey.appointments, 1);
    assert.equal(byKey.other, 1);
    assert.equal(groups.reduce((sum, g) => sum + g.count, 0), 4);
  });
});
