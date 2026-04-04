# Integrations and AI Automation Design

**Date:** 2026-04-04  
**Status:** Draft for review  
**Scope:** Phase 7 follow-on from foundation stabilization

## Goal

Build a focused automation inbox for the portal that helps the team act on daily follow-up work without adding a new integration platform prematurely. The first version should:

- surface a ranked daily action queue
- combine signals from patients, appointments, recalls, and compliance records
- let staff log outreach back to `patient_contacts`
- keep all data access API-first and session-authenticated

This is intentionally not a full omnichannel messaging engine yet. It is the operational layer that can later feed WhatsApp, email, SMS, and AI assistance.

## Non-Goals

- No external message provider integration in this phase
- No autonomous AI agent that sends messages without a user action
- No background scheduler or job runner beyond request-time queue generation
- No schema redesign for the existing CRM tables

## Recommended Shape

Create a single portal surface:

- `GET /automation` for the daily queue
- `GET /api/crm/automation` for queue generation and summaries
- `POST /api/crm/automation` for outreach logging

The page should stay simple: counts, filters, queue rows, and a quick action form.

## Data Sources

The queue should be built from existing tables only:

- `patients`
- `appointments`
- `patient_communication_consent`
- `patient_consents`
- `patient_contacts`
- recall-derived data from the existing recall queue helper

The initial queue rules should focus on operationally useful items:

- overdue recall follow-ups
- upcoming appointments that need confirmation
- patients missing communication or POPIA consent
- patients with repeated outreach gaps

## Queue Model

Each queue item should be normalized into a common shape so the page can render mixed work types in one list:

- `id`
- `kind`
- `priority`
- `patient_id`
- `patient_name`
- `title`
- `reason`
- `due_date`
- `source`
- `suggested_contact_type`
- `suggested_outcome`
- `metadata`

Priority should be stable and simple:

- `high` for overdue recalls and missing compliance items
- `medium` for upcoming appointments needing confirmation
- `low` for generic nurture items

The queue builder should deduplicate items by patient and kind where appropriate so one patient does not flood the list with near-identical actions.

## Outreach Logging

The `POST` route should accept a queue item reference plus the user’s outreach details and insert a `patient_contacts` row.

Required fields:

- `patient_id`
- `contact_type`
- `notes`

Optional fields:

- `outcome`
- `source_kind`
- `source_id`

The route should also write an audit entry so outreach actions are tracked alongside the rest of the CRM mutations.

## Page Behavior

The `/automation` page should:

- fetch the queue through `/api/crm/automation`
- show a summary strip with counts by priority and kind
- list queue items in priority order
- offer a quick outreach action per row
- refresh after logging outreach so the queue feels live

The page should use the same portal chrome and auth assumptions as the other CRM pages.

## Error Handling

The API should fail clearly and conservatively:

- `401` if the session is missing
- `500` for queue-generation or database errors
- `400` for invalid outreach payloads

On the page, loading failures should show a human-readable message and keep the rest of the portal functional.

## Testing

The implementation should be verified with both code-level and live checks:

- helper verification for queue generation
- authenticated `GET /api/crm/automation`
- authenticated `POST /api/crm/automation`
- authenticated `/automation` page load
- a grep check confirming the page uses API fetches rather than browser Supabase access

## Follow-On Path

Once this inbox exists, the next phase can layer in:

- channel adapters for WhatsApp, email, and SMS
- AI-generated suggestion text based on the queue item context
- automation templates for common outreach types
- optional background jobs for daily queue snapshots

## Success Criteria

This task is complete when:

- the portal has a working `/automation` page
- the queue is generated from existing CRM data
- staff can log outreach from the queue into `patient_contacts`
- the automation flow uses authenticated API routes only
- the implementation builds and loads cleanly in the local portal
