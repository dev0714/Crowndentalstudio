# Crown Dental Foundation Stabilization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stabilize the current portal around custom `users`-table authentication, persistent server-side sessions, API-first data access, and reusable workflow foundations so the remaining Crown Dental master scope can be built without rework.

**Architecture:** Move the portal away from mixed browser-Supabase auth and into a custom-auth architecture centered on the `users` table, signed HTTP-only cookies, and server/API access using the service role. Introduce shared infrastructure for permissions, audit logging, status tracking, and workflow metadata first, then migrate each CRM module onto that foundation before building advanced features.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Supabase Postgres, Supabase service-role server access, HTTP-only cookie sessions, existing CRM API routes.

---

## Scope Boundary

This plan is **Phase 1 only** of the full Crown Dental AI Operating System. It intentionally focuses on architectural hardening and shared foundations. It does **not** attempt to ship every requested business module in one pass. Instead, it makes the codebase safe to extend for the subsequent phases below:

1. Phase 1: Foundation stabilization
2. Phase 2: Master patient file completion
3. Phase 3: Lab workflow engine
4. Phase 4: Accounts, banking, and medical aid engine
5. Phase 5: Consents, documents, and compliance vault
6. Phase 6: Recalls, treatment plans, and review safety logic
7. Phase 7: Channel integrations, Elixir diary, and AI automations
8. Phase 8: Dashboards, registers, risk engine, and multi-site readiness

## File Structure

**Create**
- `lib/auth/session.ts`
- `lib/auth/current-user.ts`
- `lib/supabase/server.ts`
- `app/api/auth/me/route.ts`
- `app/api/auth/logout/route.ts`
- `lib/auth/permissions.ts`
- `lib/audit/write-audit-entry.ts`
- `lib/workflows/status-definitions.ts`
- `scripts/006-fix-custom-auth-rls.sql`
- `docs/superpowers/plans/2026-04-04-foundation-stabilization.md`

**Modify**
- `app/api/auth/login/route.ts`
- `components/app-shell.tsx`
- `components/dashboard-layout.tsx`
- `components/sidebar.tsx`
- `app/dashboard/page.tsx`
- `app/patients/page.tsx`
- `app/patients/[id]/page.tsx`
- `app/appointments/page.tsx`
- `app/leads/page.tsx`
- `app/lab/page.tsx`
- `app/accounts/page.tsx`
- `app/stock/page.tsx`
- `app/roles/page.tsx`
- `app/api/crm/patients/route.ts`
- `app/api/crm/appointments/route.ts`
- `app/api/crm/leads/route.ts`
- `app/api/crm/lab-cases/route.ts`
- `app/api/crm/invoices/route.ts`
- `app/api/crm/stock/route.ts`
- `scripts/001-init-crm-schema.sql`

**Why this structure**
- Auth/session files isolate all custom session logic from UI components.
- CRM API routes become the only permitted data boundary between browser UI and the database.
- Shared permission, audit, and workflow libraries keep later modules from duplicating policy and status logic.
- SQL migrations are kept explicit so Supabase state can be reconciled with the codebase.

## Phase 1 Deliverables

- Custom cookie session is the only supported portal auth path
- Browser UI no longer depends on `supabase.auth` or direct browser table reads for protected CRM data
- All current CRM modules use server/API routes
- Recursive and broken `users` RLS policies are removed or replaced
- Shared role-permission checks exist in code
- Shared audit-write helper exists and is called from all mutating CRM routes
- Shared status definitions exist for patients, leads, appointments, lab, invoices, stock, and claims
- Foundation database migration exists for audit and workflow support
- Existing pages continue to function on localhost with current test credentials

## Task 1: Lock Custom Auth as the Single Portal Auth Path

**Files:**
- Modify: `app/api/auth/login/route.ts`
- Modify: `app/auth/login/page.tsx`
- Modify: `app/admin/login/page.tsx`
- Modify: `components/app-shell.tsx`
- Modify: `components/sidebar.tsx`
- Modify: `app/dashboard/page.tsx`
- Test: manual browser login on `/auth/login` and `/dashboard`

- [ ] **Step 1: Write the failing auth path checklist**

Create a local checklist note and confirm the current failures:

```text
1. Login succeeds but some pages still rely on localStorage
2. Sidebar and dashboard fetch auth state differently
3. Protected CRM pages can load without a server session check
4. Logout does not fully clear server auth
```

- [ ] **Step 2: Verify the current gap exists**

Run:

```powershell
Invoke-WebRequest -Uri 'http://localhost:3000/api/auth/me' -UseBasicParsing
```

Expected:
- `401` before login
- after login, some pages still depend on client-only state rather than the cookie

- [ ] **Step 3: Make login, me, logout, app shell, sidebar, and dashboard all use the same cookie-backed session**

Implementation requirements:

```ts
// login route
response.cookies.set({
  name: getSessionCookieName(),
  value: createSessionToken({ id: user.id, email: user.email }),
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: getSessionMaxAgeSeconds(),
});

// app shell
const response = await fetch('/api/auth/me', { credentials: 'include' });

// logout
await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
```

- [ ] **Step 4: Verify the auth path**

Run:

```powershell
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$body = '{"email":"test@crowndental.com","password":"TestPassword1234!"}'
Invoke-WebRequest -Uri 'http://localhost:3000/api/auth/login' -Method Post -ContentType 'application/json' -Body $body -WebSession $session | Select-Object -ExpandProperty StatusCode
Invoke-WebRequest -Uri 'http://localhost:3000/api/auth/me' -WebSession $session | Select-Object -ExpandProperty StatusCode
```

Expected:
- `200`
- `200`

- [ ] **Step 5: Commit**

```bash
git add app/api/auth/login/route.ts app/api/auth/me/route.ts app/api/auth/logout/route.ts app/auth/login/page.tsx app/admin/login/page.tsx components/app-shell.tsx components/sidebar.tsx app/dashboard/page.tsx lib/auth/session.ts lib/auth/current-user.ts lib/supabase/server.ts
git commit -m "feat: stabilize custom session auth flow"
```

## Task 2: Remove Browser-Side Supabase Access from Existing CRM Index Pages

**Files:**
- Modify: `app/patients/page.tsx`
- Modify: `app/appointments/page.tsx`
- Modify: `app/leads/page.tsx`
- Modify: `app/lab/page.tsx`
- Modify: `app/accounts/page.tsx`
- Modify: `app/stock/page.tsx`
- Modify: `app/roles/page.tsx`
- Test: each page loads through `/api/crm/*`

- [ ] **Step 1: Write the failing page migration checklist**

```text
Patients page should fetch /api/crm/patients
Appointments page should fetch /api/crm/appointments
Leads page should fetch /api/crm/leads
Lab page should fetch /api/crm/lab-cases
Accounts page should fetch API-backed invoice/account data
Stock page should fetch /api/crm/stock
Roles page should fetch API-backed user/role data
```

- [ ] **Step 2: Verify at least one remaining page still uses browser Supabase**

Run:

```powershell
rg -n "from\\('|supabase\\." app\\appointments\\page.tsx app\\leads\\page.tsx app\\lab\\page.tsx app\\accounts\\page.tsx app\\stock\\page.tsx app\\roles\\page.tsx
```

Expected:
- direct client-side Supabase calls are still present before migration

- [ ] **Step 3: Replace direct client-side table queries with API fetches**

Implementation pattern:

```ts
const response = await fetch('/api/crm/appointments', {
  credentials: 'include',
});

if (!response.ok) {
  const payload = await response.json().catch(() => ({}));
  setError(payload.error || 'Failed to load appointments');
  return;
}

const payload = await response.json();
setAppointments(payload.data || []);
```

- [ ] **Step 4: Verify each page uses API fetches**

Run:

```powershell
rg -n "fetch\\('/api/crm" app\\patients\\page.tsx app\\appointments\\page.tsx app\\leads\\page.tsx app\\lab\\page.tsx app\\accounts\\page.tsx app\\stock\\page.tsx app\\roles\\page.tsx
```

Expected:
- every migrated page fetches its own `/api/crm/*` endpoint

- [ ] **Step 5: Commit**

```bash
git add app/patients/page.tsx app/appointments/page.tsx app/leads/page.tsx app/lab/page.tsx app/accounts/page.tsx app/stock/page.tsx app/roles/page.tsx
git commit -m "refactor: move crm list pages to api-backed custom auth"
```

## Task 3: Move CRM API Routes off `supabase.auth` and onto Custom Session Auth

**Files:**
- Modify: `app/api/crm/appointments/route.ts`
- Modify: `app/api/crm/leads/route.ts`
- Modify: `app/api/crm/lab-cases/route.ts`
- Modify: `app/api/crm/invoices/route.ts`
- Modify: `app/api/crm/stock/route.ts`
- Modify: `app/api/crm/patients/route.ts`
- Create: `lib/auth/permissions.ts`
- Test: `/api/crm/*` returns `401` when logged out and `200` when logged in

- [ ] **Step 1: Write the failing route checklist**

```text
CRM routes must stop using getCurrentUser() from the browser Supabase client
CRM routes must use getAuthenticatedUser() from the session cookie
Server writes must use supabaseServer
Role-sensitive routes must use a shared permission helper
```

- [ ] **Step 2: Verify old auth usage exists**

Run:

```powershell
rg -n "getCurrentUser\\(|supabase\\.from\\(" app\\api\\crm
```

Expected:
- multiple CRM routes still depend on `getCurrentUser()` and non-server Supabase access

- [ ] **Step 3: Create shared permission helpers and migrate all CRM routes**

Implementation requirements:

```ts
export function hasRole(userRole: string, allowed: string[]) {
  return allowed.includes(userRole);
}

export function assertRole(userRole: string, allowed: string[]) {
  if (!hasRole(userRole, allowed)) {
    throw new Error('Forbidden');
  }
}
```

Route pattern:

```ts
const user = await getAuthenticatedUser();
if (!user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

const { data, error } = await supabaseServer.from('stock_items').select('*');
```

- [ ] **Step 4: Verify API auth behavior**

Run:

```powershell
Invoke-WebRequest -Uri 'http://localhost:3000/api/crm/patients' -UseBasicParsing
```

Expected:
- `401` without cookie session

Then run:

```powershell
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$body = '{"email":"test@crowndental.com","password":"TestPassword1234!"}'
Invoke-WebRequest -Uri 'http://localhost:3000/api/auth/login' -Method Post -ContentType 'application/json' -Body $body -WebSession $session > $null
Invoke-WebRequest -Uri 'http://localhost:3000/api/crm/patients' -WebSession $session | Select-Object -ExpandProperty StatusCode
```

Expected:
- `200`

- [ ] **Step 5: Commit**

```bash
git add app/api/crm app/api/auth/me/route.ts lib/auth/current-user.ts lib/auth/permissions.ts lib/supabase/server.ts
git commit -m "refactor: migrate crm api routes to custom session auth"
```

## Task 4: Repair RLS and Align Database Scripts with the Custom Auth Model

**Files:**
- Create: `scripts/006-fix-custom-auth-rls.sql`
- Modify: `scripts/001-init-crm-schema.sql`
- Modify: `scripts/003-add-password-to-users.sql`
- Test: anon queries fail safely, service-role queries work, no recursive policy remains

- [ ] **Step 1: Write the failing SQL checklist**

```text
Recursive users policy must be removed
Schema must stop assuming auth.uid() as the primary portal auth path
Custom users-table login must be reflected in migration history
```

- [ ] **Step 2: Verify recursion source**

Run:

```powershell
rg -n "FROM users WHERE auth_id = auth.uid|CREATE POLICY|auth.uid\\(" scripts\\001-init-crm-schema.sql
```

Expected:
- recursive self-referencing user-policy logic is still present

- [ ] **Step 3: Write a repair migration for custom auth**

Include SQL like:

```sql
drop policy if exists "Users can read own record" on users;
drop policy if exists "CEO and Admin can read all users" on users;

create policy "Service role can read all users" on users
for select
using (auth.role() = 'service_role');

create policy "Service role full access to crm tables" on patients
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
```

Also update comments in the schema to state:

```sql
-- Portal authentication is handled by application sessions against public.users.
-- Supabase auth is not the primary browser auth boundary for the CRM portal.
```

- [ ] **Step 4: Verify the SQL migration file exists and is grep-clean**

Run:

```powershell
rg -n "recursive|auth.uid\\(|Service role" scripts\\006-fix-custom-auth-rls.sql scripts\\001-init-crm-schema.sql
```

Expected:
- new migration exists
- old recursive logic is removed or clearly superseded

- [ ] **Step 5: Commit**

```bash
git add scripts/001-init-crm-schema.sql scripts/003-add-password-to-users.sql scripts/006-fix-custom-auth-rls.sql
git commit -m "fix: align rls and schema with custom users auth"
```

## Task 5: Add a Shared Audit Trail Writer and Call It from Mutating Routes

**Files:**
- Create: `lib/audit/write-audit-entry.ts`
- Modify: `app/api/crm/patients/route.ts`
- Modify: `app/api/crm/appointments/route.ts`
- Modify: `app/api/crm/leads/route.ts`
- Modify: `app/api/crm/lab-cases/route.ts`
- Modify: `app/api/crm/invoices/route.ts`
- Modify: `app/api/crm/stock/route.ts`
- Modify: `scripts/006-fix-custom-auth-rls.sql`
- Test: create/update/delete writes an audit row

- [ ] **Step 1: Write the failing audit checklist**

```text
Every create/update/delete action must record actor, action, entity, entity id, timestamp
Audit helper must not duplicate route logic
Audit writes must fail soft so business action can still complete with logged warning
```

- [ ] **Step 2: Define the audit table in SQL**

Add SQL in the migration:

```sql
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
```

- [ ] **Step 3: Implement the shared audit writer and route hooks**

Helper pattern:

```ts
await writeAuditEntry({
  actor: user,
  action: 'patient.updated',
  entityType: 'patient',
  entityId: patientId,
  metadata: { fields: Object.keys(body) },
});
```

- [ ] **Step 4: Verify audit writes**

Run:

```powershell
rg -n "writeAuditEntry\\(" app\\api\\crm
```

Expected:
- each mutating CRM route contains an audit write call

- [ ] **Step 5: Commit**

```bash
git add lib/audit/write-audit-entry.ts app/api/crm scripts/006-fix-custom-auth-rls.sql
git commit -m "feat: add shared audit logging for crm mutations"
```

## Task 6: Introduce Shared Workflow Status Definitions

**Files:**
- Create: `lib/workflows/status-definitions.ts`
- Modify: `app/lab/page.tsx`
- Modify: `app/leads/page.tsx`
- Modify: `app/appointments/page.tsx`
- Modify: `app/accounts/page.tsx`
- Modify: `app/stock/page.tsx`
- Modify: `app/patients/[id]/page.tsx`
- Test: UI consumes status definitions from a single source

- [ ] **Step 1: Write the failing status checklist**

```text
Lab statuses should have one source of truth
Lead statuses should have one source of truth
Appointment statuses should have one source of truth
Invoice and stock statuses should not be hard-coded in scattered files
```

- [ ] **Step 2: Verify hard-coded status literals exist**

Run:

```powershell
rg -n "'Scheduled'|'Completed'|'New'|'Qualified'|'Received'|'Ready'|'Draft'|'Paid'" app
```

Expected:
- repeated hard-coded workflow values appear in many files

- [ ] **Step 3: Create shared status definitions**

Implementation pattern:

```ts
export const LAB_CASE_STATUSES = [
  'Created',
  'Collected',
  'Received by lab',
  'In production',
  'Ready',
  'Dispatched',
  'Received by practice',
  'Fitted to patient',
  'Returned for adjustment',
  'Remake',
  'Completed',
] as const;
```

Also define:
- lead statuses
- appointment statuses
- invoice statuses
- stock alert levels
- claim statuses

- [ ] **Step 4: Verify shared imports replace literals**

Run:

```powershell
rg -n "LAB_CASE_STATUSES|LEAD_STATUSES|APPOINTMENT_STATUSES|INVOICE_STATUSES" app
```

Expected:
- consuming pages import the shared status definitions

- [ ] **Step 5: Commit**

```bash
git add lib/workflows/status-definitions.ts app/lab/page.tsx app/leads/page.tsx app/appointments/page.tsx app/accounts/page.tsx app/stock/page.tsx app/patients/[id]/page.tsx
git commit -m "refactor: centralize workflow status definitions"
```

## Task 7: Migrate the Patient Detail Page off Browser Supabase

**Files:**
- Modify: `app/patients/[id]/page.tsx`
- Create or Modify: supporting patient-detail API routes under `app/api/crm/patients`
- Test: patient detail, notes, quotes, claims, lab, consents, and messages work through custom-auth APIs

- [ ] **Step 1: Write the failing patient-detail checklist**

```text
Patient detail page still reads and writes directly with browser Supabase
Initial patient load must use API
Each tab mutation must use API
Page should continue to open with existing patient ids
```

- [ ] **Step 2: Verify remaining direct browser writes exist**

Run:

```powershell
rg -n "await supabase\\.from\\(" app\\patients\\[id]\\page.tsx
```

Expected:
- multiple remaining browser writes and reads still exist

- [ ] **Step 3: Split patient-detail API into focused endpoints**

Create route shapes like:

```text
/api/crm/patients?id=...
/api/crm/patients/history?patientId=...
/api/crm/patients/clinical-notes?patientId=...
/api/crm/patients/treatment-plans?patientId=...
/api/crm/patients/quotes?patientId=...
/api/crm/patients/consents?patientId=...
/api/crm/patients/payments?patientId=...
/api/crm/patients/claims?patientId=...
/api/crm/patients/lab?patientId=...
/api/crm/patients/messages?patientId=...
```

Then replace page-level Supabase calls with `fetch(..., { credentials: 'include' })`.

- [ ] **Step 4: Verify the patient detail page no longer depends on browser Supabase**

Run:

```powershell
rg -n "supabase\\." app\\patients\\[id]\\page.tsx
```

Expected:
- no direct browser Supabase usage remains in the page

- [ ] **Step 5: Commit**

```bash
git add app/patients/[id]/page.tsx app/api/crm/patients
git commit -m "refactor: move patient detail workflow to custom-auth apis"
```

## Task 8: Define the Follow-On Delivery Plans

**Files:**
- Modify: `docs/superpowers/plans/2026-04-04-foundation-stabilization.md`

- [ ] **Step 1: Write the next-plan inventory**

List the next implementation plans to write immediately after Phase 1:

```text
2026-04-04-master-patient-file-completion.md
2026-04-04-lab-workflow-engine.md
2026-04-04-accounts-medical-aid-engine.md
2026-04-04-consents-documents-compliance.md
2026-04-04-recalls-treatment-reviews.md
2026-04-04-integrations-and-ai-automation.md
2026-04-04-dashboards-registers-risk-engine.md
```

- [ ] **Step 2: Add success gates for Phase 1**

Success gates:

```text
1. All core CRM pages authenticate through custom users-table session auth
2. No protected browser page uses direct browser Supabase queries
3. CRM APIs use service-role server access only
4. Audit writes exist for every mutation path
5. Shared workflow status definitions exist
6. RLS recursion is removed from the shipped SQL path
```

- [ ] **Step 3: Verify plan completeness**

Run:

```powershell
rg -n "TBD|TODO|implement later|fill in details|appropriate error handling|write tests for the above" docs\\superpowers\\plans\\2026-04-04-foundation-stabilization.md
```

Expected:
- no matches

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/plans/2026-04-04-foundation-stabilization.md
git commit -m "docs: add foundation stabilization implementation plan"
```

## Self-Review

**Spec coverage**
- Covers custom auth completion
- Covers API-first migration
- Covers RLS repair
- Covers audit trail foundation
- Covers shared workflow status foundation
- Covers patient detail migration
- Leaves advanced business modules for explicit follow-on plans rather than hiding them in vague future work

**Placeholder scan**
- No `TBD`, `TODO`, or “implement later” placeholders
- Each task has concrete files, verification commands, and expected outcomes

**Type consistency**
- Uses `getAuthenticatedUser()` for server auth
- Uses `supabaseServer` for server DB access
- Uses shared `writeAuditEntry()` and status definition modules as consistent foundations

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-04-foundation-stabilization.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**

## Follow-On Queue

After this stabilization pass, the next delivery plans to write are:

- `2026-04-04-master-patient-file-completion.md`
- `2026-04-04-lab-workflow-engine.md`
- `2026-04-04-accounts-medical-aid-engine.md`
- `2026-04-04-consents-documents-compliance.md`
- `2026-04-04-recalls-treatment-reviews.md`
- `2026-04-04-integrations-and-ai-automation.md`
- `2026-04-04-dashboards-registers-risk-engine.md`

Phase 1 is only complete once the core CRM pages use the custom session flow, protected browser pages stop calling Supabase directly, CRM APIs run through service-role access, audit writes exist on every mutation, shared statuses are centralized, and the shipped SQL path no longer contains recursive user-policy logic.
