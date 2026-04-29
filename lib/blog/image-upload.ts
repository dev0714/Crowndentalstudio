const SUPPORTED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
]);

function slugifySegment(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function normalizeExtension(fileName: string) {
  const match = fileName.toLowerCase().match(/\.(png|jpe?g|webp|gif|avif)$/);
  if (!match) {
    return 'jpg';
  }

  return match[1] === 'jpeg' ? 'jpg' : match[1];
}

export function isSupportedBlogImageMimeType(mimeType: string) {
  return SUPPORTED_IMAGE_MIME_TYPES.has(mimeType.toLowerCase());
}

export function buildBlogImageStoragePath(title: string, fileName: string, uploadId: string, now = new Date()) {
  const dateSegment = now.toISOString().slice(0, 10);
  const titleSegment = slugifySegment(title) || 'blog';
  const extension = normalizeExtension(fileName);
  const nameSegment = slugifySegment(fileName.replace(/\.[^.]+$/, '')) || 'image';

  return `${titleSegment}/${dateSegment}/${uploadId}-${nameSegment}.${extension}`;
}
