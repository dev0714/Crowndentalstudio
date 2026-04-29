'use client';

import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FileText, PencilLine, Plus, RefreshCcw, Trash2 } from 'lucide-react';
import { slugifyBlogTitle } from '@/lib/blog/slug';
import type { BlogPost } from '@/lib/blog/types';

type BlogFormState = {
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  content: string;
  cover_image: string;
  is_published: boolean;
};

const EMPTY_FORM: BlogFormState = {
  title: '',
  slug: '',
  category: 'General',
  excerpt: '',
  content: '',
  cover_image: '/blog-default.jpg',
  is_published: true,
};

function toFormState(post: BlogPost): BlogFormState {
  return {
    title: post.title,
    slug: post.slug,
    category: post.category,
    excerpt: post.excerpt,
    content: post.content,
    cover_image: post.cover_image,
    is_published: post.is_published,
  };
}

function BlogsContent() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [form, setForm] = useState<BlogFormState>(EMPTY_FORM);
  const [search, setSearch] = useState('');

  const selectedPost = useMemo(
    () => posts.find((post) => post.id === selectedPostId) || null,
    [posts, selectedPostId]
  );

  const filteredPosts = useMemo(() => {
    const query = search.toLowerCase().trim();
    if (!query) return posts;
    return posts.filter((post) =>
      `${post.title} ${post.category} ${post.slug}`.toLowerCase().includes(query)
    );
  }, [posts, search]);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/crm/blog-posts', {
        credentials: 'include',
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to load blog posts');
      }

      setPosts(payload.data || []);
    } catch (err) {
      console.error('[v0] Error fetching blog posts:', err);
      setError(err instanceof Error ? err.message : 'Failed to load blog posts');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPost = (post: BlogPost) => {
    setSelectedPostId(post.id);
    setForm(toFormState(post));
    setError(null);
  };

  const handleNewPost = () => {
    setSelectedPostId(null);
    setForm(EMPTY_FORM);
    setError(null);
  };

  const handleFieldChange = (field: keyof BlogFormState, value: string | boolean) => {
    setForm((current) => {
      const next = { ...current, [field]: value };

      if (field === 'title' && !current.slug.trim()) {
        next.slug = slugifyBlogTitle(String(value));
      }

      return next;
    });
  };

  const handleGenerateSlug = () => {
    setForm((current) => ({
      ...current,
      slug: slugifyBlogTitle(current.title),
    }));
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      alert('Please add a title and content before saving.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const url = selectedPostId
        ? `/api/crm/blog-posts/${selectedPostId}`
        : '/api/crm/blog-posts';
      const method = selectedPostId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(form),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to save blog post');
      }

      const savedPost = payload.data as BlogPost;
      setSelectedPostId(savedPost.id);
      setForm(toFormState(savedPost));
      await fetchPosts();
    } catch (err) {
      console.error('[v0] Error saving blog post:', err);
      setError(err instanceof Error ? err.message : 'Failed to save blog post');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (post: BlogPost) => {
    if (!confirm(`Delete "${post.title}"?`)) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/crm/blog-posts/${post.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to delete blog post');
      }

      if (selectedPostId === post.id) {
        handleNewPost();
      }

      await fetchPosts();
    } catch (err) {
      console.error('[v0] Error deleting blog post:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete blog post');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Blog Manager</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Add, edit, publish, and remove website blog posts from the CRM.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={fetchPosts} disabled={loading || saving}>
              <RefreshCcw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button
              onClick={handleNewPost}
              className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 border-0 shadow-md"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Post
            </Button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-[360px,1fr] gap-5">
          <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4 px-6">
              <CardTitle className="text-base">Posts</CardTitle>
              <CardDescription className="text-xs">
                Published and draft articles currently powering the website blog.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <Input
                placeholder="Search posts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="rounded-xl border-slate-200"
              />

              {loading ? (
                <div className="py-8 text-center text-sm text-slate-500">Loading posts...</div>
              ) : filteredPosts.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-500">No posts found.</div>
              ) : (
                <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
                  {filteredPosts.map((post) => {
                    const isActive = post.id === selectedPostId;
                    return (
                      <button
                        key={post.id}
                        onClick={() => handleSelectPost(post)}
                        className={`w-full text-left p-3 rounded-2xl border transition-all ${
                          isActive
                            ? 'border-cyan-400 bg-cyan-50 shadow-sm'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 truncate">{post.title}</p>
                            <p className="text-xs text-slate-500 truncate mt-1">/{post.slug}</p>
                          </div>
                          <span
                            className={`text-[11px] font-semibold px-2 py-1 rounded-full ${
                              post.is_published
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {post.is_published ? 'Published' : 'Draft'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-3 text-xs text-slate-500">
                          <span>{post.category}</span>
                          <span>
                            {new Date(post.published_at || post.updated_at).toLocaleDateString('en-ZA')}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4 px-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center shadow-sm">
                  <FileText className="w-4 h-4 text-white" />
                </div>
                <div>
                  <CardTitle className="text-base">
                    {selectedPost ? 'Edit Blog Post' : 'Create Blog Post'}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Website updates pull from this content automatically.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Title
                  </label>
                  <Input
                    value={form.title}
                    onChange={(e) => handleFieldChange('title', e.target.value)}
                    placeholder="Article title"
                    className="rounded-xl border-slate-200"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Category
                  </label>
                  <Input
                    value={form.category}
                    onChange={(e) => handleFieldChange('category', e.target.value)}
                    placeholder="General"
                    className="rounded-xl border-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[1fr,auto] gap-4 items-end">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Slug
                  </label>
                  <Input
                    value={form.slug}
                    onChange={(e) => handleFieldChange('slug', e.target.value)}
                    placeholder="teeth-whitening-tips"
                    className="rounded-xl border-slate-200"
                  />
                </div>
                <Button variant="outline" onClick={handleGenerateSlug}>
                  <PencilLine className="w-4 h-4 mr-2" />
                  Generate Slug
                </Button>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Excerpt
                </label>
                <Textarea
                  value={form.excerpt}
                  onChange={(e) => handleFieldChange('excerpt', e.target.value)}
                  placeholder="Short summary shown on the blog listing page"
                  className="min-h-24 rounded-xl border-slate-200"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Cover Image Path
                </label>
                <Input
                  value={form.cover_image}
                  onChange={(e) => handleFieldChange('cover_image', e.target.value)}
                  placeholder="/blog-default.jpg"
                  className="rounded-xl border-slate-200"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Content
                </label>
                <Textarea
                  value={form.content}
                  onChange={(e) => handleFieldChange('content', e.target.value)}
                  placeholder="Write the full blog content here..."
                  className="min-h-[320px] rounded-xl border-slate-200"
                />
                <p className="text-xs text-slate-500">
                  Use blank lines between paragraphs. Lines starting with `1.` become numbered lists,
                  `-` becomes bullets, and headings can be wrapped in `**double asterisks**`.
                </p>
              </div>

              <label className="flex items-center gap-3 p-4 rounded-2xl border border-slate-200 bg-slate-50/70">
                <input
                  type="checkbox"
                  checked={form.is_published}
                  onChange={(e) => handleFieldChange('is_published', e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <p className="text-sm font-semibold text-slate-900">Published on website</p>
                  <p className="text-xs text-slate-500">
                    Turn this off to keep the article saved in CRM but hidden from the public site.
                  </p>
                </div>
              </label>

              <div className="flex flex-wrap gap-3 pt-2">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 border-0 shadow-md"
                >
                  {saving ? 'Saving...' : selectedPost ? 'Save Changes' : 'Create Post'}
                </Button>
                {selectedPost && (
                  <Button variant="destructive" onClick={() => handleDelete(selectedPost)} disabled={saving}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Post
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function BlogsPage() {
  return (
    <DashboardLayout>
      <BlogsContent />
    </DashboardLayout>
  );
}
