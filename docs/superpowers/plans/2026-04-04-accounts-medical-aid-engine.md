# Accounts and Medical Aid Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a practical accounts and medical-aid engine that tracks invoice health, claims, and authorizations so the practice can see what is billed, what is pending, and what still needs action.

**Architecture:** Keep invoices and claims as the financial source of truth, then add a dedicated authorization workflow that links patients, procedures, invoices, and claims. The UI stays API-first: the accounts page becomes the operational billing dashboard, and the patient file gains a medical-aid section for authorization visibility. This slice intentionally stops short of bank reconciliation and debt collection automation so the model stays simple and safe.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Supabase Postgres, service-role server access, HTTP-only cookie auth, existing CRM API patterns, shared workflow status constants.

---

## Scope Boundary

This plan is **Phase 4, slice 1** of the broader billing work.

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
- `scripts/001-init-crm-schema.sql`

## Task 1: Add the Medical-Aid Authorization Database Table

**Files:**
- Create: `scripts/009-medical-aid-authorizations.sql`
- Modify: `scripts/001-init-crm-schema.sql`

- [ ] **Step 1: Write the authorization table migration**

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

- [ ] **Step 3: Add a short schema note**

Insert a comment in `scripts/001-init-crm-schema.sql` noting that authorization tracking is provided by `medical_aid_authorizations`.

- [ ] **Step 4: Verify the migration text**

Run:

```powershell
rg -n "medical_aid_authorizations|service_role" scripts\009-medical-aid-authorizations.sql
```

Expected:
- the new table definition appears
- the service-role policy appears

- [ ] **Step 5: Commit**

```bash
git add scripts/001-init-crm-schema.sql scripts/009-medical-aid-authorizations.sql
git commit -m "feat: add medical aid authorization schema"
```

## Task 2: Add Shared Billing Summary Logic

**Files:**
- Create: `lib/billing/authorization-summary.ts`
- Create: `lib/billing/authorization-summary.test.ts`

- [ ] **Step 1: Add summary helpers**

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

- [ ] **Step 2: Add tests for the helper math**

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

- [ ] **Step 3: Run the helper test**

Run:

```powershell
node --test --experimental-strip-types .\lib\billing\authorization-summary.test.ts
```

Expected:
- the helper tests pass

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

- [ ] **Step 1: Add the authorization type**

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

- [ ] **Step 2: Add the shared workflow status constant**

```ts
export const MEDICAL_AID_AUTHORIZATION_STATUSES = [
  'Pending',
  'Approved',
  'Rejected',
  'Expired',
  'Needs Review',
] as const;
```

- [ ] **Step 3: Implement GET, POST, PUT, and DELETE**

Use the existing custom session helper and `supabaseServer` pattern.

Required GET filters:
- `?id=...`
- `?patientId=...`
- `?invoiceId=...`

Create payload shape:

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

- [ ] **Step 4: Verify the API file uses the new table and status constants**

Run:

```powershell
rg -n "medical_aid_authorizations|MEDICAL_AID_AUTHORIZATION_STATUSES" app\api\crm\medical-aid-authorizations\route.ts lib\types\crm.ts lib\workflows\status-definitions.ts
```

Expected:
- the route references the new table and status constant

- [ ] **Step 5: Commit**

```bash
git add app/api/crm/medical-aid-authorizations/route.ts lib/types/crm.ts lib/workflows/status-definitions.ts
git commit -m "feat: add medical aid authorization api"
```

## Task 4: Extend the Patient Detail Page

**Files:**
- Modify: `app/patients/[id]/page.tsx`
- Modify: `app/api/crm/patients/[resource]/route.ts`

- [ ] **Step 1: Add an authorizations tab**

The tab should show:
- authorization status
- requested date
- reference number
- procedure name
- approved amount
- co-payment
- shortfall
- notes

- [ ] **Step 2: Fetch authorizations through the patient resource route**

Use:

```ts
fetch(`/api/crm/patients/authorizations?patientId=${patientId}`, { credentials: 'include' })
```

- [ ] **Step 3: Add create, update, and delete actions**

Use the existing patient-resource route with:

```text
POST /api/crm/patients/authorizations
PUT /api/crm/patients/authorizations?id=...
DELETE /api/crm/patients/authorizations?id=...
```

- [ ] **Step 4: Verify the page still opens for existing patients**

Run:

```powershell
Invoke-WebRequest -Uri 'http://localhost:3000/patients/82cc7c55-f138-4b1a-acf0-2f6a0b143474' -UseBasicParsing
```

Expected:
- `200` when authenticated

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

- [ ] **Step 1: Add authorization summary cards**

The page should show:
- pending authorizations
- approved authorizations
- total invoice shortfall
- total authorized value

- [ ] **Step 2: Load authorization data alongside invoices and claims**

Add a fetch call for:

```ts
fetch('/api/crm/medical-aid-authorizations?limit=1000&page=1', { credentials: 'include' })
```

- [ ] **Step 3: Calculate invoice and authorization shortfalls**

Use the shared helpers to compute:
- outstanding invoice balance
- patient shortfall exposure

- [ ] **Step 4: Verify the billing page still builds cleanly**

Run:

```powershell
npm run build
```

Expected:
- build succeeds even if the new authorization table is empty

- [ ] **Step 5: Commit**

```bash
git add app/accounts/page.tsx app/api/crm/medical-aid-claims/route.ts app/api/crm/invoices/route.ts lib/billing/authorization-summary.ts
git commit -m "feat: surface medical aid authorization health in accounts"
```

## Self-Review

**Scope coverage**
- The plan implements the missing authorization layer the current billing stack does not have.
- It keeps invoices and claims as the core financial records.
- It exposes the new information in both the patient file and the accounts dashboard.

**Placeholder scan**
- No `TBD`
- No `TODO`
- No vague “handle edge cases later”

**Type consistency**
- The status values are defined once and reused.
- The table name is consistent across migration, API, and UI.
- The helper functions are small and testable on their own.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-04-accounts-medical-aid-engine.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
