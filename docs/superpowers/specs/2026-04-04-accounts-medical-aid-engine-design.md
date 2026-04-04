# Accounts and Medical Aid Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a practical accounts and medical-aid engine that tracks invoice health, medical-aid claims, and per-patient authorization records so the practice can see what is billed, what is pending, and what still needs patient action.

**Architecture:** Keep invoices and claims as the financial source of truth, then add a dedicated authorization workflow that links patients, procedures, invoices, and claims. The UI should stay API-first: the accounts page becomes the operational billing dashboard, and the patient file gains a medical-aid section for authorizations and shortfall visibility. This slice deliberately stops short of bank reconciliation and debt-collection automation so the data model stays simple and safe.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Supabase Postgres, server-side Supabase service role access, HTTP-only cookie auth, existing CRM API patterns, shared workflow status constants.

---

## Scope Boundary

This plan is **Phase 4, slice 1** of the broader billing work. It focuses on authorization tracking and billing visibility only.

It includes:
1. Medical-aid authorization records per patient and procedure
2. Accounts-page summaries for invoice, claim, and authorization health
3. Patient-file visibility for authorizations and shortfalls
4. API routes for listing and mutating authorization records
5. A database migration for the new authorization table and supporting policies

It does **not** include:
1. Bank reconciliation
2. Payment-link generation
3. Automated debt collection workflows
4. Full medical-aid code library and rejection analytics
5. Claim submission integrations to external schemes

## File Structure

**Create**
- `app/api/crm/medical-aid-authorizations/route.ts`
- `lib/billing/authorization-summary.ts`
- `lib/billing/authorization-summary.test.ts`
- `scripts/009-medical-aid-authorizations.sql`

**Modify**
- `app/accounts/page.tsx`
- `app/patients/[id]/page.tsx`
- `app/api/crm/patients/[resource]/route.ts`
- `app/api/crm/medical-aid-claims/route.ts`
- `lib/types/crm.ts`
- `lib/workflows/status-definitions.ts`

## Data Model

The new `medical_aid_authorizations` table stores one authorization record per case.

Required columns:
- `id`
- `patient_id`
- `invoice_id`
- `claim_id`
- `procedure_name`
- `procedure_code`
- `icd10_code`
- `scheme_name`
- `authorization_requested_date`
- `authorization_reference`
- `status`
- `authorized_amount`
- `co_payment_amount`
- `patient_shortfall_amount`
- `notes`
- `created_by`
- `created_at`
- `updated_at`

The workflow statuses should be centralized and must at minimum support:
- `Pending`
- `Approved`
- `Rejected`
- `Expired`
- `Needs Review`

## Phase 4 Deliverables

- The accounts page shows a billing snapshot for invoices, claims, and authorizations
- The patient detail page shows a medical-aid authorization section
- Staff can create and update authorizations through the API
- Authorization rows can be linked to an invoice and, if present, a claim
- Shortfall visibility is calculated from invoice totals, paid amounts, and approved authorization amounts
- The migration file can be applied independently in Supabase

## Task 1: Add the Medical-Aid Authorization Database Table

**Files:**
- Create: `scripts/009-medical-aid-authorizations.sql`
- Modify: `scripts/001-init-crm-schema.sql`

- [ ] **Step 1: Capture the schema shape in SQL**

```sql
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
```

- [ ] **Step 2: Add service-role RLS policies**

```sql
alter table public.medical_aid_authorizations enable row level security;

drop policy if exists "Service role can manage medical aid authorizations" on public.medical_aid_authorizations;

create policy "Service role can manage medical aid authorizations"
on public.medical_aid_authorizations
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
```

- [ ] **Step 3: Verify the migration file is self-contained**

Run:

```powershell
rg -n "medical_aid_authorizations|service_role" scripts\009-medical-aid-authorizations.sql
```

Expected:
- the new table definition appears once
- the RLS policy appears once

- [ ] **Step 4: Add the migration note to the base schema**

Insert a short comment into `scripts/001-init-crm-schema.sql` noting that authorization tracking is provided by `medical_aid_authorizations`.

- [ ] **Step 5: Commit**

```bash
git add scripts/001-init-crm-schema.sql scripts/009-medical-aid-authorizations.sql
git commit -m "feat: add medical aid authorization schema"
```

## Task 2: Add Shared Billing Summary Logic

**Files:**
- Create: `lib/billing/authorization-summary.ts`
- Create: `lib/billing/authorization-summary.test.ts`

- [ ] **Step 1: Define the summary helpers**

```ts
export function calcInvoiceShortfall(invoice: { total_amount: number; paid_amount: number }) {
  return Math.max(0, Number(invoice.total_amount || 0) - Number(invoice.paid_amount || 0));
}

export function calcAuthorizationShortfall(authorization: {
  authorized_amount?: number | null;
  co_payment_amount?: number | null;
  patient_shortfall_amount?: number | null;
}) {
  if (authorization.patient_shortfall_amount != null) {
    return Number(authorization.patient_shortfall_amount || 0);
  }

  const authorizedAmount = Number(authorization.authorized_amount || 0);
  const coPayment = Number(authorization.co_payment_amount || 0);
  return Math.max(0, authorizedAmount - coPayment);
}
```

- [ ] **Step 2: Add tests for the math**

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcAuthorizationShortfall, calcInvoiceShortfall } from './authorization-summary';

test('calculates invoice shortfall from total and paid', () => {
  assert.equal(calcInvoiceShortfall({ total_amount: 1250, paid_amount: 400 }), 850);
});

test('prefers explicit patient shortfall when present', () => {
  assert.equal(calcAuthorizationShortfall({ patient_shortfall_amount: 300, authorized_amount: 900 }), 300);
});
```

- [ ] **Step 3: Verify the helpers pass**

Run:

```powershell
node --test --experimental-strip-types .\lib\billing\authorization-summary.test.ts
```

Expected:
- helper tests pass

- [ ] **Step 4: Commit**

```bash
git add lib/billing/authorization-summary.ts lib/billing/authorization-summary.test.ts
git commit -m "feat: add billing summary helpers"
```

## Task 3: Build the Medical-Aid Authorization API

**Files:**
- Create: `app/api/crm/medical-aid-authorizations/route.ts`
- Modify: `lib/types/crm.ts`
- Modify: `lib/workflows/status-definitions.ts`

- [ ] **Step 1: Define the request/response type**

```ts
export interface MedicalAidAuthorization {
  id: string;
  patient_id: string;
  invoice_id?: string | null;
  claim_id?: string | null;
  procedure_name: string;
  procedure_code?: string | null;
  icd10_code?: string | null;
  scheme_name?: string | null;
  authorization_requested_date: string;
  authorization_reference?: string | null;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Expired' | 'Needs Review';
  authorized_amount?: number | null;
  co_payment_amount?: number | null;
  patient_shortfall_amount?: number | null;
  notes?: string | null;
}
```

- [ ] **Step 2: Implement GET/POST/PUT/DELETE**

Use the same server-session and `supabaseServer` pattern as the other CRM routes. GET should support:
- `?id=...`
- `?patientId=...`
- `?invoiceId=...`

POST should create a new authorization record. PUT should update by `id`. DELETE should remove by `id`.

Example create payload:

```ts
const payload = {
  patient_id: body.patient_id,
  invoice_id: body.invoice_id || null,
  claim_id: body.claim_id || null,
  procedure_name: body.procedure_name,
  procedure_code: body.procedure_code || null,
  icd10_code: body.icd10_code || null,
  scheme_name: body.scheme_name || null,
  authorization_requested_date: body.authorization_requested_date || new Date().toISOString().slice(0, 10),
  authorization_reference: body.authorization_reference || null,
  status: body.status || 'Pending',
  authorized_amount: body.authorized_amount == null ? null : Number(body.authorized_amount),
  co_payment_amount: body.co_payment_amount == null ? null : Number(body.co_payment_amount),
  patient_shortfall_amount: body.patient_shortfall_amount == null ? null : Number(body.patient_shortfall_amount),
  notes: body.notes || null,
};
```

- [ ] **Step 3: Add the workflow status constant**

```ts
export const MEDICAL_AID_AUTHORIZATION_STATUSES = [
  'Pending',
  'Approved',
  'Rejected',
  'Expired',
  'Needs Review',
] as const;
```

- [ ] **Step 4: Verify the route**

Run:

```powershell
rg -n "MEDICAL_AID_AUTHORIZATION_STATUSES|medical_aid_authorizations" app\api\crm\medical-aid-authorizations\route.ts lib\types\crm.ts lib\workflows\status-definitions.ts
```

Expected:
- the route uses the new status constant and new table name

- [ ] **Step 5: Commit**

```bash
git add app/api/crm/medical-aid-authorizations/route.ts lib/types/crm.ts lib/workflows/status-definitions.ts
git commit -m "feat: add medical aid authorization api"
```

## Task 4: Extend the Patient Detail Page

**Files:**
- Modify: `app/patients/[id]/page.tsx`
- Modify: `app/api/crm/patients/[resource]/route.ts`

- [ ] **Step 1: Add an authorization tab to the patient file**

The patient page should show:
- authorization status
- requested date
- reference number
- procedure name
- approved amount
- co-payment
- shortfall
- notes

- [ ] **Step 2: Fetch authorization data through the existing patient resource route**

Use:

```ts
fetch(`/api/crm/patients/authorizations?patientId=${patientId}`, { credentials: 'include' })
```

- [ ] **Step 3: Add create/update/delete actions**

The form should post to:

```ts
POST /api/crm/patients/authorizations
PUT /api/crm/patients/authorizations?id=...
DELETE /api/crm/patients/authorizations?id=...
```

- [ ] **Step 4: Verify the page still opens for existing patients**

Run:

```powershell
Invoke-WebRequest -Uri 'http://localhost:3000/patients/82cc7c55-f138-4b1a-acf0-2f6a0b143474' -Headers @{ Cookie = "your-session-cookie-here" } -UseBasicParsing
```

Expected:
- `200`

- [ ] **Step 5: Commit**

```bash
git add app/patients/[id]/page.tsx app/api/crm/patients/[resource]/route.ts
git commit -m "feat: add patient medical aid authorization view"
```

## Task 5: Extend the Accounts Page with Billing Health

**Files:**
- Modify: `app/accounts/page.tsx`
- Modify: `app/api/crm/medical-aid-claims/route.ts`
- Modify: `app/api/crm/invoices/route.ts`
- Modify: `lib/billing/authorization-summary.ts`

- [ ] **Step 1: Add an authorization summary to the dashboard cards**

The accounts page should show:
- number of pending authorizations
- approved authorizations
- total invoice shortfall
- total authorized value

- [ ] **Step 2: Load authorization data alongside invoices and claims**

Add a fetch call for:

```ts
fetch('/api/crm/medical-aid-authorizations?limit=1000&page=1', { credentials: 'include' })
```

- [ ] **Step 3: Surface invoice shortfall calculations**

Use `calcInvoiceShortfall()` and `calcAuthorizationShortfall()` to compute:
- outstanding invoice balance
- patient shortfall exposure

- [ ] **Step 4: Verify the page still renders with no authorizations**

Run:

```powershell
npm run build
```

Expected:
- build succeeds even if the new authorization table has no rows yet

- [ ] **Step 5: Commit**

```bash
git add app/accounts/page.tsx app/api/crm/medical-aid-claims/route.ts app/api/crm/invoices/route.ts lib/billing/authorization-summary.ts
git commit -m "feat: surface medical aid authorization health in accounts"
```

## Self-Review

**Spec coverage**
- Adds an authorization workflow that the current billing stack does not have
- Keeps invoices and claims as the core financial records
- Adds patient-file and accounts-page visibility for medical aid work
- Uses one new migration rather than multiple overlapping tables

**Placeholder scan**
- No `TBD`
- No `TODO`
- No vague “add validation later” steps

**Consistency check**
- The new status constant is defined once and consumed by the API and UI
- The migration, route, and UI use the same `medical_aid_authorizations` name
- The scope is intentionally narrower than full banking/reconciliation so it can ship safely

## Execution Handoff

Plan complete and saved to `docs/superpowers/specs/2026-04-04-accounts-medical-aid-engine-design.md`. Please review it and let me know if you want any changes before we start writing out the implementation plan.
