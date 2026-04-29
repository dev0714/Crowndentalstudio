import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildBlogImageStoragePath,
  isSupportedBlogImageMimeType,
} from './image-upload.ts';

test('buildBlogImageStoragePath creates a stable foldered object path', () => {
  const path = buildBlogImageStoragePath(
    'Bright Smile Post',
    'My Hero Image.JPG',
    'upload-123',
    new Date('2026-04-29T12:00:00.000Z'),
  );

  assert.equal(path, 'bright-smile-post/2026-04-29/upload-123-my-hero-image.jpg');
});

test('isSupportedBlogImageMimeType only allows image uploads', () => {
  assert.equal(isSupportedBlogImageMimeType('image/png'), true);
  assert.equal(isSupportedBlogImageMimeType('application/pdf'), false);
});
