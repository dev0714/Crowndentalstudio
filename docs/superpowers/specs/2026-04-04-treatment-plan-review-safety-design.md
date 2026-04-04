# Treatment Plan and Review Safety Design

**Goal:** Turn diagnosis into a patient-friendly treatment plan with risks, alternatives, and pricing, then gate public review requests behind a private satisfaction check so unhappy patients are routed to internal follow-up first.

**Architecture:** Reuse the existing patient file, document generator, and CRM API layer. Add one shared treatment-plan composer that turns clinical inputs into calm patient-facing wording, one approval state so the doctor must sign off before a plan is sent, and one feedback workflow that records satisfaction or complaint outcomes before any public review prompt is issued. This keeps clinical authorship with the doctor and prevents the portal from asking for Google reviews when the patient is not happy.

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
- `app/api/crm/patients/[resource]/route.ts` for treatment-plan draft and review actions
- `lib/patients/treatment-plan-composer.ts`
- `lib/patients/treatment-plan-composer.test.ts`
- `scripts/011-treatment-plan-review-safety.sql`
- `lib/reviews/review-safety.ts`
- `lib/reviews/review-safety.test.ts`

**Modify**
- `app/patients/[id]/page.tsx`
- `lib/documents/patient-document-generator.ts`
- `app/api/crm/compliance/route.ts` if the feedback feed is surfaced there
- `lib/workflows/status-definitions.ts`
- `lib/types/crm.ts`

## Data Model

The existing `treatment_plans` table remains the clinical source of truth for plan records.

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

The test should verify:
- diagnosis appears in a patient-friendly summary
- risks are softened without hiding the meaning
- alternatives are listed clearly
- prices are included

- [ ] **Step 2: Run the test and confirm it fails**

Run:

```powershell
node --test --experimental-strip-types .\lib\patients\treatment-plan-composer.test.ts
```

Expected:
- the composer test fails because the helper does not exist yet

- [ ] **Step 3: Implement the minimal composer**

The helper should accept structured inputs such as:

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
- a patient-friendly title
- a short plain-language summary
- a formatted body suitable for the existing document generator
- a status default of `draft`

The composer should preserve clinical meaning while rewording the plan in a calm tone.

- [ ] **Step 4: Wire the document generator to use the composer**

`generatePatientDocument()` should use the new composer for `treatment_plan` documents so the generator does not duplicate wording logic.

- [ ] **Step 5: Run the test and confirm it passes**

Run:

```powershell
node --test --experimental-strip-types .\lib\patients\treatment-plan-composer.test.ts
```

Expected:
- the composer test passes

## Task 2: Add Review Safety Logic and Storage

**Files:**
- Create: `lib/reviews/review-safety.ts`
- Create: `lib/reviews/review-safety.test.ts`
- Create: `scripts/011-treatment-plan-review-safety.sql`

- [ ] **Step 1: Write the failing review-safety test**

Create a test that proves:
- a happy satisfaction result allows a review prompt
- a complaint result blocks a review prompt
- unresolved complaints require internal follow-up first

- [ ] **Step 2: Run the test and confirm it fails**

Run:

```powershell
node --test --experimental-strip-types .\lib\reviews\review-safety.test.ts
```

Expected:
- the test fails because the helper does not exist yet

- [ ] **Step 3: Implement the minimal review-safety helper**

The helper should expose logic such as:
- `shouldPromptForReview(feedback)`
- `isComplaintFirstOutcome(feedback)`
- `needsManagerFollowUp(feedback)`

The default behavior should be:
- no public review prompt until the patient is marked happy
- complaints always route to an internal queue first

- [ ] **Step 4: Add the patient feedback table**

Create the `patient_feedback` table with service-role access and links to patients, appointments, and treatment plans.

- [ ] **Step 5: Run the test and confirm it passes**

Run:

```powershell
node --test --experimental-strip-types .\lib\reviews\review-safety.test.ts
```

Expected:
- the review safety test passes

## Task 3: Extend the Patient File Workflow

**Files:**
- Modify: `app/patients/[id]/page.tsx`
- Modify: `app/api/crm/patients/[resource]/route.ts`

- [ ] **Step 1: Add a treatment-plan draft flow**

The patient file should let the doctor:
- draft a plan from diagnosis and procedures
- preview the patient-facing wording
- mark the plan as approved before send

- [ ] **Step 2: Add a satisfaction check flow**

After treatment or appointment completion, the patient file should support recording:
- happy
- needs follow-up
- complaint logged

If the result is happy, the UI can show a public review prompt state.

If the result is not happy, the UI should route to an internal complaint note first.

- [ ] **Step 3: Surface treatment-plan and review states**

The patient detail page should show:
- draft treatment plans
- approved plans
- complaint-first outcomes
- review prompt eligibility

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

Spec written and saved to `docs/superpowers/specs/2026-04-04-treatment-plan-review-safety-design.md`. Please review it and let me know if you want any changes before we start writing out the implementation plan.
