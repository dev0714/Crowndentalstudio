import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabase } from '@/lib/supabase/client';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    const hashedPassword = await bcrypt.hash(password, 10);

    const { error } = await supabase
      .from('users')
      .update({ password_hash: hashedPassword })
      .eq('email', email);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ message: 'Password set successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Error setting password' }, { status: 500 });
  }
}
