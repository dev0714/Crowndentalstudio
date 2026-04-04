import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/current-user';
import { writeAuditEntry } from '@/lib/audit/write-audit-entry';
import { supabaseServer } from '@/lib/supabase/server';
import type { Appointment, CreateAppointmentRequest } from '@/lib/types/crm';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const appointmentId = searchParams.get('id');
    const patientId = searchParams.get('patientId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let query = supabaseServer.from('appointments').select('*');

    if (appointmentId) {
      query = query.eq('id', appointmentId);
      const { data, error } = await query.single();
      if (error) throw error;
      return NextResponse.json({ data });
    }

    if (patientId) {
      query = query.eq('patient_id', patientId);
    }

    if (startDate && endDate) {
      query = query.gte('appointment_date', startDate).lte('appointment_date', endDate);
    }

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    const { data, error, count } = await query
      .range(offset, offset + limit - 1)
      .order('appointment_date', { ascending: true });

    if (error) throw error;
    return NextResponse.json({ data, count, page, limit });
  } catch (error) {
    console.error('Error fetching appointments:', error);
    return NextResponse.json({ error: 'Failed to fetch appointments' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: CreateAppointmentRequest = await request.json();

    const { data: userData } = await supabaseServer
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single();

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const appointmentData = {
      ...body,
      status: 'Scheduled',
      duration_minutes: body.duration_minutes || 30,
      created_by: userData.id,
    };

    const { data, error } = await supabaseServer
      .from('appointments')
      .insert([appointmentData])
      .select();

    if (error) throw error;
    await writeAuditEntry({
      actor: user,
      action: 'appointment.created',
      entityType: 'appointment',
      entityId: data?.[0]?.id,
      metadata: { fields: Object.keys(body) },
    });
    return NextResponse.json({ data: data[0] }, { status: 201 });
  } catch (error) {
    console.error('Error creating appointment:', error);
    return NextResponse.json({ error: 'Failed to create appointment' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const appointmentId = searchParams.get('id');

    if (!appointmentId) {
      return NextResponse.json({ error: 'Appointment ID required' }, { status: 400 });
    }

    const body = await request.json();

    const { data, error } = await supabaseServer
      .from('appointments')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', appointmentId)
      .select();

    if (error) throw error;
    await writeAuditEntry({
      actor: user,
      action: 'appointment.updated',
      entityType: 'appointment',
      entityId: appointmentId,
      metadata: { fields: Object.keys(body) },
    });
    return NextResponse.json({ data: data[0] });
  } catch (error) {
    console.error('Error updating appointment:', error);
    return NextResponse.json({ error: 'Failed to update appointment' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const appointmentId = searchParams.get('id');

    if (!appointmentId) {
      return NextResponse.json({ error: 'Appointment ID required' }, { status: 400 });
    }

    const { error } = await supabaseServer
      .from('appointments')
      .delete()
      .eq('id', appointmentId);

    if (error) throw error;
    await writeAuditEntry({
      actor: user,
      action: 'appointment.deleted',
      entityType: 'appointment',
      entityId: appointmentId,
    });
    return NextResponse.json({ message: 'Appointment deleted successfully' });
  } catch (error) {
    console.error('Error deleting appointment:', error);
    return NextResponse.json({ error: 'Failed to delete appointment' }, { status: 500 });
  }
}
