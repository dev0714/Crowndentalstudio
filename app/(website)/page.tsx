'use client'

import Link from 'next/link'
import Image from 'next/image'
import { CheckCircle, Smile, Activity, Sparkles, ArrowRight, Star, Shield, Clock } from 'lucide-react'
import { CounterStat } from '@/components/counter-stat'
import { HeroText, FadeInUp, FadeInLeft, FadeInRight, StaggerContainer, StaggerItem, FloatingBlob, FloatingBlobAlt } from '@/components/motion'

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden">

      {/* ─── HERO ─────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-500 overflow-hidden pt-28">
        {/* Animated blobs */}
        <FloatingBlob className="absolute top-20 left-10 w-96 h-96 bg-cyan-400/25 rounded-full blur-3xl pointer-events-none" />
        <FloatingBlobAlt className="absolute bottom-20 right-10 w-[500px] h-[500px] bg-blue-300/20 rounded-full blur-3xl pointer-events-none" />
        <FloatingBlob className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left Content */}
            <div className="space-y-8">
              <HeroText delay={0}>
                <div className="inline-flex items-center gap-2 glass px-4 py-2 rounded-full w-fit">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                  <span className="text-sm font-semibold text-white/90">24/7 Emergency Services Available</span>
                </div>
              </HeroText>

              <HeroText delay={0.1}>
                <h1 className="text-6xl md:text-7xl xl:text-8xl font-bold leading-[0.9] tracking-tight">
                  <span className="gradient-text">Grow</span>
                  <br />
                  <span className="text-white">Your</span>
                  <br />
                  <span className="gradient-text">Smile</span>
                </h1>
              </HeroText>

              <HeroText delay={0.2}>
                <p className="text-lg text-white/80 leading-relaxed max-w-md">
                  Experience exceptional dental care tailored to your needs. From preventative checkups to advanced treatments — your healthiest smile starts here.
                </p>
              </HeroText>

              <HeroText delay={0.3}>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link
                    href="tel:0812078621"
                    className="group inline-flex items-center gap-3 bg-white text-blue-700 px-8 py-4 rounded-2xl font-bold hover:shadow-2xl hover:scale-105 transition-all glow-white"
                  >
                    <span className="text-xl">📞</span>
                    <span>Call: 081 207 8621</span>
                  </Link>
                  <Link
                    href="/services"
                    className="group inline-flex items-center gap-2 glass px-8 py-4 rounded-2xl font-bold text-white border-white/30 hover:bg-white/20 transition-all"
                  >
                    Explore Services
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </HeroText>

              {/* Trust Badges */}
              <HeroText delay={0.4}>
                <div className="flex items-center gap-6 pt-2">
                  <div className="flex -space-x-3">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="w-9 h-9 rounded-full border-2 border-white/40 bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center text-xs text-white font-bold">
                        {String.fromCharCode(64 + i)}
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />)}
                    </div>
                    <p className="text-white/70 text-xs mt-0.5">2,400+ happy patients</p>
                  </div>
                </div>
              </HeroText>
            </div>

            {/* Right — Hero Image with glass overlays */}
            <HeroText delay={0.2} className="hidden lg:block">
              <div className="relative h-[580px]">
                {/* Main image */}
                <div className="relative h-full w-full rounded-3xl overflow-hidden glow-cyan"
                  style={{ border: '1px solid rgba(255,255,255,0.25)' }}
                >
                  <Image
                    src="/dental-hero.jpg"
                    alt="Professional dental consultation at Crown Dental Studio"
                    fill
                    className="object-cover"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-blue-900/50 via-transparent to-transparent" />
                </div>

                {/* Bottom fade */}
                <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-blue-900/60 to-transparent pointer-events-none" />
              </div>
            </HeroText>
          </div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-blue-900/60 to-transparent pointer-events-none" />
      </section>

      {/* ─── STATS ────────────────────────────────────────────────── */}
      <section className="relative py-16 overflow-hidden" style={{ background: 'linear-gradient(180deg, #1e3a8a 0%, #1d4ed8 100%)' }}>
        <FloatingBlobAlt className="absolute top-0 right-1/4 w-64 h-64 bg-cyan-400/15 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {[
              { number: '20+', label: 'Years Experience', icon: Shield },
              { number: '2,400+', label: 'Happy Patients', icon: Smile },
              { number: '5.0', label: 'Star Rating', icon: Star, isRating: true },
              { number: 'Same-Day', label: 'Appointments', icon: Clock },
              { number: '14', label: 'Services', icon: Activity },
            ].map((stat, index) => (
              <div key={index} className="glass rounded-2xl p-5 text-center hover:bg-white/20 transition-all hover:-translate-y-1 group flex flex-col items-center">
                {stat.icon && <stat.icon className="w-6 h-6 text-cyan-300 mb-2" />}
                {stat.isRating ? (
                  <div className="flex items-center gap-1">
                    <p className="text-3xl font-black text-white">{stat.number}</p>
                    <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  </div>
                ) : (
                  <p className="text-3xl font-black text-white">{stat.number}</p>
                )}
                <p className="text-cyan-100 text-sm font-medium mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── ABOUT ────────────────────────────────────────────────── */}
      <section className="relative py-28 overflow-hidden bg-gradient-to-b from-slate-50 to-blue-50">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-cyan-100/60 to-transparent rounded-full translate-x-1/3 -translate-y-1/3 pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <FadeInLeft>
              <div className="relative h-[540px]">
                <div className="relative h-full w-full rounded-3xl overflow-hidden shadow-2xl shadow-blue-200">
                  <Image src="/dental-consultation.jpg" alt="Crown Dental Studio team providing care" fill className="object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-blue-900/30 to-transparent" />
                </div>
                {/* Glass stat overlay */}
                <div className="absolute bottom-8 left-8 right-8 bg-white/95 rounded-2xl p-5 shadow-xl border border-gray-100">
                  <div className="flex items-center justify-between">
                    {[
                      { value: '20+', label: 'Years' },
                      { value: '2,400+', label: 'Patients' },
                      { value: '14', label: 'Services' },
                    ].map(({ value, label }) => (
                      <div key={label} className="text-center">
                        <p className="text-2xl font-black text-blue-900">{value}</p>
                        <p className="text-xs text-gray-600 font-semibold">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </FadeInLeft>

            <FadeInRight>
              <div className="space-y-8">
                <div className="space-y-3">
                  <p className="text-blue-600 text-sm font-bold uppercase tracking-widest">About Our Practice</p>
                  <h2 className="text-5xl font-bold text-gray-900 leading-tight">
                    Exceptional Dental Care{' '}
                    <span className="gradient-text-blue">You Can Trust</span>
                  </h2>
                </div>

                <p className="text-lg text-gray-600 leading-relaxed">
                  We provide comprehensive dental solutions for patients of all ages, including specialized care for those with anxiety or special needs. Our state-of-the-art facility ensures every visit is comfortable and effective.
                </p>

                <div className="space-y-4">
                  {[
                    { title: 'General Dentistry', desc: 'Preventative and restorative care for the whole family' },
                    { title: 'Specialized Treatments', desc: 'Orthodontics, implants, and cosmetic procedures' },
                    { title: 'Advanced Technology', desc: 'State-of-the-art equipment for better outcomes' },
                  ].map((item, i) => (
                    <div key={i} className="flex gap-4 p-4 rounded-2xl bg-white/70 hover:bg-white transition-all hover:shadow-md group">
                      <div className="flex-shrink-0 mt-0.5 w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">{item.title}</h3>
                        <p className="text-sm text-gray-500">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <Link href="/about" className="inline-flex items-center gap-2 text-blue-600 font-bold hover:text-blue-700 group pt-2">
                  Learn More About Us
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </FadeInRight>
          </div>
        </div>
      </section>

      {/* ─── SERVICES ─────────────────────────────────────────────── */}
      <section className="relative py-28 overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-500">
        <FloatingBlob className="absolute top-20 right-20 w-80 h-80 bg-cyan-400/20 rounded-full blur-3xl pointer-events-none" />
        <FloatingBlobAlt className="absolute bottom-20 left-20 w-72 h-72 bg-blue-300/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeInUp className="text-center mb-20 max-w-3xl mx-auto">
            <p className="text-cyan-300 text-sm font-bold uppercase tracking-widest mb-3">Our Services</p>
            <h2 className="text-5xl font-bold text-white leading-tight mb-6">
              Comprehensive Dental{' '}
              <span className="gradient-text">Solutions</span>
            </h2>
            <p className="text-xl text-white/75">
              From routine care to advanced treatments — everything your family needs for optimal oral health.
            </p>
          </FadeInUp>

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: Smile,
                title: 'Cosmetic Dentistry',
                desc: 'Transform your smile with teeth whitening, veneers, and aesthetic treatments.',
                gradient: 'from-cyan-400 to-blue-500',
              },
              {
                icon: Activity,
                title: 'Oral Evaluations',
                desc: 'Comprehensive assessments with personalized treatment recommendations.',
                gradient: 'from-blue-400 to-indigo-500',
              },
              {
                icon: Sparkles,
                title: 'Advanced Planning',
                desc: 'Expert treatment plans combining preventative, restorative, and cosmetic care.',
                gradient: 'from-cyan-500 to-teal-400',
              },
            ].map((service, index) => {
              const Icon = service.icon
              return (
                <StaggerItem key={index}>
                  <div className="relative group glass-heavy rounded-3xl p-8 hover:bg-white/25 transition-all duration-500 hover:-translate-y-2 shine-on-hover overflow-hidden">
                    <div className={`w-16 h-16 bg-gradient-to-br ${service.gradient} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-3">{service.title}</h3>
                    <p className="text-white/75 mb-6 leading-relaxed">{service.desc}</p>
                    <Link href="/services" className="inline-flex items-center gap-2 text-cyan-300 font-bold hover:text-cyan-200 group/link">
                      Explore
                      <ArrowRight className="w-5 h-5 group-hover/link:translate-x-1 transition-transform" />
                    </Link>
                    {/* Corner glow */}
                    <div className={`absolute -bottom-6 -right-6 w-24 h-24 bg-gradient-to-br ${service.gradient} opacity-20 rounded-full blur-xl pointer-events-none`} />
                  </div>
                </StaggerItem>
              )
            })}
          </StaggerContainer>

          <FadeInUp className="text-center mt-12">
            <Link href="/services" className="inline-flex items-center gap-3 glass px-8 py-4 rounded-2xl font-bold text-white hover:bg-white/20 transition-all group">
              View All 14 Services
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </FadeInUp>
        </div>
      </section>

      {/* ─── TRUST SECTION ────────────────────────────────────────── */}
      <section className="relative py-28 bg-gradient-to-b from-blue-50 to-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeInUp className="text-center mb-16">
            <p className="text-blue-600 text-sm font-bold uppercase tracking-widest mb-3">Why Choose Us</p>
            <h2 className="text-5xl font-bold text-gray-900 leading-tight">
              The Crown Dental{' '}
              <span className="gradient-text-blue">Difference</span>
            </h2>
          </FadeInUp>

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: '🏆', title: 'Award-Winning Care', desc: 'Recognized for excellence in dental services across Durban North.' },
              { icon: '🔬', title: 'Latest Technology', desc: 'State-of-the-art equipment for precise, comfortable treatments.' },
              { icon: '❤️', title: 'Patient-Centered', desc: 'Your comfort and health are always our highest priority.' },
              { icon: '🌙', title: '24/7 Emergencies', desc: "We're always here when dental emergencies strike." },
            ].map((item, i) => (
              <StaggerItem key={i}>
                <div className="glass-blue rounded-3xl p-7 text-center hover:shadow-xl hover:-translate-y-2 transition-all duration-300 group">
                  <span className="text-4xl mb-4 block group-hover:scale-110 transition-transform">{item.icon}</span>
                  <h3 className="font-bold text-gray-900 text-lg mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* ─── CTA ──────────────────────────────────────────────────── */}
      <section className="relative py-28 overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-500">
        <FloatingBlob className="absolute top-10 right-10 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <FloatingBlobAlt className="absolute bottom-10 left-10 w-80 h-80 bg-cyan-300/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeInUp>
            <div className="glass-heavy rounded-3xl p-12 md:p-16 text-center glow-cyan">
              <p className="text-cyan-300 text-sm font-bold uppercase tracking-widest mb-4">Take The First Step</p>
              <h2 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
                Ready for Your{' '}
                <span className="gradient-text">Best Smile?</span>
              </h2>
              <p className="text-xl text-white/75 mb-10 leading-relaxed max-w-2xl mx-auto">
                Schedule your appointment today and discover the Crown Dental difference. World-class care in a comfortable, modern environment.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/contact"
                  className="group inline-flex items-center gap-3 bg-white text-blue-700 px-10 py-4 rounded-2xl font-bold hover:shadow-2xl hover:scale-105 transition-all text-lg glow-white"
                >
                  Book Your Appointment
                  <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                </Link>
                <a
                  href="tel:0812078621"
                  className="inline-flex items-center gap-3 glass px-10 py-4 rounded-2xl font-bold text-white hover:bg-white/20 transition-all text-lg"
                >
                  📞 081 207 8621
                </a>
              </div>
            </div>
          </FadeInUp>
        </div>
      </section>
    </main>
  )
}
