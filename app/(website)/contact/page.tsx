'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { Phone, Mail, MapPin, Clock, MessageCircle, Navigation } from 'lucide-react'
import { FadeInUp, FadeUp, RevealLines, StaggerContainer, StaggerItem } from '@/components/motion'
import { Arrow, Eyebrow, btn, CONTACT_EMAIL, DIRECTIONS_HREF, PHONE_DISPLAY, PHONE_HREF, WHATSAPP_HREF } from '@/components/website/primitives'

const services = [
  'Cosmetic & Aesthetic Dentistry', 'Crowns, Bridges & Veneers', 'Dental Fillings', 'Endodontics (Root Canals)', 'Extractions',
  'Implantology & Prosthodontics', 'Oral & Maxillofacial Surgery', 'Orthodontics', 'Periodontics & Cleaning', 'Professional Teeth Whitening',
  'Protective & Functional Devices', 'Smile Makeovers', 'Pediatric Dentistry', 'Special Needs & Geriatric',
]

const details = [
  { Icon: Phone, label: 'Emergency line', value: PHONE_DISPLAY, href: PHONE_HREF },
  { Icon: Mail, label: 'Email', value: CONTACT_EMAIL, href: `mailto:${CONTACT_EMAIL}` },
  { Icon: MapPin, label: 'Address', value: '26 Mackeurtan Avenue, Durban North, 4051', href: DIRECTIONS_HREF },
  { Icon: Clock, label: 'Availability', value: 'By appointment · 24-hour on-call service', href: PHONE_HREF },
]

const input = 'w-full h-12 px-4 bg-white border border-hairline text-ink placeholder:text-muted-ink/70 focus:outline-none focus:border-teal focus:ring-2 focus:ring-teal/20 transition-colors'
const label = 'block text-[12px] font-semibold uppercase tracking-[0.14em] text-muted-ink mb-2'

type Status = 'idle' | 'sending' | 'sent' | 'error'

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', service: '', date: '', message: '', company: '' })
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value })

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('sending')
    setError(null)
    try {
      const res = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload.error || 'Something went wrong')
      setStatus('sent')
      setForm({ name: '', email: '', phone: '', service: '', date: '', message: '', company: '' })
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  return (
    <main className="overflow-x-clip bg-cream">
      {/* Hero (navy band) */}
      <section className="bg-ink">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-14 sm:pt-40 sm:pb-20 lg:pt-48 lg:pb-24">
          <FadeUp delay={0}><Eyebrow className="text-teal-light mb-5">Contact · Durban North</Eyebrow></FadeUp>
          <RevealLines as="h1" className="font-display font-medium text-white text-[40px] sm:text-[56px] lg:text-[72px] leading-[1.02] tracking-tight max-w-[820px]"
            lines={['Get in touch, or', <><em className="italic font-normal text-[#CFEDED]">book</em> a visit.</>]} />
          <FadeUp delay={550}><p className="mt-6 max-w-[560px] text-base sm:text-lg leading-relaxed text-white/80">We’d love to hear from you. Send a message below, call, or WhatsApp us — whichever is easiest.</p></FadeUp>
        </div>
      </section>

      {/* Details strip */}
      <section className="bg-white border-b border-hairline">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {details.map(({ Icon, label: l, value, href }, i) => (
              <StaggerItem key={l} className={`py-7 ${i < 3 ? 'sm:border-r border-hairline' : ''} ${i % 2 === 0 ? 'sm:pr-6' : 'sm:pl-6'} ${i < 2 ? 'border-b lg:border-b-0' : ''} ${i === 1 ? 'sm:border-r-0 lg:border-r' : ''} ${i === 2 ? 'lg:pl-6' : ''}`}>
                <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel={href.startsWith('http') ? 'noreferrer' : undefined} className="flex items-start gap-3 text-ink hover:text-teal">
                  <Icon className="w-5 h-5 mt-0.5 text-teal flex-shrink-0" />
                  <span><span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-ink mb-1">{l}</span><span className="text-[15px] font-semibold">{value}</span></span>
                </a>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Form + side */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
          <FadeInUp className="lg:col-span-7">
            <Eyebrow>Send a message</Eyebrow>
            <div className="rule-draw w-14 h-px bg-teal mt-4 mb-6" aria-hidden="true" />
            <h2 className="font-display font-medium text-ink text-[32px] sm:text-4xl lg:text-[44px] leading-[1.08] mb-3">Tell us how we can help.</h2>
            <p className="text-[15px] leading-relaxed text-muted-ink mb-8">We reply during practice hours. For pain or an emergency, please call the 24-hour line instead.</p>

            {status === 'sent' ? (
              <div className="bg-white border border-hairline p-8">
                <p className="font-display font-medium text-ink text-[26px] leading-tight mb-2">Thank you — we’ve received your message.</p>
                <p className="text-[15px] leading-relaxed text-muted-ink mb-5">We’ll be in touch shortly to confirm a time. If it’s urgent, call {PHONE_DISPLAY}.</p>
                <button type="button" onClick={() => setStatus('idle')} className="text-sm font-semibold text-teal hover:text-ink">Send another message</button>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-5" noValidate>
                <div className="hidden" aria-hidden="true"><label>Company<input name="company" value={form.company} onChange={onChange} tabIndex={-1} autoComplete="off" /></label></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div><label htmlFor="name" className={label}>Full name</label><input id="name" name="name" value={form.name} onChange={onChange} placeholder="Your name" className={input} required autoComplete="name" /></div>
                  <div><label htmlFor="phone" className={label}>Phone</label><input id="phone" type="tel" name="phone" value={form.phone} onChange={onChange} placeholder="081 000 0000" className={input} autoComplete="tel" /></div>
                </div>
                <div><label htmlFor="email" className={label}>Email</label><input id="email" type="email" name="email" value={form.email} onChange={onChange} placeholder="you@example.com" className={input} autoComplete="email" /></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div><label htmlFor="service" className={label}>Treatment you’re interested in</label>
                    <select id="service" name="service" value={form.service} onChange={onChange} className={input}>
                      <option value="">Not sure yet</option>
                      {services.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select></div>
                  <div><label htmlFor="date" className={label}>Preferred date</label><input id="date" type="date" name="date" value={form.date} onChange={onChange} className={input} /></div>
                </div>
                <div><label htmlFor="message" className={label}>Message</label><textarea id="message" name="message" value={form.message} onChange={onChange} rows={5} placeholder="Tell us what you need…" className={`${input} h-auto py-3`} required /></div>
                {error && <p className="text-sm text-red-700">{error}</p>}
                <button type="submit" disabled={status === 'sending'} className={`${btn.navy} w-full sm:w-auto disabled:opacity-60`}>
                  {status === 'sending' ? 'Sending…' : 'Send message'}
                </button>
              </form>
            )}
          </FadeInUp>

          <FadeInUp delay={0.15} className="lg:col-span-5 space-y-5">
            <div className="bg-ink text-white p-7 sm:p-8">
              <h3 className="font-display font-medium text-[28px] leading-tight mb-2">Prefer to talk?</h3>
              <p className="text-sm leading-relaxed text-white/75 mb-6">Call, WhatsApp, or come and see us on Mackeurtan Avenue.</p>
              <div className="flex flex-col gap-3">
                <a href={PHONE_HREF} className={`${btn.light} w-full`}><Phone className="w-[18px] h-[18px]" /> Call {PHONE_DISPLAY}</a>
                <a href={WHATSAPP_HREF} target="_blank" rel="noreferrer" className={`${btn.ghostOnDark} w-full`}><MessageCircle className="w-[18px] h-[18px]" /> WhatsApp us</a>
                <a href={DIRECTIONS_HREF} target="_blank" rel="noreferrer" className={`${btn.ghostOnDark} w-full`}><Navigation className="w-[18px] h-[18px]" /> Get directions</a>
              </div>
            </div>
            <a href={DIRECTIONS_HREF} target="_blank" rel="noreferrer" className="group relative block h-56 sm:h-64 overflow-hidden bg-hairline">
              <Image src="/contact-map.jpg" alt="Map to 26 Mackeurtan Avenue, Durban North" fill sizes="(min-width: 1024px) 40vw, 100vw" className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/80 to-transparent p-5">
                <p className="text-white font-semibold text-sm">26 Mackeurtan Avenue, Durban North</p>
                <p className="text-teal-light text-xs font-semibold mt-0.5">Tap for directions</p>
              </div>
            </a>
            <div className="bg-white border border-hairline p-7">
              <p className="font-display font-medium text-ink text-[22px] leading-tight mb-1">Follow @drfamod</p>
              <p className="text-sm text-muted-ink mb-4">TikTok, Facebook, Instagram, X and LinkedIn.</p>
              <p className="text-sm text-muted-ink">Existing patient? <Link href="/auth/login" className="group inline-flex items-center gap-1.5 font-semibold text-ink hover:text-teal">Patient login <Arrow className="w-4 h-4" /></Link></p>
            </div>
          </FadeInUp>
        </div>
      </section>
    </main>
  )
}
