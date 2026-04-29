import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { getAuthenticatedUser } from '@/lib/auth/current-user';
import { supabaseServer } from '@/lib/supabase/server';
import { isSupportedVoiceNoteMimeType } from '@/lib/voice-notes/voice-note-storage';
import { createVoiceNoteRecord } from '@/lib/voice-notes/voice-note-service';
import { transcribeVoiceNoteAudio } from '@/lib/voice-notes/transcribe';

function isMissingRelationError(error: { code?: string; message?: string }) {
  return error.code === '42P01' || error.code === 'PGRST205' || Boolean(error.message?.includes('does not exist'));
}

async function getPatientName(patientId: string) {
  const { data } = await supabaseServer
    .from('patients')
    .select('first_name, last_name')
    .eq('id', patientId)
    .maybeSingle();

  return `${data?.first_name || ''} ${data?.last_name || ''}`.trim();
}

async function listVoiceNotes(patientId: string) {
  const { data, error } = await supabaseServer
    .from('patient_documents')
    .select('*')
    .eq('patient_id', patientId)
    .eq('document_type', 'voice_note')
    .order('created_at', { ascending: false });

  if (error && !isMissingRelationError(error)) {
    throw error;
  }

  return (data || []).map((row) => ({
    id: row.id,
    patient_id: row.patient_id,
    document_type: row.document_type || 'voice_note',
    title: row.title || '',
    content: row.content || '',
    status: row.status || 'recorded',
    related_entity_type: row.related_entity_type || 'voice_note',
    related_entity_id: row.related_entity_id || '',
    signed_by_patient: Boolean(row.signed_by_patient),
    signed_by_guardian: Boolean(row.signed_by_guardian),
    signature_name: row.signature_name || '',
    signed_at: row.signed_at || '',
    metadata: row.metadata || {},
    created_at: row.created_at || '',
    audio_url: row.metadata?.audio_url || '',
    audio_path: row.metadata?.audio_path || '',
    transcript: row.metadata?.transcript || row.content || '',
  }));
}

async function deleteVoiceNote(id: string) {
  const { data, error } = await supabaseServer
    .from('patient_documents')
    .select('*')
    .eq('id', id)
    .eq('document_type', 'voice_note')
    .maybeSingle();

  if (error && !isMissingRelationError(error)) {
    throw error;
  }

  const audioPath = data?.metadata?.audio_path as string | undefined;
  const bucketName = (data?.metadata?.audio_bucket as string | undefined) || process.env.SUPABASE_VOICE_NOTES_BUCKET || 'voice-notes';

  const { error: deleteError } = await supabaseServer.from('patient_documents').delete().eq('id', id).eq('document_type', 'voice_note');
  if (deleteError && !isMissingRelationError(deleteError)) {
    throw deleteError;
  }

  if (audioPath) {
    await supabaseServer.storage.from(bucketName).remove([audioPath]);
  }

  return { id };
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

    const patientName = String(formData.get('patient_name') || (await getPatientName(patientId)) || 'Patient').trim() || 'Patient';
    const bucketName = process.env.SUPABASE_VOICE_NOTES_BUCKET || 'voice-notes';
    const uploadId = randomUUID();

    const note = await createVoiceNoteRecord(
      {
        patientId,
        patientName,
        file: audioValue,
        filename: audioValue.name || 'voice-note.webm',
        uploadId,
      },
      {
        uploadAudio: async ({ path, file, mimeType }) => {
          const { error: uploadError } = await supabaseServer.storage
            .from(bucketName)
            .upload(path, file, {
              contentType: (mimeType || file.type || 'application/octet-stream').split(';')[0].trim(),
              upsert: false,
            });

          if (uploadError) {
            throw uploadError;
          }

          const { data } = supabaseServer.storage.from(bucketName).getPublicUrl(path);
          return {
            audioPath: path,
            audioUrl: data.publicUrl,
          };
        },
        deleteAudio: async (audioPath) => {
          await supabaseServer.storage.from(bucketName).remove([audioPath]);
        },
        transcribeAudio: transcribeVoiceNoteAudio,
        insertDocument: async (payload) => {
          const { data, error } = await supabaseServer.from('patient_documents').insert([{
            ...payload,
            metadata: {
              ...(payload.metadata || {}),
              audio_bucket: bucketName,
            },
            created_by: user.id,
          }]).select();

          if (error) {
            throw error;
          }

          return data?.[0] || payload;
        },
      },
    );

    return NextResponse.json({ data: note }, { status: 201 });
  } catch (error) {
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
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const data = await deleteVoiceNote(id);
    return NextResponse.json({ data });
  } catch (error) {
    console.error('[voice-notes][DELETE]', error);
    return NextResponse.json({ error: 'Failed to delete voice note' }, { status: 500 });
  }
}
