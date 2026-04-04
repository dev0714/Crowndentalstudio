'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Heart, Zap, Users, Clock, ArrowRight, CheckCircle } from 'lucide-react'
import { FadeInUp, FadeInLeft, FadeInRight, StaggerContainer, StaggerItem, FloatingBlob, FloatingBlobAlt, HeroText } from '@/components/motion'

export default function About() {
  const values = [
    { icon: Heart, title: 'Compassionate Care', description: 'We treat every patient like family, ensuring comfort and dignity in every visit.', gradient: 'from-pink-400 to-rose-500' },
    { icon: Zap, title: 'Advanced Technology', description: 'Latest equipment and techniques for the best possible outcomes.', gradient: 'from-yellow-400 to-orange-500' },
    { icon: Users, title: 'All Ages Welcome', description: 'From children to seniors, we care for every member of your family.', gradient: 'from-blue-400 to-cyan-500' },
    { icon: Clock, title: '24/7 Emergency Ready', description: 'Always here when you need us most — day or night.', gradient: 'from-purple-400 to-indigo-500' },
  ]

  const team = [
    { name: 'Dr. Amod', title: 'Principal Dentist', image: '/dr-amod.jpg', specialty: '20+ Years Experience' },
    { name: 'Dr. Sarah', title: 'Restorative Specialist', image: '/dr-sarah.jpg', specialty: 'Crowns & Veneers Expert' },
    { name: 'Dr. James', title: 'Orthodontist', image: '/dr-james.jpg', specialty: 'Braces & Clear Aligners' },
  ]

  return (
    <main className="overflow-hidden">

      {/* ─── HERO ─────────────────────────────────────────────────── */}
      <section className="relative min-h-[50vh] flex items-end pb-16 bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-500 overflow-hidden pt-28">
        <FloatingBlob className="absolute top-10 right-20 w-80 h-80 bg-cyan-400/20 rounded-full blur-3xl pointer-events-none" />
        <FloatingBlobAlt className="absolute bottom-0 left-10 w-64 h-64 bg-blue-300/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <HeroText>
<h1 className="text-6xl md:text-7xl font-bold text-white leading-tight">
              About Crown<br />
              <span className="gradient-text">Dental Studio</span>
            </h1>
            <p className="text-xl text-white/75 mt-4 max-w-xl">
              A team dedicated to transforming smiles and improving oral health across Durban North.
            </p>
          </HeroText>
        </div>
      </section>

      {/* ─── MISSION ──────────────────────────────────────────────── */}
      <section className="relative py-28 bg-gradient-to-b from-slate-50 to-blue-50 overflow-hidden">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gradient-to-bl from-cyan-100/60 to-transparent rounded-full translate-x-1/3 -translate-y-1/3 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <FadeInLeft>
              <div className="space-y-6">
                <div>
                  <p className="text-blue-600 text-sm font-bold uppercase tracking-widest mb-3">Our Mission</p>
                  <h2 className="text-5xl font-bold text-gray-900 leading-tight">
                    Care That Goes{' '}
                    <span className="gradient-text-blue">Beyond</span>
                  </h2>
                </div>
                <p className="text-lg text-gray-600 leading-relaxed">
                  We provide team-based, comprehensive dental care for children and adults, including patients of all ages who are anxious or have an underlying developmental or medical condition.
                </p>
                <p className="text-gray-500 leading-relaxed">
                  Our commitment is to deliver exceptional care with compassion, utilizing advanced technology and proven treatment methodologies.
                </p>
                <div className="space-y-3 pt-2">
                  {[
                    { label: 'Excellence', desc: 'in every treatment we provide' },
                    { label: 'Compassion', desc: 'for every patient we meet' },
                    { label: 'Innovation', desc: 'in our approach and technology' },
                  ].map(({ label, desc }) => (
                    <div key={label} className="flex items-center gap-3 p-3 bg-white/70 rounded-2xl hover:bg-white transition-all">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="w-4 h-4 text-white" />
                      </div>
                      <p className="text-gray-700">
                        <span className="font-bold text-blue-900">{label}</span> {desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </FadeInLeft>

            <FadeInRight>
              <div className="relative h-[500px]">
                {/* Main visual card */}
                <div className="relative h-full w-full rounded-3xl overflow-hidden shadow-2xl shadow-blue-200">
                  <Image src="/about-team.jpg" alt="Crown Dental Studio team" fill className="object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-blue-900/60 via-blue-900/20 to-transparent" />
                  {/* Overlay glass card */}
                  <div className="absolute bottom-8 left-8 right-8 glass rounded-2xl p-5">
                    <p className="text-white font-bold text-lg mb-1">Patient-Centered Care</p>
                    <p className="text-white/75 text-sm">Your comfort and health are our highest priority</p>
                  </div>
                </div>
              </div>
            </FadeInRight>
          </div>
        </div>
      </section>

      {/* ─── VALUES ───────────────────────────────────────────────── */}
      <section className="relative py-28 overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-500">
        <FloatingBlob className="absolute top-10 left-10 w-80 h-80 bg-cyan-400/15 rounded-full blur-3xl pointer-events-none" />
        <FloatingBlobAlt className="absolute bottom-10 right-10 w-72 h-72 bg-blue-300/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeInUp className="text-center mb-16">
            <p className="text-cyan-300 text-sm font-bold uppercase tracking-widest mb-3">What Drives Us</p>
            <h2 className="text-5xl font-bold text-white leading-tight">Our Core Values</h2>
          </FadeInUp>

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, idx) => {
              const Icon = value.icon
              return (
                <StaggerItem key={idx}>
                  <div className="glass-heavy rounded-3xl p-8 text-center hover:bg-white/25 transition-all duration-500 hover:-translate-y-2 group shine-on-hover relative overflow-hidden">
                    <div className={`w-16 h-16 bg-gradient-to-br ${value.gradient} rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform shadow-lg`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-3">{value.title}</h3>
                    <p className="text-white/70 text-sm leading-relaxed">{value.description}</p>
                  </div>
                </StaggerItem>
              )
            })}
          </StaggerContainer>
        </div>
      </section>

      {/* ─── TEAM ─────────────────────────────────────────────────── */}
      <section className="relative py-28 bg-gradient-to-b from-blue-50 to-white overflow-hidden">
        <div className="absolute top-0 left-0 w-[400px] h-[400px] bg-gradient-to-br from-cyan-100/50 to-transparent rounded-full -translate-x-1/3 -translate-y-1/3 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeInUp className="text-center mb-16">
            <p className="text-blue-600 text-sm font-bold uppercase tracking-widest mb-3">The People Behind Your Smile</p>
            <h2 className="text-5xl font-bold text-gray-900 leading-tight">
              Meet Our{' '}
              <span className="gradient-text-blue">Expert Team</span>
            </h2>
          </FadeInUp>

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {team.map((member, idx) => (
              <StaggerItem key={idx}>
                <div className="group relative glass-blue rounded-3xl p-8 text-center hover:-translate-y-3 transition-all duration-500 hover:shadow-2xl hover:shadow-blue-200/50">
                  <div className="w-36 h-36 rounded-full mx-auto mb-6 overflow-hidden ring-4 ring-blue-200/50 group-hover:ring-cyan-400/50 transition-all shadow-xl">
                    <Image src={member.image} alt={member.name} width={144} height={144} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-1">{member.name}</h3>
                  <p className="text-blue-600 font-bold mb-2">{member.title}</p>
                  <span className="inline-block px-4 py-1 rounded-full text-xs font-bold text-cyan-700 bg-cyan-100/80">{member.specialty}</span>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* ─── CTA ──────────────────────────────────────────────────── */}
      <section className="relative py-24 overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-500">
        <FloatingBlob className="absolute top-10 right-10 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeInUp>
            <div className="glass-heavy rounded-3xl p-12 text-center glow-cyan">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
                Ready to Experience<br />
                <span className="gradient-text">Our Care?</span>
              </h2>
              <p className="text-white/75 mb-8 text-lg">Join thousands of happy patients who trust Crown Dental Studio.</p>
              <Link href="/contact" className="inline-flex items-center gap-3 bg-white text-blue-700 px-10 py-4 rounded-2xl font-bold hover:shadow-2xl hover:scale-105 transition-all text-lg glow-white">
                Book an Appointment
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </FadeInUp>
        </div>
      </section>
    </main>
  )
}
