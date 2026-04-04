import { test } from 'node:test';
import assert from 'node:assert/strict';
import { composeTreatmentPlan } from './treatment-plan-composer';

test('composes a patient-friendly treatment plan with risks, alternatives, and prices', () => {
  const result = composeTreatmentPlan({
    patientName: 'Ada Mthembu',
    diagnosis: 'Fractured upper molar with infection',
    treatmentOptions: ['Root canal treatment', 'Extraction and restoration'],
    risks: ['Temporary sensitivity', 'Possible need for retreatment'],
    alternatives: ['Extraction with replacement later'],
    prices: [
      { label: 'Root canal treatment', amount: 'R4,500' },
      { label: 'Extraction', amount: 'R1,200' },
    ],
    doctorName: 'Dr Fareed',
    practiceName: 'Crown Dental Studio',
  });

  assert.match(result.summary, /patient-friendly treatment plan/i);
  assert.match(result.body, /possible risks/i);
  assert.match(result.body, /temporary sensitivity/i);
  assert.match(result.body, /alternatives discussed/i);
  assert.match(result.body, /R4,500/);
});
