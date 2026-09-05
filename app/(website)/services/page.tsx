import Image from 'next/image'
import Link from 'next/link'
import { Smile, Activity, Sparkles, Shield, Heart, Zap, Brain, Leaf, Wrench, Sun, Lock, Wand2, Baby, Accessibility } from 'lucide-react'
import { FadeInUp, StaggerContainer, StaggerItem } from '@/components/motion'
import { Arrow, CtaBand, PageHero, SectionTitle } from '@/components/website/primitives'

const services = [
  { name: 'Cosmetic & Aesthetic Dentistry', slug: 'cosmetic-aesthetic-dentistry', icon: Sparkles, desc: 'Enhancing smiles through whitening, bonding, and aesthetic reshaping' },
  { name: 'Crowns, Bridges & Veneers', slug: 'crowns-bridges-veneers', icon: Activity, desc: 'Restoring damaged teeth with durable, natural-looking prosthetics' },
  { name: 'Dental Fillings', slug: 'dental-fillings', icon: Shield, desc: 'Treating cavities with tooth-coloured composite or amalgam fillings' },
  { name: 'Endodontics (Root Canals)', slug: 'endodontics-root-canals', icon: Zap, desc: 'Saving infected teeth through precise root canal therapy' },
  { name: 'Extractions', slug: 'extractions', icon: Heart, desc: 'Gentle removal of damaged, impacted, or problematic teeth' },
  { name: 'Implantology & Prosthodontics', slug: 'implantology-prosthodontics', icon: Brain, desc: 'Permanent tooth replacement using titanium implants' },
  { name: 'Oral & Maxillofacial Surgery', slug: 'oral-maxillofacial-surgery', icon: Leaf, desc: 'Surgical treatment of jaw, face, and oral conditions' },
  { name: 'Orthodontics', slug: 'orthodontics', icon: Wrench, desc: 'Straightening teeth with braces and clear aligner systems' },
  { name: 'Periodontics & Cleaning', slug: 'periodontics-cleaning', icon: Sun, desc: 'Treating gum disease and providing professional scale & polish' },
  { name: 'Professional Teeth Whitening', slug: 'teeth-whitening', icon: Smile, desc: 'Professional in-chair and take-home whitening treatments' },
  { name: 'Protective & Functional Devices', slug: 'protective-functional-devices', icon: Lock, desc: 'Custom mouthguards, nightguards, and splints' },
  { name: 'Smile Makeovers', slug: 'smile-makeovers', icon: Wand2, desc: 'Full aesthetic transformations combining multiple treatments' },
  { name: 'Pediatric Dentistry', slug: 'pediatric-dentistry', icon: Baby, desc: 'Gentle, child-friendly dental care from infancy through teens' },
  { name: 'Special Needs & Geriatric', slug: 'special-needs-geriatric', icon: Accessibility, desc: 'Specialised care for elderly patients and those with disabilities' },
]

const featured = [
  { href: '/services/cosmetic-aesthetic-dentistry', src: '/cosmetic-dentistry.jpg', title: 'Cosmetic dentistry', desc: 'Whitening, veneers and bonding that look natural — never overdone.' },
  { href: '/services/orthodontics', src: '/orthodontics.jpg', title: 'Orthodontics', desc: 'Braces and aligners for teens and adults, planned around your life.' },
  { href: '/services/implantology-prosthodontics', src: '/implants.jpg', title: 'Dental implants', desc: 'A permanent, natural-feeling replacement for missing teeth.' },
]

export default function Services() {
  return (
    <main className="overflow-x-clip bg-cream">
      <PageHero
        eyebrow="Treatments · 14 services"
        lines={['Everything your smile', <>needs, <em className="italic font-normal text-[#CFEDED]">under one roof.</em></>]}
        intro="Comprehensive care ranging from routine check-ups to complex surgical procedures — for children, adults and anxious patients alike."
        image="/services-hero.jpg"
        imageAlt="Treatment room at Crown Dental Studio"
      />

      {/* Featured */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
        <FadeInUp><SectionTitle eyebrow="Most requested" title="Where most patients start." className="mb-12 lg:mb-14" /></FadeInUp>
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-7">
          {featured.map((item) => (
            <StaggerItem key={item.href} className="group">
              <Link href={item.href} className="block text-ink hover:text-ink">
                <div className="relative h-[240px] sm:h-[300px] overflow-hidden">
                  <Image src={item.src} alt={item.title} fill sizes="(min-width: 768px) 33vw, 100vw" className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]" />
                </div>
                <h3 className="font-display font-medium text-[30px] leading-tight mt-6 mb-2">{item.title}</h3>
                <p className="text-[15px] leading-relaxed text-muted-ink">{item.desc}</p>
                <span className="inline-flex items-center gap-2 mt-4 text-sm font-semibold text-teal">Learn more <Arrow className="w-4 h-4" /></span>
              </Link>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </section>

      {/* All services */}
      <section className="bg-white py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeInUp><SectionTitle eyebrow="Complete range" title="All 14 treatments." className="mb-12 lg:mb-14" /></FadeInUp>
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" step={0.05}>
            {services.map((s) => {
              const Icon = s.icon
              return (
                <StaggerItem key={s.slug} className="group">
                  <Link href={`/services/${s.slug}`} className="flex h-full flex-col bg-cream border border-hairline p-7 text-ink hover:text-ink hover:border-ink transition-colors">
                    <span className="w-11 h-11 rounded-full border border-hairline flex items-center justify-center text-teal mb-5" aria-hidden="true"><Icon className="w-5 h-5" /></span>
                    <h3 className="font-display font-medium text-[24px] leading-tight mb-2">{s.name}</h3>
                    <p className="text-[14px] leading-relaxed text-muted-ink flex-1">{s.desc}</p>
                    <span className="inline-flex items-center gap-2 mt-5 text-sm font-semibold text-teal">Learn more <Arrow className="w-4 h-4" /></span>
                  </Link>
                </StaggerItem>
              )
            })}
          </StaggerContainer>
        </div>
      </section>

      <CtaBand title="Not sure which treatment you need?" copy="Book a consultation and we’ll walk you through your options, costs and what to expect — before anything is decided." />
    </main>
  )
}
