import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/current-user';
import { assertRole } from '@/lib/auth/permissions';
import { writeAuditEntry } from '@/lib/audit/write-audit-entry';
import { deleteBlogPost, getBlogPostById, updateBlogPost } from '@/lib/blog/store';

function ensureBlogAdminAccess(userRole: string) {
  assertRole(userRole, ['CEO', 'Admin']);
}

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_: NextRequest, context: RouteContext) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    ensureBlogAdminAccess(user.role);

    const { id } = await context.params;
    const data = await getBlogPostById(id);

    if (!data) {
      return NextResponse.json({ error: 'Blog post not found' }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error fetching blog post:', error);
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to fetch blog post' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    ensureBlogAdminAccess(user.role);

    const { id } = await context.params;
    const body = await request.json();
    if (!body.title || !body.content) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
    }

    const data = await updateBlogPost(id, body, user.id);
    await writeAuditEntry({
      actor: user,
      action: 'blog_post.updated',
      entityType: 'blog_post',
      entityId: data.id,
      metadata: { slug: data.slug, title: data.title },
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error updating blog post:', error);
    if (error instanceof Error) {
      if (error.message === 'Forbidden') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      if (error.message === 'Blog post not found') {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update blog post' }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, context: RouteContext) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    ensureBlogAdminAccess(user.role);

    const { id } = await context.params;
    const deleted = await deleteBlogPost(id, user.id);
    await writeAuditEntry({
      actor: user,
      action: 'blog_post.deleted',
      entityType: 'blog_post',
      entityId: deleted.id,
      metadata: { slug: deleted.slug, title: deleted.title },
    });

    return NextResponse.json({ message: 'Blog post deleted successfully' });
  } catch (error) {
    console.error('Error deleting blog post:', error);
    if (error instanceof Error) {
      if (error.message === 'Forbidden') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      if (error.message === 'Blog post not found') {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to delete blog post' }, { status: 500 });
  }
}
