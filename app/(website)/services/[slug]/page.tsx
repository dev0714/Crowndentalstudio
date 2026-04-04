import Image from 'next/image'
import Link from 'next/link'
import { CheckCircle, ArrowRight, Phone, Mail } from 'lucide-react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { FloatingBlob, FloatingBlobAlt } from '@/components/motion'

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
    <main>
      {/* Hero */}
      <section className="relative min-h-[52vh] flex items-end pb-14 overflow-hidden pt-20">
        {/* Background image */}
        <div className="absolute inset-0">
          <Image
            src={service.image}
            alt={service.title}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(29,78,216,0.93) 0%, rgba(8,145,178,0.88) 100%)' }} />
        </div>

        {/* Floating blobs */}
        <FloatingBlob className="absolute top-12 right-16 w-80 h-80 bg-cyan-400/15 rounded-full blur-3xl pointer-events-none" />
        <FloatingBlobAlt className="absolute bottom-0 left-12 w-64 h-64 bg-blue-300/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          {/* Title */}
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight drop-shadow-lg">
            {service.title}
          </h1>
          <p className="text-lg md:text-xl text-white/80 mt-4 max-w-2xl drop-shadow">
            {service.description}
          </p>

          {/* CTA pills */}
          <div className="flex flex-wrap gap-3 mt-8">
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 bg-white text-blue-700 px-6 py-2.5 rounded-full font-bold text-sm hover:bg-blue-50 hover:shadow-lg hover:scale-105 transition-all shadow-md"
            >
              Book Appointment <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="tel:0812078621"
              className="inline-flex items-center gap-2 glass border border-white/30 text-white px-6 py-2.5 rounded-full font-semibold text-sm hover:bg-white/20 transition-all"
            >
              <Phone className="w-4 h-4" /> 081 207 8621
            </a>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="bg-gradient-to-b from-slate-50 to-white py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2 space-y-14">
              {/* Featured Image */}
              <div className="relative h-80 md:h-[420px] rounded-3xl overflow-hidden shadow-2xl">
                <Image
                  src={service.image}
                  alt={service.title}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-blue-900/30 to-transparent" />
              </div>

              {/* What is it */}
              <div>
                <p className="text-cyan-600 text-sm font-bold uppercase tracking-widest mb-2">Overview</p>
                <h2 className="text-3xl md:text-4xl font-bold text-blue-900 mb-5">What is {service.title}?</h2>
                <p className="text-lg text-gray-600 leading-relaxed">{service.overview}</p>
              </div>

              {/* What to Expect */}
              <div>
                <p className="text-cyan-600 text-sm font-bold uppercase tracking-widest mb-2">Process</p>
                <h2 className="text-3xl md:text-4xl font-bold text-blue-900 mb-7">What to Expect</h2>
                <div className="space-y-4">
                  {service.whatToExpect.map((step, idx) => (
                    <div key={idx} className="flex gap-5 p-4 bg-white rounded-2xl border border-blue-50 shadow-sm hover:shadow-md hover:border-blue-100 transition-all">
                      <div className="flex-shrink-0 w-9 h-9 bg-gradient-to-br from-blue-600 to-cyan-600 text-white rounded-xl flex items-center justify-center font-bold text-sm shadow-md">
                        {idx + 1}
                      </div>
                      <p className="text-gray-700 mt-1.5 leading-relaxed">{step}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Benefits */}
              <div>
                <p className="text-cyan-600 text-sm font-bold uppercase tracking-widest mb-2">Why Choose Us</p>
                <h2 className="text-3xl md:text-4xl font-bold text-blue-900 mb-7">Benefits</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {service.benefits.map((benefit, idx) => (
                    <div key={idx} className="flex gap-3 p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl border border-blue-100 hover:shadow-md transition-all">
                      <CheckCircle className="w-5 h-5 text-cyan-600 flex-shrink-0 mt-0.5" />
                      <p className="text-gray-700 text-sm font-medium leading-relaxed">{benefit}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* FAQ */}
              <div>
                <p className="text-cyan-600 text-sm font-bold uppercase tracking-widest mb-2">Questions</p>
                <h2 className="text-3xl md:text-4xl font-bold text-blue-900 mb-7">Frequently Asked Questions</h2>
                <Accordion type="single" collapsible className="space-y-3">
                  {service.faq.map((item, idx) => (
                    <AccordionItem key={idx} value={`item-${idx}`} className="border border-blue-100 rounded-2xl overflow-hidden bg-white shadow-sm">
                      <AccordionTrigger className="text-base font-semibold hover:text-cyan-600 px-5 py-4 hover:no-underline">
                        {item.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-gray-600 px-5 pb-4 leading-relaxed">
                        {item.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </div>

            {/* Sidebar */}
            <div>
              <div className="sticky top-24 space-y-5">
                {/* CTA card */}
                <div className="relative overflow-hidden rounded-3xl p-8 space-y-5" style={{ background: 'linear-gradient(135deg, rgba(29,78,216,1) 0%, rgba(8,145,178,1) 100%)' }}>
                  <FloatingBlob className="absolute -top-8 -right-8 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                  <h3 className="text-2xl font-bold text-white relative z-10">Ready to Get Started?</h3>
                  <p className="text-white/70 text-sm relative z-10">Book your appointment today and take the first step toward your best smile.</p>
                  <Link href="/contact" className="relative z-10 block w-full bg-white text-blue-700 py-3 rounded-2xl font-bold hover:bg-blue-50 hover:shadow-xl hover:scale-105 transition-all text-center shadow-lg">
                    Book This Service
                  </Link>
                  <div className="relative z-10 border-t border-white/20 pt-5 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
                        <Phone className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-xs text-white/60 font-semibold uppercase tracking-wide">Call us directly</p>
                        <a href="tel:0812078621" className="text-base font-bold text-white hover:text-cyan-200 transition-colors">081 207 8621</a>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
                        <Mail className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-xs text-white/60 font-semibold uppercase tracking-wide">Email us</p>
                        <a href="mailto:info@crowndental.com" className="text-sm font-bold text-white hover:text-cyan-200 transition-colors break-all">info@crowndental.com</a>
                      </div>
                    </div>
                  </div>
                </div>

                {/* All services link */}
                <div className="bg-white rounded-3xl p-6 border border-blue-100 shadow-sm space-y-4">
                  <h4 className="font-bold text-blue-900">Explore All Services</h4>
                  <p className="text-sm text-gray-500">We offer a comprehensive range of dental treatments for the whole family.</p>
                  <Link href="/services" className="inline-flex items-center gap-2 text-blue-600 font-bold text-sm hover:text-cyan-600 transition-colors">
                    View All Services <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold mb-4 drop-shadow-lg">Schedule Your Consultation Today</h2>
          <p className="text-lg opacity-95 mb-8 drop-shadow">Discover how we can help you achieve your dental goals with expert care.</p>
          <Link href="/contact" className="inline-block bg-white text-blue-600 px-8 py-4 rounded-xl font-bold hover:bg-blue-50 shadow-lg hover:shadow-xl hover:scale-105 transition-all">
            Book Appointment Now
          </Link>
        </div>
      </section>
    </main>
  )
}
