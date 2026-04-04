import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildStaffComplianceSummary } from './staff-compliance';

test('summarizes staff onboarding compliance', () => {
  const summary = buildStaffComplianceSummary([
    {
      id: 'staff-1',
      full_name: 'Dr Fareed',
      email: 'fareed@example.com',
      role: 'Doctor',
      is_active: true,
      hpcsa_registration_number: 'A12345',
      id_document_uploaded: true,
      proof_of_address_uploaded: true,
      contract_signed: true,
      nda_signed: true,
      restraint_signed: true,
      training_repayment_clause_signed: true,
    },
    {
      id: 'staff-2',
      full_name: 'Reception One',
      email: 'reception@example.com',
      role: 'Reception',
      is_active: true,
      id_document_uploaded: true,
      proof_of_address_uploaded: false,
      contract_signed: false,
      nda_signed: false,
      restraint_signed: false,
      training_repayment_clause_signed: false,
    },
  ]);

  assert.equal(summary.totalStaff, 2);
  assert.equal(summary.readyStaffCount, 1);
  assert.equal(summary.needsAttentionCount, 1);
  assert.equal(summary.missingHpcsaCount, 0);
  assert.equal(summary.missingDocumentsCount, 1);
  assert.equal(summary.profiles[0].complianceStatus, 'Ready');
  assert.deepEqual(summary.profiles[1].missingItems, [
    'Proof of address',
    'Contract',
    'NDA',
    'Restraint',
    'Training repayment clause',
    'HPCSA registration',
  ]);
});
