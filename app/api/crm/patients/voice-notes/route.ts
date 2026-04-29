import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { getAuthenticatedUser } from '@/lib/auth/current-user';
import { supabaseServer } from '@/lib/supabase/server';
import { isSupportedVoiceNoteMimeType, buildVoiceNoteTitle } from '@/lib/voice-notes/voice-note-storage';
import { addVoiceNote, deleteVoiceNote as deleteStoredVoiceNote, listVoiceNotes, type VoiceNoteRecord } from '@/lib/voice-notes/voice-note-store';
import { transcribeVoiceNoteAudio } from '@/lib/voice-notes/transcribe';

function getPatientDisplayName(formData: FormData) {
  const patientName = String(formData.get('patient_name') || '').trim();
  return patientName || 'Patient';
}

async function uploadVoiceNoteAudio(bucketName: string, path: string, file: File, mimeType: string) {
  const { error: uploadError } = await supabaseServer.storage
    .from(bucketName)
    .upload(path, file, {
      contentType: mimeType,
      upsert: false,
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabaseServer.storage.from(bucketName).getPublicUrl(path);
  return data.publicUrl;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');
    if (!patientId) {
      return NextResponse.json({ error: 'patientId is required' }, { status: 400 });
    }

    const data = await listVoiceNotes(patientId);
    return NextResponse.json({ data });
  } catch (error) {
    console.error('[voice-notes][GET]', error);
    return NextResponse.json({ error: 'Failed to load voice notes' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let uploadedAudioPath: string | null = null;

  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const patientId = String(formData.get('patient_id') || '').trim();
    const audioValue = formData.get('audio') || formData.get('file');

    if (!patientId) {
      return NextResponse.json({ error: 'patient_id is required' }, { status: 400 });
    }

    if (!(audioValue instanceof File)) {
      return NextResponse.json({ error: 'Audio file is required' }, { status: 400 });
    }

    if (!isSupportedVoiceNoteMimeType(audioValue.type)) {
      return NextResponse.json({ error: 'Unsupported audio file type' }, { status: 400 });
    }

    const bucketName = process.env.SUPABASE_VOICE_NOTES_BUCKET || 'voice-notes';
    const patientName = getPatientDisplayName(formData);
    const uploadId = randomUUID();
    const path = `patients/${patientId}/${new Date().toISOString().slice(0, 10)}/${uploadId}-${audioValue.name || 'voice-note.webm'}`;
    const mimeType = audioValue.type.split(';')[0].trim();
    const audioUrl = await uploadVoiceNoteAudio(bucketName, path, audioValue, mimeType);
    uploadedAudioPath = path;

    let transcript = '';
    let transcriptionStatus: 'completed' | 'failed' = 'completed';
    let transcriptionError: string | null = null;

    try {
      transcript = await transcribeVoiceNoteAudio({ file: audioValue, filename: audioValue.name || 'voice-note.webm' });
    } catch (error) {
      transcriptionStatus = 'failed';
      transcriptionError = error instanceof Error ? error.message : 'Failed to transcribe voice note';
    }

    const note: VoiceNoteRecord = {
      id: randomUUID(),
      patient_id: patientId,
      title: buildVoiceNoteTitle(patientName),
      content: transcript,
      status: 'draft',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      audio_url: audioUrl,
      audio_path: path,
      transcript,
      transcription_status: transcriptionStatus,
      transcription_error: transcriptionError,
      metadata: {
        audio_bucket: bucketName,
        audio_path: path,
        audio_url: audioUrl,
        transcript,
        transcription_status: transcriptionStatus,
        transcription_error: transcriptionError,
        transcription_model: process.env.OPENAI_TRANSCRIPTION_MODEL || 'whisper-1',
        source_file_name: audioValue.name || 'voice-note.webm',
        mime_type: mimeType,
        document_kind: 'voice_note',
        recorded_by: user.id,
        recorded_by_email: user.email,
        recorded_by_name: user.full_name,
      },
    };

    const saved = await addVoiceNote(patientId, note, null);
    return NextResponse.json({ data: saved }, { status: 201 });
  } catch (error) {
    if (uploadedAudioPath) {
      const bucketName = process.env.SUPABASE_VOICE_NOTES_BUCKET || 'voice-notes';
      await supabaseServer.storage.from(bucketName).remove([uploadedAudioPath]).catch(() => undefined);
    }

    console.error('[voice-notes][POST]', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to create voice note' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const patientId = searchParams.get('patientId');

    if (!id || !patientId) {
      return NextResponse.json({ error: 'id and patientId are required' }, { status: 400 });
    }

    const currentNotes = await listVoiceNotes(patientId);
    const note = currentNotes.find((entry) => entry.id === id);
    if (!note) {
      return NextResponse.json({ error: 'Voice note not found' }, { status: 404 });
    }

    await deleteStoredVoiceNote(patientId, id, null);

    const audioPath = note.audio_path || String(note.metadata?.audio_path || '');
    const bucketName = String(note.metadata?.audio_bucket || process.env.SUPABASE_VOICE_NOTES_BUCKET || 'voice-notes');
    if (audioPath) {
      await supabaseServer.storage.from(bucketName).remove([audioPath]).catch(() => undefined);
    }

    return NextResponse.json({ data: { id } });
  } catch (error) {
    console.error('[voice-notes][DELETE]', error);
    return NextResponse.json({ error: 'Failed to delete voice note' }, { status: 500 });
  }
}
