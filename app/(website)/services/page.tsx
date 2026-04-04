'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Smile, Activity, Sparkles, Shield, Heart, Zap, Brain, Leaf, Wrench, Sun, Lock, Wand2, Baby, Accessibility, ArrowRight } from 'lucide-react'
import { FadeInUp, StaggerContainer, StaggerItem, FloatingBlob, FloatingBlobAlt, HeroText } from '@/components/motion'

const services = [
  { name: 'Cosmetic & Aesthetic Dentistry', slug: 'cosmetic-aesthetic-dentistry', icon: Sparkles, desc: 'Enhancing smiles through whitening, bonding, and aesthetic reshaping', gradient: 'from-pink-400 to-rose-500' },
  { name: 'Crowns, Bridges & Veneers', slug: 'crowns-bridges-veneers', icon: Activity, desc: 'Restoring damaged teeth with durable, natural-looking prosthetics', gradient: 'from-blue-400 to-indigo-500' },
  { name: 'Dental Fillings', slug: 'dental-fillings', icon: Shield, desc: 'Treating cavities with tooth-coloured composite or amalgam fillings', gradient: 'from-emerald-400 to-teal-500' },
  { name: 'Endodontics (Root Canals)', slug: 'endodontics-root-canals', icon: Zap, desc: 'Saving infected teeth through precise root canal therapy', gradient: 'from-yellow-400 to-orange-500' },
  { name: 'Extractions', slug: 'extractions', icon: Heart, desc: 'Gentle removal of damaged, impacted, or problematic teeth', gradient: 'from-red-400 to-pink-500' },
  { name: 'Implantology & Prosthodontics', slug: 'implantology-prosthodontics', icon: Brain, desc: 'Permanent tooth replacement using titanium implants', gradient: 'from-violet-400 to-purple-500' },
  { name: 'Oral & Maxillofacial Surgery', slug: 'oral-maxillofacial-surgery', icon: Leaf, desc: 'Surgical treatment of jaw, face, and oral conditions', gradient: 'from-cyan-400 to-blue-500' },
  { name: 'Orthodontics', slug: 'orthodontics', icon: Wrench, desc: 'Straightening teeth with braces and clear aligner systems', gradient: 'from-blue-400 to-cyan-500' },
  { name: 'Periodontics & Cleaning', slug: 'periodontics-cleaning', icon: Sun, desc: 'Treating gum disease and providing professional scale & polish', gradient: 'from-amber-400 to-yellow-500' },
  { name: 'Professional Teeth Whitening', slug: 'teeth-whitening', icon: Smile, desc: 'Professional in-chair and take-home whitening treatments', gradient: 'from-cyan-400 to-teal-500' },
  { name: 'Protective & Functional Devices', slug: 'protective-functional-devices', icon: Lock, desc: 'Custom mouthguards, nightguards, and splints', gradient: 'from-slate-400 to-blue-500' },
  { name: 'Smile Makeovers', slug: 'smile-makeovers', icon: Wand2, desc: 'Full aesthetic transformations combining multiple treatments', gradient: 'from-pink-400 to-purple-500' },
  { name: 'Pediatric Dentistry', slug: 'pediatric-dentistry', icon: Baby, desc: 'Gentle, child-friendly dental care from infancy through teens', gradient: 'from-green-400 to-emerald-500' },
  { name: 'Special Needs & Geriatric', slug: 'special-needs-geriatric', icon: Accessibility, desc: 'Specialised care for elderly patients and those with disabilities', gradient: 'from-indigo-400 to-blue-500' },
]

export default function Services() {
  return (
    <main className="overflow-hidden">

      {/* ─── HERO ─────────────────────────────────────────────────── */}
      <section className="relative min-h-[55vh] flex items-end pb-16 overflow-hidden pt-28">
        {/* Background image */}
        <div className="absolute inset-0">
          <Image src="/services-hero.jpg" alt="Dental clinic services" fill className="object-cover" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(29,78,216,0.92) 0%, rgba(8,145,178,0.88) 100%)' }} />
        </div>
        <FloatingBlob className="absolute top-10 right-20 w-80 h-80 bg-cyan-400/15 rounded-full blur-3xl pointer-events-none" />
        <FloatingBlobAlt className="absolute bottom-0 left-20 w-64 h-64 bg-blue-300/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <HeroText>
<h1 className="text-6xl md:text-7xl font-bold text-white leading-tight">
              Expert Dental<br />
              <span className="gradient-text">Services</span>
            </h1>
            <p className="text-xl text-white/75 mt-4 max-w-xl">
              Comprehensive care ranging from routine checkups to complex surgical procedures.
            </p>
          </HeroText>
        </div>
      </section>

      {/* ─── FEATURED SERVICES ────────────────────────────────────── */}
      <section className="relative py-28 bg-gradient-to-b from-slate-900 to-blue-900 overflow-hidden">
        <FloatingBlob className="absolute top-10 right-10 w-96 h-96 bg-cyan-400/10 rounded-full blur-3xl pointer-events-none" />
        <FloatingBlobAlt className="absolute bottom-10 left-10 w-80 h-80 bg-blue-300/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeInUp className="text-center mb-16">
            <p className="text-cyan-300 text-sm font-bold uppercase tracking-widest mb-3">Most Popular</p>
            <h2 className="text-5xl font-bold text-white leading-tight">Featured Services</h2>
          </FadeInUp>

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { href: '/services/cosmetic-aesthetic-dentistry', src: '/cosmetic-dentistry.jpg', title: 'Cosmetic Dentistry', desc: 'Brighten your smile with professional treatments' },
              { href: '/services/orthodontics', src: '/orthodontics.jpg', title: 'Orthodontics', desc: 'Straighten your teeth with modern solutions' },
              { href: '/services/implantology-prosthodontics', src: '/implants.jpg', title: 'Dental Implants', desc: 'Permanent tooth replacement solutions' },
            ].map((item, i) => (
              <StaggerItem key={i}>
                <Link href={item.href}>
                  <div className="group relative h-96 rounded-3xl overflow-hidden hover:-translate-y-2 transition-all duration-500 shine-on-hover"
                    style={{ border: '1px solid rgba(255,255,255,0.15)' }}
                  >
                    <Image src={item.src} alt={item.title} fill className="object-cover group-hover:scale-110 transition-transform duration-700" />
                    <div className="absolute inset-0 bg-gradient-to-t from-blue-900/90 via-blue-900/30 to-transparent" />
                    <div className="absolute inset-0 flex flex-col justify-end p-7">
                      <div className="glass rounded-2xl p-4">
                        <h3 className="text-xl font-bold text-white mb-1">{item.title}</h3>
                        <p className="text-white/75 text-sm mb-3">{item.desc}</p>
                        <span className="inline-flex items-center gap-1 text-cyan-300 text-sm font-bold group-hover:gap-2 transition-all">
                          Learn More <ArrowRight className="w-4 h-4" />
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* ─── ALL SERVICES GRID ────────────────────────────────────── */}
      <section className="relative py-28 bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-500 overflow-hidden">
        <FloatingBlob className="absolute top-20 right-20 w-72 h-72 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <FloatingBlobAlt className="absolute bottom-20 left-20 w-64 h-64 bg-cyan-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeInUp className="text-center mb-16">
            <p className="text-cyan-300 text-sm font-bold uppercase tracking-widest mb-3">Complete Range</p>
            <h2 className="text-5xl font-bold text-white leading-tight">All Our Services</h2>
          </FadeInUp>

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {services.map((service) => {
              const Icon = service.icon
              return (
                <StaggerItem key={service.slug}>
                  <Link href={`/services/${service.slug}`}>
                    <div className="group glass-heavy rounded-2xl p-6 hover:bg-white/25 transition-all duration-500 hover:-translate-y-1 shine-on-hover relative overflow-hidden h-full">
                      <div className={`w-12 h-12 bg-gradient-to-br ${service.gradient} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="text-lg font-bold text-white mb-2">{service.name}</h3>
                      <p className="text-white/65 text-sm mb-4 leading-relaxed">{service.desc}</p>
                      <span className="inline-flex items-center gap-1 text-cyan-300 text-sm font-bold group-hover:gap-2 transition-all">
                        Learn More <ArrowRight className="w-4 h-4" />
                      </span>
                    </div>
                  </Link>
                </StaggerItem>
              )
            })}
          </StaggerContainer>
        </div>
      </section>

      {/* ─── CTA ──────────────────────────────────────────────────── */}
      <section className="relative py-24 bg-gradient-to-b from-blue-900 to-blue-800 overflow-hidden">
        <FloatingBlob className="absolute top-10 right-10 w-64 h-64 bg-cyan-400/15 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeInUp>
            <div className="glass-heavy rounded-3xl p-12 text-center glow-cyan">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                Schedule Your <span className="gradient-text">Appointment</span>
              </h2>
              <p className="text-white/75 mb-8 text-lg">Ready to get started? Our team is here to help.</p>
              <Link href="/contact" className="inline-flex items-center gap-3 bg-white text-blue-700 px-10 py-4 rounded-2xl font-bold hover:shadow-2xl hover:scale-105 transition-all text-lg">
                Book Now
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </FadeInUp>
        </div>
      </section>
    </main>
  )
}
