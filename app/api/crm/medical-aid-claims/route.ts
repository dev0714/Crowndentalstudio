import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/current-user';
import { writeAuditEntry } from '@/lib/audit/write-audit-entry';
import { supabaseServer } from '@/lib/supabase/server';

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

function mapClaim(record: Record<string, unknown>, patientName = '') {
  return {
    id: record.id,
    patient_id: record.patient_id,
    patient_name: patientName,
    invoice_id: record.invoice_id || null,
    claim_number: record.claim_number || '',
    amount_claimed: Number(record.amount_claimed || 0),
    amount_approved: record.amount_approved == null ? null : Number(record.amount_approved),
    claim_date: (record.claim_date as string) || '',
    status: record.status || 'Submitted',
    rejection_reason: record.rejection_reason || '',
  };
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const claimId = searchParams.get('id');
    const patientId = searchParams.get('patientId');
    const status = searchParams.get('status');

    let query = supabaseServer.from('medical_aid_claims').select('*');

    if (claimId) {
      const { data, error } = await query.eq('id', claimId).maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;
      if (!data) {
        return NextResponse.json({ data: null });
      }

      const patientNames = await getPatientNames([data.patient_id]);
      return NextResponse.json({ data: mapClaim(data, patientNames[data.patient_id] || data.patient_id) });
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
      .order('claim_date', { ascending: false });

    if (error) throw error;

    const patientNames = await getPatientNames((data || []).map((item) => item.patient_id));
    return NextResponse.json({
      data: (data || []).map((item) => mapClaim(item, patientNames[item.patient_id] || item.patient_id)),
      count,
      page,
      limit,
    });
  } catch (error) {
    console.error('Error fetching medical aid claims:', error);
    return NextResponse.json({ error: 'Failed to fetch medical aid claims' }, { status: 500 });
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
      claim_number: body.claim_number || `CLM-${Date.now()}`,
      amount_claimed: Number(body.amount_claimed ?? body.amount ?? 0),
      amount_approved: body.amount_approved == null ? null : Number(body.amount_approved),
      claim_date: body.claim_date || new Date().toISOString().slice(0, 10),
      status: body.status || 'Submitted',
      rejection_reason: body.rejection_reason || null,
    };

    const { data, error } = await supabaseServer.from('medical_aid_claims').insert([payload]).select();
    if (error) throw error;

    await writeAuditEntry({
      actor: user,
      action: 'medical_aid_claim.created',
      entityType: 'medical_aid_claim',
      entityId: data?.[0]?.id,
      metadata: { fields: Object.keys(body) },
    });

    return NextResponse.json({ data: data?.[0] }, { status: 201 });
  } catch (error) {
    console.error('Error creating medical aid claim:', error);
    return NextResponse.json({ error: 'Failed to create medical aid claim' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const claimId = searchParams.get('id');
    if (!claimId) {
      return NextResponse.json({ error: 'Claim ID required' }, { status: 400 });
    }

    const body = await request.json();
    const { data, error } = await supabaseServer
      .from('medical_aid_claims')
      .update({
        invoice_id: body.invoice_id || null,
        claim_number: body.claim_number || `CLM-${Date.now()}`,
        amount_claimed: Number(body.amount_claimed ?? body.amount ?? 0),
        amount_approved: body.amount_approved == null ? null : Number(body.amount_approved),
        claim_date: body.claim_date || new Date().toISOString().slice(0, 10),
        status: body.status || 'Submitted',
        rejection_reason: body.rejection_reason || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', claimId)
      .select();

    if (error) throw error;

    await writeAuditEntry({
      actor: user,
      action: 'medical_aid_claim.updated',
      entityType: 'medical_aid_claim',
      entityId: claimId,
      metadata: { fields: Object.keys(body) },
    });

    return NextResponse.json({ data: data?.[0] });
  } catch (error) {
    console.error('Error updating medical aid claim:', error);
    return NextResponse.json({ error: 'Failed to update medical aid claim' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const claimId = searchParams.get('id');
    if (!claimId) {
      return NextResponse.json({ error: 'Claim ID required' }, { status: 400 });
    }

    const { error } = await supabaseServer.from('medical_aid_claims').delete().eq('id', claimId);
    if (error) throw error;

    await writeAuditEntry({
      actor: user,
      action: 'medical_aid_claim.deleted',
      entityType: 'medical_aid_claim',
      entityId: claimId,
    });

    return NextResponse.json({ message: 'Medical aid claim deleted successfully' });
  } catch (error) {
    console.error('Error deleting medical aid claim:', error);
    return NextResponse.json({ error: 'Failed to delete medical aid claim' }, { status: 500 });
  }
}
