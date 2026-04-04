# Integrations and AI Automation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a daily automation inbox that ranks follow-up work from existing CRM data and lets staff log outreach back to `patient_contacts`.

**Architecture:** Keep this phase intentionally small and operational. A shared helper builds a normalized queue from patients, appointments, recall signals, and compliance records, while an authenticated CRM API route exposes that queue and accepts outreach logging. The browser page stays thin: it fetches the API, renders queue cards, and posts outreach actions back to the same route.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Supabase Postgres, service-role server access, HTTP-only cookie sessions, existing CRM API patterns, shared audit logging.

---

## Scope Boundary

This plan is the first delivery slice of the integrations and AI automation phase. It does **not** add external providers or autonomous AI sending. The only supported behaviors in this pass are:

1. Generate a daily action queue from CRM data already in the database
2. Let staff log outreach into `patient_contacts`
3. Show the queue on a new `/automation` portal page
4. Keep the implementation API-first and session-authenticated

Later work can layer in WhatsApp, SMS, email, AI suggestions, and background jobs once the manual inbox works.

## File Structure

**Create**
- `lib/automation/automation-queue.ts`
- `lib/automation/automation-queue.test.ts`
- `app/api/crm/automation/route.ts`
- `app/automation/page.tsx`

**Modify**
- `lib/auth/portal-navigation.ts`
- `components/sidebar.tsx`

## Task 1: Build the Shared Automation Queue Helper

**Files:**
- Create: `lib/automation/automation-queue.ts`
- Test: `lib/automation/automation-queue.test.ts`

- [ ] **Step 1: Write the failing queue helper test**

Create a test that proves the helper turns raw CRM rows into a single ranked queue. The test should include one overdue recall, one upcoming appointment, and one patient missing POPIA consent.

```ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildAutomationQueue } from './automation-queue';

describe('buildAutomationQueue', () => {
  it('builds a ranked queue with summary counts', () => {
    const result = buildAutomationQueue(
      [
        { id: 'p1', first_name: 'Ada', last_name: 'Mthembu', created_at: '2025-01-01T00:00:00.000Z' },
      ],
      [
        { id: 'a1', patient_id: 'p1', appointment_date: '2026-04-05T08:00:00.000Z', status: 'Scheduled' },
      ],
      [
        { id: 'c1', patient_id: 'p1', popia_consent: false, whatsapp_consent: true, call_recording_consent: false, email_consent: false, sms_consent: false, marketing_consent: false, updated_at: '2026-04-04T00:00:00.000Z' },
      ],
      [
        { id: 'pc1', patient_id: 'p1', contact_type: 'call', contact_date: '2026-03-01T10:00:00.000Z', outcome: 'No answer' },
      ],
      [
        {
          id: 'r1',
          kind: 'routine-recall',
          patient_id: 'p1',
          patient_name: 'Ada Mthembu',
          source_id: 'a1',
          source_label: 'Completed appointment',
          due_date: '2026-04-01T00:00:00.000Z',
          last_activity_date: '2025-10-01T00:00:00.000Z',
          days_overdue: 3,
          priority: 'high',
          reason: 'Routine recall is overdue',
        },
      ],
      '2026-04-04T00:00:00.000Z'
    );

    assert.equal(result.summary.total, 3);
    assert.equal(result.summary.high, 2);
    assert.equal(result.summary.medium, 1);
    assert.equal(result.items[0].kind, 'routine-recall');
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run:

```powershell
node --test --experimental-strip-types .\lib\automation\automation-queue.test.ts
```

Expected:
- the test fails because `buildAutomationQueue` does not exist yet

- [ ] **Step 3: Implement the minimal helper**

Implement `buildAutomationQueue` so it accepts raw rows and returns:

```ts
type AutomationPriority = 'high' | 'medium' | 'low';
type AutomationKind =
  | 'overdue-recall'
  | 'appointment-confirmation'
  | 'missing-popia-consent'
  | 'missing-signed-consent'
  | 'outreach-gap';

export function buildAutomationQueue(
  patients,
  appointments,
  communicationConsents,
  signedConsents,
  patientContacts,
  recallItems,
  nowIso = new Date().toISOString()
) {
  return {
    summary: { total, high, medium, low, recalls, confirmations, compliance, outreach_gaps },
    items: [...normalizedItems].sort(sortByPriorityThenDueDate),
  };
}
```

Queue rules for the first pass:

- carry forward recall items from the existing recall helper
- add an `appointment-confirmation` item for `Scheduled` appointments within the next 48 hours
- add a `missing-popia-consent` item when `patient_communication_consent.popia_consent` is false or missing
- add a `missing-signed-consent` item when a patient has no `patient_consents` rows
- add an `outreach-gap` item when a patient has no `patient_contacts` rows in the last 30 days
- deduplicate by `patient_id` and `kind`

- [ ] **Step 4: Run the test and confirm it passes**

Run:

```powershell
node --test --experimental-strip-types .\lib\automation\automation-queue.test.ts
```

Expected:
- the helper test passes

- [ ] **Step 5: Commit**

```bash
git add lib/automation/automation-queue.ts lib/automation/automation-queue.test.ts
git commit -m "feat: add shared automation queue helper"
```

## Task 2: Add the Authenticated Automation API

**Files:**
- Create: `app/api/crm/automation/route.ts`
- Modify: `lib/audit/write-audit-entry.ts` if needed for outreach metadata reuse

- [ ] **Step 1: Write the failing route check**

Add a live check that proves the route is not present yet and that the queue API is still missing.

```powershell
Invoke-WebRequest -Uri 'http://localhost:3000/api/crm/automation' -UseBasicParsing
```

Expected:
- `404` before implementation

- [ ] **Step 2: Implement `GET /api/crm/automation`**

The route should use the same server auth pattern as the other CRM routes:

```ts
const user = await getAuthenticatedUser();
if (!user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

It should load:

```ts
const [patientsResult, appointmentsResult, communicationResult, consentResult, contactsResult, recallQueueResult] =
  await Promise.all([
    supabaseServer.from('patients').select('id, first_name, last_name, created_at, status'),
    supabaseServer.from('appointments').select('id, patient_id, appointment_date, status, appointment_type'),
    supabaseServer.from('patient_communication_consent').select('*'),
    supabaseServer.from('patient_consents').select('*'),
    supabaseServer.from('patient_contacts').select('id, patient_id, contact_type, contact_date, outcome'),
    loadRecallData(),
  ]);
```

Then it should pass the raw rows into `buildAutomationQueue(...)` and return:

```ts
return NextResponse.json({ data: queue });
```

- [ ] **Step 3: Implement `POST /api/crm/automation` outreach logging**

Accept a body shaped like this:

```ts
{
  patient_id: string;
  contact_type: 'call' | 'email' | 'sms' | 'whatsapp' | 'in_person';
  notes: string;
  outcome?: string;
  source_kind?: string;
  source_id?: string;
}
```

Insert into `patient_contacts` with `created_by: user.id`, then write an audit row:

```ts
await writeAuditEntry({
  actor: user,
  action: 'automation.outreach_logged',
  entityType: 'patient_contact',
  entityId: insertedContact.id,
  metadata: {
    patient_id: body.patient_id,
    contact_type: body.contact_type,
    outcome: body.outcome || null,
    source_kind: body.source_kind || null,
    source_id: body.source_id || null,
  },
});
```

The response should be:

```ts
return NextResponse.json({ data: insertedContact }, { status: 201 });
```

- [ ] **Step 4: Run the route checks**

Run:

```powershell
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$body = '{"email":"test@crowndental.com","password":"TestPassword1234!"}'
Invoke-WebRequest -Uri 'http://localhost:3000/api/auth/login' -Method Post -ContentType 'application/json' -Body $body -WebSession $session | Out-Null
Invoke-WebRequest -Uri 'http://localhost:3000/api/crm/automation' -WebSession $session | Select-Object -ExpandProperty StatusCode
```

Expected:
- `200`

Then post a sample outreach action using the first returned queue item:

```powershell
 $queue = Invoke-WebRequest -Uri 'http://localhost:3000/api/crm/automation' -WebSession $session | Select-Object -ExpandProperty Content | ConvertFrom-Json
 $firstItem = $queue.data.items[0]
 $payload = @{
   patient_id = $firstItem.patient_id
   contact_type = 'call'
   notes = 'Reached out about recall'
   outcome = 'Left voicemail'
   source_kind = $firstItem.kind
   source_id = $firstItem.id
 } | ConvertTo-Json
Invoke-WebRequest -Uri 'http://localhost:3000/api/crm/automation' -Method Post -ContentType 'application/json' -Body $payload -WebSession $session | Select-Object -ExpandProperty StatusCode
```

Expected:
- `201`

- [ ] **Step 5: Commit**

```bash
git add app/api/crm/automation/route.ts lib/audit/write-audit-entry.ts
git commit -m "feat: add crm automation api"
```

## Task 3: Build the Automation Inbox Page and Portal Navigation

**Files:**
- Create: `app/automation/page.tsx`
- Modify: `lib/auth/portal-navigation.ts`
- Modify: `components/sidebar.tsx`

- [ ] **Step 1: Write the failing page-load check**

Once the page exists, it should load through the portal and use the API rather than browser Supabase.

```powershell
Invoke-WebRequest -Uri 'http://localhost:3000/automation' -UseBasicParsing | Select-Object -ExpandProperty StatusCode
```

Expected:
- `200` after implementation

- [ ] **Step 2: Implement the page**

The page should follow the existing CRM page pattern:

```tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AutomationPage() {
  // fetch /api/crm/automation on mount
  // render summary cards
  // render queue rows
  // render outreach form per row
}
```

The page must:

- call `fetch('/api/crm/automation', { credentials: 'include' })`
- display summary counts by priority and kind
- list queue items in priority order
- let the user log outreach with a small inline form or quick action modal
- refresh the queue after a successful outreach post

- [ ] **Step 3: Add the nav item and icon**

Update the portal nav items:

```ts
{ label: 'Automation', href: '/automation' },
```

Add a matching sidebar icon, for example:

```ts
Automation: Sparkles,
```

and import `Sparkles` from `lucide-react`.

- [ ] **Step 4: Run the page and API verification**

Run:

```powershell
npm run build
```

Expected:
- build passes

Then verify the page and route:

```powershell
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$body = '{"email":"test@crowndental.com","password":"TestPassword1234!"}'
Invoke-WebRequest -Uri 'http://localhost:3000/api/auth/login' -Method Post -ContentType 'application/json' -Body $body -WebSession $session | Out-Null
Invoke-WebRequest -Uri 'http://localhost:3000/automation' -WebSession $session | Select-Object -ExpandProperty StatusCode
Invoke-WebRequest -Uri 'http://localhost:3000/api/crm/automation' -WebSession $session | Select-Object -ExpandProperty StatusCode
```

Expected:
- `200`
- `200`

Finally confirm the page fetches the API:

```powershell
rg -n "fetch\\('/api/crm/automation|supabase\\." app\\automation\\page.tsx
```

Expected:
- `fetch('/api/crm/automation'` is present
- no browser Supabase usage remains

- [ ] **Step 5: Commit**

```bash
git add app/automation/page.tsx lib/auth/portal-navigation.ts components/sidebar.tsx
git commit -m "feat: add automation inbox portal page"
```

## Self-Review

**Spec coverage**
- Queue helper covers the shared automation data model
- API route covers both queue generation and outreach logging
- Page task covers the portal surface and navigation
- Verification covers helper behavior, API auth, outreach writes, and page load

**Placeholder scan**
- No placeholders or vague "add proper handling" language
- Every task includes a concrete file list, a test command, and a commit step

**Type consistency**
- `buildAutomationQueue` is the single queue-building entry point
- Outreach logging uses the existing `patient_contacts` schema
- The page consumes the API payload returned by the route without duplicating queue logic

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-04-integrations-and-ai-automation.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session with checkpointed reviews

**Which approach?**
