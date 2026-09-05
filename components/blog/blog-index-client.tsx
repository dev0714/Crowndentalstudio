'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { FadeInUp, FadeUp, RevealLines, StaggerContainer, StaggerItem } from '@/components/motion';
import { Arrow, Eyebrow } from '@/components/website/primitives';
import type { BlogPost } from '@/lib/blog/types';

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function BlogIndexClient({ posts }: { posts: BlogPost[] }) {
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');

  const categories = useMemo(() => {
    const unique = Array.from(new Set(posts.map((p) => p.category).filter(Boolean))).sort((a, b) => a.localeCompare(b));
    return ['All', ...unique];
  }, [posts]);

  const filtered = useMemo(() => posts.filter((post) => {
    const matchesCategory = category === 'All' || post.category === category;
    const haystack = `${post.title} ${post.excerpt} ${post.category}`.toLowerCase();
    return matchesCategory && haystack.includes(search.toLowerCase());
  }), [category, posts, search]);

  return (
    <main className="overflow-x-clip bg-cream">
      <section className="bg-ink">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-14 sm:pt-40 sm:pb-20 lg:pt-48 lg:pb-24">
          <FadeUp delay={0}><Eyebrow className="text-teal-light mb-5">Dental health blog</Eyebrow></FadeUp>
          <RevealLines as="h1" className="font-display font-medium text-white text-[40px] sm:text-[56px] lg:text-[72px] leading-[1.02] tracking-tight max-w-[820px]"
            lines={['Advice from', <><em className="italic font-normal text-[#CFEDED]">the chair.</em></>]} />
          <FadeUp delay={550}><p className="mt-6 max-w-[560px] text-base sm:text-lg leading-relaxed text-white/80">Practical tips, treatment guides and oral-health insights from our dental team.</p></FadeUp>
        </div>
      </section>

      <section className="bg-white border-b border-hairline">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
          <div className="relative w-full md:max-w-sm">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-ink" aria-hidden="true" />
            <input type="search" placeholder="Search articles" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search articles"
              className="w-full h-11 pl-11 pr-4 bg-cream border border-hairline text-ink placeholder:text-muted-ink/70 focus:outline-none focus:border-teal focus:ring-2 focus:ring-teal/20" />
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button key={cat} type="button" onClick={() => setCategory(cat)} aria-pressed={category === cat}
                className={`h-10 px-4 rounded-full text-[13px] font-semibold border transition-colors ${category === cat ? 'bg-ink text-white border-ink' : 'bg-white text-ink border-hairline hover:border-ink'}`}>
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        {filtered.length > 0 ? (
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7" step={0.06}>
            {filtered.map((post) => (
              <StaggerItem key={post.id} className="group">
                <Link href={`/blog/${post.slug}`} className="flex h-full flex-col bg-white border border-hairline text-ink hover:text-ink hover:border-ink transition-colors">
                  <div className="relative h-[200px] sm:h-[220px] overflow-hidden">
                    <Image src={post.cover_image} alt={post.title} fill sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw" className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]" />
                  </div>
                  <div className="p-6 flex-1 flex flex-col">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-teal mb-3">{post.category} · {formatDate(post.published_at || post.created_at)}</p>
                    <h3 className="font-display font-medium text-[26px] leading-tight mb-2">{post.title}</h3>
                    <p className="text-[14px] leading-relaxed text-muted-ink flex-1">{post.excerpt}</p>
                    <span className="inline-flex items-center gap-2 mt-5 text-sm font-semibold text-teal">Read article <Arrow className="w-4 h-4" /></span>
                  </div>
                </Link>
              </StaggerItem>
            ))}
          </StaggerContainer>
        ) : (
          <FadeInUp className="text-center py-20">
            <p className="font-display font-medium text-ink text-[26px] mb-2">No articles found</p>
            <p className="text-muted-ink">Try a different search or category.</p>
          </FadeInUp>
        )}
      </section>
    </main>
  );
}
