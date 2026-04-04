import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/current-user';
import { writeAuditEntry } from '@/lib/audit/write-audit-entry';
import { supabaseServer } from '@/lib/supabase/server';
import { MEDICAL_AID_AUTHORIZATION_STATUSES } from '@/lib/workflows/status-definitions';

function isMissingRelationError(error: { code?: string; message?: string }) {
  return error.code === '42P01' || error.code === 'PGRST205' || Boolean(error.message?.includes('does not exist'));
}

function mapAuthorization(record: Record<string, unknown>, patientName = '') {
  return {
    id: record.id,
    patient_id: record.patient_id,
    patient_name: patientName,
    invoice_id: record.invoice_id || null,
    claim_id: record.claim_id || null,
    procedure_name: record.procedure_name || '',
    procedure_code: record.procedure_code || '',
    icd10_code: record.icd10_code || '',
    scheme_name: record.scheme_name || '',
    authorization_requested_date: (record.authorization_requested_date as string) || '',
    authorization_reference: record.authorization_reference || '',
    status: record.status || 'Pending',
    authorized_amount: record.authorized_amount == null ? null : Number(record.authorized_amount),
    co_payment_amount: record.co_payment_amount == null ? null : Number(record.co_payment_amount),
    patient_shortfall_amount: record.patient_shortfall_amount == null ? null : Number(record.patient_shortfall_amount),
    notes: record.notes || '',
    created_at: (record.created_at as string) || '',
    updated_at: (record.updated_at as string) || '',
  };
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

  return Object.fromEntries((data || []).map((patient) => [patient.id, `${patient.first_name} ${patient.last_name}`.trim()]));
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const authId = searchParams.get('id');
    const patientId = searchParams.get('patientId');
    const invoiceId = searchParams.get('invoiceId');

    let query = supabaseServer.from('medical_aid_authorizations').select('*');

    if (authId) {
      const { data, error } = await query.eq('id', authId).maybeSingle();
      if (error && error.code !== 'PGRST116') {
        if (isMissingRelationError(error)) {
          return NextResponse.json({ data: null });
        }
        throw error;
      }
      if (!data) {
        return NextResponse.json({ data: null });
      }

      const patientNames = await getPatientNames([data.patient_id]);
      return NextResponse.json({ data: mapAuthorization(data, patientNames[data.patient_id] || data.patient_id) });
    }

    if (patientId) {
      query = query.eq('patient_id', patientId);
    }

    if (invoiceId) {
      query = query.eq('invoice_id', invoiceId);
    }

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    const { data, error, count } = await query
      .range(offset, offset + limit - 1)
      .order('authorization_requested_date', { ascending: false });

    if (error) {
      if (isMissingRelationError(error)) {
        return NextResponse.json({ data: [], count: 0, page, limit });
      }
      throw error;
    }

    const patientNames = await getPatientNames((data || []).map((item) => item.patient_id));
    return NextResponse.json({
      data: (data || []).map((item) => mapAuthorization(item, patientNames[item.patient_id] || item.patient_id)),
      count,
      page,
      limit,
    });
  } catch (error) {
    console.error('Error fetching medical aid authorizations:', error);
    return NextResponse.json({ error: 'Failed to fetch medical aid authorizations' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const payload = {
      patient_id: body.patient_id,
      invoice_id: body.invoice_id || null,
      claim_id: body.claim_id || null,
      procedure_name: body.procedure_name || '',
      procedure_code: body.procedure_code || null,
      icd10_code: body.icd10_code || null,
      scheme_name: body.scheme_name || null,
      authorization_requested_date: body.authorization_requested_date || new Date().toISOString().slice(0, 10),
      authorization_reference: body.authorization_reference || null,
      status: MEDICAL_AID_AUTHORIZATION_STATUSES.includes(body.status) ? body.status : 'Pending',
      authorized_amount: body.authorized_amount == null ? null : Number(body.authorized_amount),
      co_payment_amount: body.co_payment_amount == null ? null : Number(body.co_payment_amount),
      patient_shortfall_amount: body.patient_shortfall_amount == null ? null : Number(body.patient_shortfall_amount),
      notes: body.notes || null,
      created_by: user.id,
    };

    const { data, error } = await supabaseServer.from('medical_aid_authorizations').insert([payload]).select();
    if (error) throw error;

    await writeAuditEntry({
      actor: user,
      action: 'medical_aid_authorization.created',
      entityType: 'medical_aid_authorization',
      entityId: data?.[0]?.id,
      metadata: { fields: Object.keys(body) },
    });

    return NextResponse.json({ data: data?.[0] }, { status: 201 });
  } catch (error) {
    console.error('Error creating medical aid authorization:', error);
    return NextResponse.json({ error: 'Failed to create medical aid authorization' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const authId = searchParams.get('id');
    if (!authId) {
      return NextResponse.json({ error: 'Authorization ID required' }, { status: 400 });
    }

    const body = await request.json();
    const { data, error } = await supabaseServer
      .from('medical_aid_authorizations')
      .update({
        patient_id: body.patient_id,
        invoice_id: body.invoice_id || null,
        claim_id: body.claim_id || null,
        procedure_name: body.procedure_name || '',
        procedure_code: body.procedure_code || null,
        icd10_code: body.icd10_code || null,
        scheme_name: body.scheme_name || null,
        authorization_requested_date: body.authorization_requested_date || new Date().toISOString().slice(0, 10),
        authorization_reference: body.authorization_reference || null,
        status: MEDICAL_AID_AUTHORIZATION_STATUSES.includes(body.status) ? body.status : 'Pending',
        authorized_amount: body.authorized_amount == null ? null : Number(body.authorized_amount),
        co_payment_amount: body.co_payment_amount == null ? null : Number(body.co_payment_amount),
        patient_shortfall_amount: body.patient_shortfall_amount == null ? null : Number(body.patient_shortfall_amount),
        notes: body.notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', authId)
      .select();

    if (error) throw error;

    await writeAuditEntry({
      actor: user,
      action: 'medical_aid_authorization.updated',
      entityType: 'medical_aid_authorization',
      entityId: authId,
      metadata: { fields: Object.keys(body) },
    });

    return NextResponse.json({ data: data?.[0] });
  } catch (error) {
    console.error('Error updating medical aid authorization:', error);
    return NextResponse.json({ error: 'Failed to update medical aid authorization' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const authId = searchParams.get('id');
    if (!authId) {
      return NextResponse.json({ error: 'Authorization ID required' }, { status: 400 });
    }

    const { error } = await supabaseServer.from('medical_aid_authorizations').delete().eq('id', authId);
    if (error) throw error;

    await writeAuditEntry({
      actor: user,
      action: 'medical_aid_authorization.deleted',
      entityType: 'medical_aid_authorization',
      entityId: authId,
    });

    return NextResponse.json({ message: 'Medical aid authorization deleted successfully' });
  } catch (error) {
    console.error('Error deleting medical aid authorization:', error);
    return NextResponse.json({ error: 'Failed to delete medical aid authorization' }, { status: 500 });
  }
}
