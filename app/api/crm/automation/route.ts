import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/current-user';
import { writeAuditEntry } from '@/lib/audit/write-audit-entry';
import { buildAutomationQueue } from '@/lib/automation/automation-queue';
import { buildAutomationEventFeed } from '@/lib/automation/automation-events';
import { buildRecallQueue } from '@/lib/recalls/recall-queue';
import { supabaseServer } from '@/lib/supabase/server';

async function loadAutomationQueue() {
  const [
    patientsResult,
    appointmentsResult,
    communicationResult,
    signedConsentsResult,
    contactsResult,
    treatmentPlansResult,
    proceduresResult,
    labCasesResult,
    eventsResult,
  ] = await Promise.all([
    supabaseServer.from('patients').select('id, first_name, last_name, created_at, status'),
    supabaseServer.from('appointments').select('id, patient_id, appointment_date, status, appointment_type'),
    supabaseServer.from('patient_communication_consent').select('id, patient_id, popia_consent, updated_at'),
    supabaseServer.from('patient_consents').select('id, patient_id, consent_type, signed_date, created_at'),
    supabaseServer.from('patient_contacts').select('id, patient_id, contact_type, contact_date, outcome'),
    supabaseServer
      .from('treatment_plans')
      .select('id, patient_id, plan_name, description, accepted, accepted_date, issued_date'),
    supabaseServer
      .from('patient_procedures')
      .select('id, patient_id, procedure_name, status, procedure_date, created_at'),
    supabaseServer
      .from('lab_cases')
      .select('*'),
    supabaseServer
      .from('automation_events')
      .select(
        'id, patient_id, patient_name, channel, direction, status, title, message, source_system, source_kind, source_id, external_id, scheduled_for, occurred_at, resolved_at, payload, metadata, created_at, updated_at',
      )
      .order('occurred_at', { ascending: false })
      .limit(50),
  ]);

  const errors = [
    patientsResult.error,
    appointmentsResult.error,
    communicationResult.error,
    signedConsentsResult.error,
    contactsResult.error,
    treatmentPlansResult.error,
    proceduresResult.error,
    labCasesResult.error,
  ].filter(Boolean);

  if (errors.length > 0) {
    throw errors[0];
  }

  const recallQueue = buildRecallQueue(
    patientsResult.data || [],
    appointmentsResult.data || [],
    treatmentPlansResult.data || [],
    proceduresResult.data || [],
    labCasesResult.data || [],
  );

  if (eventsResult.error) {
    console.warn('[automation] Failed to load automation events:', eventsResult.error.message);
  }

  const automationEvents = buildAutomationEventFeed(eventsResult.data || []);

  const queue = buildAutomationQueue(
    patientsResult.data || [],
    appointmentsResult.data || [],
    communicationResult.data || [],
    signedConsentsResult.data || [],
    contactsResult.data || [],
    recallQueue.items,
  );

  return {
    queue,
    events: automationEvents,
  };
}

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await loadAutomationQueue();
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error fetching automation queue:', error);
    return NextResponse.json({ error: 'Failed to fetch automation queue' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const patientId = String(body.patient_id || '').trim();
    const contactType = String(body.contact_type || '').trim();
    const notes = String(body.notes || '').trim();
    const outcome = String(body.outcome || '').trim();
    const sourceKind = String(body.source_kind || '').trim();
    const sourceId = String(body.source_id || '').trim();
    const patientNameFromBody = String(body.patient_name || '').trim();

    if (!patientId) {
      return NextResponse.json({ error: 'Patient ID required' }, { status: 400 });
    }

    if (!notes) {
      return NextResponse.json({ error: 'Notes are required' }, { status: 400 });
    }

    if (!['call', 'email', 'sms', 'whatsapp', 'in_person'].includes(contactType)) {
      return NextResponse.json({ error: 'Invalid contact type' }, { status: 400 });
    }

    let patientName = patientNameFromBody;
    if (!patientName) {
      const patientLookup = await supabaseServer.from('patients').select('first_name, last_name').eq('id', patientId).maybeSingle();
      patientName = [patientLookup.data?.first_name, patientLookup.data?.last_name].filter(Boolean).join(' ') || 'Unlinked patient';
    }

    const { data, error } = await supabaseServer
      .from('patient_contacts')
      .insert([
        {
          patient_id: patientId,
          contact_type: contactType,
          contact_date: new Date().toISOString(),
          notes,
          outcome: outcome || null,
          created_by: user.id,
        },
      ])
      .select('id, patient_id, contact_type, contact_date, notes, outcome, created_by');

    if (error) throw error;

    const insertedContact = data?.[0];

    try {
      await supabaseServer.from('automation_events').insert([
        {
          patient_id: patientId,
          patient_name: patientName || 'Unlinked patient',
          channel: contactType,
          direction: 'outbound',
          status: 'resolved',
          title: 'Staff outreach logged',
          message: notes,
          source_system: 'portal',
          source_kind: sourceKind || null,
          source_id: sourceId || null,
          occurred_at: new Date().toISOString(),
          payload: {
            contact_type: contactType,
            outcome: outcome || null,
            source_kind: sourceKind || null,
            source_id: sourceId || null,
          },
          metadata: {
            contact_id: insertedContact?.id || null,
          },
          created_by: user.id,
          updated_by: user.id,
        },
      ]);
    } catch (automationEventError) {
      console.warn('[automation] Failed to write automation event:', automationEventError);
    }

    await writeAuditEntry({
      actor: user,
      action: 'automation.outreach_logged',
      entityType: 'patient_contact',
      entityId: insertedContact?.id,
      metadata: {
        patient_id: patientId,
        contact_type: contactType,
        notes,
        outcome: outcome || null,
        source_kind: sourceKind || null,
        source_id: sourceId || null,
      },
    });

    return NextResponse.json({ data: insertedContact }, { status: 201 });
  } catch (error) {
    console.error('Error logging automation outreach:', error);
    return NextResponse.json({ error: 'Failed to log automation outreach' }, { status: 500 });
  }
}
