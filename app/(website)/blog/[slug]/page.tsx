import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPublishedBlogPostBySlug, getPublishedBlogPosts } from '@/lib/blog/store'

export const dynamic = 'force-dynamic';

function renderContent(content: string) {
  return content.split('\n\n').map((paragraph, idx) => {
    if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
      return (
        <h2 key={idx} className="text-2xl font-bold text-blue-900 mt-8 mb-4">
          {paragraph.slice(2, -2)}
        </h2>
      );
    }
    if (paragraph.startsWith('1.')) {
      const items = paragraph.split('\n').filter((line) => line.trim());
      return (
        <ol key={idx} className="list-decimal list-inside space-y-3 text-gray-700 mb-6 ml-4">
          {items.map((item, itemIndex) => (
            <li key={itemIndex}>{item.replace(/^\d+\.\s/, '')}</li>
          ))}
        </ol>
      );
    }
    if (paragraph.startsWith('-')) {
      const items = paragraph.split('\n').filter((line) => line.trim());
      return (
        <ul key={idx} className="list-disc list-inside space-y-3 text-gray-700 mb-6 ml-4">
          {items.map((item, itemIndex) => (
            <li key={itemIndex}>{item.replace(/^-\s/, '')}</li>
          ))}
        </ul>
      );
    }

    return (
      <p key={idx} className="text-gray-700 mb-4 leading-relaxed text-lg">
        {paragraph}
      </p>
    );
  });
}

export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPublishedBlogPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const relatedPosts = (await getPublishedBlogPosts())
    .filter((candidate) => candidate.id !== post.id)
    .filter((candidate) => candidate.category === post.category)
    .slice(0, 2);

  return (
    <main>
      {/* Hero with Image */}
      <section className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-12 md:py-16 relative overflow-hidden">
        <div className="absolute inset-0 opacity-30">
          <Image
            src={post.cover_image}
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
            <span className="opacity-90">
              {new Date(post.published_at || post.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </div>
        </div>
      </section>

      {/* Featured Image */}
      <section className="bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative h-96 rounded-2xl overflow-hidden shadow-xl -mt-12 mb-8">
            <Image
              src={post.cover_image}
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
          <div className="prose max-w-none">{renderContent(post.content)}</div>

          {/* Related Posts */}
          {relatedPosts.length > 0 && (
            <div className="mt-16 pt-8 border-t-2 border-blue-100">
              <h3 className="text-2xl font-bold text-blue-900 mb-6">Related Articles</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {relatedPosts.map((relatedPost) => (
                  <Link key={relatedPost.id} href={`/blog/${relatedPost.slug}`}>
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
