import Link from 'next/link'
import Image from 'next/image'
import type { ReactNode } from 'react'
import { ArrowRight, Phone } from 'lucide-react'
import { FadeInUp, FadeUp, KenBurns, RevealLines } from '@/components/motion'

export const PHONE_DISPLAY = '081 207 8621'
export const PHONE_HREF = 'tel:0812078621'
export const WHATSAPP_HREF = 'https://wa.me/27812078621'
export const CONTACT_EMAIL = 'info@crowndental.com'
export const DIRECTIONS_HREF = 'https://www.google.com/maps/search/?api=1&query=26+Mackeurtan+Avenue+Durban+North+4051'

export const btn = {
  light: 'inline-flex items-center justify-center gap-2.5 h-[52px] px-7 rounded-full bg-white text-navy-800 font-semibold text-[15px] hover:bg-cream transition-colors',
  ghostOnDark: 'inline-flex items-center justify-center gap-2.5 h-[52px] px-7 rounded-full border border-white/35 text-white font-semibold text-[15px] hover:border-white hover:text-white transition-colors',
  navy: 'inline-flex items-center justify-center gap-2.5 h-[52px] px-7 rounded-full bg-navy-800 text-white font-semibold text-[15px] hover:bg-ink hover:text-white transition-colors',
  ghost: 'inline-flex items-center justify-center gap-2.5 h-[52px] px-7 rounded-full border border-hairline text-ink font-semibold text-[15px] hover:border-ink hover:text-ink transition-colors',
}

export function Eyebrow({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <p className={`text-[12px] font-semibold uppercase tracking-[0.18em] text-teal ${className}`}>{children}</p>
}

export function Arrow({ className = '' }: { className?: string }) {
  return <ArrowRight className={`w-[18px] h-[18px] transition-transform group-hover:translate-x-1 ${className}`} />
}

export function SectionTitle({ eyebrow, title, className = '', light = false }: { eyebrow: string; title: ReactNode; className?: string; light?: boolean }) {
  return (
    <div className={className}>
      <Eyebrow className={light ? 'text-teal-light' : ''}>{eyebrow}</Eyebrow>
      <h2 className={`font-display font-medium text-[34px] sm:text-5xl lg:text-[56px] leading-[1.05] mt-4 ${light ? 'text-white' : 'text-ink'}`}>{title}</h2>
    </div>
  )
}

/** Inner-page hero: optional full-bleed photo with the slow zoom, scrim, eyebrow, revealed serif title. */
export function PageHero({
  eyebrow,
  lines,
  intro,
  image,
  imageAlt = '',
  children,
}: {
  eyebrow: string
  lines: ReactNode[]
  intro?: string
  image?: string
  imageAlt?: string
  children?: ReactNode
}) {
  return (
    <section className="relative overflow-hidden bg-ink">
      {image && (
        <>
          <KenBurns className="absolute inset-0">
            <Image src={image} alt={imageAlt} fill priority sizes="100vw" className="object-cover" />
          </KenBurns>
          <div className="absolute inset-0 bg-gradient-to-r from-ink/85 via-ink/60 to-ink/25" aria-hidden="true" />
          <div className="absolute inset-0 bg-gradient-to-b from-ink/30 via-transparent to-ink/60" aria-hidden="true" />
          <div className="absolute inset-0 bg-ink/40 sm:hidden" aria-hidden="true" />
        </>
      )}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-14 sm:pt-40 sm:pb-20 lg:pt-48 lg:pb-24">
        <FadeUp delay={0}>
          <Eyebrow className="text-teal-light mb-5">{eyebrow}</Eyebrow>
        </FadeUp>
        <RevealLines
          as="h1"
          className="font-display font-medium text-white text-[40px] sm:text-[56px] lg:text-[72px] leading-[1.02] tracking-tight max-w-[820px]"
          lines={lines}
        />
        {intro && (
          <FadeUp delay={550}>
            <p className="mt-6 max-w-[560px] text-base sm:text-lg leading-relaxed text-white/80">{intro}</p>
          </FadeUp>
        )}
        {children && <FadeUp delay={750}><div className="mt-8">{children}</div></FadeUp>}
      </div>
    </section>
  )
}

/** Closing navy band shared by the inner pages. */
export function CtaBand({ title = 'Ready for a healthier smile?', copy = 'Book online in a minute, or call us and we’ll find a time that suits you.' }: { title?: string; copy?: string }) {
  return (
    <section className="relative z-10 bg-ink text-white py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-24 items-center">
        <FadeInUp className="lg:col-span-7">
          <h2 className="font-display font-medium text-white text-[36px] sm:text-5xl lg:text-[64px] leading-[1.02] mb-5">{title}</h2>
          <p className="text-[17px] leading-relaxed text-white/75 max-w-[520px] mb-9">{copy}</p>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <Link href="/contact" className={btn.light}>Book an appointment</Link>
            <a href={PHONE_HREF} className={btn.ghostOnDark}><Phone className="w-[18px] h-[18px]" /> Call {PHONE_DISPLAY}</a>
          </div>
        </FadeInUp>
        <FadeInUp delay={0.15} className="lg:col-span-5 lg:border-l lg:border-white/20 lg:pl-12 flex flex-col gap-6">
          <div><Eyebrow className="text-teal-light">Visit us</Eyebrow><p className="mt-2 text-base leading-relaxed text-white/85">26 Mackeurtan Avenue<br />Durban North</p></div>
          <div><Eyebrow className="text-teal-light">Emergencies</Eyebrow><p className="mt-2 text-base leading-relaxed text-white/85">24-hour on-call line · <a href={PHONE_HREF} className="text-white hover:text-teal-light">{PHONE_DISPLAY}</a></p></div>
        </FadeInUp>
      </div>
    </section>
  )
}
