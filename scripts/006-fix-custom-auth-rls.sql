-- Repair RLS and add audit infrastructure for the custom session auth model.

drop policy if exists "Users can read own record" on users;
drop policy if exists "CEO and Admin can read all users" on users;
drop policy if exists "Users can read patients" on patients;
drop policy if exists "Reception can create leads" on leads;
drop policy if exists "Users can read assigned leads" on leads;
drop policy if exists "Doctors can create appointments" on appointments;
drop policy if exists "Users can read appointments" on appointments;

drop policy if exists "Service role full access to users" on users;
drop policy if exists "Service role full access to patients" on patients;
drop policy if exists "Service role full access to patient_contacts" on patient_contacts;
drop policy if exists "Service role full access to leads" on leads;
drop policy if exists "Service role full access to appointments" on appointments;
drop policy if exists "Service role full access to patient_procedures" on patient_procedures;
drop policy if exists "Service role full access to lab_cases" on lab_cases;
drop policy if exists "Service role full access to invoices" on invoices;
drop policy if exists "Service role full access to invoice_items" on invoice_items;
drop policy if exists "Service role full access to stock_items" on stock_items;
drop policy if exists "Service role full access to settings" on settings;

create policy "Service role full access to users" on users
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "Service role full access to patients" on patients
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "Service role full access to patient_contacts" on patient_contacts
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "Service role full access to leads" on leads
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "Service role full access to appointments" on appointments
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "Service role full access to patient_procedures" on patient_procedures
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "Service role full access to lab_cases" on lab_cases
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "Service role full access to invoices" on invoices
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "Service role full access to invoice_items" on invoice_items
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "Service role full access to stock_items" on stock_items
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "Service role full access to settings" on settings
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references users(id),
  actor_email text,
  actor_role text,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists patient_payments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  amount numeric not null,
  payment_date date not null,
  payment_method text,
  notes text,
  created_by uuid references users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
