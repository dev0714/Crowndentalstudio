import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeClaimStatus,
  normalizeConsentType,
  normalizeMessageType,
  parseClinicalNoteContent,
  serializeClinicalNote,
} from './patient-detail-formatters';

test('normalizes legacy claim status values to schema-safe values', () => {
  assert.equal(normalizeClaimStatus('Pending'), 'Submitted');
  assert.equal(normalizeClaimStatus('Under Review'), 'Under Review');
  assert.equal(normalizeClaimStatus('submitted'), 'Submitted');
});

test('normalizes message types to schema-safe values', () => {
  assert.equal(normalizeMessageType('WhatsApp'), 'whatsapp');
  assert.equal(normalizeMessageType('Social Media'), 'social');
});

test('normalizes consent labels to schema-safe values', () => {
  assert.equal(normalizeConsentType('Data Processing'), 'data_processing');
  assert.equal(normalizeConsentType('Photography'), 'photography');
});

test('preserves clinical note visit date and content when round-tripped', () => {
  const serialized = serializeClinicalNote({
    visit_date: '2026-04-04',
    diagnosis: 'Sensitive tooth',
    notes: 'Observed during follow-up',
    procedures: 'Exam and x-rays',
  });

  assert.deepEqual(parseClinicalNoteContent(serialized), {
    visit_date: '2026-04-04',
    diagnosis: 'Sensitive tooth',
    notes: 'Observed during follow-up',
    procedures: 'Exam and x-rays',
  });
});
