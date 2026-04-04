'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AuthLoginForm } from '@/components/auth-login-form';

export default function LoginPage() {
  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        backgroundImage: 'url(/dental-pattern.jpg)',
        backgroundSize: 'auto',
        backgroundRepeat: 'repeat',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Overlay for better form visibility */}
      <div className="absolute inset-0 bg-white/35"></div>

      <div className="w-full max-w-md relative z-10">
        {/* Login Card */}
        <Card className="border border-slate-200 shadow-lg">
          {/* Logo/Header */}
          <div className="text-center pt-8 pb-4 border-b border-slate-200">
            <h1 className="text-4xl font-bold text-slate-900 mb-1 font-display">
              Crown Dental
            </h1>
            <p className="text-slate-600 text-sm">AI Operating System</p>
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
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-slate-500 mt-8">
          Crown Dental Studio © 2025. All rights reserved.
        </p>
      </div>
    </div>
  );
}
