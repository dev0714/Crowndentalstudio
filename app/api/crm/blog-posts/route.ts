import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/current-user';
import { assertRole } from '@/lib/auth/permissions';
import { writeAuditEntry } from '@/lib/audit/write-audit-entry';
import { createBlogPost, getAllBlogPosts } from '@/lib/blog/store';

function ensureBlogAdminAccess(userRole: string) {
  assertRole(userRole, ['CEO', 'Admin']);
}

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    ensureBlogAdminAccess(user.role);

    const data = await getAllBlogPosts();
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to fetch blog posts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    ensureBlogAdminAccess(user.role);

    const body = await request.json();
    if (!body.title || !body.content) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
    }

    const data = await createBlogPost(body, user.id);
    await writeAuditEntry({
      actor: user,
      action: 'blog_post.created',
      entityType: 'blog_post',
      entityId: data.id,
      metadata: { slug: data.slug, title: data.title },
    });

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('Error creating blog post:', error);
    if (error instanceof Error) {
      if (error.message === 'Forbidden') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create blog post' }, { status: 500 });
  }
}
