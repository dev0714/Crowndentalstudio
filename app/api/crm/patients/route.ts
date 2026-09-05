import { NextRequest, NextResponse } from 'next/server';
import type { Patient, CreatePatientRequest } from '@/lib/types/crm';
import { getAuthenticatedUser } from '@/lib/auth/current-user';
import { writeAuditEntry } from '@/lib/audit/write-audit-entry';
import { supabaseServer } from '@/lib/supabase/server';
import { buildPatientSearchFilter, parseListParams } from '@/lib/patients/patient-list-query';

// Postgres rejects '' for date/numeric/uuid columns, so blank form fields must become null.
function normalizeEmptyStrings<T extends Record<string, unknown>>(payload: T): T {
  return Object.fromEntries(
    Object.entries(payload).map(([key, value]) => [
      key,
      typeof value === 'string' && value.trim() === '' ? null : value,
    ]),
  ) as T;
}

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  const message = (error as { message?: string } | null)?.message;
  return message || fallback;
}

// GET - Fetch all patients or specific patient
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('id');

    if (patientId) {
      // Get single patient
      const { data, error } = await supabaseServer
        .from('patients')
        .select('*')
        .eq('id', patientId)
        .single();

      if (error) throw error;
      return NextResponse.json({ data });
    }

    // Get all patients with pagination and optional free-text search
    const { page, limit, search } = parseListParams(searchParams);
    const offset = (page - 1) * limit;

    let query = supabaseServer
      .from('patients')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    const searchFilter = buildPatientSearchFilter(search);
    if (searchFilter) {
      query = query.or(searchFilter);
    }

    const { data, error, count } = await query.range(offset, offset + limit - 1);

    if (error) throw error;
    return NextResponse.json({ data, count, page, limit });
  } catch (error) {
    console.error('Error fetching patients:', error);
    return NextResponse.json({ error: 'Failed to fetch patients' }, { status: 500 });
  }
}

// POST - Create new patient
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: CreatePatientRequest = normalizeEmptyStrings(await request.json());

    // Get current user's ID from users table
    const { data: userData, error: userError } = await supabaseServer
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const patientData = {
      ...body,
      status: 'Active',
      created_by: userData.id,
    };

    const { data, error } = await supabaseServer.from('patients').insert([patientData]).select();

    if (error) throw error;
    await writeAuditEntry({
      actor: user,
      action: 'patient.created',
      entityType: 'patient',
      entityId: data?.[0]?.id,
      metadata: { fields: Object.keys(body) },
    });
    return NextResponse.json({ data: data[0] }, { status: 201 });
  } catch (error) {
    console.error('Error creating patient:', error);
    return NextResponse.json({ error: errorMessage(error, 'Failed to create patient') }, { status: 500 });
  }
}

// PUT - Update patient
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('id');

    if (!patientId) {
      return NextResponse.json({ error: 'Patient ID required' }, { status: 400 });
    }

    const body = normalizeEmptyStrings(await request.json());

    const { data, error } = await supabaseServer
      .from('patients')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', patientId)
      .select();

    if (error) throw error;
    await writeAuditEntry({
      actor: user,
      action: 'patient.updated',
      entityType: 'patient',
      entityId: patientId,
      metadata: { fields: Object.keys(body) },
    });
    return NextResponse.json({ data: data[0] });
  } catch (error) {
    console.error('Error updating patient:', error);
    return NextResponse.json({ error: errorMessage(error, 'Failed to update patient') }, { status: 500 });
  }
}

// DELETE - Delete patient
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('id');

    if (!patientId) {
      return NextResponse.json({ error: 'Patient ID required' }, { status: 400 });
    }

    const { error } = await supabaseServer.from('patients').delete().eq('id', patientId);

    if (error) throw error;
    await writeAuditEntry({
      actor: user,
      action: 'patient.deleted',
      entityType: 'patient',
      entityId: patientId,
    });
    return NextResponse.json({ message: 'Patient deleted successfully' });
  } catch (error) {
    console.error('Error deleting patient:', error);
    return NextResponse.json({ error: 'Failed to delete patient' }, { status: 500 });
  }
}
