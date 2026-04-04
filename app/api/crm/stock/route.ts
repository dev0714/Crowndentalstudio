import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/current-user';
import { writeAuditEntry } from '@/lib/audit/write-audit-entry';
import { supabaseServer } from '@/lib/supabase/server';

function normalizeStockPayload(body: Record<string, unknown>) {
  const reorderLevel =
    typeof body.reorder_level === 'number' ? body.reorder_level : typeof body.min_stock_level === 'number' ? body.min_stock_level : 10;
  const minStockLevel =
    typeof body.min_stock_level === 'number' ? body.min_stock_level : reorderLevel;

  return {
    ...body,
    quantity_on_hand: typeof body.quantity_on_hand === 'number' ? body.quantity_on_hand : 0,
    quantity_on_order: typeof body.quantity_on_order === 'number' ? body.quantity_on_order : 0,
    reorder_level: reorderLevel,
    min_stock_level: minStockLevel,
    storage_location: typeof body.storage_location === 'string' ? body.storage_location : null,
    batch_number: typeof body.batch_number === 'string' ? body.batch_number : null,
  };
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('id');
    const category = searchParams.get('category');

    let query = supabaseServer.from('stock_items').select('*');

    if (itemId) {
      query = query.eq('id', itemId);
      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      return NextResponse.json({ data: data || null });
    }

    if (category) {
      query = query.eq('category', category);
    }

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    const { data, error, count } = await query
      .range(offset, offset + limit - 1)
      .order('item_name', { ascending: true });

    if (error) throw error;
    return NextResponse.json({ data, count, page, limit });
  } catch (error) {
    console.error('Error fetching stock items:', error);
    return NextResponse.json({ error: 'Failed to fetch stock items' }, { status: 500 });
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

    const itemData = {
      ...normalizeStockPayload(body),
      created_by: userData.id,
    };

    const { data, error } = await supabaseServer
      .from('stock_items')
      .insert([itemData])
      .select();

    if (error) throw error;
    await writeAuditEntry({
      actor: user,
      action: 'stock_item.created',
      entityType: 'stock_item',
      entityId: data?.[0]?.id,
      metadata: { fields: Object.keys(body) },
    });
    return NextResponse.json({ data: data[0] }, { status: 201 });
  } catch (error) {
    console.error('Error creating stock item:', error);
    return NextResponse.json({ error: 'Failed to create stock item' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('id');

    if (!itemId) {
      return NextResponse.json({ error: 'Stock Item ID required' }, { status: 400 });
    }

    const body = await request.json();

    const { data, error } = await supabaseServer
      .from('stock_items')
      .update({
        ...normalizeStockPayload(body),
        updated_at: new Date().toISOString(),
      })
      .eq('id', itemId)
      .select();

    if (error) throw error;
    await writeAuditEntry({
      actor: user,
      action: 'stock_item.updated',
      entityType: 'stock_item',
      entityId: itemId,
      metadata: { fields: Object.keys(body) },
    });
    return NextResponse.json({ data: data[0] });
  } catch (error) {
    console.error('Error updating stock item:', error);
    return NextResponse.json({ error: 'Failed to update stock item' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('id');

    if (!itemId) {
      return NextResponse.json({ error: 'Stock Item ID required' }, { status: 400 });
    }

    const { error } = await supabaseServer
      .from('stock_items')
      .delete()
      .eq('id', itemId);

    if (error) throw error;
    await writeAuditEntry({
      actor: user,
      action: 'stock_item.deleted',
      entityType: 'stock_item',
      entityId: itemId,
    });
    return NextResponse.json({ message: 'Stock item deleted successfully' });
  } catch (error) {
    console.error('Error deleting stock item:', error);
    return NextResponse.json({ error: 'Failed to delete stock item' }, { status: 500 });
  }
}
