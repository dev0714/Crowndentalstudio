import 'server-only';

import { DEFAULT_BLOG_POSTS } from './default-posts';
import { slugifyBlogTitle } from './slug';
import { supabaseServer } from '@/lib/supabase/server';
import type { BlogPost, BlogPostInput } from './types';

const BLOG_SETTINGS_KEY = 'blog_posts';

function cloneDefaultPosts() {
  return DEFAULT_BLOG_POSTS.map((post) => ({ ...post }));
}

function normalizeBlogPost(raw: Partial<BlogPost>): BlogPost | null {
  if (!raw.id || !raw.title || !raw.slug || !raw.content) {
    return null;
  }

  return {
    id: String(raw.id),
    title: String(raw.title),
    slug: String(raw.slug),
    excerpt: String(raw.excerpt || ''),
    content: String(raw.content),
    category: String(raw.category || 'General'),
    cover_image: String(raw.cover_image || '/blog-default.jpg'),
    is_published: Boolean(raw.is_published),
    published_at: raw.published_at ? String(raw.published_at) : null,
    created_at: String(raw.created_at || new Date().toISOString()),
    updated_at: String(raw.updated_at || new Date().toISOString()),
    created_by: raw.created_by ? String(raw.created_by) : null,
  };
}

async function readStoredBlogPosts(): Promise<BlogPost[] | null> {
  const { data, error } = await supabaseServer
    .from('settings')
    .select('setting_value')
    .eq('setting_key', BLOG_SETTINGS_KEY)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.setting_value) {
    return null;
  }

  try {
    const parsed = JSON.parse(data.setting_value);
    if (!Array.isArray(parsed)) {
      return null;
    }

    const normalized = parsed
      .map((entry) => normalizeBlogPost(entry as Partial<BlogPost>))
      .filter((entry): entry is BlogPost => Boolean(entry));

    return normalized.length > 0 ? normalized : null;
  } catch {
    return null;
  }
}

export async function getAllBlogPosts() {
  const stored = await readStoredBlogPosts();
  const posts = stored ?? cloneDefaultPosts();

  return posts.sort((a, b) => {
    const aTime = new Date(a.published_at || a.updated_at).getTime();
    const bTime = new Date(b.published_at || b.updated_at).getTime();
    return bTime - aTime;
  });
}

export async function getPublishedBlogPosts() {
  const posts = await getAllBlogPosts();

  return posts.filter((post) => post.is_published);
}

export async function getPublishedBlogPostBySlug(slug: string) {
  const posts = await getPublishedBlogPosts();
  return posts.find((post) => post.slug === slug) || null;
}

export async function getBlogPostById(id: string) {
  const posts = await getAllBlogPosts();
  return posts.find((post) => post.id === id) || null;
}

export async function saveBlogPosts(posts: BlogPost[], updatedBy: string | null) {
  const payload = JSON.stringify(posts);
  const { error } = await supabaseServer.from('settings').upsert(
    [
      {
        setting_key: BLOG_SETTINGS_KEY,
        setting_value: payload,
        setting_type: 'json',
        description: 'Managed blog posts for the public website and CRM editor',
        updated_by: updatedBy,
        updated_at: new Date().toISOString(),
      },
    ],
    { onConflict: 'setting_key' }
  );

  if (error) {
    throw new Error(error.message);
  }
}

export async function createBlogPost(input: BlogPostInput, userId: string | null) {
  const posts = await getAllBlogPosts();
  const now = new Date().toISOString();
  const slug = slugifyBlogTitle(input.slug || input.title);

  if (!slug) {
    throw new Error('Slug is required');
  }

  if (posts.some((post) => post.slug === slug)) {
    throw new Error('A blog post with this slug already exists');
  }

  const blogPost: BlogPost = {
    id: crypto.randomUUID(),
    title: input.title.trim(),
    slug,
    excerpt: String(input.excerpt || '').trim(),
    content: input.content.trim(),
    category: String(input.category || 'General').trim() || 'General',
    cover_image: String(input.cover_image || '').trim() || '/blog-default.jpg',
    is_published: Boolean(input.is_published),
    published_at: input.is_published ? input.published_at || now : null,
    created_at: now,
    updated_at: now,
    created_by: userId,
  };

  const nextPosts = [blogPost, ...posts];
  await saveBlogPosts(nextPosts, userId);

  return blogPost;
}

export async function updateBlogPost(id: string, input: BlogPostInput, userId: string | null) {
  const posts = await getAllBlogPosts();
  const existing = posts.find((post) => post.id === id);

  if (!existing) {
    throw new Error('Blog post not found');
  }

  const nextSlug = slugifyBlogTitle(input.slug || input.title);
  if (!nextSlug) {
    throw new Error('Slug is required');
  }

  if (posts.some((post) => post.id !== id && post.slug === nextSlug)) {
    throw new Error('A blog post with this slug already exists');
  }

  const updated: BlogPost = {
    ...existing,
    title: input.title.trim(),
    slug: nextSlug,
    excerpt: String(input.excerpt || '').trim(),
    content: input.content.trim(),
    category: String(input.category || 'General').trim() || 'General',
    cover_image: String(input.cover_image || '').trim() || '/blog-default.jpg',
    is_published: Boolean(input.is_published),
    published_at: input.is_published
      ? input.published_at || existing.published_at || new Date().toISOString()
      : null,
    updated_at: new Date().toISOString(),
  };

  const nextPosts = posts.map((post) => (post.id === id ? updated : post));
  await saveBlogPosts(nextPosts, userId);

  return updated;
}

export async function deleteBlogPost(id: string, userId: string | null) {
  const posts = await getAllBlogPosts();
  const existing = posts.find((post) => post.id === id);

  if (!existing) {
    throw new Error('Blog post not found');
  }

  const nextPosts = posts.filter((post) => post.id !== id);
  await saveBlogPosts(nextPosts, userId);

  return existing;
}
