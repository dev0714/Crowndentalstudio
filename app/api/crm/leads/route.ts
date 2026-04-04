import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/current-user';
import { writeAuditEntry } from '@/lib/audit/write-audit-entry';
import { supabaseServer } from '@/lib/supabase/server';
import type { Lead, CreateLeadRequest } from '@/lib/types/crm';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get('id');
    const status = searchParams.get('status');

    let query = supabaseServer.from('leads').select('*');

    if (leadId) {
      query = query.eq('id', leadId);
      const { data, error } = await query.single();
      if (error) throw error;
      return NextResponse.json({ data });
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
    return NextResponse.json({ data, count, page, limit });
  } catch (error) {
    console.error('Error fetching leads:', error);
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: CreateLeadRequest = await request.json();

    const { data: userData } = await supabaseServer
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single();

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const leadData = {
      ...body,
      status: 'New',
      created_by: userData.id,
    };

    const { data, error } = await supabaseServer
      .from('leads')
      .insert([leadData])
      .select();

    if (error) throw error;
    await writeAuditEntry({
      actor: user,
      action: 'lead.created',
      entityType: 'lead',
      entityId: data?.[0]?.id,
      metadata: { fields: Object.keys(body) },
    });
    return NextResponse.json({ data: data[0] }, { status: 201 });
  } catch (error) {
    console.error('Error creating lead:', error);
    return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get('id');

    if (!leadId) {
      return NextResponse.json({ error: 'Lead ID required' }, { status: 400 });
    }

    const body = await request.json();

    const { data, error } = await supabaseServer
      .from('leads')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', leadId)
      .select();

    if (error) throw error;
    await writeAuditEntry({
      actor: user,
      action: 'lead.updated',
      entityType: 'lead',
      entityId: leadId,
      metadata: { fields: Object.keys(body) },
    });
    return NextResponse.json({ data: data[0] });
  } catch (error) {
    console.error('Error updating lead:', error);
    return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get('id');

    if (!leadId) {
      return NextResponse.json({ error: 'Lead ID required' }, { status: 400 });
    }

    const { error } = await supabaseServer
      .from('leads')
      .delete()
      .eq('id', leadId);

    if (error) throw error;
    await writeAuditEntry({
      actor: user,
      action: 'lead.deleted',
      entityType: 'lead',
      entityId: leadId,
    });
    return NextResponse.json({ message: 'Lead deleted successfully' });
  } catch (error) {
    console.error('Error deleting lead:', error);
    return NextResponse.json({ error: 'Failed to delete lead' }, { status: 500 });
  }
}
