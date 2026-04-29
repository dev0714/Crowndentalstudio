'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { formatDateSA } from '@/lib/sa-formatting';
import { Mic, Pause, Play, RotateCcw, Square, Trash2, Upload, FileAudio } from 'lucide-react';

type VoiceNote = {
  id: string;
  title: string;
  content: string;
  status: string;
  created_at: string;
  audio_url?: string;
  audio_path?: string;
  transcript?: string;
  transcription_status?: 'completed' | 'failed';
  transcription_error?: string | null;
  metadata?: Record<string, unknown>;
};

type PatientVoiceNotesProps = {
  patientId: string;
  patientName: string;
};

export function PatientVoiceNotes({ patientId, patientName }: PatientVoiceNotesProps) {
  const [voiceNotes, setVoiceNotes] = useState<VoiceNote[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  const fetchVoiceNotes = async () => {
    const response = await fetch(`/api/crm/patients/voice-notes?patientId=${patientId}`, {
      credentials: 'include',
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || 'Failed to load voice notes');
    }
    setVoiceNotes(payload.data || []);
  };

  useEffect(() => {
    fetchVoiceNotes().catch((err) => {
      console.error('[v0] Failed to load voice notes', err);
      setError('Failed to load voice notes');
    });

    return () => {
      recorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      recorderRef.current = null;
      streamRef.current = null;
    };
  }, [patientId]);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [selectedFile]);

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    setError(null);
    setStatus(null);
    try {
      const formData = new FormData();
      formData.append('patient_id', patientId);
      formData.append('patient_name', patientName);
      formData.append('audio', file);

      const response = await fetch('/api/crm/patients/voice-notes', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to save voice note');
      }

      const transcriptionStatus = payload.data?.transcription_status as 'completed' | 'failed' | undefined;
      const transcriptionError = payload.data?.transcription_error as string | undefined;
      setSelectedFile(null);
      setStatus(
        transcriptionStatus === 'failed'
          ? `Voice note saved, but transcription needs attention${transcriptionError ? `: ${transcriptionError}` : '.'}`
          : 'Voice note saved and transcribed.',
      );
      await fetchVoiceNotes();
    } catch (err) {
      console.error('[v0] Voice note upload failed', err);
      setError(err instanceof Error ? err.message : 'Failed to upload voice note');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);
    setStatus(file ? `Selected ${file.name}` : null);
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('This browser does not support recording');
      return;
    }

    setError(null);
    setStatus('Preparing microphone...');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
      const recorder = new MediaRecorder(stream, preferredType ? { mimeType: preferredType } : undefined);
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        const extension = blob.type.includes('ogg') ? 'ogg' : blob.type.includes('mp4') ? 'mp4' : blob.type.includes('wav') ? 'wav' : 'webm';
        const file = new File([blob], `voice-note-${Date.now()}.${extension}`, { type: blob.type || 'audio/webm' });
        setSelectedFile(file);
        setStatus('Recording ready to upload.');
        setIsRecording(false);
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        recorderRef.current = null;
      };

      streamRef.current = stream;
      recorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setStatus('Recording...');
    } catch (err) {
      console.error('[v0] Failed to start recording', err);
      setError('Could not access microphone');
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    setStatus(null);
    setPreviewUrl(null);
  };

  const playPreview = async () => {
    if (!previewAudioRef.current || !previewUrl) {
      return;
    }

    try {
      previewAudioRef.current.currentTime = 0;
      await previewAudioRef.current.play();
    } catch (playError) {
      console.error('[v0] Failed to play voice note preview', playError);
      setError('Could not play the selected recording');
    }
  };

  const pausePreview = () => {
    previewAudioRef.current?.pause();
  };

  const deleteVoiceNote = async (id: string) => {
    try {
      setError(null);
      const response = await fetch(`/api/crm/patients/voice-notes?patientId=${patientId}&id=${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to delete voice note');
      }
      setStatus('Voice note deleted.');
      await fetchVoiceNotes();
    } catch (err) {
      console.error('[v0] Failed to delete voice note', err);
      setError('Failed to delete voice note');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-5">
      <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4 px-6">
          <CardTitle className="text-base">Voice Note Recorder</CardTitle>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            Save an audio note for {patientName || 'this patient'} and the app will store the recording and transcript together.
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 block">Audio file</label>
            <Input type="file" accept="audio/*" onChange={handleFileChange} className="rounded-xl border-slate-200" />
          </div>

          <div className="flex flex-wrap gap-2">
            {!isRecording ? (
              <Button type="button" onClick={startRecording} className="bg-blue-600 hover:bg-blue-700 text-white">
                <Mic className="w-4 h-4 mr-2" />
                Record
              </Button>
            ) : (
              <Button type="button" onClick={stopRecording} className="bg-rose-600 hover:bg-rose-700 text-white">
                <Square className="w-4 h-4 mr-2" />
                Stop
              </Button>
            )}

            <Button type="button" onClick={() => selectedFile && uploadFile(selectedFile)} disabled={!selectedFile || isUploading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Upload className="w-4 h-4 mr-2" />
              {isUploading ? 'Uploading…' : 'Save Voice Note'}
            </Button>

            <Button type="button" variant="outline" onClick={clearSelectedFile} disabled={!selectedFile}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Clear
            </Button>
          </div>

          {selectedFile && (
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm text-blue-800">
              Ready: <span className="font-semibold">{selectedFile.name}</span>
            </div>
          )}

          {previewUrl && (
            <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3">
              <audio ref={previewAudioRef} controls src={previewUrl} className="w-full" />
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={playPreview}>
                  <Play className="w-3.5 h-3.5 mr-2" />
                  Play
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={pausePreview}>
                  <Pause className="w-3.5 h-3.5 mr-2" />
                  Pause
                </Button>
              </div>
            </div>
          )}

          {status && <p className="text-sm text-emerald-700">{status}</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </CardContent>
      </Card>

      <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4 px-6">
          <CardTitle className="text-base">Saved Voice Notes</CardTitle>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          {voiceNotes.length > 0 ? (
            voiceNotes.map((note) => {
              const audioUrl = note.audio_url || String(note.metadata?.audio_url || '');
              const transcript = note.transcript || note.content;
              const transcriptionStatus = note.transcription_status || String(note.metadata?.transcription_status || '');
              const transcriptionError = note.transcription_error || String(note.metadata?.transcription_error || '');

              return (
                <div key={note.id} className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-slate-900">{note.title}</h3>
                      <p className="text-xs text-slate-500">{formatDateSA(note.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                        {note.status}
                      </span>
                      {transcriptionStatus === 'failed' && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          Transcript pending
                        </span>
                      )}
                      <Button type="button" variant="outline" size="sm" onClick={() => deleteVoiceNote(note.id)} className="text-red-600 border-red-200 hover:bg-red-50">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  {audioUrl ? (
                    <div className="space-y-2">
                      <audio controls className="w-full">
                        <source src={audioUrl} />
                      </audio>
                      <a
                        href={audioUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex text-sm font-medium text-blue-700 hover:text-blue-800"
                      >
                        Open audio file
                      </a>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <FileAudio className="w-4 h-4" />
                      Audio file unavailable
                    </div>
                  )}

                  <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700 whitespace-pre-wrap">
                    {transcript || 'No transcript available yet.'}
                  </div>
                  {transcriptionError && (
                    <p className="text-xs text-amber-700">
                      Transcription note: {transcriptionError}
                    </p>
                  )}
                </div>
              );
            })
          ) : (
            <div className="flex items-center justify-center h-40 text-slate-400 text-sm rounded-2xl border-2 border-dashed border-slate-200">
              No voice notes recorded yet
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
