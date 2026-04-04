'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Phone, Mail, MapPin, Clock, ArrowRight, Send, MessageCircle, Navigation } from 'lucide-react'
import { useState } from 'react'
import { FadeInUp, FadeInLeft, FadeInRight, StaggerContainer, StaggerItem, FloatingBlob, FloatingBlobAlt, HeroText } from '@/components/motion'

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    service: '',
    date: '',
    message: '',
  })

  const services = [
    'Cosmetic & Aesthetic Dentistry',
    'Crowns, Bridges & Veneers',
    'Dental Fillings',
    'Endodontics (Root Canals)',
    'Extractions',
    'Implantology & Prosthodontics',
    'Oral & Maxillofacial Surgery',
    'Orthodontics',
    'Periodontics & Cleaning',
    'Professional Teeth Whitening',
    'Protective & Functional Devices',
    'Smile Makeovers',
    'Pediatric Dentistry',
    'Special Needs & Geriatric',
  ]

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Form submitted:', formData)
  }

  const emergencyNumber = '081 207 8621'
  const emergencyHref = 'tel:0812078621'
  const whatsappHref = 'https://wa.me/27812078621'
  const directionsHref = 'https://www.google.com/maps/search/?api=1&query=26+Mackeurtan+Avenue+Durban+North+4051'
  const contactEmail = 'info@crowndental.com'

  const inputClass = "w-full px-4 py-3.5 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-400/60 transition-all"
  const inputStyle = { background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)' }

  return (
    <main className="overflow-hidden">

      {/* ─── HERO ─────────────────────────────────────────────────── */}
      <section className="relative min-h-[50vh] flex items-end pb-16 bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-500 overflow-hidden pt-28">
        <FloatingBlob className="absolute top-10 right-20 w-80 h-80 bg-cyan-400/20 rounded-full blur-3xl pointer-events-none" />
        <FloatingBlobAlt className="absolute bottom-0 left-10 w-64 h-64 bg-blue-300/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <HeroText>
<h1 className="text-6xl md:text-7xl font-bold text-white leading-tight">
              Get In Touch &<br />
              <span className="gradient-text">Book a Visit</span>
            </h1>
            <p className="text-xl text-white/75 mt-4 max-w-xl">
              Ready to start your smile journey? We'd love to hear from you.
            </p>
          </HeroText>
        </div>
      </section>

      {/* ─── CONTACT INFO CARDS ───────────────────────────────────── */}
      <section className="relative py-12 bg-gradient-to-b from-blue-900 to-blue-800 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { Icon: Phone, label: 'Emergency Call', value: emergencyNumber, href: emergencyHref, gradient: 'from-blue-400 to-cyan-500' },
              { Icon: Mail, label: 'Email Us', value: contactEmail, href: `mailto:${contactEmail}`, gradient: 'from-cyan-400 to-teal-500' },
              { Icon: MapPin, label: 'Get Directions', value: '26 Mackeurtan Avenue', href: directionsHref, gradient: 'from-indigo-400 to-blue-500' },
              { Icon: Clock, label: 'Availability', value: '24-hour on-call service', href: emergencyHref, gradient: 'from-blue-400 to-indigo-500' },
            ].map(({ Icon, label, value, href, gradient }, i) => (
              <StaggerItem key={i}>
                <a href={href} className="group glass-heavy rounded-2xl p-5 flex flex-col items-center text-center hover:bg-white/25 transition-all hover:-translate-y-1 block">
                  <div className={`w-11 h-11 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-lg`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-1">{label}</p>
                  <p className="text-white font-bold text-sm">{value}</p>
                </a>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* ─── FORM + DETAILS ───────────────────────────────────────── */}
      <section className="relative py-28 bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-500 overflow-hidden">
        <FloatingBlob className="absolute top-20 right-10 w-72 h-72 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <FloatingBlobAlt className="absolute bottom-20 left-10 w-64 h-64 bg-cyan-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">

            {/* ── Form ── */}
            <FadeInLeft>
              <div className="glass-heavy rounded-3xl p-8 md:p-10">
                <h2 className="text-3xl font-bold text-white mb-2">Send Us a Message</h2>
                <p className="text-white/60 mb-8">Fill in the form below and we'll get back to you shortly.</p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-white/80 mb-2">Full Name</label>
                      <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Your name" className={inputClass} style={inputStyle} required />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-white/80 mb-2">Phone Number</label>
                      <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="081 000 0000" className={inputClass} style={inputStyle} required />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-white/80 mb-2">Email Address</label>
                    <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="your@email.com" className={inputClass} style={inputStyle} required />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-white/80 mb-2">Service Interested In</label>
                      <select name="service" value={formData.service} onChange={handleChange} className={`${inputClass} [&>option]:bg-blue-900 [&>option]:text-white`} style={inputStyle} required>
                        <option value="">Select a service</option>
                        {services.map((service) => (
                          <option key={service} value={service}>{service}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-white/80 mb-2">Preferred Date</label>
                      <input type="date" name="date" value={formData.date} onChange={handleChange} className={`${inputClass} [color-scheme:dark]`} style={inputStyle} required />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-white/80 mb-2">Message</label>
                    <textarea name="message" value={formData.message} onChange={handleChange} rows={4} placeholder="Tell us about your needs..." className={inputClass} style={inputStyle} required />
                  </div>

                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-bold text-blue-800 hover:shadow-2xl hover:scale-[1.02] transition-all text-lg bg-white"
                  >
                    <Send className="w-5 h-5" />
                    Send Message
                  </button>
                </form>
              </div>
            </FadeInLeft>

            {/* ── Contact Details ── */}
            <FadeInRight>
              <div className="space-y-6">
                <div className="glass-heavy rounded-3xl p-8">
                  <h2 className="text-2xl font-bold text-white mb-6">Practice Details</h2>
                  <div className="space-y-4">
                    {[
                      { Icon: Phone, title: 'Emergency Line', content: <a href={emergencyHref} className="text-cyan-300 font-bold hover:text-cyan-200 transition">{emergencyNumber}</a>, gradient: 'from-blue-400 to-cyan-500' },
                      { Icon: Mail, title: 'Email', content: <a href={`mailto:${contactEmail}`} className="text-cyan-300 font-bold hover:text-cyan-200 transition break-all">{contactEmail}</a>, gradient: 'from-cyan-400 to-teal-500' },
                      { Icon: MapPin, title: 'Address', content: <span className="text-white/75">26 Mackeurtan Avenue<br />Durban North, SA, 4051</span>, gradient: 'from-indigo-400 to-blue-500' },
                      { Icon: Clock, title: 'Availability', content: <span className="text-white/75">Open by appointment<br />24-hour on-call service</span>, gradient: 'from-blue-400 to-indigo-500' },
                    ].map(({ Icon, title, content, gradient }, i) => (
                      <div key={i} className="glass rounded-xl p-4 flex gap-4 hover:bg-white/15 transition-all">
                        <div className={`w-10 h-10 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center flex-shrink-0 shadow-md`}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-white/60 text-xs font-bold uppercase tracking-wider mb-1">{title}</p>
                          <div className="text-sm">{content}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <a
                      href={emergencyHref}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-blue-800 transition-all hover:scale-[1.02]"
                    >
                      <Phone className="w-4 h-4" />
                      Call Emergency
                    </a>
                    <a
                      href={whatsappHref}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-bold text-white transition-all hover:bg-white/15"
                    >
                      <MessageCircle className="w-4 h-4" />
                      WhatsApp
                    </a>
                    <a
                      href={directionsHref}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-bold text-white transition-all hover:bg-white/15"
                    >
                      <Navigation className="w-4 h-4" />
                      Get Directions
                    </a>
                  </div>
                </div>

                <div className="glass-heavy rounded-3xl p-7">
                  <p className="text-white font-bold text-lg mb-2">Follow @drfamod</p>
                  <p className="text-white/60 text-sm mb-4">Find us on TikTok, Facebook, Instagram, Twitter, and LinkedIn.</p>
                  <div className="flex flex-wrap gap-2">
                    {['TikTok', 'Facebook', 'Instagram', 'Twitter', 'LinkedIn'].map((platform) => (
                      <span key={platform} className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-sm font-semibold text-white">
                        {platform}: @drfamod
                      </span>
                    ))}
                  </div>
                </div>

                {/* Map */}
                <a
                  href={directionsHref}
                  target="_blank"
                  rel="noreferrer"
                  className="relative block h-52 rounded-3xl overflow-hidden glass-heavy"
                  style={{ border: '1px solid rgba(255,255,255,0.2)' }}
                >
                  <Image src="/contact-map.jpg" alt="Office location" fill className="object-cover opacity-70" />
                  <div className="absolute inset-0 bg-gradient-to-t from-blue-900/60 to-transparent" />
                  <div className="absolute bottom-5 left-5 glass rounded-xl px-4 py-2">
                    <p className="text-white font-bold text-sm">26 Mackeurtan Avenue</p>
                    <p className="text-white/70 text-xs">Durban North, SA 4051</p>
                    <p className="mt-1 text-cyan-300 text-xs font-semibold">Tap for directions</p>
                  </div>
                </a>

                {/* Patient Login */}
                <div className="glass-heavy rounded-3xl p-7 text-center">
                  <p className="text-white font-bold text-lg mb-2">Existing Patient?</p>
                  <p className="text-white/60 text-sm mb-4">Log in to manage your appointments and records.</p>
                  <Link href="/auth/login" className="inline-flex items-center gap-2 text-cyan-300 font-bold hover:text-cyan-200 transition group">
                    Patient Login
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            </FadeInRight>
          </div>
        </div>
      </section>
    </main>
  )
}
