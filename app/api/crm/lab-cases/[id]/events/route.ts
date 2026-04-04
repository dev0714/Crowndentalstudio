import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/current-user';
import { writeAuditEntry } from '@/lib/audit/write-audit-entry';
import {
  buildLabWorkflowSnapshot,
  LAB_WORKFLOW_EVENT_TYPE,
  resolveLabWorkflowUpdate,
} from '@/lib/lab/lab-workflow';
import { supabaseServer } from '@/lib/supabase/server';

const WORKFLOW_FIELDS = [
  'workflow_stage',
  'shade',
  'expected_return_date',
  'slip_text',
  'slip_sent_at',
  'collected_at',
  'ready_for_collection_at',
  'collected_by_driver_at',
  'dropped_off_by_me_at',
  'patient_called_at',
  'patient_collected_at',
  'comeback_requested_at',
  'comeback_reason',
  'satisfaction_signed_at',
  'closed_at',
  'lab_driver_name',
  'worker_name',
] as const;

function stripWorkflowFields(payload: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(payload).filter(([key]) => !WORKFLOW_FIELDS.includes(key as (typeof WORKFLOW_FIELDS)[number])));
}

async function loadLabCase(caseId: string) {
  const { data, error } = await supabaseServer
    .from('lab_cases')
    .select('*')
    .eq('id', caseId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function loadLabEvents(caseId: string) {
  const { data, error } = await supabaseServer
    .from('lab_case_events')
    .select('id, lab_case_id, event_type, event_at, notes, metadata, created_by')
    .eq('lab_case_id', caseId)
    .order('event_at', { ascending: true });

  if (error) {
    if (
      (error as { code?: string }).code === '42P01' ||
      (error as { code?: string }).code === 'PGRST205' ||
      error.message.includes('does not exist')
    ) {
      return [];
    }
    throw error;
  }

  return data || [];
}

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const labCase = await loadLabCase(id);
    if (!labCase) {
      return NextResponse.json({ data: null });
    }

    const events = await loadLabEvents(id);
    const snapshot = buildLabWorkflowSnapshot(
      {
        ...labCase,
        workflow_stage: labCase.workflow_stage,
      },
      events,
    );

    return NextResponse.json({
      data: {
        ...labCase,
        workflow_snapshot: snapshot,
        events,
      },
    });
  } catch (error) {
    console.error('Error loading lab workflow events:', error);
    return NextResponse.json({ error: 'Failed to load lab workflow events' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const eventType = String(body.event_type || '').trim();

    if (!eventType) {
      return NextResponse.json({ error: 'Event type required' }, { status: 400 });
    }

    const labCase = await loadLabCase(id);
    if (!labCase) {
      return NextResponse.json({ error: 'Lab case not found' }, { status: 404 });
    }

    const { patch, metadata } = resolveLabWorkflowUpdate(
      eventType as (typeof LAB_WORKFLOW_EVENT_TYPE)[keyof typeof LAB_WORKFLOW_EVENT_TYPE],
      body,
    );

    const { data: eventData, error: eventError } = await supabaseServer
      .from('lab_case_events')
      .insert([
        {
          lab_case_id: id,
          event_type: eventType,
          event_at: body.event_at || new Date().toISOString(),
          notes: String(body.notes || '').trim() || null,
          metadata: {
            ...metadata,
            ...(typeof body.metadata === 'object' && body.metadata ? body.metadata : {}),
          },
          created_by: user.id,
        },
      ])
      .select()
      .single();

    const eventDataOrFallback =
      !eventError
        ? eventData
        : {
            id: `${id}-${Date.now()}`,
            lab_case_id: id,
            event_type: eventType,
            event_at: body.event_at || new Date().toISOString(),
            notes: String(body.notes || '').trim() || null,
            metadata,
            created_by: user.id,
          };

    if (
      eventError &&
      !(
        (eventError as { code?: string }).code === '42P01' ||
        (eventError as { code?: string }).code === 'PGRST205' ||
        eventError.message.includes('does not exist')
      )
    ) {
      throw eventError;
    }

    const { data: updatedCase, error: updateError } = await supabaseServer
      .from('lab_cases')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    let finalCase = updatedCase;

    if (updateError) {
      if (
        (updateError as { code?: string }).code === '42703' ||
        (updateError as { code?: string }).code === 'PGRST204' ||
        (updateError as { code?: string }).code === 'PGRST205' ||
        updateError.message.includes('does not exist')
      ) {
        const fallbackPayload = stripWorkflowFields({ ...patch, updated_at: new Date().toISOString() });
        const retry = await supabaseServer
          .from('lab_cases')
          .update(fallbackPayload)
          .eq('id', id)
          .select()
          .single();
        if (retry.error) {
          throw retry.error;
        }
        finalCase = retry.data;
      } else {
        throw updateError;
      }
    }

    await writeAuditEntry({
      actor: user,
      action: 'lab_case.event_logged',
      entityType: 'lab_case_event',
      entityId: eventDataOrFallback.id,
      metadata: {
        lab_case_id: id,
        event_type: eventType,
        patch,
      },
    });

    return NextResponse.json({
      data: {
        event: eventDataOrFallback,
        lab_case: finalCase,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating lab workflow event:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to log lab workflow event' },
      { status: 500 },
    );
  }
}
