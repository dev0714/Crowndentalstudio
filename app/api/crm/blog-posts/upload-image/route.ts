import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/current-user';
import { assertRole } from '@/lib/auth/permissions';
import { buildBlogImageStoragePath, isSupportedBlogImageMimeType } from '@/lib/blog/image-upload';
import { supabaseServer } from '@/lib/supabase/server';

function ensureBlogAdminAccess(userRole: string) {
  assertRole(userRole, ['CEO', 'Admin']);
}

function getBlogImagesBucketName() {
  return process.env.SUPABASE_BLOG_IMAGES_BUCKET || 'blog-images';
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    ensureBlogAdminAccess(user.role);

    const formData = await request.formData();
    const file = formData.get('file');
    const title = String(formData.get('title') || 'blog').trim() || 'blog';

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Image file is required' }, { status: 400 });
    }

    if (!isSupportedBlogImageMimeType(file.type)) {
      return NextResponse.json({ error: 'Please upload a JPG, PNG, WEBP, GIF, or AVIF image' }, { status: 400 });
    }

    const uploadId = randomUUID();
    const fileName = file.name || 'image.jpg';
    const objectPath = buildBlogImageStoragePath(title, fileName, uploadId);
    const bucketName = getBlogImagesBucketName();
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    const { error } = await supabaseServer.storage
      .from(bucketName)
      .upload(objectPath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      throw new Error(error.message);
    }

    const { data } = supabaseServer.storage.from(bucketName).getPublicUrl(objectPath);

    if (!data?.publicUrl) {
      throw new Error('Could not build the public image URL');
    }

    return NextResponse.json({
      data: {
        url: data.publicUrl,
        path: objectPath,
        bucket: bucketName,
      },
    });
  } catch (error) {
    console.error('Error uploading blog image:', error);
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload blog image' },
      { status: 500 }
    );
  }
}
