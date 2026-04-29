import 'server-only';

type TranscribeVoiceNoteInput = {
  file: File;
  filename: string;
};

function cleanTranscript(value: string) {
  return value.trim().replace(/\s+\n/g, '\n').replace(/\n{3,}/g, '\n\n');
}

export async function transcribeVoiceNoteAudio({ file, filename }: TranscribeVoiceNoteInput) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is required to transcribe voice notes');
  }

  const model = process.env.OPENAI_TRANSCRIPTION_MODEL || 'whisper-1';
  const formData = new FormData();
  formData.append('file', file, filename);
  formData.append('model', model);
  formData.append('response_format', 'json');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(errorText || 'Failed to transcribe voice note audio');
  }

  const payload = (await response.json()) as { text?: string };
  return cleanTranscript(String(payload.text || ''));
}
