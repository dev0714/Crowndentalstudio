'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { Logo } from '@/components/logo';
import { AuthLoginForm } from '@/components/auth-login-form';

export default function LoginPage() {
  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        backgroundImage: 'url(/dental-pattern.jpg)',
        backgroundSize: 'auto',
        backgroundPosition: 'center',
      }}
    >
      {/* Blue-tinted overlay for better text contrast */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/40 via-blue-500/35 to-cyan-500/40"></div>

      <div className="relative z-10 w-full max-w-md">
        {/* Back Button */}
        <Link href="/" className="inline-flex items-center gap-2 text-white hover:text-blue-100 transition mb-4">
          <ArrowLeft size={20} />
          <span className="text-sm font-medium">Back to Home</span>
        </Link>

        {/* Login Card */}
        <Card className="bg-white border border-slate-200 shadow-lg">
          {/* Logo/Header */}
          <div className="text-center pt-8 pb-4 border-b border-slate-200 flex justify-center">
            <Logo variant="full" className="h-auto" />
          </div>

          <CardHeader className="pb-6">
            <CardTitle className="text-2xl text-slate-900">Welcome Back</CardTitle>
            <CardDescription className="text-slate-600">
              Sign in to access your practice management system
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-0">
            <AuthLoginForm />

            <div className="mt-6 pt-6 border-t border-slate-200 text-center text-sm text-slate-600">
              <p>Demo credentials available upon request</p>
            </div>

            {/* Footer */}
            <p className="text-center text-xs text-slate-500 mt-6 pt-6 border-t border-slate-200">
              Crown Dental Studio © 2025. All rights reserved.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
