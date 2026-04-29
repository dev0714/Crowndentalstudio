const SUPPORTED_AUDIO_MIME_TYPES = new Set([
  'audio/webm',
  'audio/ogg',
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/x-m4a',
  'audio/wav',
  'audio/aac',
]);

function slugifySegment(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function inferExtension(fileName: string, mimeType: string) {
  const lowerName = fileName.toLowerCase();
  const nameMatch = lowerName.match(/\.(webm|ogg|mp3|mp4|m4a|wav|aac)$/);
  if (nameMatch) {
    return nameMatch[1] === 'm4a' ? 'm4a' : nameMatch[1];
  }

  const mimeMap: Record<string, string> = {
    'audio/webm': 'webm',
    'audio/ogg': 'ogg',
    'audio/mpeg': 'mp3',
    'audio/mp3': 'mp3',
    'audio/mp4': 'mp4',
    'audio/x-m4a': 'm4a',
    'audio/wav': 'wav',
    'audio/aac': 'aac',
  };

  return mimeMap[mimeType.toLowerCase()] || 'webm';
}

export function isSupportedVoiceNoteMimeType(mimeType: string) {
  return SUPPORTED_AUDIO_MIME_TYPES.has(mimeType.toLowerCase());
}

export function buildVoiceNoteStoragePath(
  patientId: string,
  patientName: string,
  fileName: string,
  uploadId: string,
  mimeType = '',
  now = new Date(),
) {
  const dateSegment = now.toISOString().slice(0, 10);
  const patientSegment = slugifySegment(patientName) || slugifySegment(patientId) || 'patient';
  const extension = inferExtension(fileName, mimeType);
  const fileSegment = slugifySegment(fileName.replace(/\.[^.]+$/, '')) || 'voice-note';

  return `patients/${patientSegment}/${dateSegment}/${uploadId}-${fileSegment}.${extension}`;
}

export function buildVoiceNoteTitle(patientName: string, now = new Date()) {
  const datePart = now.toLocaleDateString('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return `Voice note - ${patientName} - ${datePart}`;
}
