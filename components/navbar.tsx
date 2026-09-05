'use client'

import Link from 'next/link'
import { Menu, X, ChevronDown, Phone } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Logo } from './logo'

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

const primaryLinks = [
  { href: '/about', label: 'About' },
  { href: '/blog', label: 'Blog' },
  { href: '/contact', label: 'Contact' },
]

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [servicesOpen, setServicesOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Over the dark hero the bar is transparent with white type; once scrolled it becomes a solid cream bar.
  const solid = scrolled || isOpen
  const text = solid ? 'text-ink' : 'text-white'
  const linkClass = `px-3.5 py-2 text-[14px] font-medium rounded-full transition-colors ${
    solid ? 'text-ink/80 hover:text-ink hover:bg-ink/5' : 'text-white/85 hover:text-white hover:bg-white/10'
  }`

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-[background-color,border-color,box-shadow] duration-500 ${
        solid ? 'bg-cream/95 backdrop-blur-md border-b border-hairline shadow-[0_10px_30px_-24px_rgba(11,31,58,0.35)]' : 'bg-transparent border-b border-transparent'
      }`}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" aria-label="Main">
        <div className="flex items-center justify-between h-20">
          <Link href="/" className="flex items-center gap-3" aria-label="Crown Dental Studio home">
            <Logo variant="icon" className={`h-9 w-auto transition-[filter] duration-500 ${solid ? '' : 'brightness-0 invert'}`} />
            <span className={`font-display text-[19px] sm:text-[22px] leading-none font-medium ${text}`}>Crown Dental Studio</span>
          </Link>

          {/* Desktop */}
          <div className="hidden md:flex items-center gap-1">
            <div className="relative group">
              <button className={`${linkClass} inline-flex items-center gap-1`} aria-haspopup="true">
                Treatments
                <ChevronDown className="w-4 h-4 transition-transform duration-300 group-hover:rotate-180" />
              </button>
              <div className="absolute left-0 top-full pt-3 w-72 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <div className="bg-white border border-hairline shadow-[0_24px_60px_-30px_rgba(11,31,58,0.35)] p-2">
                  {services.map((service) => (
                    <Link
                      key={service.slug}
                      href={`/services/${service.slug}`}
                      className="block px-4 py-2.5 text-[14px] text-ink/80 hover:text-ink hover:bg-cream transition-colors"
                    >
                      {service.name}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
            {primaryLinks.map(({ href, label }) => (
              <Link key={href} href={href} className={linkClass}>{label}</Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-5">
            <a href="tel:0812078621" className={`hidden lg:inline-flex items-center gap-2 text-[14px] font-semibold ${text} hover:text-teal transition-colors`}>
              <Phone className="w-4 h-4" />
              081 207 8621
            </a>
            <Link href="/auth/login" className={`text-[14px] font-medium ${solid ? 'text-ink/70 hover:text-ink' : 'text-white/80 hover:text-white'} transition-colors`}>
              Login
            </Link>
            <Link
              href="/contact"
              className={`inline-flex items-center h-11 px-5 rounded-full text-[14px] font-semibold transition-colors ${
                solid ? 'bg-navy-800 text-white hover:bg-ink' : 'bg-white text-navy-800 hover:bg-cream'
              }`}
            >
              Book an appointment
            </Link>
          </div>

          <button
            className={`md:hidden p-2 rounded-full ${solid ? 'text-ink hover:bg-ink/5' : 'text-white hover:bg-white/10'}`}
            onClick={() => setIsOpen(!isOpen)}
            aria-expanded={isOpen}
            aria-label={isOpen ? 'Close menu' : 'Open menu'}
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile */}
        <div className={`md:hidden overflow-hidden transition-[max-height,opacity] duration-300 ${isOpen ? 'max-h-[720px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="pb-6 pt-2 space-y-1">
            <button
              onClick={() => setServicesOpen(!servicesOpen)}
              className="w-full flex items-center justify-between px-3 py-3 text-[15px] font-medium text-ink"
              aria-expanded={servicesOpen}
            >
              Treatments
              <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${servicesOpen ? 'rotate-180' : ''}`} />
            </button>
            <div className={`pl-3 overflow-hidden transition-[max-height,opacity] duration-300 ${servicesOpen ? 'max-h-[520px] opacity-100' : 'max-h-0 opacity-0'}`}>
              {services.map((service) => (
                <Link key={service.slug} href={`/services/${service.slug}`} className="block px-3 py-2 text-[14px] text-ink/75 hover:text-ink">
                  {service.name}
                </Link>
              ))}
            </div>
            {primaryLinks.map(({ href, label }) => (
              <Link key={href} href={href} className="block px-3 py-3 text-[15px] font-medium text-ink">{label}</Link>
            ))}
            <div className="border-t border-hairline pt-4 mt-3 space-y-3">
              <a href="tel:0812078621" className="flex items-center gap-2 px-3 text-[15px] font-semibold text-ink"><Phone className="w-4 h-4" /> 081 207 8621</a>
              <Link href="/contact" className="flex items-center justify-center h-12 rounded-full bg-navy-800 text-white text-[15px] font-semibold">Book an appointment</Link>
              <Link href="/auth/login" className="block text-center text-[14px] font-medium text-ink/70">Patient login</Link>
            </div>
          </div>
        </div>
      </nav>
    </header>
  )
}
