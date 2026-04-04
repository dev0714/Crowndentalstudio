import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generatePatientDocument } from './patient-document-generator';

describe('generatePatientDocument', () => {
  it('writes treatment plans in a calm patient-friendly tone with risks, alternatives, and prices', () => {
    const doc = generatePatientDocument({
      patientName: 'John Smith',
      documentType: 'treatment_plan',
      diagnosis: 'Fractured upper molar',
      treatmentOptions: 'Crown restoration\nRoot canal with crown',
      risks: 'Temporary sensitivity\nNeed for retreatment',
      alternatives: 'No treatment\nExtraction',
      prices: 'Crown: R4500\nRoot canal: R2500',
      doctorName: 'Fareed',
    });

    assert.equal(doc.title, 'Treatment Plan');
    assert.match(doc.content, /Fractured upper molar/);
    assert.match(doc.content, /Possible risks discussed/i);
    assert.match(doc.content, /Alternatives discussed/i);
    assert.match(doc.content, /Crown: R4500/);
  });

  it('generates referral letters and certificates with the patient details baked in', () => {
    const referral = generatePatientDocument({
      patientName: 'John Smith',
      documentType: 'referral_letter',
      specialty: 'Orthodontist',
      reason: 'orthodontic consultation',
      doctorName: 'Fareed',
    });
    const certificate = generatePatientDocument({
      patientName: 'John Smith',
      documentType: 'medical_certificate',
      daysOff: '2',
      reason: 'post-operative recovery',
      createdAt: '2026-04-04',
    });

    assert.match(referral.content, /Orthodontist/);
    assert.match(referral.content, /orthodontic consultation/);
    assert.match(certificate.content, /2 day\(s\)/);
    assert.match(certificate.content, /John Smith/);
  });
});

