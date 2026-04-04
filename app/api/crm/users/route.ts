import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/current-user';
import { assertRole } from '@/lib/auth/permissions';
import { supabaseServer } from '@/lib/supabase/server';

function ensureUserAdminAccess(userRole: string) {
  assertRole(userRole, ['CEO', 'Admin']);
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    ensureUserAdminAccess(user.role);

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');

    if (userId) {
      const { data, error } = await supabaseServer
        .from('users')
        .select('id, full_name, email, phone, role, is_active, created_at')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return NextResponse.json({ data });
    }

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    const { data, error, count } = await supabaseServer
      .from('users')
      .select('id, full_name, email, phone, role, is_active, created_at', { count: 'exact' })
      .order('role', { ascending: true })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return NextResponse.json({ data, count, page, limit });
  } catch (error) {
    console.error('Error fetching users:', error);
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    ensureUserAdminAccess(user.role);

    const body = await request.json();

    if (!body.email || !body.full_name || !body.password || !body.role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(body.password, 10);

    const { data, error } = await supabaseServer
      .from('users')
      .insert([
        {
          email: body.email,
          full_name: body.full_name,
          phone: body.phone || null,
          role: body.role,
          is_active: body.is_active ?? true,
          password_hash: passwordHash,
        },
      ])
      .select('id, full_name, email, phone, role, is_active, created_at');

    if (error) throw error;
    return NextResponse.json({ data: data?.[0] }, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    ensureUserAdminAccess(user.role);

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    const { error } = await supabaseServer.from('users').delete().eq('id', userId);

    if (error) throw error;
    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
