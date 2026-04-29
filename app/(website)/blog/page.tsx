import { BlogIndexClient } from '@/components/blog/blog-index-client';
import { getPublishedBlogPosts } from '@/lib/blog/store';

export const dynamic = 'force-dynamic';

export default async function Blog() {
  const posts = await getPublishedBlogPosts();

  return <BlogIndexClient posts={posts} />;
}
