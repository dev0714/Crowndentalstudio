export type PatientDocumentType =
  | 'treatment_plan'
  | 'referral_letter'
  | 'medical_certificate'
  | 'consent_form';

import { composeTreatmentPlan } from '@/lib/patients/treatment-plan-composer';

export type PatientDocumentInput = {
  patientName: string;
  patientId?: string;
  documentType: PatientDocumentType;
  title?: string;
  diagnosis?: string;
  treatmentOptions?: string;
  risks?: string;
  alternatives?: string;
  prices?: string;
  specialty?: string;
  reason?: string;
  procedure?: string;
  daysOff?: string;
  consentType?: string;
  notes?: string;
  doctorName?: string;
  practiceName?: string;
  createdAt?: string;
};

export type GeneratedPatientDocument = {
  title: string;
  content: string;
  summary: string;
};

function splitLines(value: string | null | undefined) {
  return (value || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function bulletList(value: string | null | undefined) {
  const lines = splitLines(value);
  return lines.length > 0 ? lines.map((line) => `- ${line}`).join('\n') : '- Not specified';
}

function normalizeDoctorName(value: string | null | undefined) {
  return (value || '').replace(/^dr\.?\s+/i, '').trim();
}

function friendlyRiskParagraph(risks: string | null | undefined) {
  const lines = splitLines(risks);
  if (lines.length === 0) {
    return 'Possible risks were discussed in a calm, practical way and the patient was given time to ask questions.';
  }

  return `Possible risks discussed included the following in plain language:\n${lines.map((line) => `- ${line}`).join('\n')}\nThese risks are uncommon for many patients, but they were explained so the patient can make an informed decision.`;
}

function baseHeader(input: PatientDocumentInput) {
  const lines = [
    input.practiceName || 'Crown Dental Studio',
    input.doctorName ? `Prepared by Dr ${normalizeDoctorName(input.doctorName)}` : null,
    `Patient: ${input.patientName}`,
    input.createdAt ? `Date: ${input.createdAt}` : null,
  ].filter(Boolean);

  return lines.join('\n');
}

function buildTreatmentPlan(input: PatientDocumentInput): GeneratedPatientDocument {
  const composed = composeTreatmentPlan({
    patientName: input.patientName,
    diagnosis: (input.diagnosis || 'Clinical diagnosis to be confirmed by the treating doctor').trim(),
    treatmentOptions: splitLines(input.treatmentOptions),
    risks: splitLines(input.risks),
    alternatives: splitLines(input.alternatives),
    prices: splitLines(input.prices).map((line) => {
      const [label, amount] = line.split(':');
      return {
        label: (label || '').trim(),
        amount: (amount || '').trim(),
      };
    }),
    doctorName: input.doctorName,
    practiceName: input.practiceName,
  });

  return {
    title: input.title || composed.title,
    summary: composed.summary,
    content: [baseHeader(input), '', composed.body].join('\n'),
  };
}

function buildReferralLetter(input: PatientDocumentInput): GeneratedPatientDocument {
  const specialty = (input.specialty || 'specialist').trim();
  const reason = (input.reason || input.diagnosis || 'Further assessment required').trim();

  return {
    title: input.title || `Referral Letter - ${specialty}`,
    summary: `Referral letter drafted for ${input.patientName}`,
    content: [
      baseHeader(input),
      '',
      `Referred to: ${specialty}`,
      '',
      `Dear colleague,`,
      '',
      `${input.patientName} is being referred for ${reason}.`,
      input.procedure ? `Relevant procedure or focus area: ${input.procedure}.` : null,
      input.notes ? `Clinical notes: ${input.notes}` : null,
      '',
      'Please review the attached information and send feedback to the treating doctor once the patient has been seen.',
      '',
      'Kind regards,',
      input.doctorName ? `Dr ${normalizeDoctorName(input.doctorName)}` : 'Treating clinician',
    ].filter(Boolean).join('\n'),
  };
}

function buildMedicalCertificate(input: PatientDocumentInput): GeneratedPatientDocument {
  const daysOff = input.daysOff || '1';
  const reason = input.reason || input.diagnosis || 'Medical consultation';

  return {
    title: input.title || 'Medical Certificate',
    summary: `Medical certificate drafted for ${input.patientName}`,
    content: [
      baseHeader(input),
      '',
      'Medical Certificate',
      '',
      `This is to confirm that ${input.patientName} was seen on ${input.createdAt || 'the recorded date'} for ${reason}.`,
      `Recommended time off work or school: ${daysOff} day(s).`,
      input.notes ? `Notes: ${input.notes}` : null,
      '',
      'Please note: this draft must be reviewed and signed by the treating doctor before issue.',
    ].filter(Boolean).join('\n'),
  };
}

function buildConsentForm(input: PatientDocumentInput): GeneratedPatientDocument {
  const consentType = (input.consentType || 'treatment').replace(/_/g, ' ').trim();

  return {
    title: input.title || `${consentType} consent form`,
    summary: `Consent draft prepared for ${input.patientName}`,
    content: [
      baseHeader(input),
      '',
      'Consent Form Draft',
      `Consent type: ${consentType}`,
      input.procedure ? `Procedure: ${input.procedure}` : null,
      '',
      `I, ${input.patientName}, confirm that I have been informed about the proposed treatment, the expected benefits, possible risks, and alternative options.`,
      input.diagnosis ? `Clinical context: ${input.diagnosis}` : null,
      input.notes ? `Additional notes: ${input.notes}` : null,
      '',
      'Patient signature: ____________________',
      'Guardian signature: ____________________',
      '',
      'This draft is designed for doctor review before being issued for signature.',
    ].filter(Boolean).join('\n'),
  };
}

export function generatePatientDocument(input: PatientDocumentInput): GeneratedPatientDocument {
  switch (input.documentType) {
    case 'treatment_plan':
      return buildTreatmentPlan(input);
    case 'referral_letter':
      return buildReferralLetter(input);
    case 'medical_certificate':
      return buildMedicalCertificate(input);
    case 'consent_form':
      return buildConsentForm(input);
    default:
      return buildTreatmentPlan(input);
  }
}
