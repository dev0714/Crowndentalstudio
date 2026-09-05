import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Phone } from 'lucide-react'
import { CounterStat } from '@/components/counter-stat'
import {
  FadeInUp,
  FadeUp,
  KenBurns,
  Parallax,
  RevealLines,
  StaggerContainer,
  StaggerItem,
} from '@/components/motion'

const PHONE_DISPLAY = '081 207 8621'
const PHONE_HREF = 'tel:0812078621'

const treatments = [
  { name: 'Cosmetic dentistry', blurb: 'Whitening, veneers and bonding that look natural — never overdone.', image: '/cosmetic-dentistry.jpg', href: '/services/cosmetic-aesthetic-dentistry' },
  { name: 'Dental implants', blurb: 'A permanent, natural-feeling replacement for missing teeth.', image: '/implants.jpg', href: '/services/implantology-prosthodontics' },
  { name: 'Orthodontics', blurb: 'Braces and aligners for teens and adults, planned around your life.', image: '/orthodontics.jpg', href: '/services/orthodontics' },
  { name: 'Crowns & bridges', blurb: 'Restore strength and shape to damaged or missing teeth.', href: '/services/crowns-bridges-veneers' },
  { name: 'Root canal therapy', blurb: 'Relieve pain and save the tooth — comfortably, in as few visits as possible.', href: '/services/endodontics-root-canals' },
  { name: 'Children’s dentistry', blurb: 'Calm, positive first visits that set up a lifetime of healthy habits.', href: '/services/pediatric-dentistry' },
]

const reasons = [
  { title: 'An experienced team', body: 'Three dentists and over 20 years of caring for Durban North families. [QUALIFICATIONS PLACEHOLDER]' },
  { title: 'Modern, well-kept equipment', body: '[EQUIPMENT PLACEHOLDER] — digital planning and imaging for more precise, more comfortable treatment.' },
  { title: 'Gentle, anxiety-aware care', body: 'If the dentist makes you nervous, tell us. We slow down, explain more, and never rush you.' },
  { title: 'Same-day & emergency care', body: 'A 24-hour on-call line, and same-day appointments when pain can’t wait.' },
]

const team = [
  { name: 'Dr Amod', role: 'Principal Dentist', note: '[QUALIFICATION]', image: '/dr-amod.jpg' },
  { name: 'Dr Sarah [SURNAME]', role: 'Restorative Specialist', note: '[QUALIFICATION]', image: '/dr-sarah.jpg' },
  { name: 'Dr James [SURNAME]', role: 'Orthodontist', note: '[QUALIFICATION]', image: '/dr-james.jpg' },
]

const stats = [
  { number: '20+', label: 'Years in Durban North' },
  { number: '2,400+', label: 'Happy patients' },
  { number: '5.0', label: 'Average patient rating' },
  { number: '14', label: 'Treatments offered' },
]

function Eyebrow({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <p className={`text-[12px] font-semibold uppercase tracking-[0.18em] text-teal ${className}`}>{children}</p>
}

function Arrow() {
  return <ArrowRight className="w-[18px] h-[18px] transition-transform group-hover:translate-x-1" />
}

export default function Home() {
  return (
    <main className="overflow-x-clip bg-cream">

      {/* ─── HERO ─────────────────────────────────────────────────── */}
      <section className="relative min-h-[100svh] overflow-hidden bg-ink">
        <KenBurns className="absolute inset-0">
          <Image
            src="/dental-hero.jpg"
            alt="A dentist at Crown Dental Studio talking with a patient"
            fill
            priority
            sizes="100vw"
            className="object-cover object-[60%_40%]"
          />
        </KenBurns>
        <div className="absolute inset-0 bg-gradient-to-r from-ink/85 via-ink/55 to-ink/10" aria-hidden="true" />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/35 via-transparent to-ink/50" aria-hidden="true" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-40 pb-24 md:pt-52 md:pb-32">
          <FadeUp delay={0}>
            <Eyebrow className="text-teal-light mb-6">Family &amp; cosmetic dentistry · Durban North</Eyebrow>
          </FadeUp>

          <RevealLines
            as="h1"
            className="font-display font-medium text-white text-[56px] sm:text-[72px] lg:text-[96px] xl:text-[104px] leading-[0.98] tracking-tight max-w-[820px]"
            lines={[
              'Care you can feel',
              <><em className="italic font-normal text-[#CFEDED]">confident</em> about.</>,
            ]}
          />

          <FadeUp delay={650}>
            <p className="mt-8 max-w-[520px] text-lg leading-relaxed text-white/80">
              Over twenty years of gentle, modern dentistry on Mackeurtan Avenue — from routine check-ups to complete smile restorations.
            </p>
          </FadeUp>

          <FadeUp delay={850}>
            <div className="mt-10 flex flex-col sm:flex-row sm:items-center gap-4">
              <Link
                href="/contact"
                className="inline-flex items-center justify-center h-[52px] px-7 rounded-full bg-white text-navy-800 font-semibold text-[15px] hover:bg-cream transition-colors"
              >
                Book an appointment
              </Link>
              <a
                href={PHONE_HREF}
                className="inline-flex items-center justify-center gap-2.5 h-[52px] px-7 rounded-full border border-white/35 text-white font-semibold text-[15px] hover:border-white hover:text-white transition-colors"
              >
                <Phone className="w-[18px] h-[18px]" />
                Call {PHONE_DISPLAY}
              </a>
            </div>
          </FadeUp>

          <FadeUp delay={1050}>
            <div className="mt-14 flex items-center gap-2.5 text-[13px] text-white/70">
              <span className="w-2 h-2 rounded-full bg-teal-light shadow-[0_0_0_4px_rgba(94,234,212,0.2)]" aria-hidden="true" />
              24-hour on-call line for dental emergencies
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ─── PROOF STRIP ──────────────────────────────────────────── */}
      <section className="bg-white border-b border-hairline">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4">
            {stats.map((stat, i) => (
              <CounterStat
                key={stat.label}
                number={stat.number}
                label={stat.label}
                className={[
                  'py-9 lg:py-11',
                  i % 2 === 0 ? 'pr-6 lg:pr-8 border-r border-hairline' : 'pl-6 lg:pl-8',
                  i < 2 ? 'border-b border-hairline lg:border-b-0' : '',
                  i === 1 ? 'lg:border-r' : '',
                  i === 2 ? 'lg:border-r lg:pr-8 lg:pl-8' : '',
                ].join(' ')}
                numberClassName="font-display text-5xl lg:text-[64px] leading-none text-teal"
                labelClassName="mt-2.5 text-sm text-muted-ink"
              />
            ))}
          </div>
        </div>
      </section>

      {/* ─── OUR APPROACH ─────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center">
          <FadeInUp>
            <Parallax className="relative h-[420px] sm:h-[520px] lg:h-[620px] overflow-hidden">
              <div className="absolute -inset-y-[8%] inset-x-0">
                <Image src="/dental-consultation.jpg" alt="A consultation at Crown Dental Studio" fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
              </div>
            </Parallax>
          </FadeInUp>
          <FadeInUp delay={0.15}>
            <Eyebrow>Our approach</Eyebrow>
            <div className="rule-draw w-14 h-px bg-teal mt-4 mb-7" aria-hidden="true" />
            <h2 className="font-display font-medium text-ink text-4xl sm:text-5xl lg:text-[56px] leading-[1.05] mb-8">Unhurried, honest dentistry.</h2>
            <div className="divide-y divide-hairline border-y border-hairline">
              {[
                ['We explain before we treat.', 'Every option, cost and alternative is walked through with you first — no surprises in the chair.'],
                ['Gentle by design.', 'Anxious patients, children and those with special needs are welcomed with the extra time and care they deserve.'],
                ['One practice for the whole family.', 'From first visits to implants and smile makeovers, you see the same team at every stage.'],
              ].map(([lead, rest]) => (
                <p key={lead} className="py-5 text-base leading-relaxed text-muted-ink">
                  <strong className="font-semibold text-ink">{lead}</strong> {rest}
                </p>
              ))}
            </div>
            <Link href="/about" className="group inline-flex items-center gap-2 mt-8 text-[15px] font-semibold text-ink hover:text-teal">
              About the practice <Arrow />
            </Link>
          </FadeInUp>
        </div>
      </section>

      {/* ─── TREATMENTS ───────────────────────────────────────────── */}
      <section className="bg-white py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeInUp className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-14">
            <div>
              <Eyebrow>Treatments</Eyebrow>
              <h2 className="font-display font-medium text-ink text-4xl sm:text-5xl lg:text-[56px] leading-[1.05] mt-4">
                Everything your smile needs,<br className="hidden md:block" /> under one roof.
              </h2>
            </div>
            <Link href="/services" className="group inline-flex items-center gap-2 text-[15px] font-semibold text-ink hover:text-teal md:pb-2">
              See all 14 treatments <Arrow />
            </Link>
          </FadeInUp>

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
            {treatments.map((t) => (
              <StaggerItem key={t.name} className={t.image ? '' : 'bg-cream p-9 min-h-[220px]'}>
                {t.image && (
                  <div className="relative h-[300px] overflow-hidden mb-6">
                    <Image src={t.image} alt="" fill sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw" className="object-cover transition-transform duration-700 ease-out hover:scale-[1.04]" />
                  </div>
                )}
                <h3 className="font-display font-medium text-ink text-[30px] leading-tight mb-2">{t.name}</h3>
                <p className="text-[15px] leading-relaxed text-muted-ink">{t.blurb}</p>
                <Link href={t.href} className="inline-block mt-4 text-sm font-semibold text-teal hover:text-ink">Learn more</Link>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* ─── WHY CROWN DENTAL ─────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-24">
          <FadeInUp className="lg:col-span-5 lg:sticky lg:top-28 self-start">
            <Eyebrow>Why Crown Dental</Eyebrow>
            <h2 className="font-display font-medium text-ink text-4xl sm:text-5xl lg:text-[56px] leading-[1.05] mt-4 mb-5">A practice built<br />around you.</h2>
            <p className="text-base leading-relaxed text-muted-ink max-w-[380px]">
              Over twenty years on the same street, one team, and a simple promise: you will always know what is happening and why.
            </p>
          </FadeInUp>
          <StaggerContainer className="lg:col-span-7 divide-y divide-hairline border-y border-hairline">
            {reasons.map((r, i) => (
              <StaggerItem key={r.title} className="grid grid-cols-[56px_1fr] sm:grid-cols-[72px_1fr] gap-5 sm:gap-6 py-7">
                <div className="font-display text-[28px] text-teal leading-none pt-1">{String(i + 1).padStart(2, '0')}</div>
                <div>
                  <h3 className="font-display font-medium text-ink text-[26px] sm:text-[28px] leading-tight mb-1.5">{r.title}</h3>
                  <p className="text-[15px] leading-relaxed text-muted-ink">{r.body}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* ─── TEAM ─────────────────────────────────────────────────── */}
      <section className="bg-white py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeInUp>
            <Eyebrow>Your dentists</Eyebrow>
            <h2 className="font-display font-medium text-ink text-4xl sm:text-5xl lg:text-[56px] leading-[1.05] mt-4 mb-14">Meet the team.</h2>
          </FadeInUp>
          <StaggerContainer className="grid grid-cols-1 sm:grid-cols-3 gap-7">
            {team.map((member) => (
              <StaggerItem key={member.name} className="group">
                <div className="relative h-[360px] lg:h-[420px] overflow-hidden bg-hairline">
                  <Image src={member.image} alt={member.name} fill sizes="(min-width: 640px) 33vw, 100vw" className="object-cover grayscale-[15%] transition-[filter,transform] duration-700 ease-out group-hover:grayscale-0 group-hover:scale-[1.03]" />
                </div>
                <h3 className="font-display font-medium text-ink text-[30px] leading-tight mt-6 mb-1">{member.name}</h3>
                <p className="text-sm text-muted-ink">{member.role} · {member.note}</p>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* ─── TESTIMONIAL (pinned; the next band slides over it) ───── */}
      <section className="quote-pin sticky top-0 z-0 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32 text-center">
        <FadeInUp>
          <div className="rule-draw w-14 h-px bg-teal mx-auto mb-9" aria-hidden="true" />
          <blockquote className="font-display italic font-normal text-ink text-3xl sm:text-4xl lg:text-[44px] leading-[1.25] max-w-[900px] mx-auto">
            “[PATIENT TESTIMONIAL PLACEHOLDER — a real Google review quote will go here.]”
          </blockquote>
          <p className="mt-8 text-sm font-semibold uppercase tracking-[0.12em] text-muted-ink">[Name] · Durban North</p>
        </FadeInUp>
      </section>

      {/* ─── VISIT / CTA ──────────────────────────────────────────── */}
      <section className="relative z-10 bg-ink text-white py-24 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-24 items-center">
          <FadeInUp className="lg:col-span-7">
            <h2 className="font-display font-medium text-white text-4xl sm:text-5xl lg:text-[64px] leading-[1.02] mb-6">Ready for a healthier smile?</h2>
            <p className="text-[17px] leading-relaxed text-white/75 max-w-[520px] mb-10">Book online in a minute, or call us and we’ll find a time that suits you.</p>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <Link href="/contact" className="inline-flex items-center justify-center h-[52px] px-7 rounded-full bg-white text-navy-800 font-semibold text-[15px] hover:bg-cream transition-colors">Book an appointment</Link>
              <a href={PHONE_HREF} className="inline-flex items-center justify-center gap-2.5 h-[52px] px-7 rounded-full border border-white/35 text-white font-semibold text-[15px] hover:border-white hover:text-white transition-colors">
                <Phone className="w-[18px] h-[18px]" /> Call {PHONE_DISPLAY}
              </a>
            </div>
          </FadeInUp>
          <FadeInUp delay={0.15} className="lg:col-span-5 lg:border-l lg:border-white/20 lg:pl-12 flex flex-col gap-7">
            <div><Eyebrow className="text-teal-light">Visit us</Eyebrow><p className="mt-2.5 text-base leading-relaxed text-white/85">26 Mackeurtan Avenue<br />Durban North</p></div>
            <div><Eyebrow className="text-teal-light">Hours</Eyebrow><p className="mt-2.5 text-base leading-relaxed text-white/85">[HOURS PLACEHOLDER]</p></div>
            <div><Eyebrow className="text-teal-light">Emergencies</Eyebrow><p className="mt-2.5 text-base leading-relaxed text-white/85">24-hour on-call line · <a href={PHONE_HREF} className="text-white hover:text-teal-light">{PHONE_DISPLAY}</a></p></div>
          </FadeInUp>
        </div>
      </section>
    </main>
  )
}
