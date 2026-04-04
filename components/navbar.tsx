'use client'

import Link from 'next/link'
import { Menu, X, ChevronDown, Phone } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Logo } from './logo'

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [servicesOpen, setServicesOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const services = [
    { name: 'Cosmetic & Aesthetic Dentistry', slug: 'cosmetic-aesthetic-dentistry' },
    { name: 'Crowns, Bridges & Veneers', slug: 'crowns-bridges-veneers' },
    { name: 'Dental Fillings', slug: 'dental-fillings' },
    { name: 'Endodontics (Root Canals)', slug: 'endodontics-root-canals' },
    { name: 'Extractions', slug: 'extractions' },
    { name: 'Implantology & Prosthodontics', slug: 'implantology-prosthodontics' },
    { name: 'Oral & Maxillofacial Surgery', slug: 'oral-maxillofacial-surgery' },
    { name: 'Orthodontics', slug: 'orthodontics' },
    { name: 'Periodontics & Cleaning', slug: 'periodontics-cleaning' },
    { name: 'Professional Teeth Whitening', slug: 'teeth-whitening' },
    { name: 'Protective & Functional Devices', slug: 'protective-functional-devices' },
    { name: 'Smile Makeovers', slug: 'smile-makeovers' },
    { name: 'Pediatric Dentistry', slug: 'pediatric-dentistry' },
    { name: 'Special Needs & Geriatric', slug: 'special-needs-geriatric' },
  ]

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        mounted ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
      } ${
        scrolled
          ? 'bg-white/90 backdrop-blur-2xl shadow-lg shadow-blue-500/10 border-b border-blue-100/50'
          : 'bg-white/10 backdrop-blur-xl border-b border-white/20'
      }`}
      style={{ transitionProperty: 'background-color, border-color, box-shadow, opacity, transform' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-3 min-h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <Logo variant="full" />
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-1 ml-8">
            {[
              { href: '/', label: 'Home' },
              { href: '/about', label: 'About' },
              { href: '/blog', label: 'Blog' },
              { href: '/contact', label: 'Contact' },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                  scrolled
                    ? 'text-gray-700 hover:text-blue-600 hover:bg-blue-50'
                    : 'text-white/90 hover:text-white hover:bg-white/15'
                }`}
              >
                {label}
              </Link>
            ))}

            {/* Services Dropdown */}
            <div className="relative group">
              <button
                className={`px-4 py-2 text-sm font-semibold flex items-center gap-1 rounded-lg transition-all duration-200 ${
                  scrolled
                    ? 'text-gray-700 hover:text-blue-600 hover:bg-blue-50'
                    : 'text-white/90 hover:text-white hover:bg-white/15'
                }`}
              >
                Services
                <ChevronDown className="w-4 h-4 transition-transform group-hover:rotate-180 duration-300" />
              </button>
              <div
                className="absolute left-0 top-full mt-2 w-64 rounded-2xl shadow-2xl shadow-blue-500/20 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(20px)', border: '1px solid rgba(147,197,253,0.4)' }}
              >
                <div className="p-2">
                  {services.map((service) => (
                    <Link
                      key={service.slug}
                      href={`/services/${service.slug}`}
                      className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all"
                    >
                      {service.name}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <a
              href="tel:0812078621"
              className={`hidden lg:flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl transition-all ${
                scrolled ? 'text-blue-600 hover:bg-blue-50' : 'text-white/90 hover:text-white hover:bg-white/15'
              }`}
            >
              <Phone className="w-4 h-4" />
              081 207 8621
            </a>
            <Link
              href="/auth/login"
              className={`px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
                scrolled
                  ? 'border-blue-600 text-blue-600 hover:bg-blue-50'
                  : 'border-white/50 text-white hover:bg-white/15'
              }`}
            >
              Login
            </Link>
            <Link
              href="/contact"
              className="relative overflow-hidden px-5 py-2 rounded-xl text-sm font-bold text-white transition-all hover:scale-105 hover:shadow-lg hover:shadow-blue-500/30"
              style={{ background: 'linear-gradient(135deg, #2563eb, #0891b2)' }}
            >
              Book Appointment
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className={`md:hidden p-2 rounded-lg transition-colors ${
              scrolled ? 'text-gray-700 hover:bg-gray-100' : 'text-white hover:bg-white/15'
            }`}
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        <div
          className={`md:hidden overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}
        >
          <div
            className="py-4 space-y-1 rounded-2xl mb-4 p-4"
            style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(20px)', border: '1px solid rgba(147,197,253,0.3)' }}
          >
            {[
              { href: '/', label: 'Home' },
              { href: '/about', label: 'About' },
            ].map(({ href, label }) => (
              <Link key={href} href={href} className="block px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition">
                {label}
              </Link>
            ))}

            <button
              onClick={() => setServicesOpen(!servicesOpen)}
              className="w-full text-left px-4 py-3 text-sm font-semibold text-gray-700 hover:text-blue-600 flex items-center justify-between hover:bg-blue-50 rounded-xl transition"
            >
              Services
              <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${servicesOpen ? 'rotate-180' : ''}`} />
            </button>
            <div className={`pl-4 space-y-1 overflow-hidden transition-all duration-300 ${servicesOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
              {services.map((service) => (
                <Link key={service.slug} href={`/services/${service.slug}`} className="block px-4 py-2 text-xs text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition">
                  {service.name}
                </Link>
              ))}
            </div>

            {[
              { href: '/blog', label: 'Blog' },
              { href: '/contact', label: 'Contact' },
            ].map(({ href, label }) => (
              <Link key={href} href={href} className="block px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition">
                {label}
              </Link>
            ))}

            <div className="border-t border-blue-100 pt-3 mt-3 space-y-2">
              <Link href="/auth/login" className="block px-4 py-3 text-sm font-bold text-blue-600 border-2 border-blue-200 rounded-xl text-center hover:bg-blue-50 transition">Login</Link>
              <Link href="/contact" className="block px-4 py-3 text-sm font-bold text-white rounded-xl text-center hover:opacity-90 transition" style={{ background: 'linear-gradient(135deg, #2563eb, #0891b2)' }}>
                Book Appointment
              </Link>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
