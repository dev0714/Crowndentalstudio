export type BlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  cover_image: string;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
};

export type BlogPostInput = {
  title: string;
  slug?: string;
  excerpt?: string;
  content: string;
  category?: string;
  cover_image?: string;
  is_published?: boolean;
  published_at?: string | null;
};
