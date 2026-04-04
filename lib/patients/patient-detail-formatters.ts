export const PATIENT_CONSENT_TYPES = [
  'treatment',
  'procedure',
  'photography',
  'recording',
  'data_processing',
] as const;

export const PATIENT_MESSAGE_TYPES = ['whatsapp', 'sms', 'email', 'social'] as const;

export type PatientConsentType = (typeof PATIENT_CONSENT_TYPES)[number];
export type PatientMessageType = (typeof PATIENT_MESSAGE_TYPES)[number];

export type ClaimStatus = 'Submitted' | 'Under Review' | 'Approved' | 'Rejected' | 'Paid';

const MESSAGE_TYPE_ALIASES: Record<string, PatientMessageType> = {
  whatsapp: 'whatsapp',
  'whats app': 'whatsapp',
  sms: 'sms',
  email: 'email',
  social: 'social',
  'social media': 'social',
};

const CONSENT_TYPE_ALIASES: Record<string, PatientConsentType> = {
  treatment: 'treatment',
  procedure: 'procedure',
  photography: 'photography',
  recording: 'recording',
  'data processing': 'data_processing',
  data_processing: 'data_processing',
};

const CLAIM_STATUS_ALIASES: Record<string, ClaimStatus> = {
  pending: 'Submitted',
  submitted: 'Submitted',
  'under review': 'Under Review',
  under_review: 'Under Review',
  approved: 'Approved',
  rejected: 'Rejected',
  paid: 'Paid',
};

function normalizeKey(value: string | null | undefined) {
  return (value || '').trim().toLowerCase();
}

export function normalizeClaimStatus(value: string | null | undefined): ClaimStatus {
  return CLAIM_STATUS_ALIASES[normalizeKey(value)] || 'Submitted';
}

export function normalizeMessageType(value: string | null | undefined): PatientMessageType {
  return MESSAGE_TYPE_ALIASES[normalizeKey(value)] || 'whatsapp';
}

export function normalizeConsentType(value: string | null | undefined): PatientConsentType {
  return CONSENT_TYPE_ALIASES[normalizeKey(value)] || 'treatment';
}

function isDateLine(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function serializeClinicalNote(body: {
  visit_date?: string;
  diagnosis?: string;
  notes?: string;
  procedures?: string;
}) {
  return [
    body.visit_date || '',
    body.diagnosis || '',
    body.notes || '',
    body.procedures || '',
  ].join('\n');
}

export function parseClinicalNoteContent(noteContent: string | null | undefined) {
  const lines = (noteContent || '')
    .split(/\r?\n/)
    .map((line) => line.trim());

  if (lines.length > 0 && isDateLine(lines[0])) {
    return {
      visit_date: lines[0] || '',
      diagnosis: lines[1] || '',
      notes: lines[2] || '',
      procedures: lines[3] || '',
    };
  }

  return {
    visit_date: '',
    diagnosis: lines[0] || '',
    notes: lines[1] || '',
    procedures: lines[2] || '',
  };
}
