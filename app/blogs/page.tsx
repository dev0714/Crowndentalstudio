'use client';

import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FileImage, FileText, Plus, RefreshCcw, Trash2, Upload } from 'lucide-react';
import type { BlogPost } from '@/lib/blog/types';

type BlogFormState = {
  title: string;
  excerpt: string;
  content: string;
  is_published: boolean;
};

const EMPTY_FORM: BlogFormState = {
  title: '',
  excerpt: '',
  content: '',
  is_published: true,
};

function toFormState(post: BlogPost): BlogFormState {
  return {
    title: post.title,
    excerpt: post.excerpt,
    content: post.content,
    is_published: post.is_published,
  };
}

function BlogsContent() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [form, setForm] = useState<BlogFormState>(EMPTY_FORM);
  const [search, setSearch] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFileName, setImageFileName] = useState<string | null>(null);
  const [coverImageUrl, setCoverImageUrl] = useState<string>('');

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
    setCoverImageUrl(post.cover_image);
    setImagePreview(post.cover_image);
    setImageFileName(null);
    setError(null);
  };

  const handleNewPost = () => {
    setSelectedPostId(null);
    setForm(EMPTY_FORM);
    setImagePreview(null);
    setImageFileName(null);
    setCoverImageUrl('');
    setError(null);
  };

  const handleFieldChange = (field: keyof BlogFormState, value: string | boolean) => {
    setForm((current) => ({
      ...current,
      [field]: value,
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
        body: JSON.stringify({
          ...form,
          cover_image: coverImageUrl || '/blog-default.jpg',
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to save blog post');
      }

      const savedPost = payload.data as BlogPost;
      setSelectedPostId(savedPost.id);
      setForm(toFormState(savedPost));
      setCoverImageUrl(savedPost.cover_image);
      setImagePreview(savedPost.cover_image);
      await fetchPosts();
    } catch (err) {
      console.error('[v0] Error saving blog post:', err);
      setError(err instanceof Error ? err.message : 'Failed to save blog post');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    if (!form.title.trim()) {
      alert('Please add a title first so the image can be grouped correctly.');
      return;
    }

    setUploadingImage(true);
    setError(null);

    try {
      const uploadForm = new FormData();
      uploadForm.append('file', file);
      uploadForm.append('title', form.title);

      const response = await fetch('/api/crm/blog-posts/upload-image', {
        method: 'POST',
        credentials: 'include',
        body: uploadForm,
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to upload image');
      }

      setCoverImageUrl(payload.data.url);
      setImagePreview(payload.data.url);
      setImageFileName(file.name);
    } catch (err) {
      console.error('[v0] Error uploading image:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setUploadingImage(false);
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
              Write and publish blog posts without needing technical settings.
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
                Pick a post to edit, or create a new one.
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
                            <p className="text-xs text-slate-500 truncate mt-1">
                              {post.excerpt || 'No summary yet'}
                            </p>
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
                          <span>{post.is_published ? 'Visible on website' : 'Hidden from website'}</span>
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
                    The website updates automatically. The link slug is created from the title for you.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
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
                  Short Summary
                </label>
                <Textarea
                  value={form.excerpt}
                  onChange={(e) => handleFieldChange('excerpt', e.target.value)}
                  placeholder="A short summary that appears on the website blog page"
                  className="min-h-24 rounded-xl border-slate-200"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Main Content
                </label>
                <Textarea
                  value={form.content}
                  onChange={(e) => handleFieldChange('content', e.target.value)}
                  placeholder="Write the full blog post here..."
                  className="min-h-[380px] rounded-xl border-slate-200"
                />
                <p className="text-xs text-slate-500">
                  Keep a blank line between paragraphs. If needed, lines starting with `1.` become numbered
                  lists, `-` becomes bullets, and headings can be wrapped in `**double asterisks**`.
                </p>
              </div>

              <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Blog Picture</p>
                    <p className="text-xs text-slate-500">Upload an image to the Supabase bucket.</p>
                  </div>
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          void handleImageUpload(file);
                        }
                        e.currentTarget.value = '';
                      }}
                    />
                    <span className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm border border-slate-200 hover:bg-slate-50">
                      <Upload className="w-4 h-4" />
                      {uploadingImage ? 'Uploading...' : 'Upload Picture'}
                    </span>
                  </label>
                </div>

                {(imagePreview || coverImageUrl) ? (
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <div className="relative aspect-[16/9] bg-slate-100">
                      <img
                        src={imagePreview || coverImageUrl}
                        alt="Blog cover preview"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3 px-4 py-3 text-xs text-slate-600">
                      <span className="flex items-center gap-2 truncate">
                        <FileImage className="w-4 h-4" />
                        {imageFileName || 'Uploaded image'}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setImagePreview(null);
                          setImageFileName(null);
                          setCoverImageUrl('');
                        }}
                        className="font-semibold text-blue-600 hover:text-blue-700"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center">
                    <p className="text-sm font-medium text-slate-700">No image uploaded yet</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Upload a picture and it will be saved in the Supabase bucket.
                    </p>
                  </div>
                )}
                <p className="text-xs text-slate-500 break-all">
                  {coverImageUrl ? coverImageUrl : 'No image URL yet'}
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
                  disabled={saving || uploadingImage}
                  className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 border-0 shadow-md"
                >
                  {saving ? 'Saving...' : selectedPost ? 'Save Changes' : 'Create Post'}
                </Button>
                {selectedPost && (
                  <Button
                    variant="destructive"
                    onClick={() => handleDelete(selectedPost)}
                    disabled={saving || uploadingImage}
                  >
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
