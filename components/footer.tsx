import Link from 'next/link'
import { Facebook, Instagram, Linkedin, Phone, Mail, MapPin } from 'lucide-react'
import { Logo } from './logo'

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

const directionsHref = 'https://www.google.com/maps/search/?api=1&query=26+Mackeurtan+Avenue+Durban+North+4051'

const keyServices = [
  { name: 'Cosmetic & Aesthetic Dentistry', slug: 'cosmetic-aesthetic-dentistry' },
  { name: 'Dental Implants', slug: 'implantology-prosthodontics' },
  { name: 'Orthodontics', slug: 'orthodontics' },
  { name: 'Root Canal Therapy', slug: 'endodontics-root-canals' },
  { name: 'Teeth Whitening', slug: 'teeth-whitening' },
  { name: 'Pediatric Dentistry', slug: 'pediatric-dentistry' },
]

const quickLinks = [
  { label: 'Home', href: '/' },
  { label: 'About', href: '/about' },
  { label: 'Treatments', href: '/services' },
  { label: 'Blog', href: '/blog' },
  { label: 'Contact', href: '/contact' },
]

const socials = [
  { Icon: Facebook, href: 'https://facebook.com/drfamod', label: 'Facebook' },
  { Icon: Instagram, href: 'https://instagram.com/drfamod', label: 'Instagram' },
  { Icon: TikTokIcon, href: 'https://tiktok.com/@drfamod', label: 'TikTok' },
  { Icon: XIcon, href: 'https://x.com/drfamod', label: 'X' },
  { Icon: Linkedin, href: 'https://linkedin.com/in/drfamod', label: 'LinkedIn' },
]

const heading = 'text-[12px] font-semibold uppercase tracking-[0.18em] text-ink mb-4'
const link = 'text-[14px] text-muted-ink hover:text-ink transition-colors'

export function Footer() {
  return (
    <footer className="bg-cream border-t border-hairline">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr] gap-10 lg:gap-12">
          <div>
            <div className="flex items-center gap-3">
              <Logo variant="icon" className="h-8 w-auto" />
              <span className="font-display text-[20px] font-medium text-ink">Crown Dental Studio</span>
            </div>
            <p className="mt-4 max-w-[320px] text-[14px] leading-relaxed text-muted-ink">
              Family and cosmetic dentistry in Durban North, with a 24-hour on-call line when urgent care is needed.
            </p>
            <div className="flex gap-2 mt-5">
              {socials.map(({ Icon, href, label }) => (
                <a key={label} href={href} target="_blank" rel="noreferrer" aria-label={label}
                  className="w-9 h-9 rounded-full border border-hairline flex items-center justify-center text-muted-ink hover:text-ink hover:border-ink transition-colors">
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <p className={heading}>Practice</p>
            <ul className="space-y-2.5">
              {quickLinks.map(({ label, href }) => (
                <li key={href}><Link href={href} className={link}>{label}</Link></li>
              ))}
            </ul>
          </div>

          <div>
            <p className={heading}>Treatments</p>
            <ul className="space-y-2.5">
              {keyServices.map((service) => (
                <li key={service.slug}><Link href={`/services/${service.slug}`} className={link}>{service.name}</Link></li>
              ))}
            </ul>
          </div>

          <div>
            <p className={heading}>Contact</p>
            <ul className="space-y-3 text-[14px] text-muted-ink">
              <li className="flex items-start gap-2.5"><Phone className="w-4 h-4 mt-0.5 text-teal flex-shrink-0" /><a href="tel:0812078621" className="text-ink hover:text-teal">081 207 8621</a></li>
              <li className="flex items-start gap-2.5"><Mail className="w-4 h-4 mt-0.5 text-teal flex-shrink-0" /><a href="mailto:info@crowndental.com" className="text-ink hover:text-teal break-all">info@crowndental.com</a></li>
              <li className="flex items-start gap-2.5"><MapPin className="w-4 h-4 mt-0.5 text-teal flex-shrink-0" /><a href={directionsHref} target="_blank" rel="noreferrer" className="text-ink hover:text-teal">26 Mackeurtan Avenue<br />Durban North, 4051</a></li>
            </ul>
            <p className="mt-4 text-[12px] leading-relaxed text-muted-ink">Open by appointment, with a 24-hour on-call service for urgent needs.</p>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-hairline flex flex-col md:flex-row items-center justify-between gap-3 text-[12px] text-muted-ink">
          <p>© {new Date().getFullYear()} Crown Dental Studio. All rights reserved.</p>
          <p>Existing patient? <Link href="/auth/login" className="font-semibold text-ink hover:text-teal">Patient login →</Link></p>
        </div>
      </div>
    </footer>
  )
}
