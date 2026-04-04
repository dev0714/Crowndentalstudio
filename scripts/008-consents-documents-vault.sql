-- Consents, documents, and compliance vault migration

create table if not exists public.patient_documents (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  document_type text not null check (
    document_type in (
      'treatment_plan',
      'referral_letter',
      'medical_certificate',
      'consent_form'
    )
  ),
  title text not null,
  content text not null,
  status text not null default 'draft' check (status in ('draft', 'issued', 'signed', 'archived')),
  related_entity_type text,
  related_entity_id text,
  signed_by_patient boolean not null default false,
  signed_by_guardian boolean not null default false,
  signature_name text,
  signed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_patient_documents_patient_id on public.patient_documents(patient_id);
create index if not exists idx_patient_documents_type on public.patient_documents(document_type);
create index if not exists idx_patient_documents_created_at on public.patient_documents(created_at);

alter table public.patient_documents enable row level security;

drop policy if exists "Service role full access to patient_documents" on public.patient_documents;
create policy "Service role full access to patient_documents" on public.patient_documents
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

