import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/current-user';
import { writeAuditEntry } from '@/lib/audit/write-audit-entry';
import { supabaseServer } from '@/lib/supabase/server';
import { buildRecallQueue } from '@/lib/recalls/recall-queue';

async function loadRecallData() {
  const [patientsResult, appointmentsResult, treatmentPlansResult, proceduresResult, labCasesResult] = await Promise.all([
    supabaseServer.from('patients').select('id, first_name, last_name, created_at'),
    supabaseServer.from('appointments').select('id, patient_id, appointment_date, status'),
    supabaseServer
      .from('treatment_plans')
      .select('id, patient_id, plan_name, description, accepted, accepted_date, issued_date'),
    supabaseServer
      .from('patient_procedures')
      .select('id, patient_id, procedure_name, status, procedure_date, created_at'),
    supabaseServer
      .from('lab_cases')
      .select('*'),
  ]);

  const errors = [
    patientsResult.error,
    appointmentsResult.error,
    treatmentPlansResult.error,
    proceduresResult.error,
    labCasesResult.error,
  ].filter(Boolean);
  if (errors.length > 0) {
    throw errors[0];
  }

  return buildRecallQueue(
    patientsResult.data || [],
    appointmentsResult.data || [],
    treatmentPlansResult.data || [],
    proceduresResult.data || [],
    labCasesResult.data || [],
  );
}

function appointmentTypeForKind(kind: string) {
  switch (kind) {
    case 'treatment-review':
      return 'Treatment Review';
    case 'procedure-review':
      return 'Procedure Review';
    case 'lab-follow-up':
      return 'Lab Follow Up';
    default:
      return 'Recall Review';
  }
}

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const queue = await loadRecallData();
    return NextResponse.json({ data: queue });
  } catch (error) {
    console.error('Error fetching recall queue:', error);
    return NextResponse.json({ error: 'Failed to fetch recall queue' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const patientId = String(body.patient_id || '');
    const kind = String(body.kind || 'routine-recall');
    const dueDate = String(body.due_date || new Date().toISOString().slice(0, 10));

    if (!patientId) {
      return NextResponse.json({ error: 'Patient ID required' }, { status: 400 });
    }

    const appointmentDate = body.appointment_date || `${dueDate}T09:00:00.000Z`;
    const appointmentType = body.appointment_type || appointmentTypeForKind(kind);

    const { data, error } = await supabaseServer
      .from('appointments')
      .insert([
        {
          patient_id: patientId,
          appointment_date: appointmentDate,
          appointment_type: appointmentType,
          status: 'Scheduled',
          duration_minutes: 30,
          notes: body.notes || `Scheduled from ${kind.replace('-', ' ')} queue`,
          created_by: user.id,
        },
      ])
      .select();

    if (error) throw error;

    await writeAuditEntry({
      actor: user,
      action: 'recall.scheduled',
      entityType: 'appointment',
      entityId: data?.[0]?.id,
      metadata: {
        kind,
        patientId,
        appointmentDate,
        appointmentType,
      },
    });

    return NextResponse.json({ data: data?.[0] }, { status: 201 });
  } catch (error) {
    console.error('Error scheduling recall:', error);
    return NextResponse.json({ error: 'Failed to schedule recall' }, { status: 500 });
  }
}
