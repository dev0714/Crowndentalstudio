'use client'

import Image from 'next/image'
import Link from 'next/link'

export default function BlogPost({ params }: { params: { slug: string } }) {
  const posts: Record<string, any> = {
    'teeth-whitening-tips': {
      title: 'Teeth Whitening Tips for a Brighter Smile',
      date: '2025-01-15',
      category: 'Cosmetic',
      image: '/cosmetic-dentistry.jpg',
      content: `Professional teeth whitening can transform your smile, and maintaining those results is key. Here are our expert tips to keep your teeth bright longer.

**Professional vs. At-Home Whitening**

Professional whitening treatments offer faster, more dramatic results. Our in-office treatments use high-concentration whitening agents under professional supervision, delivering results in a single appointment. At-home kits are gentler and work more gradually over time.

**Maintenance Tips**

1. Avoid staining foods and drinks like coffee, red wine, and dark berries
2. Drink plenty of water to rinse your mouth
3. Brush twice daily with whitening toothpaste
4. Use a straw when drinking beverages that stain
5. Floss daily to remove surface stains between teeth

**Touch-Up Schedule**

Professional results typically last 6-12 months. We recommend touch-up treatments every 6 months to maintain your bright smile.

**Diet Adjustments**

If you can't avoid staining foods, try to consume them during meals rather than throughout the day. This minimizes exposure and allows saliva to help protect your teeth.`,
      relatedPosts: [
        { title: 'Cosmetic Dentistry: A Complete Guide', slug: 'cosmetic-guide' },
        { title: 'Smile Makeover Success Stories', slug: 'smile-makeover' }
      ]
    },
    'flossing-guide': {
      title: 'The Complete Flossing Guide',
      date: '2025-01-10',
      category: 'Preventive',
      image: '/blog-default.jpg',
      content: `Flossing is a crucial part of your daily oral hygiene routine. Let's explore why and how to do it correctly.

**Why Flossing Matters**

Brushing alone cannot clean between your teeth. Floss removes food particles and plaque from these hard-to-reach areas, preventing cavities and gum disease.

**Proper Flossing Technique**

1. Take 12-18 inches of floss
2. Wrap it around your middle fingers
3. Hold it with your thumbs and index fingers
4. Use a gentle, sawing motion between teeth
5. Curve the floss around each tooth
6. Be gentle when flossing near the gum line

**Types of Floss**

- Traditional string floss
- Tape floss for wider gaps
- Water flossers for those with braces or implants
- Interdental brushes as an alternative`,
      relatedPosts: [
        { title: 'Gum Disease Prevention Tips', slug: 'gum-prevention' },
        { title: 'Daily Oral Hygiene Routine', slug: 'oral-hygiene' }
      ]
    }
  }

  const post = posts[params.slug] || posts['teeth-whitening-tips']

  return (
    <main>
      {/* Hero with Image */}
      <section className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-12 md:py-16 relative overflow-hidden">
        <div className="absolute inset-0 opacity-30">
          <Image
            src={post.image}
            alt={post.title}
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/95 to-cyan-600/95"></div>
        </div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-sm mb-4 opacity-90">
            <Link href="/" className="hover:text-white transition">Home</Link>
            <span>/</span>
            <Link href="/blog" className="hover:text-white transition">Blog</Link>
            <span>/</span>
            <span className="truncate">{post.title}</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 drop-shadow-lg">{post.title}</h1>
          <div className="flex flex-wrap items-center gap-4 text-sm drop-shadow">
            <span className="bg-white/30 backdrop-blur px-4 py-1 rounded-full font-semibold">{post.category}</span>
            <span className="opacity-90">{new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
        </div>
      </section>

      {/* Featured Image */}
      <section className="bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative h-96 rounded-2xl overflow-hidden shadow-xl -mt-12 mb-8">
            <Image
              src={post.image}
              alt={post.title}
              fill
              className="object-cover"
            />
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="bg-white py-12 md:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="prose max-w-none">
            {post.content.split('\n\n').map((paragraph, idx) => {
              if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
                return <h2 key={idx} className="text-2xl font-bold text-blue-900 mt-8 mb-4">{paragraph.slice(2, -2)}</h2>
              }
              if (paragraph.startsWith('1.')) {
                const items = paragraph.split('\n').filter((line) => line.trim())
                return (
                  <ol key={idx} className="list-decimal list-inside space-y-3 text-gray-700 mb-6 ml-4">
                    {items.map((item, i) => (
                      <li key={i}>{item.replace(/^\d+\.\s/, '')}</li>
                    ))}
                  </ol>
                )
              }
              if (paragraph.startsWith('-')) {
                const items = paragraph.split('\n').filter((line) => line.trim())
                return (
                  <ul key={idx} className="list-disc list-inside space-y-3 text-gray-700 mb-6 ml-4">
                    {items.map((item, i) => (
                      <li key={i}>{item.replace(/^-\s/, '')}</li>
                    ))}
                  </ul>
                )
              }
              return <p key={idx} className="text-gray-700 mb-4 leading-relaxed text-lg">{paragraph}</p>
            })}
          </div>

          {/* Related Posts */}
          {post.relatedPosts && post.relatedPosts.length > 0 && (
            <div className="mt-16 pt-8 border-t-2 border-blue-100">
              <h3 className="text-2xl font-bold text-blue-900 mb-6">Related Articles</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {post.relatedPosts.map((relatedPost, idx) => (
                  <Link key={idx} href={`/blog/${relatedPost.slug}`}>
                    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6 rounded-2xl hover:shadow-lg hover:-translate-y-1 transition-all border-2 border-blue-100 hover:border-cyan-400">
                      <h4 className="font-bold text-blue-900 mb-2">{relatedPost.title}</h4>
                      <p className="text-cyan-600 font-semibold">Read More →</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* CTA */}
          <div className="mt-16 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl p-8 text-center border-2 border-blue-100">
            <h3 className="text-2xl font-bold text-blue-900 mb-4">Schedule Your Appointment Today</h3>
            <Link href="/contact" className="inline-block bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-8 py-3 rounded-xl font-bold hover:shadow-lg hover:scale-105 transition-all">
              Book Now
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
