import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/current-user';
import { assertRole } from '@/lib/auth/permissions';
import { supabaseServer } from '@/lib/supabase/server';
import { writeAuditEntry } from '@/lib/audit/write-audit-entry';
import { canChangeUser, isPortalRole, validatePassword } from '@/lib/auth/user-admin-rules';

const USER_COLUMNS = 'id, full_name, email, phone, role, is_active, created_at';
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

async function countOtherActiveAdmins(excludeId: string) {
  const { count, error } = await supabaseServer
    .from('users')
    .select('id', { count: 'exact', head: true })
    .in('role', ['CEO', 'Admin'])
    .eq('is_active', true)
    .neq('id', excludeId);
  if (error) throw error;
  return count ?? 0;
}

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

export async function PUT(request: NextRequest) {
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

    const { data: target, error: targetError } = await supabaseServer
      .from('users')
      .select('id, full_name, email, phone, role, is_active')
      .eq('id', userId)
      .maybeSingle();
    if (targetError) throw targetError;
    if (!target) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const patch: Record<string, unknown> = {};

    if (body.full_name !== undefined) {
      const name = String(body.full_name).trim();
      if (!name) return NextResponse.json({ error: 'Full name is required' }, { status: 400 });
      patch.full_name = name;
    }
    if (body.email !== undefined) {
      const email = String(body.email).trim().toLowerCase();
      if (!EMAIL.test(email)) return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 });
      patch.email = email;
    }
    if (body.phone !== undefined) {
      patch.phone = String(body.phone).trim() || null;
    }
    if (body.role !== undefined) {
      if (!isPortalRole(body.role)) return NextResponse.json({ error: 'Choose a valid role' }, { status: 400 });
      patch.role = body.role;
    }
    if (body.is_active !== undefined) {
      patch.is_active = Boolean(body.is_active);
    }
    let passwordReset = false;
    if (body.password !== undefined && body.password !== null && body.password !== '') {
      const problem = validatePassword(body.password);
      if (problem) return NextResponse.json({ error: problem }, { status: 400 });
      patch.password_hash = await bcrypt.hash(String(body.password), 10);
      passwordReset = true;
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    const verdict = canChangeUser({
      actorId: user.id,
      target: { id: target.id, role: target.role, is_active: Boolean(target.is_active) },
      nextRole: typeof patch.role === 'string' ? patch.role : undefined,
      nextActive: typeof patch.is_active === 'boolean' ? patch.is_active : undefined,
      otherActiveAdmins: await countOtherActiveAdmins(target.id),
    });
    if (!verdict.ok) {
      return NextResponse.json({ error: verdict.reason }, { status: 400 });
    }

    const { data, error } = await supabaseServer
      .from('users')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select(USER_COLUMNS);

    if (error) {
      if (String((error as { code?: string }).code) === '23505') {
        return NextResponse.json({ error: 'Another user already has that email address' }, { status: 409 });
      }
      throw error;
    }

    const changedFields = Object.keys(patch).filter((key) => key !== 'password_hash');
    if (changedFields.length > 0) {
      await writeAuditEntry({
        actor: user,
        action: 'user.updated',
        entityType: 'user',
        entityId: userId,
        metadata: { fields: changedFields, role: patch.role ?? target.role, is_active: patch.is_active ?? target.is_active },
      });
    }
    if (passwordReset) {
      await writeAuditEntry({ actor: user, action: 'user.password_reset', entityType: 'user', entityId: userId, metadata: { email: patch.email ?? target.email } });
    }

    return NextResponse.json({ data: data?.[0], password_reset: passwordReset });
  } catch (error) {
    console.error('Error updating user:', error);
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
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

    const { data: target, error: targetError } = await supabaseServer
      .from('users')
      .select('id, email, role, is_active')
      .eq('id', userId)
      .maybeSingle();
    if (targetError) throw targetError;
    if (!target) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const verdict = canChangeUser({
      actorId: user.id,
      target: { id: target.id, role: target.role, is_active: Boolean(target.is_active) },
      deleting: true,
      otherActiveAdmins: await countOtherActiveAdmins(target.id),
    });
    if (!verdict.ok) {
      return NextResponse.json({ error: verdict.reason }, { status: 400 });
    }

    const { error } = await supabaseServer.from('users').delete().eq('id', userId);

    if (error) throw error;
    await writeAuditEntry({ actor: user, action: 'user.deleted', entityType: 'user', entityId: userId, metadata: { email: target.email, role: target.role } });
    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
