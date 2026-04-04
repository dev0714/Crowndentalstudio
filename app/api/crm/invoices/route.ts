import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/current-user';
import { writeAuditEntry } from '@/lib/audit/write-audit-entry';
import { supabaseServer } from '@/lib/supabase/server';
import type { Invoice, CreateInvoiceRequest } from '@/lib/types/crm';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const invoiceId = searchParams.get('id');
    const patientId = searchParams.get('patientId');
    const status = searchParams.get('status');

    let query = supabaseServer.from('invoices').select('*');

    if (invoiceId) {
      query = query.eq('id', invoiceId);
      const { data, error } = await query.single();
      if (error) throw error;
      return NextResponse.json({ data });
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
      .order('invoice_date', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ data, count, page, limit });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: CreateInvoiceRequest = await request.json();

    const { data: userData } = await supabaseServer
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single();

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Calculate totals
    const subtotal = body.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
    const discount = body.discount || 0;
    const tax = body.tax || 0;
    const total_amount = subtotal - discount + tax;

    // Generate invoice number
    const invoiceNumber = `INV-${Date.now()}`;

    const invoiceData = {
      invoice_number: invoiceNumber,
      patient_id: body.patient_id,
      invoice_date: body.invoice_date,
      due_date: body.due_date,
      subtotal,
      discount,
      tax,
      total_amount,
      paid_amount: 0,
      status: 'Draft',
      medical_aid_claim: body.medical_aid_claim || false,
      created_by: userData.id,
    };

    const { data: invoiceData_, error: invoiceError } = await supabaseServer
      .from('invoices')
      .insert([invoiceData])
      .select();

    if (invoiceError) throw invoiceError;

    const invoice = invoiceData_[0];

    // Create invoice items
    const itemsData = body.items.map((item) => ({
      invoice_id: invoice.id,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total: item.quantity * item.unit_price,
    }));

    const { error: itemsError } = await supabaseServer
      .from('invoice_items')
      .insert(itemsData);

    if (itemsError) throw itemsError;

    await writeAuditEntry({
      actor: user,
      action: 'invoice.created',
      entityType: 'invoice',
      entityId: invoice.id,
      metadata: { fields: Object.keys(body), itemCount: body.items.length },
    });

    return NextResponse.json({ data: invoice }, { status: 201 });
  } catch (error) {
    console.error('Error creating invoice:', error);
    return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const invoiceId = searchParams.get('id');

    if (!invoiceId) {
      return NextResponse.json({ error: 'Invoice ID required' }, { status: 400 });
    }

    const body = await request.json();

    const { data, error } = await supabaseServer
      .from('invoices')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', invoiceId)
      .select();

    if (error) throw error;
    await writeAuditEntry({
      actor: user,
      action: 'invoice.updated',
      entityType: 'invoice',
      entityId: invoiceId,
      metadata: { fields: Object.keys(body) },
    });
    return NextResponse.json({ data: data[0] });
  } catch (error) {
    console.error('Error updating invoice:', error);
    return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const invoiceId = searchParams.get('id');

    if (!invoiceId) {
      return NextResponse.json({ error: 'Invoice ID required' }, { status: 400 });
    }

    // Delete invoice items first
    await supabaseServer.from('invoice_items').delete().eq('invoice_id', invoiceId);

    // Delete invoice
    const { error } = await supabaseServer
      .from('invoices')
      .delete()
      .eq('id', invoiceId);

    if (error) throw error;
    await writeAuditEntry({
      actor: user,
      action: 'invoice.deleted',
      entityType: 'invoice',
      entityId: invoiceId,
    });
    return NextResponse.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    return NextResponse.json({ error: 'Failed to delete invoice' }, { status: 500 });
  }
}
