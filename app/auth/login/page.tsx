'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Logo } from '@/components/logo';
import { AuthLoginForm } from '@/components/auth-login-form';
import { FadeUp, KenBurns } from '@/components/motion';

export default function LoginPage() {
  return (
    <div className="min-h-[100svh] grid grid-rows-[auto_1fr] lg:grid-rows-1 lg:grid-cols-2 bg-cream text-ink font-body">
      {/* Photo panel — a short band on phones, a full column on desktop */}
      <section className="relative h-52 sm:h-64 lg:h-auto lg:min-h-[100svh] overflow-hidden bg-ink">
        <KenBurns className="absolute inset-0">
          <Image src="/dental-consultation.jpg" alt="" fill priority sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
        </KenBurns>
        <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/35 to-ink/20" aria-hidden="true" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink/40 to-transparent hidden lg:block" aria-hidden="true" />
        <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8 lg:p-14">
          <FadeUp delay={200}>
            <p className="text-[11px] sm:text-[12px] font-semibold uppercase tracking-[0.18em] text-teal-light mb-2 lg:mb-4">Crown Dental Studio · Practice portal</p>
            <p className="font-display font-medium text-white text-[26px] sm:text-[32px] lg:text-[44px] leading-[1.05] max-w-[520px]">
              Care you can feel <em className="italic font-normal text-[#CFEDED]">confident</em> about.
            </p>
            <p className="hidden lg:block mt-4 text-sm text-white/70">26 Mackeurtan Avenue, Durban North</p>
          </FadeUp>
        </div>
      </section>

      {/* Sign-in panel */}
      <section className="flex items-center justify-center px-5 py-10 sm:px-10 lg:px-16 lg:py-16">
        <div className="w-full max-w-[420px]">
          <Link href="/" className="inline-flex items-center gap-2 text-[13px] font-medium text-muted-ink hover:text-ink mb-8 sm:mb-10">
            <ArrowLeft className="w-4 h-4" />
            Back to website
          </Link>

          <div className="flex items-center gap-3 mb-8">
            <Logo variant="icon" className="h-9 w-auto" />
            <span className="font-display text-[22px] leading-none font-medium text-ink">Crown Dental Studio</span>
          </div>

          <h1 className="font-display font-medium text-ink text-[36px] sm:text-[40px] leading-[1.05] mb-2">Welcome back.</h1>
          <p className="text-[15px] leading-relaxed text-muted-ink mb-8">Sign in to your practice management system.</p>

          <AuthLoginForm />

          <p className="mt-8 pt-6 border-t border-hairline text-center text-[13px] text-muted-ink">Demo credentials available on request.</p>
          <p className="mt-6 text-center text-[12px] text-muted-ink/80">© {new Date().getFullYear()} Crown Dental Studio. All rights reserved.</p>
        </div>
      </section>
    </div>
  );
}
