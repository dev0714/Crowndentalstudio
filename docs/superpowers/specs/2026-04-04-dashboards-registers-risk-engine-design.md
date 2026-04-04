# Dashboards, Registers, and Risk Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single operations control center that surfaces role-aware dashboards, generated registers, patient audit timelines, and risk flags so the practice can monitor work, catch exceptions, and export the records it needs.

**Architecture:** Reuse the existing CRM tables and custom-auth API layer as the data source, then add one operations API that assembles dashboard metrics, register rows, and risk signals in a consistent shape. The UI should be a single operations page with role-aware sections rather than separate disconnected dashboards. Where practical, the page should render from one summary payload and drill into registers through simple filters and exports.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Supabase Postgres, service-role server access, HTTP-only cookie auth, existing CRM API patterns, shared workflow status constants.

---

## Scope Boundary

This plan covers the final operational control layer for the portal.

It includes:
1. CEO, reception, accounts, and clinical dashboard summaries
2. System-generated registers for leads, lab, consent, AR, recall, stock, and incidents
3. A patient-level audit timeline view
4. A simple risk engine for missing consent, overdue lab work, unpaid invoices, and stale recalls
5. Exportable register data for day-to-day operations

It does **not** include:
1. Elixir diary integration
2. AI call handling or omnichannel lead intake
3. SMS/WhatsApp/email dispatch engines
4. Profitability modeling by case with full costing inputs
5. Multi-site permissions redesign

## File Structure

**Create**
- `app/api/crm/operations/route.ts`
- `app/operations/page.tsx`
- `lib/operations/operations-summary.ts`
- `lib/operations/operations-summary.test.ts`
- `lib/operations/register-export.ts`
- `lib/operations/register-export.test.ts`
- `lib/operations/risk-signals.ts`
- `lib/operations/risk-signals.test.ts`

**Modify**
- `components/sidebar.tsx`
- `lib/auth/portal-navigation.ts`
- `app/compliance/page.tsx`
- `app/dashboard/page.tsx`
- `app/patients/[id]/page.tsx`
- `app/accounts/page.tsx`
- `app/lab/page.tsx`
- `app/leads/page.tsx`
- `app/stock/page.tsx`
- `lib/workflows/status-definitions.ts`

## Data Sources

The operations API should aggregate from existing sources:
- `patients`
- `appointments`
- `leads`
- `lab_cases`
- `invoices`
- `invoice_items`
- `medical_aid_claims`
- `medical_aid_authorizations`
- `patient_consents`
- `patient_communication_consent`
- `patient_documents`
- `patient_contacts`
- `stock_items`
- `audit_log`
- `quotes`
- `treatment_plans`

## Phase Deliverables

- A single `/operations` page that loads quickly and shows the most important metrics
- Register sections that can be filtered by type and exported
- A patient audit timeline that shows key events in order
- Risk flags that surface operational exceptions before they become problems
- Navigation entries for the new operations page

## Task 1: Add Shared Summary, Register, and Risk Helpers

**Files:**
- Create: `lib/operations/operations-summary.ts`
- Create: `lib/operations/operations-summary.test.ts`
- Create: `lib/operations/register-export.ts`
- Create: `lib/operations/register-export.test.ts`
- Create: `lib/operations/risk-signals.ts`
- Create: `lib/operations/risk-signals.test.ts`

- [ ] **Step 1: Define the dashboard summary helpers**

```ts
export function buildOperationsSummary(input: {
  patients: Array<{ status: string }>;
  appointments: Array<{ status: string }>;
  invoices: Array<{ status: string; total_amount: number; paid_amount: number }>;
  labCases: Array<{ status: string; workflow_stage?: string | null; due_date?: string | null }>;
  leads: Array<{ status: string }>;
}) {
  return {
    totalPatients: input.patients.length,
    activePatients: input.patients.filter((patient) => patient.status === 'Active').length,
    todayAppointments: input.appointments.filter((appointment) => appointment.status === 'Scheduled' || appointment.status === 'Confirmed').length,
    overdueInvoices: input.invoices.filter((invoice) => invoice.status === 'Overdue').length,
    openLabCases: input.labCases.filter((labCase) => labCase.status !== 'Completed').length,
    openLeads: input.leads.filter((lead) => lead.status !== 'Lost' && lead.status !== 'Converted').length,
  };
}
```

- [ ] **Step 2: Define the register export helper**

```ts
export function toCsv(rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escape = (value: unknown) => {
    const text = String(value ?? '');
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return [headers.join(','), ...rows.map((row) => headers.map((header) => escape(row[header])).join(','))].join('\n');
}
```

- [ ] **Step 3: Define the risk signal helper**

```ts
export function buildRiskSignals(input: {
  outstandingConsentCount: number;
  overdueLabCount: number;
  overdueInvoiceCount: number;
  staleRecallCount: number;
}) {
  const signals: Array<{ key: string; label: string; severity: 'low' | 'medium' | 'high' }> = [];
  if (input.outstandingConsentCount > 0) signals.push({ key: 'missing-consent', label: 'Missing consent records', severity: 'high' });
  if (input.overdueLabCount > 0) signals.push({ key: 'overdue-lab', label: 'Overdue lab cases', severity: 'high' });
  if (input.overdueInvoiceCount > 0) signals.push({ key: 'unpaid-invoices', label: 'Unpaid invoices', severity: 'medium' });
  if (input.staleRecallCount > 0) signals.push({ key: 'stale-recalls', label: 'Stale recall follow-ups', severity: 'medium' });
  return signals;
}
```

- [ ] **Step 4: Add tests for the helpers**

Use Node test cases that verify:
- counts are calculated correctly
- CSV escaping preserves commas and quotes
- risk signals are emitted only when counts are above zero

- [ ] **Step 5: Verify the helper tests**

Run:

```powershell
node --test --experimental-strip-types .\lib\operations\operations-summary.test.ts
node --test --experimental-strip-types .\lib\operations\register-export.test.ts
node --test --experimental-strip-types .\lib\operations\risk-signals.test.ts
```

Expected:
- helper tests pass

- [ ] **Step 6: Commit**

```bash
git add lib/operations/operations-summary.ts lib/operations/operations-summary.test.ts lib/operations/register-export.ts lib/operations/register-export.test.ts lib/operations/risk-signals.ts lib/operations/risk-signals.test.ts
git commit -m "feat: add operations helper foundations"
```

## Task 2: Build the Operations API

**Files:**
- Create: `app/api/crm/operations/route.ts`
- Modify: `lib/workflows/status-definitions.ts`

- [ ] **Step 1: Define the API response shape**

The API should return:
- `summary` for dashboards
- `registers` keyed by register type
- `patientTimeline` for a selected patient
- `risks` for current exceptions

- [ ] **Step 2: Fetch source data from the CRM tables**

Use `supabaseServer` and the authenticated session to load the required records from the data sources listed above.

- [ ] **Step 3: Assemble register rows**

Each register should include a normalized row shape with:
- `id`
- `label`
- `patient_id`
- `patient_name`
- `status`
- `date`
- `owner`
- `source`

- [ ] **Step 4: Build the patient audit timeline**

The timeline should combine:
- `audit_log`
- appointment changes
- lab case events
- consent creation
- invoice creation and payment updates
- claims and authorizations

- [ ] **Step 5: Add risk detection**

The API should flag:
- patients missing communication consent
- lab cases overdue beyond due date or expected return date
- invoices that are overdue or partially paid
- patients with stale recall status
- patients with a case in the lab and no workflow progress

- [ ] **Step 6: Verify the response structure**

Run:

```powershell
rg -n "summary|registers|patientTimeline|risks" app\api\crm\operations\route.ts
```

Expected:
- the route returns all four top-level groups

- [ ] **Step 7: Commit**

```bash
git add app/api/crm/operations/route.ts lib/workflows/status-definitions.ts
git commit -m "feat: add operations api"
```

## Task 3: Build the Operations Control Center Page

**Files:**
- Create: `app/operations/page.tsx`
- Modify: `components/sidebar.tsx`
- Modify: `lib/auth/portal-navigation.ts`

- [ ] **Step 1: Create the operations page shell**

The page should show:
- a top summary strip
- role-aware dashboard cards
- register sections with filters
- a patient audit timeline panel
- a risk panel

- [ ] **Step 2: Load the operations payload from the API**

Use:

```ts
fetch('/api/crm/operations', { credentials: 'include' })
```

- [ ] **Step 3: Add register filters and export buttons**

Each register section should allow:
- filter by type/status
- copy or export the filtered rows to CSV

- [ ] **Step 4: Add navigation links**

Add `/operations` to the sidebar and portal navigation so the page is easy to reach from existing layouts.

- [ ] **Step 5: Verify the page renders**

Run:

```powershell
npm run build
```

Expected:
- build succeeds

- [ ] **Step 6: Commit**

```bash
git add app/operations/page.tsx components/sidebar.tsx lib/auth/portal-navigation.ts
git commit -m "feat: add operations control center"
```

## Task 4: Surface Patient Audit and Risk Views in Existing Pages

**Files:**
- Modify: `app/patients/[id]/page.tsx`
- Modify: `app/compliance/page.tsx`
- Modify: `app/dashboard/page.tsx`
- Modify: `app/accounts/page.tsx`
- Modify: `app/lab/page.tsx`
- Modify: `app/leads/page.tsx`
- Modify: `app/stock/page.tsx`

- [ ] **Step 1: Add a patient timeline panel**

The patient detail page should show a compact timeline backed by the operations API so staff can see:
- calls
- bookings
- consents
- documents
- invoices
- claims
- lab events

- [ ] **Step 2: Surface risk flags in current dashboards**

Each existing dashboard page should show a compact risk summary, not a duplicate control center:
- dashboard shows top risk counts
- accounts shows finance risks
- lab shows overdue lab risks
- compliance shows consent gaps

- [ ] **Step 3: Reuse the operations API**

These pages should fetch from `/api/crm/operations` instead of reconstructing the logic locally.

- [ ] **Step 4: Verify the pages still build**

Run:

```powershell
npm run build
```

Expected:
- build succeeds after the new page integrations

- [ ] **Step 5: Commit**

```bash
git add app/patients/[id]/page.tsx app/compliance/page.tsx app/dashboard/page.tsx app/accounts/page.tsx app/lab/page.tsx app/leads/page.tsx app/stock/page.tsx
git commit -m "feat: surface operations timeline and risk summaries"
```

## Self-Review

**Scope coverage**
- Covers dashboards, registers, patient timeline, and risk engine
- Keeps the control center in one page and one API
- Reuses existing data sources instead of inventing new operational tables

**Placeholder scan**
- No `TBD`
- No `TODO`
- No vague “add analytics later”

**Consistency check**
- The same normalized register row shape is reused across sections
- Risk detection stays simple and explainable
- Existing pages only receive small summary surfaces so the new page remains the primary control center

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-04-dashboards-registers-risk-engine.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
