import Image from 'next/image'
import Link from 'next/link'
import { FadeInUp, Parallax, StaggerContainer, StaggerItem } from '@/components/motion'
import { Arrow, CtaBand, Eyebrow, PageHero, SectionTitle } from '@/components/website/primitives'

const values = [
  { title: 'Compassionate care', body: 'We treat every patient like family, with comfort and dignity in every visit.' },
  { title: 'Modern technology', body: '[EQUIPMENT PLACEHOLDER] — current equipment and proven techniques for the best possible outcomes.' },
  { title: 'All ages welcome', body: 'From children to seniors, we care for every member of your family — including anxious patients and those with developmental or medical conditions.' },
  { title: 'Ready for emergencies', body: 'A 24-hour on-call line, so we are here when you need us most — day or night.' },
]

const team = [
  { name: 'Dr Amod', role: 'Principal Dentist', note: '20+ years’ experience · [QUALIFICATION]', image: '/dr-amod.jpg' },
  { name: 'Dr Sarah [SURNAME]', role: 'Restorative Specialist', note: 'Crowns & veneers · [QUALIFICATION]', image: '/dr-sarah.jpg' },
  { name: 'Dr James [SURNAME]', role: 'Orthodontist', note: 'Braces & clear aligners · [QUALIFICATION]', image: '/dr-james.jpg' },
]

const principles = [
  ['Excellence', 'in every treatment we provide.'],
  ['Compassion', 'for every patient we meet.'],
  ['Honesty', 'about options, costs and what to expect.'],
]

export default function About() {
  return (
    <main className="overflow-x-clip bg-cream">
      <PageHero
        eyebrow="About the practice"
        lines={['A team dedicated to', <><em className="italic font-normal text-[#CFEDED]">healthier</em> smiles.</>]}
        intro="Comprehensive, team-based dental care for children and adults in Durban North — for more than twenty years."
        image="/about-team.jpg"
        imageAlt="The Crown Dental Studio team"
      />

      {/* Mission */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center">
          <FadeInUp>
            <Eyebrow>Our mission</Eyebrow>
            <div className="rule-draw w-14 h-px bg-teal mt-4 mb-7" aria-hidden="true" />
            <h2 className="font-display font-medium text-ink text-[34px] sm:text-5xl lg:text-[56px] leading-[1.05] mb-6">Care that goes beyond the appointment.</h2>
            <p className="text-base sm:text-lg leading-relaxed text-muted-ink mb-4">
              We provide team-based, comprehensive dental care for children and adults, including patients of all ages who are anxious or have an underlying developmental or medical condition.
            </p>
            <p className="text-base leading-relaxed text-muted-ink">
              Our commitment is to deliver exceptional care with compassion, using current technology and proven treatment methods — and to explain every step before we take it.
            </p>
            <div className="mt-8 divide-y divide-hairline border-y border-hairline">
              {principles.map(([lead, rest]) => (
                <p key={lead} className="py-4 text-[15px] leading-relaxed text-muted-ink"><strong className="font-semibold text-ink">{lead}</strong> {rest}</p>
              ))}
            </div>
          </FadeInUp>
          <FadeInUp delay={0.15}>
            <Parallax className="relative h-[380px] sm:h-[480px] lg:h-[600px] overflow-hidden">
              <div className="absolute -inset-y-[8%] inset-x-0">
                <Image src="/dental-consultation.jpg" alt="A consultation at Crown Dental Studio" fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
              </div>
            </Parallax>
          </FadeInUp>
        </div>
      </section>

      {/* Values */}
      <section className="bg-white py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-24">
          <FadeInUp className="lg:col-span-5 lg:sticky lg:top-28 self-start">
            <SectionTitle eyebrow="What drives us" title={<>Our core<br />values.</>} />
          </FadeInUp>
          <StaggerContainer className="lg:col-span-7 divide-y divide-hairline border-y border-hairline">
            {values.map((v, i) => (
              <StaggerItem key={v.title} className="grid grid-cols-[56px_1fr] sm:grid-cols-[72px_1fr] gap-5 sm:gap-6 py-7">
                <div className="font-display text-[28px] text-teal leading-none pt-1">{String(i + 1).padStart(2, '0')}</div>
                <div>
                  <h3 className="font-display font-medium text-ink text-[26px] sm:text-[28px] leading-tight mb-1.5">{v.title}</h3>
                  <p className="text-[15px] leading-relaxed text-muted-ink">{v.body}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Team */}
      <section className="py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeInUp><SectionTitle eyebrow="The people behind your smile" title="Meet the team." className="mb-12 lg:mb-14" /></FadeInUp>
          <StaggerContainer className="grid grid-cols-1 sm:grid-cols-3 gap-7">
            {team.map((m) => (
              <StaggerItem key={m.name} className="group">
                <div className="relative h-[360px] sm:h-[260px] md:h-[320px] lg:h-[420px] overflow-hidden bg-hairline">
                  <Image src={m.image} alt={m.name} fill sizes="(min-width: 640px) 33vw, 100vw" className="object-cover grayscale-[15%] transition-[filter,transform] duration-700 ease-out group-hover:grayscale-0 group-hover:scale-[1.03]" />
                </div>
                <h3 className="font-display font-medium text-ink text-[28px] leading-tight mt-5 mb-1">{m.name}</h3>
                <p className="text-sm font-semibold text-ink">{m.role}</p>
                <p className="text-sm text-muted-ink mt-0.5">{m.note}</p>
              </StaggerItem>
            ))}
          </StaggerContainer>
          <FadeInUp className="mt-12">
            <Link href="/services" className="group inline-flex items-center gap-2 text-[15px] font-semibold text-ink hover:text-teal">See our treatments <Arrow /></Link>
          </FadeInUp>
        </div>
      </section>

      <CtaBand title="Ready to experience our care?" />
    </main>
  )
}
