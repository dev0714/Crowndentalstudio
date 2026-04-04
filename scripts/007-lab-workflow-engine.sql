-- Lab workflow engine migration
-- Adds detailed workflow tracking and event history for lab cases.

alter table if exists public.lab_cases
  add column if not exists workflow_stage text default 'Created',
  add column if not exists shade text,
  add column if not exists expected_return_date date,
  add column if not exists slip_text text,
  add column if not exists slip_sent_at timestamptz,
  add column if not exists collected_at timestamptz,
  add column if not exists ready_for_collection_at timestamptz,
  add column if not exists collected_by_driver_at timestamptz,
  add column if not exists dropped_off_by_me_at timestamptz,
  add column if not exists patient_called_at timestamptz,
  add column if not exists patient_collected_at timestamptz,
  add column if not exists comeback_requested_at timestamptz,
  add column if not exists comeback_reason text,
  add column if not exists satisfaction_signed_at timestamptz,
  add column if not exists closed_at timestamptz,
  add column if not exists lab_driver_name text,
  add column if not exists worker_name text;

update public.lab_cases
set workflow_stage = coalesce(workflow_stage, 'Created')
where workflow_stage is null;

create table if not exists public.lab_case_events (
  id uuid primary key default gen_random_uuid(),
  lab_case_id uuid not null references public.lab_cases(id) on delete cascade,
  event_type text not null,
  event_at timestamptz not null default now(),
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_lab_case_events_lab_case_id on public.lab_case_events(lab_case_id);
create index if not exists idx_lab_case_events_event_at on public.lab_case_events(event_at);

alter table public.lab_case_events enable row level security;

drop policy if exists "Service role full access to lab_case_events" on public.lab_case_events;
create policy "Service role full access to lab_case_events" on public.lab_case_events
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
