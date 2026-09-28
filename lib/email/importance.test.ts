import assert from 'node:assert/strict';
import { test } from 'node:test';
import { classifyImportance } from './importance';

const mail = (subject: string, fromEmail: string) => ({ uid: '1', from: fromEmail, fromEmail, subject, date: '' });

test('money, deadlines and clinical matters from people are important', () => {
  assert.equal(classifyImportance(mail('Invoice INV-411212 - Crown Dental Studio', 'lab@ridge.co.za'), 'lab').important, true);
  assert.equal(classifyImportance(mail('Diners Club statement', 'statements@dinersclub.co.za'), 'accounts').important, true);
  assert.equal(classifyImportance(mail('Appointment for my son', 'mum@gmail.com'), 'appointments').important, true);
  assert.equal(classifyImportance(mail('Question about implants', 'someone@gmail.com'), 'patient_enquiries').important, true);
  // Even from an address that looks automated (web form relays), a patient enquiry is important.
  assert.equal(classifyImportance(mail('New enquiry from website', 'noreply@formrelay.com'), 'patient_enquiries').important, true);
});

test('marketing, promotions and system notices are not important', () => {
  assert.equal(classifyImportance(mail('Our top pick for you: crown.dentist', 'email@e.godaddy.com'), 'marketing').important, false);
  assert.equal(classifyImportance(mail('Your weekly digest', 'noreply@dropbox.com'), 'other').important, false);
  assert.equal(classifyImportance(mail('New sign-in to your account', 'no-reply@accounts.google.com'), 'other').important, false);
  assert.equal(classifyImportance(mail('Hello', 'friend@gmail.com'), 'other').important, false);
  assert.equal(classifyImportance(mail('Your Bolt ride on Friday', 'receipts@bolt.eu'), 'personal').important, false);
  assert.equal(classifyImportance(mail('eMD Remittance Report', 'reports@e-md.co.za'), 'accounts').important, true);
});
