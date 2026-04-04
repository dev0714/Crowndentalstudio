import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/current-user';
import { writeAuditEntry } from '@/lib/audit/write-audit-entry';
import {
  buildLabWorkflowSnapshot,
  deriveLabWorkflowStage,
  labStatusForWorkflowStage,
  type LabWorkflowStage,
} from '@/lib/lab/lab-workflow';
import { LAB_WORKFLOW_STAGE } from '@/lib/workflows/status-definitions';
import { supabaseServer } from '@/lib/supabase/server';

type LabWorkflowEventRow = {
  id: string;
  lab_case_id: string;
  event_type: string;
  event_at: string;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  created_by: string | null;
};

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

async function getPatientNames(patientIds: string[]) {
  if (patientIds.length === 0) {
    return {};
  }

  const { data, error } = await supabaseServer
    .from('patients')
    .select('id, first_name, last_name')
    .in('id', patientIds);

  if (error) {
    throw error;
  }

  return Object.fromEntries(
    (data || []).map((patient) => [patient.id, `${patient.first_name} ${patient.last_name}`.trim()]),
  );
}

async function getLabWorkflowEvents(caseIds: string[]) {
  if (caseIds.length === 0) {
    return {};
  }

  const { data, error } = await supabaseServer
    .from('lab_case_events')
    .select('id, lab_case_id, event_type, event_at, notes, metadata, created_by')
    .in('lab_case_id', caseIds)
    .order('event_at', { ascending: true });

  if (error) {
    if ((error as { code?: string }).code === '42P01' || (error as { code?: string }).code === 'PGRST205' || error.message.includes('does not exist')) {
      return {};
    }
    throw error;
  }

  return (data || []).reduce<Record<string, LabWorkflowEventRow[]>>((acc, event) => {
    acc[event.lab_case_id] = acc[event.lab_case_id] || [];
    acc[event.lab_case_id].push(event);
    return acc;
  }, {});
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get('id');
    const patientId = searchParams.get('patientId');
    const status = searchParams.get('status');
    const includeEvents = searchParams.get('includeEvents') === '1' || searchParams.get('includeEvents') === 'true';

    let query = supabaseServer
      .from('lab_cases')
      .select('*');

    if (caseId) {
      query = query.eq('id', caseId);
      const { data, error } = await query.maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;
      if (!data) {
        return NextResponse.json({ data: null });
      }

      const patientNames = await getPatientNames([data.patient_id]);
      const events = includeEvents ? await getLabWorkflowEvents([data.id]) : {};
      const workflowEvents = events[data.id] || [];
      const workflowSnapshot = buildLabWorkflowSnapshot(
        {
          ...data,
          workflow_stage: data.workflow_stage || deriveLabWorkflowStage(data),
        },
        workflowEvents,
      );
      return NextResponse.json({
        data: {
          ...data,
          patient_name: patientNames[data.patient_id] || data.patient_id,
          workflow_stage: data.workflow_stage || workflowSnapshot.current_stage,
          status: data.status || labStatusForWorkflowStage(workflowSnapshot.current_stage),
          workflow_snapshot: workflowSnapshot,
          events: workflowEvents,
        },
      });
    }

    if (patientId) {
      query = query.eq('patient_id', patientId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    const { data, error, count } = await query
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const patientNames = await getPatientNames((data || []).map((item) => item.patient_id));
    const eventsByCase = includeEvents ? await getLabWorkflowEvents((data || []).map((item) => item.id)) : {};
    return NextResponse.json({
      data: (data || []).map((item) => {
        const workflowStage = item.workflow_stage || deriveLabWorkflowStage(item);
        const workflowEvents = eventsByCase[item.id] || [];
        const workflowSnapshot = includeEvents
          ? buildLabWorkflowSnapshot(
              {
                ...item,
                workflow_stage: workflowStage,
              },
              workflowEvents,
            )
          : null;

        return {
          ...item,
          patient_name: patientNames[item.patient_id] || item.patient_id,
          workflow_stage: workflowStage,
          status: item.status || labStatusForWorkflowStage(workflowStage),
          workflow_snapshot: workflowSnapshot,
          events: workflowEvents,
        };
      }),
      count,
      page,
      limit,
    });
  } catch (error) {
    console.error('Error fetching lab cases:', error);
    return NextResponse.json({ error: 'Failed to fetch lab cases' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const { data: userData } = await supabaseServer
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single();

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const workflowStage = (body.workflow_stage || LAB_WORKFLOW_STAGE.CREATED) as LabWorkflowStage;
    const caseData = {
      ...body,
      status: body.status || labStatusForWorkflowStage(workflowStage),
      workflow_stage: workflowStage,
      created_by: userData.id,
    };

    const { data, error } = await supabaseServer
      .from('lab_cases')
      .insert([caseData])
      .select();

    if (error) {
      if (
        (error as { code?: string }).code === '42703' ||
        (error as { code?: string }).code === 'PGRST204' ||
        error.message.includes('does not exist')
      ) {
        const fallbackPayload = stripWorkflowFields(caseData);
        const retry = await supabaseServer.from('lab_cases').insert([fallbackPayload]).select();
        if (retry.error) throw retry.error;
        await writeAuditEntry({
          actor: user,
          action: 'lab_case.created',
          entityType: 'lab_case',
          entityId: retry.data?.[0]?.id,
          metadata: { fields: Object.keys(body) },
        });
        return NextResponse.json({ data: retry.data?.[0] }, { status: 201 });
      }
      throw error;
    }
    await writeAuditEntry({
      actor: user,
      action: 'lab_case.created',
      entityType: 'lab_case',
      entityId: data?.[0]?.id,
      metadata: { fields: Object.keys(body) },
    });
    return NextResponse.json({ data: data[0] }, { status: 201 });
  } catch (error) {
    console.error('Error creating lab case:', error);
    return NextResponse.json({ error: 'Failed to create lab case' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get('id');

    if (!caseId) {
      return NextResponse.json({ error: 'Lab Case ID required' }, { status: 400 });
    }

    const body = await request.json();
    const workflowStage = body.workflow_stage ? (String(body.workflow_stage) as LabWorkflowStage) : undefined;
    const nextStatus = workflowStage ? labStatusForWorkflowStage(workflowStage) : body.status;

    const { data, error } = await supabaseServer
      .from('lab_cases')
      .update({
        ...body,
        ...(workflowStage ? { workflow_stage: workflowStage, status: nextStatus } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', caseId)
      .select();

    if (error) {
      if (
        (error as { code?: string }).code === '42703' ||
        (error as { code?: string }).code === 'PGRST204' ||
        error.message.includes('does not exist')
      ) {
        const fallbackPayload = stripWorkflowFields({
          ...body,
          updated_at: new Date().toISOString(),
          ...(workflowStage ? { status: nextStatus } : {}),
        });
        const retry = await supabaseServer.from('lab_cases').update(fallbackPayload).eq('id', caseId).select();
        if (retry.error) throw retry.error;
        await writeAuditEntry({
          actor: user,
          action: 'lab_case.updated',
          entityType: 'lab_case',
          entityId: caseId,
          metadata: { fields: Object.keys(body) },
        });
        return NextResponse.json({ data: retry.data?.[0] });
      }
      throw error;
    }
    await writeAuditEntry({
      actor: user,
      action: 'lab_case.updated',
      entityType: 'lab_case',
      entityId: caseId,
      metadata: { fields: Object.keys(body) },
    });
    return NextResponse.json({ data: data[0] });
  } catch (error) {
    console.error('Error updating lab case:', error);
    return NextResponse.json({ error: 'Failed to update lab case' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get('id');

    if (!caseId) {
      return NextResponse.json({ error: 'Lab Case ID required' }, { status: 400 });
    }

    const { error } = await supabaseServer
      .from('lab_cases')
      .delete()
      .eq('id', caseId);

    if (error) throw error;
    await writeAuditEntry({
      actor: user,
      action: 'lab_case.deleted',
      entityType: 'lab_case',
      entityId: caseId,
    });
    return NextResponse.json({ message: 'Lab case deleted successfully' });
  } catch (error) {
    console.error('Error deleting lab case:', error);
    return NextResponse.json({ error: 'Failed to delete lab case' }, { status: 500 });
  }
}
