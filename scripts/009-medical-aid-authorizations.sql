-- Medical aid authorization tracking for billing workflow

create table if not exists public.medical_aid_authorizations (
  id uuid not null default uuid_generate_v4(),
  patient_id uuid not null,
  invoice_id uuid,
  claim_id uuid,
  procedure_name character varying not null,
  procedure_code character varying,
  icd10_code character varying,
  scheme_name character varying,
  authorization_requested_date date default current_date,
  authorization_reference character varying,
  status character varying default 'Pending',
  authorized_amount numeric,
  co_payment_amount numeric,
  patient_shortfall_amount numeric,
  notes text,
  created_by uuid,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  CONSTRAINT medical_aid_authorizations_pkey PRIMARY KEY (id),
  CONSTRAINT medical_aid_authorizations_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id),
  CONSTRAINT medical_aid_authorizations_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id),
  CONSTRAINT medical_aid_authorizations_claim_id_fkey FOREIGN KEY (claim_id) REFERENCES public.medical_aid_claims(id),
  CONSTRAINT medical_aid_authorizations_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);

alter table public.medical_aid_authorizations enable row level security;

drop policy if exists "Service role can manage medical aid authorizations" on public.medical_aid_authorizations;

create policy "Service role can manage medical aid authorizations"
on public.medical_aid_authorizations
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
