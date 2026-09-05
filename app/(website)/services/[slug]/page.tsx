import Image from 'next/image'
import Link from 'next/link'
import { Check, Phone, Mail } from 'lucide-react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { FadeInUp, StaggerContainer, StaggerItem } from '@/components/motion'
import { Arrow, CtaBand, Eyebrow, PageHero, btn, CONTACT_EMAIL, PHONE_DISPLAY, PHONE_HREF } from '@/components/website/primitives'

const serviceDetails = {
  'cosmetic-aesthetic-dentistry': {
    title: 'Cosmetic & Aesthetic Dentistry',
    image: '/cosmetic-dentistry.jpg',
    description: 'Enhancing smiles through whitening, bonding, and aesthetic reshaping',
    overview: 'Cosmetic dentistry focuses on improving the appearance of your teeth and smile. From professional whitening to porcelain veneers, we offer treatments tailored to achieve your ideal smile.',
    whatToExpect: [
      'Initial consultation to discuss your goals',
      'Digital smile preview using advanced imaging',
      'Custom treatment plan',
      'Regular follow-up appointments'
    ],
    benefits: [
      'Dramatically improved smile aesthetics',
      'Enhanced self-confidence',
      'Natural-looking, long-lasting results',
      'Multiple treatment options available'
    ],
    faq: [
      { question: 'How long does teeth whitening last?', answer: 'Professional whitening typically lasts 6-12 months depending on lifestyle and maintenance.' },
      { question: 'Are veneers reversible?', answer: 'Veneers require tooth preparation, making them semi-permanent, but can be replaced.' },
      { question: 'Is cosmetic dentistry covered by insurance?', answer: 'Most cosmetic procedures are not covered, but we offer flexible payment plans.' }
    ]
  },
  'orthodontics': {
    title: 'Orthodontics',
    image: '/orthodontics.jpg',
    description: 'Straightening teeth and improving bite with modern solutions',
    overview: 'Orthodontics is the specialized field of dentistry that focuses on correcting misaligned teeth and jaws. Modern orthodontic treatments are more discreet and efficient than ever before.',
    whatToExpect: [
      'Comprehensive orthodontic assessment',
      'X-rays and digital imaging for planning',
      'Custom braces or aligners',
      'Regular adjustment appointments'
    ],
    benefits: [
      'Straighter teeth and improved appearance',
      'Better bite function and jaw alignment',
      'Easier to clean and maintain teeth',
      'Improved overall oral health',
      'Life-long smile confidence'
    ],
    faq: [
      { question: 'How long does orthodontic treatment take?', answer: 'Most treatments take 18-24 months, depending on the complexity of your case.' },
      { question: 'Are clear aligners as effective as braces?', answer: 'Clear aligners are highly effective for most cases and offer excellent results with improved aesthetics.' },
      { question: 'Will I need a retainer after braces?', answer: 'Yes, retainers are essential to maintain your results long-term after active treatment.' }
    ]
  },
  'pediatric-dentistry': {
    title: 'Pediatric Dentistry',
    image: '/pediatric-dentistry.jpg',
    description: 'Gentle, child-friendly dental care for lifelong healthy smiles',
    overview: 'We understand that visiting the dentist can be intimidating for children. Our pediatric specialists use a warm, friendly approach to make dental visits enjoyable and build positive lifelong habits.',
    whatToExpect: [
      'Comfortable, welcoming environment designed for kids',
      'Gentle examination and professional cleaning',
      'Age-appropriate oral hygiene education',
      'Fun rewards program for good behavior'
    ],
    benefits: [
      'Early detection of dental problems',
      'Professional cleaning and fluoride treatments',
      'Cavity prevention strategies for children',
      'Comfortable experience building positive habits',
      'Specialized care for all developmental stages'
    ],
    faq: [
      { question: 'When should my child first visit the dentist?', answer: 'We recommend the first visit around age 1 or when the first tooth appears.' },
      { question: 'How often should children visit the dentist?', answer: 'Children should have regular check-ups every 6 months for optimal oral health.' },
      { question: 'Are baby teeth really that important?', answer: 'Yes, baby teeth are crucial for proper development and help guide permanent teeth into place.' }
    ]
  },
  'crowns-bridges-veneers': {
    title: 'Crowns, Bridges & Veneers',
    image: '/crowns-bridges.jpg',
    description: 'Restoring damaged teeth with durable, natural-looking prosthetics',
    overview: 'Crowns, bridges, and veneers are essential restorative treatments that repair damaged teeth and restore your smile. These custom-made solutions blend seamlessly with your natural teeth.',
    whatToExpect: [
      'Tooth preparation and shaping',
      'Color matching to your natural teeth',
      'Temporary restoration placement',
      'Custom fabrication in the lab',
      'Permanent restoration fitting'
    ],
    benefits: [
      'Restored tooth function',
      'Natural appearance and feel',
      'Improved bite and chewing',
      'Long-lasting durability',
      'Protection of damaged teeth'
    ],
    faq: [
      { question: 'How long do crowns last?', answer: 'Quality crowns typically last 10-15 years or longer with proper care.' },
      { question: 'Is the procedure painful?', answer: 'No, the area is numbed with anesthesia during the procedure.' },
      { question: 'Can crowns stain?', answer: 'Porcelain crowns resist staining, though the tooth underneath can if exposed.' }
    ]
  },
  'dental-fillings': {
    title: 'Dental Fillings',
    image: '/fillings.jpg',
    description: 'Treating cavities with tooth-coloured composite or amalgam fillings',
    overview: 'Dental fillings restore the structure and function of teeth damaged by decay. We use tooth-colored composite materials for a natural appearance.',
    whatToExpect: [
      'Cavity assessment and examination',
      'Removal of decayed tooth material',
      'Cleaning and preparation of the cavity',
      'Filling material application',
      'Shaping and polishing'
    ],
    benefits: [
      'Stop cavity progression',
      'Restore tooth strength',
      'Natural color matching',
      'Quick and painless procedure',
      'Improved oral health'
    ],
    faq: [
      { question: 'How long do fillings last?', answer: 'Composite fillings typically last 5-10 years depending on location and care.' },
      { question: 'Are fillings noticeable?', answer: 'Modern composite fillings match your tooth color and are virtually invisible.' },
      { question: 'Can I eat after a filling?', answer: 'Wait until the numbness wears off, usually 2-3 hours after treatment.' }
    ]
  },
  'endodontics-root-canals': {
    title: 'Endodontics (Root Canals)',
    image: '/root-canal.jpg',
    description: 'Saving infected teeth through precise root canal therapy',
    overview: 'Root canal therapy removes infected or inflamed pulp from inside the tooth, eliminating pain and saving the tooth from extraction.',
    whatToExpect: [
      'X-rays to assess the infection',
      'Local anesthesia application',
      'Pulp removal and cleaning',
      'Canal filling with biocompatible material',
      'Restoration with a crown'
    ],
    benefits: [
      'Eliminate severe tooth pain',
      'Save your natural tooth',
      'Prevent infection spread',
      'Long-term tooth preservation',
      'Return to normal function'
    ],
    faq: [
      { question: 'Is a root canal painful?', answer: 'No, modern root canals are no more uncomfortable than a regular filling.' },
      { question: 'Why do I need a crown after?', answer: 'A crown protects the tooth and restores full functionality after root canal therapy.' },
      { question: 'How long does treatment take?', answer: 'Most root canals can be completed in 1-2 visits depending on complexity.' }
    ]
  },
  'extractions': {
    title: 'Extractions',
    image: '/extraction.jpg',
    description: 'Gentle removal of damaged, impacted, or problematic teeth',
    overview: 'Sometimes extraction is necessary to preserve overall oral health. We perform gentle, minimally invasive extractions with comprehensive aftercare.',
    whatToExpect: [
      'Thorough examination and imaging',
      'Local anesthesia',
      'Gentle tooth removal technique',
      'Socket care and cleaning',
      'Post-extraction instructions'
    ],
    benefits: [
      'Relief from severe pain',
      'Prevent infection and disease',
      'Improve overall oral health',
      'Clear path for other treatments',
      'Minimize complications'
    ],
    faq: [
      { question: 'Will extraction hurt?', answer: 'No, the area is fully numbed during the procedure.' },
      { question: 'What is the recovery time?', answer: 'Most patients recover fully within 7-10 days with proper aftercare.' },
      { question: 'What are replacement options?', answer: 'Options include implants, bridges, dentures, or leaving space depending on your needs.' }
    ]
  },
  'implantology-prosthodontics': {
    title: 'Implantology & Prosthodontics',
    image: '/implants.jpg',
    description: 'Permanent tooth replacement using titanium implants',
    overview: 'Dental implants provide a permanent, natural-looking solution to replace missing teeth. They integrate with your jawbone for superior stability and function.',
    whatToExpect: [
      'Initial consultation and imaging',
      'Implant placement surgery',
      'Integration period (osseointegration)',
      'Abutment and crown placement',
      'Regular follow-up care'
    ],
    benefits: [
      'Look and feel like natural teeth',
      'Prevent bone loss',
      'Improve speech and eating',
      'Boost confidence and appearance',
      'Durable long-term solution'
    ],
    faq: [
      { question: 'How long do implants last?', answer: 'With proper care, implants can last 25+ years or a lifetime.' },
      { question: 'Am I a candidate for implants?', answer: 'Most people are candidates, but we assess bone health and overall health during consultation.' },
      { question: 'How is the implant placed?', answer: 'A small titanium post is surgically placed in the jawbone to serve as the tooth root.' }
    ]
  },
  'oral-maxillofacial-surgery': {
    title: 'Oral & Maxillofacial Surgery',
    image: '/oral-surgery.jpg',
    description: 'Surgical treatment of jaw, face, and oral conditions',
    overview: 'Oral and maxillofacial surgery addresses complex conditions involving teeth, jaws, and facial structures with advanced surgical techniques.',
    whatToExpect: [
      'Detailed pre-surgical evaluation',
      'Advanced imaging and planning',
      'Surgical procedure',
      'Post-operative care instructions',
      'Follow-up appointments'
    ],
    benefits: [
      'Resolve complex oral conditions',
      'Improve function and appearance',
      'Expert surgical care',
      'Advanced pain management',
      'Comprehensive recovery support'
    ],
    faq: [
      { question: 'What conditions require this surgery?', answer: 'Impacted teeth, jaw misalignment, facial reconstruction, and TMJ disorders.' },
      { question: 'Is surgery always necessary?', answer: 'We explore all treatment options and recommend surgery only when necessary.' },
      { question: 'What is recovery like?', answer: 'Recovery varies but typically involves 1-2 weeks of restricted activity.' }
    ]
  },
  'periodontics-cleaning': {
    title: 'Periodontics & Cleaning',
    image: '/periodontics.jpg',
    description: 'Treating gum disease and providing professional scale & polish',
    overview: 'Professional periodontal care prevents and treats gum disease, maintaining healthy gums and supporting your teeth for life.',
    whatToExpect: [
      'Gum health assessment',
      'Professional scaling and root planing',
      'Tartar and plaque removal',
      'Polish and fluoride treatment',
      'Home care recommendations'
    ],
    benefits: [
      'Prevent gum disease progression',
      'Reduce inflammation and bleeding',
      'Fresher breath',
      'Brighter smile',
      'Better overall oral health'
    ],
    faq: [
      { question: 'How often should I have cleanings?', answer: 'Regular patients should have cleanings every 6 months; those with gum disease may need more frequent visits.' },
      { question: 'Is scaling painful?', answer: 'We use gentle techniques and anesthesia if needed to ensure comfort.' },
      { question: 'Can gum disease be reversed?', answer: 'Early stages can be reversed with professional treatment and good home care.' }
    ]
  },
  'professional-teeth-whitening': {
    title: 'Professional Teeth Whitening',
    image: '/cosmetic-dentistry.jpg',
    description: 'Professional in-chair and take-home whitening treatments',
    overview: 'Our professional whitening treatments deliver dramatic results safely and effectively, giving you a brighter, more confident smile.',
    whatToExpect: [
      'Shade assessment and comparison',
      'Protective barrier application',
      'Whitening gel application',
      'Light activation (if used)',
      'Multiple applications for results'
    ],
    benefits: [
      'Dramatically brighter teeth',
      'Professional-grade results',
      'Safe and effective',
      'Customizable treatment levels',
      'Long-lasting brightness'
    ],
    faq: [
      { question: 'How long do results last?', answer: 'Results typically last 6-12 months depending on diet and lifestyle.' },
      { question: 'Will whitening damage my teeth?', answer: 'Professional whitening is safe and gentle on teeth when done by a professional.' },
      { question: 'Can crowns be whitened?', answer: 'Crowns don\'t whiten, so they may need replacement to match newly whitened teeth.' }
    ]
  },
  'teeth-whitening': {
    title: 'Professional Teeth Whitening',
    image: '/cosmetic-dentistry.jpg',
    description: 'Professional in-chair and take-home whitening treatments',
    overview: 'Our professional whitening treatments deliver dramatic results safely and effectively, giving you a brighter, more confident smile.',
    whatToExpect: [
      'Shade assessment and comparison',
      'Protective barrier application',
      'Whitening gel application',
      'Light activation (if used)',
      'Multiple applications for results'
    ],
    benefits: [
      'Dramatically brighter teeth',
      'Professional-grade results',
      'Safe and effective',
      'Customizable treatment levels',
      'Long-lasting brightness'
    ],
    faq: [
      { question: 'How long do results last?', answer: 'Results typically last 6-12 months depending on diet and lifestyle.' },
      { question: 'Will whitening damage my teeth?', answer: 'Professional whitening is safe and gentle on teeth when done by a professional.' },
      { question: 'Can crowns be whitened?', answer: 'Crowns don\'t whiten, so they may need replacement to match newly whitened teeth.' }
    ]
  },
  'protective-functional-devices': {
    title: 'Protective & Functional Devices',
    image: '/mouthguard.jpg',
    description: 'Custom mouthguards, nightguards, and splints',
    overview: 'We create custom-fitted protective devices to guard your teeth during sports, prevent grinding damage, or manage jaw conditions.',
    whatToExpect: [
      'Assessment of your needs',
      'Mouth impression or scan',
      'Custom fabrication',
      'Fit adjustment and comfort check',
      'Care instructions'
    ],
    benefits: [
      'Prevent tooth injuries',
      'Reduce nighttime grinding damage',
      'Custom comfort fit',
      'Durable and long-lasting',
      'Improve sleep quality'
    ],
    faq: [
      { question: 'How long do guards last?', answer: 'Custom guards typically last 3-5 years with proper care.' },
      { question: 'Can I sleep with a nightguard?', answer: 'Yes, nightguards are designed for comfortable nighttime wear.' },
      { question: 'How do I care for my guard?', answer: 'Clean daily with mild soap and water, and store in a case.' }
    ]
  },
  'smile-makeovers': {
    title: 'Smile Makeovers',
    image: '/smile-makeover.jpg',
    description: 'Full aesthetic transformations combining multiple treatments',
    overview: 'A complete smile makeover combines cosmetic and restorative treatments to create your ideal smile, tailored to your unique goals.',
    whatToExpect: [
      'Comprehensive smile analysis',
      'Digital smile design preview',
      'Custom treatment plan',
      'Phase-by-phase implementation',
      'Final results reveal'
    ],
    benefits: [
      'Dramatically transformed smile',
      'Customized to your preferences',
      'Improved confidence',
      'Coordinated professional plan',
      'Life-changing results'
    ],
    faq: [
      { question: 'How long does a makeover take?', answer: 'Timeline varies from a few weeks to several months depending on the complexity.' },
      { question: 'Can I see a preview?', answer: 'Yes, we use digital smile design to show you projected results before treatment.' },
      { question: 'What treatments are included?', answer: 'Treatments are customized but may include whitening, veneers, bonding, or orthodontics.' }
    ]
  },
  'special-needs-geriatric': {
    title: 'Special Needs & Geriatric',
    image: '/cosmetic-dentistry.jpg',
    description: 'Specialised care for elderly patients and those with disabilities',
    overview: 'We provide compassionate, specialized dental care for seniors and patients with special needs, adapting our approach to their unique requirements.',
    whatToExpect: [
      'Gentle and patient approach',
      'Accessibility accommodations',
      'Health history review',
      'Simplified treatment plans',
      'Caregiver communication'
    ],
    benefits: [
      'Comfortable, stress-free experience',
      'Accessible care',
      'Health condition management',
      'Dignity and respect',
      'Maintained oral health'
    ],
    faq: [
      { question: 'Can elderly patients still get implants?', answer: 'Yes, age alone isn\'t a barrier; we assess individual health status.' },
      { question: 'How do medications affect dental care?', answer: 'We review all medications and adjust treatment plans accordingly.' },
      { question: 'Are treatments more gentle?', answer: 'Yes, we use gentle techniques and shorter appointments when needed.' }
    ]
  }
}

export default async function ServiceDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const service = serviceDetails[slug as keyof typeof serviceDetails] || serviceDetails['cosmetic-aesthetic-dentistry']

  return (
    <main className="overflow-x-clip bg-cream">
      <PageHero
        eyebrow="Treatment"
        lines={[service.title]}
        intro={service.description}
        image={service.image}
        imageAlt={service.title}
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <Link href="/contact" className={btn.light}>Book an appointment</Link>
          <a href={PHONE_HREF} className={btn.ghostOnDark}><Phone className="w-[18px] h-[18px]" /> Call {PHONE_DISPLAY}</a>
        </div>
      </PageHero>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
          <div className="lg:col-span-8 space-y-16 lg:space-y-20">
            <FadeInUp>
              <Eyebrow>Overview</Eyebrow>
              <div className="rule-draw w-14 h-px bg-teal mt-4 mb-6" aria-hidden="true" />
              <h2 className="font-display font-medium text-ink text-[32px] sm:text-4xl lg:text-[44px] leading-[1.08] mb-5">What is {service.title.toLowerCase()}?</h2>
              <p className="text-base sm:text-lg leading-relaxed text-muted-ink">{service.overview}</p>
            </FadeInUp>

            <div>
              <FadeInUp>
                <Eyebrow>What to expect</Eyebrow>
                <h2 className="font-display font-medium text-ink text-[32px] sm:text-4xl lg:text-[44px] leading-[1.08] mt-4 mb-6">Your visit, step by step.</h2>
              </FadeInUp>
              <StaggerContainer className="divide-y divide-hairline border-y border-hairline">
                {service.whatToExpect.map((step, idx) => (
                  <StaggerItem key={idx} className="grid grid-cols-[48px_1fr] sm:grid-cols-[64px_1fr] gap-4 sm:gap-6 py-5">
                    <div className="font-display text-[24px] text-teal leading-none pt-0.5">{String(idx + 1).padStart(2, '0')}</div>
                    <p className="text-[15px] sm:text-base leading-relaxed text-ink">{step}</p>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </div>

            <div>
              <FadeInUp>
                <Eyebrow>Benefits</Eyebrow>
                <h2 className="font-display font-medium text-ink text-[32px] sm:text-4xl lg:text-[44px] leading-[1.08] mt-4 mb-6">Why patients choose it.</h2>
              </FadeInUp>
              <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                {service.benefits.map((benefit, idx) => (
                  <StaggerItem key={idx} className="flex gap-3 py-3 border-b border-hairline">
                    <Check className="w-5 h-5 text-teal flex-shrink-0 mt-0.5" aria-hidden="true" />
                    <p className="text-[15px] leading-relaxed text-ink">{benefit}</p>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </div>

            <FadeInUp>
              <Eyebrow>Questions</Eyebrow>
              <h2 className="font-display font-medium text-ink text-[32px] sm:text-4xl lg:text-[44px] leading-[1.08] mt-4 mb-6">Frequently asked.</h2>
              <Accordion type="single" collapsible className="border-t border-hairline">
                {service.faq.map((item, idx) => (
                  <AccordionItem key={idx} value={`item-${idx}`} className="border-b border-hairline">
                    <AccordionTrigger className="font-display font-medium text-ink text-[20px] sm:text-[22px] leading-snug text-left py-5 hover:no-underline hover:text-teal">
                      {item.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-[15px] leading-relaxed text-muted-ink pb-5">
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </FadeInUp>
          </div>

          <aside className="lg:col-span-4">
            <div className="lg:sticky lg:top-28 space-y-5">
              <FadeInUp>
                <div className="bg-ink text-white p-7 sm:p-8">
                  <h3 className="font-display font-medium text-[28px] leading-tight mb-2">Ready to get started?</h3>
                  <p className="text-sm leading-relaxed text-white/75 mb-6">Book your appointment and take the first step toward a healthier smile.</p>
                  <Link href="/contact" className={`${btn.light} w-full`}>Book this treatment</Link>
                  <div className="mt-6 pt-6 border-t border-white/20 space-y-4">
                    <div className="flex items-start gap-3">
                      <Phone className="w-4 h-4 mt-1 text-teal-light flex-shrink-0" />
                      <div><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/60">Call us</p><a href={PHONE_HREF} className="text-base font-semibold text-white hover:text-teal-light">{PHONE_DISPLAY}</a></div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Mail className="w-4 h-4 mt-1 text-teal-light flex-shrink-0" />
                      <div><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/60">Email</p><a href={`mailto:${CONTACT_EMAIL}`} className="text-sm font-semibold text-white hover:text-teal-light break-all">{CONTACT_EMAIL}</a></div>
                    </div>
                  </div>
                </div>
              </FadeInUp>
              <FadeInUp delay={0.1}>
                <div className="bg-white border border-hairline p-7">
                  <h4 className="font-display font-medium text-ink text-[22px] leading-tight mb-2">All 14 treatments</h4>
                  <p className="text-sm leading-relaxed text-muted-ink mb-4">A comprehensive range of dental care for the whole family.</p>
                  <Link href="/services" className="group inline-flex items-center gap-2 text-sm font-semibold text-ink hover:text-teal">Browse treatments <Arrow className="w-4 h-4" /></Link>
                </div>
              </FadeInUp>
            </div>
          </aside>
        </div>
      </section>

      <CtaBand title="Schedule a consultation." copy="Discover how we can help you reach your goals, with care that is explained before it is given." />
    </main>
  )
}
