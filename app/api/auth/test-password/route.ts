import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { password, hash } = await request.json();

    console.log('[v0] Testing password hash');
    console.log('[v0] Password:', password);
    console.log('[v0] Hash:', hash);

    const isValid = await bcrypt.compare(password, hash);
    
    console.log('[v0] Match result:', isValid);

    return NextResponse.json({
      password,
      hash,
      isValid,
      message: isValid ? 'Password matches!' : 'Password does not match'
    });
  } catch (error) {
    console.error('[v0] Test error:', error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
