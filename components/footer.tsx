'use client'

import Link from 'next/link'
import { Facebook, Instagram, Linkedin, Phone, Mail, MapPin, ArrowRight } from 'lucide-react'
import { Logo } from './logo'
import { FadeInUp, StaggerContainer, StaggerItem } from './motion'

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M14.5 3c.4 1.9 1.5 3.3 3.5 3.8V9a6.5 6.5 0 0 1-3.5-1v6.7a5.7 5.7 0 1 1-5.7-5.7c.3 0 .7 0 1 .1v2.4a3.2 3.2 0 1 0 2.3 3.1V3h2.4Z" />
    </svg>
  )
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M18.9 2H22l-6.8 7.8L23 22h-6.1l-4.8-6.3L6.6 22H3.5l7.2-8.2L1 2h6.3l4.3 5.8L18.9 2Zm-1.1 18h1.7L6.4 3.9H4.6L17.8 20Z" />
    </svg>
  )
}

export function Footer() {
  const directionsHref = 'https://www.google.com/maps/search/?api=1&query=26+Mackeurtan+Avenue+Durban+North+4051'
  const keyServices = [
    { name: 'Cosmetic & Aesthetic Dentistry', slug: 'cosmetic-aesthetic-dentistry' },
    { name: 'Dental Implants', slug: 'implantology-prosthodontics' },
    { name: 'Orthodontics', slug: 'orthodontics' },
    { name: 'Root Canal Therapy', slug: 'endodontics-root-canals' },
    { name: 'Teeth Whitening', slug: 'teeth-whitening' },
    { name: 'Pediatric Dentistry', slug: 'pediatric-dentistry' },
  ]

  return (
    <footer className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 40%, #0891b2 100%)' }}>
      {/* Background blobs */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-cyan-400/10 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-blue-300/10 rounded-full translate-x-1/3 translate-y-1/3 blur-3xl pointer-events-none" />

      {/* CTA Strip */}
      <div className="relative border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <FadeInUp className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <p className="text-cyan-300 text-sm font-bold uppercase tracking-widest mb-1">Ready to transform your smile?</p>
              <h3 className="text-3xl font-bold text-white">Book Your Appointment Today</h3>
            </div>
            <Link
              href="/contact"
              className="group flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-blue-700 transition-all hover:scale-105 hover:shadow-2xl"
              style={{ background: 'rgba(255,255,255,0.95)' }}
            >
              Book Appointment
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </FadeInUp>
        </div>
      </div>

      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <StaggerItem>
            <div className="glass rounded-2xl p-6 space-y-4">
              <Logo variant="text" className="w-36" />
              <p className="text-sm text-white/75 leading-relaxed">
                Protecting your oral health with exceptional dental care and 24-hour on-call support when urgent care is needed.
              </p>
              <div className="flex gap-3">
                {[
                  { Icon: Facebook, href: 'https://facebook.com/drfamod' },
                  { Icon: Instagram, href: 'https://instagram.com/drfamod' },
                  { Icon: TikTokIcon, href: 'https://tiktok.com/@drfamod' },
                  { Icon: XIcon, href: 'https://x.com/drfamod' },
                  { Icon: Linkedin, href: 'https://linkedin.com/in/drfamod' },
                ].map(({ Icon, href }, i) => (
                  <a
                    key={i}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-white/70 hover:text-cyan-300 hover:bg-white/10 transition-all"
                  >
                    <Icon className="w-4 h-4" />
                  </a>
                ))}
              </div>
            </div>
          </StaggerItem>

          {/* Quick Links */}
          <StaggerItem>
            <h4 className="font-bold text-lg mb-5 text-cyan-300 tracking-wide">Quick Links</h4>
            <ul className="space-y-3">
              {[
                { label: 'Home', href: '/' },
                { label: 'About', href: '/about' },
                { label: 'Services', href: '/services' },
                { label: 'Blog', href: '/blog' },
                { label: 'Contact', href: '/contact' },
              ].map(({ label, href }) => (
                <li key={href}>
                  <Link href={href} className="group flex items-center gap-2 text-sm text-white/75 hover:text-cyan-300 transition-colors">
                    <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </StaggerItem>

          {/* Services */}
          <StaggerItem>
            <h4 className="font-bold text-lg mb-5 text-cyan-300 tracking-wide">Services</h4>
            <ul className="space-y-3">
              {keyServices.map((service) => (
                <li key={service.slug}>
                  <Link href={`/services/${service.slug}`} className="group flex items-center gap-2 text-sm text-white/75 hover:text-cyan-300 transition-colors">
                    <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                    {service.name}
                  </Link>
                </li>
              ))}
            </ul>
          </StaggerItem>

          {/* Contact */}
          <StaggerItem>
            <h4 className="font-bold text-lg mb-5 text-cyan-300 tracking-wide">Contact Us</h4>
            <div className="space-y-4">
              {[
                { Icon: Phone, content: <a href="tel:0812078621" className="text-white hover:text-cyan-100 transition">081 207 8621</a> },
                { Icon: Mail, content: <a href="mailto:info@crowndental.com" className="text-white hover:text-cyan-100 transition break-all">info@crowndental.com</a> },
                { Icon: MapPin, content: <a href={directionsHref} target="_blank" rel="noreferrer" className="text-white hover:text-cyan-100 transition">26 Mackeurtan Avenue<br />Durban North, SA, 4051</a> },
              ].map(({ Icon, content }, i) => (
                <div key={i} className="glass-light rounded-xl p-3 flex items-start gap-3">
                  <Icon className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-white/80">{content}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-white/60 mt-3">Open by appointment with 24-hour on-call service for urgent needs.</p>
          </StaggerItem>
        </StaggerContainer>

        {/* Bottom Bar */}
        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-white/60 gap-4">
          <p>© 2025 Crown Dental Studio. All rights reserved.</p>
          <div className="flex items-center gap-2">
            <span>Existing patient?</span>
            <Link href="/auth/login" className="text-cyan-400 hover:text-cyan-300 font-bold transition-colors">Patient Login →</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
