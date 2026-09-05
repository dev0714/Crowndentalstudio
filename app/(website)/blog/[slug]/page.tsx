import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPublishedBlogPostBySlug, getPublishedBlogPosts } from '@/lib/blog/store'
import { Arrow, CtaBand, Eyebrow } from '@/components/website/primitives'

export const dynamic = 'force-dynamic';

function renderContent(content: string) {
  return content.split('\n\n').map((paragraph, idx) => {
    if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
      return <h2 key={idx} className="font-display font-medium text-ink text-[28px] sm:text-[32px] leading-tight mt-10 mb-4">{paragraph.slice(2, -2)}</h2>;
    }
    if (paragraph.startsWith('1.')) {
      const items = paragraph.split('\n').filter((line) => line.trim());
      return (
        <ol key={idx} className="list-decimal pl-6 space-y-2.5 text-[17px] leading-relaxed text-muted-ink mb-6 marker:text-teal marker:font-semibold">
          {items.map((item, i) => <li key={i}>{item.replace(/^\d+\.\s/, '')}</li>)}
        </ol>
      );
    }
    if (paragraph.startsWith('-')) {
      const items = paragraph.split('\n').filter((line) => line.trim());
      return (
        <ul key={idx} className="list-disc pl-6 space-y-2.5 text-[17px] leading-relaxed text-muted-ink mb-6 marker:text-teal">
          {items.map((item, i) => <li key={i}>{item.replace(/^-\s/, '')}</li>)}
        </ul>
      );
    }
    return <p key={idx} className="text-[17px] leading-relaxed text-muted-ink mb-5">{paragraph}</p>;
  });
}

export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPublishedBlogPostBySlug(slug);
  if (!post) {
    notFound();
    return null;
  }

  const related = (await getPublishedBlogPosts())
    .filter((c) => c.id !== post.id && c.category === post.category)
    .slice(0, 2);

  const dateLabel = new Date(post.published_at || post.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <main className="overflow-x-clip bg-cream">
      <section className="bg-ink">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-12 sm:pt-40 sm:pb-16">
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-[13px] text-white/60 mb-6">
            <Link href="/" className="text-white/70 hover:text-white">Home</Link><span aria-hidden="true">/</span>
            <Link href="/blog" className="text-white/70 hover:text-white">Blog</Link><span aria-hidden="true">/</span>
            <span className="text-white/90 truncate max-w-[60vw]">{post.title}</span>
          </nav>
          <Eyebrow className="text-teal-light mb-4">{post.category} · {dateLabel}</Eyebrow>
          <h1 className="font-display font-medium text-white text-[36px] sm:text-[48px] lg:text-[60px] leading-[1.05] tracking-tight">{post.title}</h1>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative h-[240px] sm:h-[360px] lg:h-[440px] overflow-hidden -mt-8 sm:-mt-10 bg-hairline">
          <Image src={post.cover_image} alt={post.title} fill priority sizes="(min-width: 1024px) 896px, 100vw" className="object-cover" />
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
        <article className="max-w-none">{renderContent(post.content)}</article>

        {related.length > 0 && (
          <div className="mt-16 pt-10 border-t border-hairline">
            <Eyebrow className="mb-4">Related articles</Eyebrow>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {related.map((r) => (
                <Link key={r.id} href={`/blog/${r.slug}`} className="group block bg-white border border-hairline p-6 text-ink hover:text-ink hover:border-ink transition-colors">
                  <h3 className="font-display font-medium text-[24px] leading-tight mb-3">{r.title}</h3>
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-teal">Read article <Arrow className="w-4 h-4" /></span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>

      <CtaBand title="Questions about your own smile?" copy="Book a consultation and we’ll talk it through — no obligation, no jargon." />
    </main>
  )
}
