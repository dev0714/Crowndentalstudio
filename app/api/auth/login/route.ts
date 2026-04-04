import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import { shouldUseSecureCookie } from '@/lib/auth/cookie-security';
import { resolveDemoLoginUser } from '@/lib/auth/demo-login';
import { createSessionToken, getSessionCookieName, getSessionMaxAgeSeconds } from '@/lib/auth/session';
import { supabaseServer } from '@/lib/supabase/server';
import { toPublicAuthUser } from '@/lib/auth/public-user';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const demoUser = resolveDemoLoginUser(email, password);

    if (demoUser) {
      const response = NextResponse.json(
        {
          user: toPublicAuthUser({
            id: demoUser.id,
            email: demoUser.email,
            full_name: demoUser.fullName,
            role: demoUser.role,
          }),
          message: 'Login successful',
        },
        { status: 200 },
      );

      response.cookies.set({
        name: getSessionCookieName(),
        value: createSessionToken({
          id: demoUser.id,
          email: demoUser.email,
          fullName: demoUser.fullName,
          role: demoUser.role,
        }),
        httpOnly: true,
        sameSite: 'lax',
        secure: shouldUseSecureCookie(request),
        path: '/',
        maxAge: getSessionMaxAgeSeconds(),
      });
      response.headers.set('Cache-Control', 'no-store');

      return response;
    }

    // Query the users table directly
    const { data: user, error: queryError } = await supabaseServer
      .from('users')
      .select('id, email, full_name, role, password_hash')
      .eq('email', email)
      .single();

    if (queryError || !user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    if (typeof user.password_hash !== 'string' || user.password_hash.length === 0) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    let isPasswordValid = false;

    try {
      isPasswordValid = await bcrypt.compare(password, user.password_hash);
    } catch {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Update last login
    await supabaseServer
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id);

    const response = NextResponse.json(
      {
        user: toPublicAuthUser(user),
        message: 'Login successful'
      },
      { status: 200 }
    );

    response.cookies.set({
      name: getSessionCookieName(),
      value: createSessionToken({ id: user.id, email: user.email, fullName: user.full_name, role: user.role }),
      httpOnly: true,
      sameSite: 'lax',
      secure: shouldUseSecureCookie(request),
      path: '/',
      maxAge: getSessionMaxAgeSeconds(),
    });
    response.headers.set('Cache-Control', 'no-store');

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    );
  }
}
