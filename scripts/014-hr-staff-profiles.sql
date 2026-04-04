-- HR staff profile foundation for onboarding and compliance tracking.
create table if not exists public.staff_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  id_document_uploaded boolean not null default false,
  proof_of_address_uploaded boolean not null default false,
  banking_details_last4 text,
  qualifications text,
  hpcsa_registration_number text,
  contract_signed boolean not null default false,
  nda_signed boolean not null default false,
  restraint_signed boolean not null default false,
  training_repayment_clause_signed boolean not null default false,
  leave_balance_days numeric(6,2) not null default 0,
  shift_schedule jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists staff_profiles_user_id_idx on public.staff_profiles (user_id);
