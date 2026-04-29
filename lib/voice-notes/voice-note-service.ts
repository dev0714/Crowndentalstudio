import { buildVoiceNoteStoragePath, buildVoiceNoteTitle } from './voice-note-storage.ts';

export type VoiceNoteUploadResult = {
  audioPath: string;
  audioUrl: string;
};

export type VoiceNoteInsertPayload = Record<string, unknown> & {
  patient_id: string;
  document_type: string;
  title: string;
  content: string;
  metadata: Record<string, unknown>;
};

type CreateVoiceNoteInput = {
  patientId: string;
  patientName: string;
  file: File;
  filename: string;
  now?: Date;
  uploadId?: string;
};

type CreateVoiceNoteDeps = {
  uploadAudio: (input: {
    path: string;
    file: File;
    filename: string;
    mimeType: string;
  }) => Promise<VoiceNoteUploadResult>;
  transcribeAudio?: (input: { file: File; filename: string }) => Promise<string>;
  insertDocument: (payload: VoiceNoteInsertPayload) => Promise<Record<string, unknown>>;
  deleteAudio?: (audioPath: string) => Promise<void>;
};

export async function createVoiceNoteRecord(
  input: CreateVoiceNoteInput,
  deps: CreateVoiceNoteDeps,
) {
  const now = input.now || new Date();
  const uploadId = input.uploadId || crypto.randomUUID();
  const mimeType = input.file.type || '';
  const path = buildVoiceNoteStoragePath(
    input.patientId,
    input.patientName,
    input.filename,
    uploadId,
    mimeType,
    now,
  );
  const title = buildVoiceNoteTitle(input.patientName, now);
  const transcribeAudio = deps.transcribeAudio || (await import('./transcribe.ts')).transcribeVoiceNoteAudio;

  let uploaded: VoiceNoteUploadResult | null = null;

  try {
    uploaded = await deps.uploadAudio({
      path,
      file: input.file,
      filename: input.filename,
      mimeType,
    });
    const transcript = await transcribeAudio({ file: input.file, filename: input.filename });

    const document = await deps.insertDocument({
      patient_id: input.patientId,
      document_type: 'voice_note',
      title,
      content: transcript,
      status: 'recorded',
      related_entity_type: 'voice_note',
      related_entity_id: uploaded.audioPath,
      signed_by_patient: false,
      signed_by_guardian: false,
      signature_name: null,
      signed_at: null,
      metadata: {
        audio_bucket: 'voice-notes',
        audio_path: uploaded.audioPath,
        audio_url: uploaded.audioUrl,
        transcript,
        transcription_model: process.env.OPENAI_TRANSCRIPTION_MODEL || 'whisper-1',
        source_file_name: input.filename,
        mime_type: mimeType,
      },
    });

    return {
      ...document,
      title,
      transcript,
      audioPath: uploaded.audioPath,
      audioUrl: uploaded.audioUrl,
    };
  } catch (error) {
    if (uploaded && deps.deleteAudio) {
      await deps.deleteAudio(uploaded.audioPath).catch(() => undefined);
    }
    throw error;
  }
}
