import 'server-only';

import { supabaseServer } from '@/lib/supabase/server';

export type VoiceNoteRecord = {
  id: string;
  patient_id: string;
  title: string;
  content: string;
  status: string;
  created_at: string;
  updated_at: string;
  audio_url?: string;
  audio_path?: string;
  transcript?: string;
  transcription_status?: 'completed' | 'failed';
  transcription_error?: string | null;
  metadata?: Record<string, unknown>;
};

export function getVoiceNotesSettingKey(patientId: string) {
  return `voice_notes:${patientId}`;
}

export function upsertVoiceNoteRecord(records: Array<Pick<VoiceNoteRecord, 'id' | 'created_at'> & Record<string, unknown>>, note: Record<string, unknown>) {
  const filtered = records.filter((record) => record.id !== note.id);
  const next = [note, ...filtered];

  return next.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
}

export function removeVoiceNoteRecord(records: Array<{ id: string }>, noteId: string) {
  return records.filter((record) => record.id !== noteId);
}

function parseVoiceNotes(value: string | null | undefined): VoiceNoteRecord[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(Boolean) as VoiceNoteRecord[];
  } catch {
    return [];
  }
}

async function readVoiceNotesSetting(patientId: string) {
  const { data, error } = await supabaseServer
    .from('settings')
    .select('setting_value')
    .eq('setting_key', getVoiceNotesSettingKey(patientId))
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return parseVoiceNotes(data?.setting_value || null);
}

async function saveVoiceNotesSetting(patientId: string, notes: VoiceNoteRecord[], updatedBy: string | null) {
  const { error } = await supabaseServer.from('settings').upsert(
    [
      {
        setting_key: getVoiceNotesSettingKey(patientId),
        setting_value: JSON.stringify(notes),
        setting_type: 'json',
        description: 'Patient voice notes and audio links',
        updated_by: updatedBy,
        updated_at: new Date().toISOString(),
      },
    ],
    { onConflict: 'setting_key' },
  );

  if (error) {
    throw new Error(error.message);
  }
}

export async function listVoiceNotes(patientId: string) {
  return readVoiceNotesSetting(patientId);
}

export async function addVoiceNote(patientId: string, note: VoiceNoteRecord, updatedBy: string | null) {
  const existing = await readVoiceNotesSetting(patientId);
  const next = upsertVoiceNoteRecord(existing, note) as VoiceNoteRecord[];
  await saveVoiceNotesSetting(patientId, next, updatedBy);
  return note;
}

export async function deleteVoiceNote(patientId: string, noteId: string, updatedBy: string | null) {
  const existing = await readVoiceNotesSetting(patientId);
  const next = removeVoiceNoteRecord(existing, noteId) as VoiceNoteRecord[];
  await saveVoiceNotesSetting(patientId, next, updatedBy);
  return next;
}
