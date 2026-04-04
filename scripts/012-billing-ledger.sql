-- Billing ledger tables for bank statement imports and payment reminder tracking.

create table if not exists public.bank_statement_lines (
  id uuid not null default gen_random_uuid(),
  statement_date date not null,
  description text not null,
  reference text,
  amount numeric not null,
  direction character varying default 'credit'::character varying check (direction::text = any (array['credit'::character varying, 'debit'::character varying]::text[])),
  bank_account text,
  matched_invoice_id uuid,
  matched_invoice_number text,
  match_confidence character varying default 'unmatched'::character varying check (match_confidence::text = any (array['high'::character varying, 'medium'::character varying, 'low'::character varying, 'unmatched'::character varying]::text[])),
  match_reason text,
  matched_at timestamptz,
  raw_payload jsonb default '{}'::jsonb,
  notes text,
  imported_by uuid references public.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint bank_statement_lines_pkey primary key (id),
  constraint bank_statement_lines_matched_invoice_id_fkey foreign key (matched_invoice_id) references public.invoices(id)
);

create index if not exists bank_statement_lines_statement_date_idx on public.bank_statement_lines (statement_date desc);
create index if not exists bank_statement_lines_matched_invoice_id_idx on public.bank_statement_lines (matched_invoice_id);
create index if not exists bank_statement_lines_match_confidence_idx on public.bank_statement_lines (match_confidence);

create table if not exists public.payment_reminders (
  id uuid not null default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  reminder_day integer not null check (reminder_day in (1, 3, 7, 14, 21)),
  reminder_type character varying not null default 'payment'::character varying check (reminder_type::text = any (array['payment'::character varying, 'deposit'::character varying, 'cancellation'::character varying]::text[])),
  status character varying not null default 'queued'::character varying check (status::text = any (array['queued'::character varying, 'sent'::character varying, 'failed'::character varying]::text[])),
  scheduled_for timestamptz,
  sent_at timestamptz,
  notes text,
  created_by uuid references public.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint payment_reminders_pkey primary key (id),
  constraint payment_reminders_invoice_day_key unique (invoice_id, reminder_day, reminder_type)
);

create index if not exists payment_reminders_invoice_id_idx on public.payment_reminders (invoice_id);
create index if not exists payment_reminders_patient_id_idx on public.payment_reminders (patient_id);
create index if not exists payment_reminders_status_idx on public.payment_reminders (status);

alter table public.bank_statement_lines enable row level security;
alter table public.payment_reminders enable row level security;

drop policy if exists "Service role full access to bank_statement_lines" on public.bank_statement_lines;
create policy "Service role full access to bank_statement_lines" on public.bank_statement_lines
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "Service role full access to payment_reminders" on public.payment_reminders;
create policy "Service role full access to payment_reminders" on public.payment_reminders
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
