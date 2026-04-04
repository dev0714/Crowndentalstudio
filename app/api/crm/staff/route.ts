import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/current-user';
import { writeAuditEntry } from '@/lib/audit/write-audit-entry';
import { supabaseServer } from '@/lib/supabase/server';

function isMissingRelationError(error: { message?: string } | null | undefined) {
  return Boolean(error?.message?.includes('Could not find the table') || error?.message?.includes('does not exist'));
}

async function fetchStaffRows() {
  const usersResult = await supabaseServer
    .from('users')
    .select('id, email, full_name, role, is_active, created_at, updated_at')
    .order('full_name', { ascending: true });

  if (usersResult.error) throw usersResult.error;

  const profilesResult = await supabaseServer.from('staff_profiles').select('*');
  if (profilesResult.error && !isMissingRelationError(profilesResult.error)) {
    throw profilesResult.error;
  }

  const profilesByUserId = new Map((profilesResult.data || []).map((row) => [row.user_id, row]));

  return (usersResult.data || []).map((user) => {
    const profile = profilesByUserId.get(user.id);
    return {
      ...user,
      ...profile,
    };
  });
}

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await fetchStaffRows();
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error fetching staff profiles:', error);
    return NextResponse.json({ error: 'Failed to fetch staff profiles' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const userId = typeof body.user_id === 'string' ? body.user_id : typeof body.id === 'string' ? body.id : null;

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    const payload = {
      user_id: userId,
      id_document_uploaded: Boolean(body.id_document_uploaded),
      proof_of_address_uploaded: Boolean(body.proof_of_address_uploaded),
      banking_details_last4: typeof body.banking_details_last4 === 'string' ? body.banking_details_last4 : null,
      qualifications: typeof body.qualifications === 'string' ? body.qualifications : null,
      hpcsa_registration_number: typeof body.hpcsa_registration_number === 'string' ? body.hpcsa_registration_number : null,
      contract_signed: Boolean(body.contract_signed),
      nda_signed: Boolean(body.nda_signed),
      restraint_signed: Boolean(body.restraint_signed),
      training_repayment_clause_signed: Boolean(body.training_repayment_clause_signed),
      leave_balance_days: typeof body.leave_balance_days === 'number' ? body.leave_balance_days : 0,
      shift_schedule: body.shift_schedule && typeof body.shift_schedule === 'object' ? body.shift_schedule : {},
      notes: typeof body.notes === 'string' ? body.notes : null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseServer.from('staff_profiles').upsert([payload], { onConflict: 'user_id' }).select('*');
    if (error) throw error;

    await writeAuditEntry({
      actor: user,
      action: 'staff_profile.created_or_updated',
      entityType: 'staff_profile',
      entityId: data?.[0]?.id || userId,
      metadata: { user_id: userId, fields: Object.keys(body) },
    });

    return NextResponse.json({ data: data?.[0] || null }, { status: 201 });
  } catch (error) {
    console.error('Error saving staff profile:', error);
    return NextResponse.json({ error: 'Failed to save staff profile' }, { status: 500 });
  }
}
