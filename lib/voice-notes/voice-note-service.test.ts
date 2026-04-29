import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoiceNoteRecord } from './voice-note-service.ts';

test('createVoiceNoteRecord stores audio, transcript, and patient document metadata', async () => {
  const file = new File(['hello world'], 'recording.webm', { type: 'audio/webm' });
  const uploadCalls: Array<{ path: string; filename: string; mimeType: string }> = [];
  const insertCalls: Array<Record<string, unknown>> = [];

  const result = await createVoiceNoteRecord(
    {
      patientId: 'patient-123',
      patientName: 'John Smith',
      file,
      filename: 'recording.webm',
      now: new Date('2026-04-29T10:15:00.000Z'),
      uploadId: 'upload-abc',
    },
    {
      uploadAudio: async ({ path, file, filename, mimeType }) => {
        uploadCalls.push({ path, filename, mimeType });
        return { audioPath: path, audioUrl: `https://cdn.example.com/${path}` };
      },
      transcribeAudio: async () => 'Patient reports mild tooth pain.',
      insertDocument: async (payload) => {
        insertCalls.push(payload);
        return { ...payload, id: 'doc-1', created_at: '2026-04-29T10:15:00.000Z' };
      },
    },
  );

  assert.equal(uploadCalls.length, 1);
  assert.equal(uploadCalls[0].filename, 'recording.webm');
  assert.equal(uploadCalls[0].mimeType, 'audio/webm');
  assert.match(uploadCalls[0].path, /^patients\/john-smith\/2026-04-29\/upload-abc-recording\.webm$/);

  assert.equal(insertCalls.length, 1);
  assert.equal(insertCalls[0].document_type, 'voice_note');
  assert.equal(insertCalls[0].patient_id, 'patient-123');
  assert.equal(insertCalls[0].title, 'Voice note - John Smith - 29 Apr 2026');
  assert.equal(insertCalls[0].content, 'Patient reports mild tooth pain.');
  assert.equal(insertCalls[0].metadata.audio_url, `https://cdn.example.com/${uploadCalls[0].path}`);
  assert.equal(insertCalls[0].metadata.audio_path, uploadCalls[0].path);
  assert.equal(insertCalls[0].metadata.transcription_model, 'whisper-1');
  assert.equal(result.id, 'doc-1');
  assert.equal(result.audioUrl, `https://cdn.example.com/${uploadCalls[0].path}`);
  assert.equal(result.transcript, 'Patient reports mild tooth pain.');
});

test('createVoiceNoteRecord keeps the voice note even if transcription fails', async () => {
  const file = new File(['hello world'], 'recording.webm', { type: 'audio/webm' });
  const insertCalls: Array<Record<string, unknown>> = [];

  const result = await createVoiceNoteRecord(
    {
      patientId: 'patient-123',
      patientName: 'John Smith',
      file,
      filename: 'recording.webm',
      now: new Date('2026-04-29T10:15:00.000Z'),
      uploadId: 'upload-abc',
    },
    {
      uploadAudio: async ({ path }) => ({ audioPath: path, audioUrl: `https://cdn.example.com/${path}` }),
      transcribeAudio: async () => {
        throw new Error('OpenAI unavailable');
      },
      insertDocument: async (payload) => {
        insertCalls.push(payload);
        return { ...payload, id: 'doc-2', created_at: '2026-04-29T10:15:00.000Z' };
      },
    },
  );

  assert.equal(insertCalls.length, 1);
  assert.equal(insertCalls[0].content, '');
  assert.equal(insertCalls[0].metadata.transcription_status, 'failed');
  assert.equal(insertCalls[0].metadata.transcription_error, 'OpenAI unavailable');
  assert.equal(result.transcript, '');
  assert.equal(result.transcriptionStatus, 'failed');
});
