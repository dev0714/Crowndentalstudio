import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getVoiceNotesSettingKey,
  upsertVoiceNoteRecord,
  removeVoiceNoteRecord,
} from './voice-note-store.ts';

test('getVoiceNotesSettingKey scopes notes to a patient', () => {
  assert.equal(getVoiceNotesSettingKey('patient-123'), 'voice_notes:patient-123');
});

test('upsertVoiceNoteRecord replaces an existing note and keeps newest first', () => {
  const original = [
    { id: 'a', created_at: '2026-04-29T08:00:00.000Z' },
    { id: 'b', created_at: '2026-04-29T09:00:00.000Z' },
  ] as Array<{ id: string; created_at: string }>;

  const updated = upsertVoiceNoteRecord(original, { id: 'a', created_at: '2026-04-29T10:00:00.000Z' });

  assert.deepEqual(updated.map((note) => note.id), ['a', 'b']);
  assert.equal(updated[0].created_at, '2026-04-29T10:00:00.000Z');
});

test('removeVoiceNoteRecord removes a note by id', () => {
  const original = [
    { id: 'a' },
    { id: 'b' },
  ] as Array<{ id: string }>;

  const updated = removeVoiceNoteRecord(original, 'a');

  assert.deepEqual(updated.map((note) => note.id), ['b']);
});
