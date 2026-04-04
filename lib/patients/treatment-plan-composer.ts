export type TreatmentPlanComposerInput = {
  patientName: string;
  diagnosis: string;
  treatmentOptions: string[];
  risks: string[];
  alternatives: string[];
  prices: Array<{ label: string; amount: string }>;
  doctorName?: string;
  practiceName?: string;
};

export type TreatmentPlanComposerResult = {
  title: string;
  summary: string;
  body: string;
  status: 'draft';
};

function splitLines(values: string[] | null | undefined) {
  return (values || [])
    .map((value) => String(value || '').trim())
    .filter(Boolean);
}

function bulletList(values: string[] | null | undefined, fallback: string) {
  const lines = splitLines(values);
  return lines.length > 0 ? lines.map((line) => `- ${line}`).join('\n') : `- ${fallback}`;
}

function priceList(values: Array<{ label: string; amount: string }> | null | undefined) {
  const lines = (values || [])
    .map((value) => `${String(value.label || '').trim()}: ${String(value.amount || '').trim()}`.trim())
    .filter(Boolean);

  return lines.length > 0 ? lines.map((line) => `- ${line}`).join('\n') : '- Pricing to be confirmed';
}

function normalizeDoctorName(value: string | null | undefined) {
  return String(value || '').replace(/^dr\.?\s+/i, '').trim();
}

function makeIntro(input: TreatmentPlanComposerInput) {
  return [
    `${input.patientName}, we have reviewed your diagnosis of ${input.diagnosis}.`,
    'The treatment plan below is written in clear, patient-friendly language so you can understand the options and make an informed choice.',
  ].join(' ');
}

export function composeTreatmentPlan(input: TreatmentPlanComposerInput): TreatmentPlanComposerResult {
  const practiceName = input.practiceName || 'Crown Dental Studio';
  const doctorName = normalizeDoctorName(input.doctorName);

  return {
    title: 'Patient-Friendly Treatment Plan',
    summary: `Patient-friendly treatment plan drafted for ${input.patientName}`,
    body: [
      practiceName,
      doctorName ? `Prepared by Dr ${doctorName}` : null,
      '',
      `Patient: ${input.patientName}`,
      `Diagnosis: ${input.diagnosis}`,
      '',
      makeIntro(input),
      '',
      'Recommended treatment options',
      bulletList(input.treatmentOptions, 'No treatment options added yet'),
      '',
      'Possible risks discussed in plain language',
      bulletList(input.risks, 'No specific risks recorded yet'),
      'These risks were explained so the patient can make an informed decision without unnecessary alarm.',
      '',
      'Alternatives discussed',
      bulletList(input.alternatives, 'No alternatives added yet'),
      '',
      'Pricing',
      priceList(input.prices),
      '',
      'This draft should be reviewed by the doctor before being sent to the patient.',
    ]
      .filter(Boolean)
      .join('\n'),
    status: 'draft',
  };
}
