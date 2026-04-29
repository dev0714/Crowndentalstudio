-- Allow voice notes to be stored in the patient_documents vault

alter table public.patient_documents
drop constraint if exists patient_documents_document_type_check;

alter table public.patient_documents
add constraint patient_documents_document_type_check
check (
  document_type in (
    'treatment_plan',
    'referral_letter',
    'medical_certificate',
    'consent_form',
    'voice_note'
  )
);

-- Keep the standard document statuses, but voice notes save as draft until reviewed/transcribed
alter table public.patient_documents
drop constraint if exists patient_documents_status_check;

alter table public.patient_documents
add constraint patient_documents_status_check
check (status in ('draft', 'issued', 'signed', 'archived'));
