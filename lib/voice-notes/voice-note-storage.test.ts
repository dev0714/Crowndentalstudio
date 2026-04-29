import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildVoiceNoteStoragePath,
  buildVoiceNoteTitle,
  isSupportedVoiceNoteMimeType,
} from './voice-note-storage.ts';

test('buildVoiceNoteStoragePath creates a patient-scoped audio path', () => {
  const path = buildVoiceNoteStoragePath(
    'patient-123',
    'Ada Mthembu',
    'Recording.MP3',
    'upload-123',
    'audio/mpeg',
    new Date('2026-04-29T12:00:00.000Z'),
  );

  assert.equal(path, 'patients/ada-mthembu/2026-04-29/upload-123-recording.mp3');
});

test('buildVoiceNoteTitle creates a readable title', () => {
  const title = buildVoiceNoteTitle('Ada Mthembu', new Date('2026-04-29T12:00:00.000Z'));
  assert.match(title, /^Voice note - Ada Mthembu - /);
});

test('isSupportedVoiceNoteMimeType allows audio uploads only', () => {
  assert.equal(isSupportedVoiceNoteMimeType('audio/webm'), true);
  assert.equal(isSupportedVoiceNoteMimeType('image/png'), false);
});
