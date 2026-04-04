# Treatment Plan and Review Safety Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn diagnosis into a patient-friendly treatment plan with risks, alternatives, and pricing, then gate public review requests behind a private satisfaction check so unhappy patients are routed to internal follow-up first.

**Architecture:** Reuse the existing patient file, document generator, and CRM API layer. Add one shared treatment-plan composer that converts clinical inputs into calm patient-facing wording, one narrow patient-feedback table for complaint-first review tracking, and one portal workflow that only offers a public review prompt after a happy satisfaction result. This keeps clinical authorship with the doctor and avoids a second document pipeline.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Supabase Postgres, service-role server access, HTTP-only cookie auth, existing patient document generator, existing CRM API patterns, shared workflow status constants.

---

## Scope Boundary

This plan covers the treatment-plan and review-safety slice only.

It includes:
1. Patient-friendly treatment-plan drafting from diagnosis, procedures, risks, alternatives, and prices
2. Doctor approval before a treatment plan is marked ready to send
3. Document generation for treatment plans using the existing patient document generator
4. Complaint-first satisfaction checks after appointments or treatment completion
5. Internal complaint logging when the patient is not happy
6. Public review prompting only after a happy response is captured
7. Portal visibility for treatment-plan drafts and review outcomes on the patient file

It does **not** include:
1. Full AI voice/call handling
2. External review-platform integrations beyond a link or prompt state
3. Detailed template editor for every document type
4. New billing or medical-aid logic
5. Automated SMS/WhatsApp delivery

## File Structure

**Create**
- `lib/patients/treatment-plan-composer.ts`
- `lib/patients/treatment-plan-composer.test.ts`
- `lib/reviews/review-safety.ts`
- `lib/reviews/review-safety.test.ts`
- `scripts/011-treatment-plan-review-safety.sql`

**Modify**
- `app/patients/[id]/page.tsx`
- `app/api/crm/patients/[resource]/route.ts`
- `lib/documents/patient-document-generator.ts`
- `lib/workflows/status-definitions.ts`
- `lib/types/crm.ts`

## Data Model

The existing `treatment_plans` table remains the source of truth for clinical plan records.

This slice adds one small workflow table for review safety:
- `patient_feedback`

Required columns for `patient_feedback`:
- `id`
- `patient_id`
- `appointment_id`
- `treatment_plan_id`
- `feedback_type`
- `outcome`
- `rating`
- `notes`
- `review_prompted_at`
- `review_link_sent_at`
- `complaint_logged_at`
- `resolved_at`
- `created_by`
- `created_at`
- `updated_at`

Recommended workflow values:
- `feedback_type`: `satisfaction` or `complaint`
- `outcome`: `happy`, `needs_follow_up`, `complaint_logged`, `resolved`

## Phase Deliverables

- Doctors can draft a patient-friendly treatment plan from the patient file
- The generated plan includes diagnosis, recommended options, alternatives, risks, and pricing
- The doctor must approve a draft before it can be marked ready to send
- The patient file shows both treatment-plan drafts and review outcomes
- A satisfaction check captures whether the patient was happy before any public review link is offered
- Complaints are logged internally first and can be followed up before the review prompt is shown

## Task 1: Add the Treatment-Plan Composer

**Files:**
- Create: `lib/patients/treatment-plan-composer.ts`
- Create: `lib/patients/treatment-plan-composer.test.ts`
- Modify: `lib/documents/patient-document-generator.ts`

- [ ] **Step 1: Write the failing composer test**

Create a test that proves clinical text is turned into a calmer patient-facing treatment plan and that prices, risks, and alternatives are preserved.

Use a test shaped like this:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { composeTreatmentPlan } from './treatment-plan-composer';

test('composes a patient-friendly treatment plan with risks, alternatives, and prices', () => {
  const result = composeTreatmentPlan({
    patientName: 'Ada Mthembu',
    diagnosis: 'Fractured upper molar with infection',
    treatmentOptions: ['Root canal treatment', 'Extraction and restoration'],
    risks: ['Temporary sensitivity', 'Possible need for retreatment'],
    alternatives: ['Extraction with replacement later'],
    prices: [
      { label: 'Root canal treatment', amount: 'R4,500' },
      { label: 'Extraction', amount: 'R1,200' },
    ],
    doctorName: 'Dr Fareed',
    practiceName: 'Crown Dental Studio',
  });

  assert.match(result.summary, /patient-friendly treatment plan/i);
  assert.match(result.body, /possible risks/i);
  assert.match(result.body, /temporary sensitivity/i);
  assert.match(result.body, /alternatives discussed/i);
  assert.match(result.body, /R4,500/);
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run:

```powershell
node --test --experimental-strip-types .\lib\patients\treatment-plan-composer.test.ts
```

Expected:
- the composer test fails because `composeTreatmentPlan` does not exist yet

- [ ] **Step 3: Implement the minimal composer**

Implement `composeTreatmentPlan(input)` so it accepts:

```ts
{
  patientName: string;
  diagnosis: string;
  treatmentOptions: string[];
  risks: string[];
  alternatives: string[];
  prices: Array<{ label: string; amount: string }>;
  doctorName?: string;
  practiceName?: string;
}
```

It should return:

```ts
{
  title: string;
  summary: string;
  body: string;
  status: 'draft';
}
```

The body should:
- keep the diagnosis visible
- use a calm patient-facing tone
- include risks without sounding alarming
- list alternatives clearly
- include prices in a readable format

- [ ] **Step 4: Wire the document generator to use the composer**

Update `generatePatientDocument()` so `documentType: 'treatment_plan'` delegates to the new composer instead of building treatment-plan wording inline.

Keep the generator output consistent with the existing document format:

```ts
{
  title: string;
  content: string;
  summary: string;
}
```

- [ ] **Step 5: Run the test and confirm it passes**

Run:

```powershell
node --test --experimental-strip-types .\lib\patients\treatment-plan-composer.test.ts
```

Expected:
- the composer test passes

- [ ] **Step 6: Commit**

```bash
git add lib/patients/treatment-plan-composer.ts lib/patients/treatment-plan-composer.test.ts lib/documents/patient-document-generator.ts
git commit -m "feat: add treatment plan composer"
```

## Task 2: Add Review Safety Logic and Storage

**Files:**
- Create: `lib/reviews/review-safety.ts`
- Create: `lib/reviews/review-safety.test.ts`
- Create: `scripts/011-treatment-plan-review-safety.sql`
- Modify: `lib/workflows/status-definitions.ts`

- [ ] **Step 1: Write the failing review-safety test**

Create a test that proves:
- a happy satisfaction result allows a review prompt
- a complaint result blocks a review prompt
- unresolved complaints require internal follow-up first

Use a test shaped like this:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { needsManagerFollowUp, shouldPromptForReview } from './review-safety';

test('allows public review prompts only after a happy outcome', () => {
  assert.equal(shouldPromptForReview({ feedback_type: 'satisfaction', outcome: 'happy' }), true);
  assert.equal(shouldPromptForReview({ feedback_type: 'complaint', outcome: 'complaint_logged' }), false);
  assert.equal(needsManagerFollowUp({ feedback_type: 'complaint', outcome: 'needs_follow_up' }), true);
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run:

```powershell
node --test --experimental-strip-types .\lib\reviews\review-safety.test.ts
```

Expected:
- the test fails because the helper does not exist yet

- [ ] **Step 3: Implement the minimal review-safety helper**

Implement helpers such as:

```ts
export function shouldPromptForReview(input: { feedback_type: string; outcome: string }): boolean;
export function needsManagerFollowUp(input: { feedback_type: string; outcome: string }): boolean;
export function isComplaintFirstOutcome(input: { feedback_type: string; outcome: string }): boolean;
```

Behavior:
- only a happy satisfaction response returns `true` for review prompting
- complaints always block public review prompting
- unresolved complaints require manager follow-up

- [ ] **Step 4: Add the patient feedback table**

Create `patient_feedback` with:
- a patient foreign key
- optional appointment and treatment-plan foreign keys
- status tracking fields for review prompting and complaint handling
- service-role access policies

Keep the migration self-contained and safe to apply independently in Supabase.

- [ ] **Step 5: Run the test and confirm it passes**

Run:

```powershell
node --test --experimental-strip-types .\lib\reviews\review-safety.test.ts
```

Expected:
- the review safety test passes

- [ ] **Step 6: Commit**

```bash
git add lib/reviews/review-safety.ts lib/reviews/review-safety.test.ts scripts/011-treatment-plan-review-safety.sql lib/workflows/status-definitions.ts
git commit -m "feat: add review safety workflow"
```

## Task 3: Extend the Patient File Workflow

**Files:**
- Modify: `app/patients/[id]/page.tsx`
- Modify: `app/api/crm/patients/[resource]/route.ts`
- Modify: `lib/types/crm.ts`

- [ ] **Step 1: Add a treatment-plan draft flow**

The patient file should let the doctor:
- draft a plan from diagnosis and procedures
- preview the patient-facing wording
- mark the plan as approved before send

Wire the UI so the doctor can move through the following states:

```ts
type TreatmentPlanWorkflowStatus = 'draft' | 'approved' | 'sent';
```

- [ ] **Step 2: Add a satisfaction check flow**

After treatment or appointment completion, the patient file should support recording:
- happy
- needs follow-up
- complaint logged

If the result is happy, the UI can show a public review prompt state.

If the result is not happy, the UI should route to an internal complaint note first.

Suggested feedback shape:

```ts
{
  feedback_type: 'satisfaction' | 'complaint';
  outcome: 'happy' | 'needs_follow_up' | 'complaint_logged' | 'resolved';
  rating?: number;
  notes?: string;
}
```

- [ ] **Step 3: Surface treatment-plan and review states**

The patient detail page should show:
- draft treatment plans
- approved plans
- complaint-first outcomes
- review prompt eligibility

If the current API route does not already expose the needed fields, extend it to return treatment-plan approval state and patient-feedback rows in the patient payload.

- [ ] **Step 4: Run the page and API verification**

Run:

```powershell
npm run build
```

Expected:
- build passes

Then verify the page and patient route load for a real patient:

```powershell
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$body = '{"email":"test@crowndental.com","password":"TestPassword123!"}'
Invoke-WebRequest -Uri 'http://localhost:3000/api/auth/login' -Method Post -ContentType 'application/json' -Body $body -WebSession $session | Out-Null
Invoke-WebRequest -Uri 'http://localhost:3000/patients/82cc7c55-f138-4b1a-acf0-2f6a0b143474' -WebSession $session | Select-Object -ExpandProperty StatusCode
Invoke-WebRequest -Uri 'http://localhost:3000/api/crm/patients/treatment-plans?patientId=82cc7c55-f138-4b1a-acf0-2f6a0b143474' -WebSession $session | Select-Object -ExpandProperty StatusCode
```

Expected:
- `200`
- `200`

- [ ] **Step 5: Commit**

```bash
git add app/patients/[id]/page.tsx app/api/crm/patients/[resource]/route.ts lib/types/crm.ts
git commit -m "feat: extend patient treatment review workflow"
```

## Self-Review

**Scope coverage**
- Treatment-plan composition is separated from storage
- Review safety is separated from document generation
- The patient file is the main operator surface

**Placeholder scan**
- No `TBD`, `TODO`, or generic “implement later” placeholders
- The review safety decision is explicit: happy first, public review second

**Consistency check**
- The design reuses the existing patient document generator instead of creating a second document pipeline
- The new `patient_feedback` table is narrow and only supports the complaint-first review workflow

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-04-treatment-plan-review-safety.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
