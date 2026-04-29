'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Search, ArrowRight, Calendar, Tag } from 'lucide-react';
import {
  FadeInUp,
  FloatingBlob,
  FloatingBlobAlt,
  HeroText,
  StaggerContainer,
  StaggerItem,
} from '@/components/motion';
import type { BlogPost } from '@/lib/blog/types';

const categoryColors: Record<string, string> = {
  Cosmetic: 'from-pink-400 to-rose-500',
  Preventive: 'from-emerald-400 to-teal-500',
  General: 'from-blue-400 to-cyan-500',
  "Children's": 'from-yellow-400 to-orange-500',
};

export function BlogIndexClient({ posts }: { posts: BlogPost[] }) {
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');

  const categories = useMemo(() => {
    const uniqueCategories = Array.from(
      new Set(posts.map((post) => post.category).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));

    return ['All', ...uniqueCategories];
  }, [posts]);

  const filtered = useMemo(() => {
    return posts.filter((post) => {
      const matchesCategory = category === 'All' || post.category === category;
      const haystack = `${post.title} ${post.excerpt} ${post.category}`.toLowerCase();
      const matchesSearch = haystack.includes(search.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [category, posts, search]);

  return (
    <main className="overflow-hidden">
      <section className="relative min-h-[50vh] flex items-end pb-16 bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-500 overflow-hidden pt-28">
        <FloatingBlob className="absolute top-10 right-20 w-80 h-80 bg-cyan-400/20 rounded-full blur-3xl pointer-events-none" />
        <FloatingBlobAlt className="absolute bottom-0 left-10 w-64 h-64 bg-blue-300/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <HeroText>
            <h1 className="text-6xl md:text-7xl font-bold text-white leading-tight">
              Dental Health
              <br />
              <span className="gradient-text">Blog</span>
            </h1>
            <p className="text-xl text-white/75 mt-4 max-w-xl">
              Expert tips, treatment guides, and oral health insights from our dental team.
            </p>
          </HeroText>
        </div>
      </section>

      <section className="relative py-10 bg-gradient-to-b from-blue-900 to-blue-800 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeInUp className="space-y-5">
            <div className="relative max-w-xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-cyan-400" />
              <input
                type="text"
                placeholder="Search articles..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255,255,255,0.2)',
                }}
              />
            </div>

            <div className="flex flex-wrap gap-3">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                    category === cat
                      ? 'bg-white text-blue-700 shadow-lg scale-105'
                      : 'text-white/80 hover:text-white hover:bg-white/15'
                  }`}
                  style={
                    category !== cat
                      ? { background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }
                      : {}
                  }
                >
                  {cat}
                </button>
              ))}
            </div>
          </FadeInUp>
        </div>
      </section>

      <section className="relative py-20 bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-500 overflow-hidden">
        <FloatingBlob className="absolute top-10 right-10 w-72 h-72 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <FloatingBlobAlt className="absolute bottom-10 left-10 w-64 h-64 bg-cyan-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {filtered.length > 0 ? (
            <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((post) => (
                <StaggerItem key={post.id}>
                  <Link href={`/blog/${post.slug}`}>
                    <div className="group glass-heavy rounded-3xl overflow-hidden hover:-translate-y-2 transition-all duration-500 hover:bg-white/25 shine-on-hover h-full flex flex-col">
                      <div className="relative h-48 overflow-hidden">
                        <Image
                          src={post.cover_image}
                          alt={post.title}
                          fill
                          className="object-cover group-hover:scale-110 transition-transform duration-700"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-blue-900/60 to-transparent" />
                        <div className="absolute top-4 left-4">
                          <span
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r ${
                              categoryColors[post.category] || 'from-blue-400 to-cyan-500'
                            } shadow-lg`}
                          >
                            <Tag className="w-3 h-3" />
                            {post.category}
                          </span>
                        </div>
                      </div>

                      <div className="p-6 flex-1 flex flex-col">
                        <h3 className="text-lg font-bold text-white mb-3 leading-snug group-hover:text-cyan-200 transition-colors">
                          {post.title}
                        </h3>
                        <p className="text-white/65 text-sm mb-5 leading-relaxed flex-1">
                          {post.excerpt}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-white/50 text-xs">
                            <Calendar className="w-3 h-3" />
                            {new Date(post.published_at || post.created_at).toLocaleDateString('en-ZA', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </div>
                          <span className="inline-flex items-center gap-1 text-cyan-300 text-sm font-bold group-hover:gap-2 transition-all">
                            Read More <ArrowRight className="w-4 h-4" />
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </StaggerItem>
              ))}
            </StaggerContainer>
          ) : (
            <FadeInUp className="text-center py-20">
              <div className="glass-heavy rounded-3xl p-12 max-w-md mx-auto">
                <p className="text-white text-xl font-semibold mb-2">No articles found</p>
                <p className="text-white/60">Try adjusting your search or category filter.</p>
              </div>
            </FadeInUp>
          )}
        </div>
      </section>
    </main>
  );
}
