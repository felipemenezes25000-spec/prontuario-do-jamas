import { useCallback, useEffect, useRef } from 'react';
import { useVoiceStore, type VoiceIntent } from '@/stores/voice.store';
import api from '@/lib/api';

export type VoiceStatus = 'idle' | 'requesting-permission' | 'recording' | 'processing' | 'complete' | 'error';

interface UseVoiceOptions {
  context?: string;
  encounterId?: string;
  patientId?: string;
}

/** Detect best supported audio mimeType for MediaRecorder */
function getSupportedMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
    'audio/mpeg',
  ];
  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return undefined;
}

interface TranscribeResponse {
  transcriptionId: string;
  text: string;
  confidence: number;
  structuredData: Record<string, unknown>;
  intent: VoiceIntent;
  intentConfidence: number;
  intentData: Record<string, unknown>;
}

export function useVoice(options?: UseVoiceOptions) {
  const {
    isRecording,
    isProcessing,
    currentTranscription,
    partialText,
    structuredData,
    error,
    duration,
    intent,
    intentConfidence,
    intentData,
    startRecording: storeStartRecording,
    stopRecording: storeStopRecording,
    setProcessing,
    setTranscription,
    setStructuredData,
    setIntent,
    setError,
    setDuration,
    clearTranscription,
    reset,
  } = useVoiceStore();

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  const getStatus = (): VoiceStatus => {
    if (error) return 'error';
    if (isProcessing) return 'processing';
    if (isRecording) return 'recording';
    if (currentTranscription) return 'complete';
    return 'idle';
  };

  // Stabilize options to avoid useCallback recreation on every render
  const context = options?.context;
  const encounterId = options?.encounterId;
  const patientId = options?.patientId;

  const startRecording = useCallback(async () => {
    try {
      // Guard: check browser support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError(
          'Navegador nao suporta gravacao de audio. Use HTTPS ou um navegador atualizado (Chrome, Firefox, Edge).',
        );
        return;
      }

      const mimeType = getSupportedMimeType();
      if (!mimeType) {
        setError(
          'Navegador nao suporta nenhum formato de audio para gravacao. Tente Chrome ou Firefox.',
        );
        return;
      }

      chunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream, { mimeType });

      // Derive file extension from mimeType for the upload
      const fileExt = mimeType.startsWith('audio/webm')
        ? 'webm'
        : mimeType.startsWith('audio/ogg')
          ? 'ogg'
          : mimeType.startsWith('audio/mp4')
            ? 'mp4'
            : 'audio';

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        const blobMimeType = mimeType.split(';')[0]; // e.g. "audio/webm"
        const audioBlob = new Blob(chunksRef.current, { type: blobMimeType });

        // Send audio to backend for transcription + intent classification
        setProcessing(true);

        const formData = new FormData();
        formData.append('audio', audioBlob, `recording.${fileExt}`);
        if (context) {
          formData.append('context', context);
        }
        if (encounterId) {
          formData.append('encounterId', encounterId);
        }
        if (patientId) {
          formData.append('patientId', patientId);
        }

        api
          .post<TranscribeResponse>('/ai/voice/transcribe', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 60000, // Intent classification adds latency
          })
          .then((response) => {
            setTranscription(response.data.text);
            setStructuredData(response.data.structuredData);
            // Set intent from backend classification
            if (response.data.intent) {
              setIntent(
                response.data.intent,
                response.data.intentConfidence ?? 0.5,
                response.data.intentData ?? {},
              );
            }
          })
          .catch((err: unknown) => {
            const message =
              err instanceof Error
                ? err.message
                : typeof err === 'object' &&
                    err !== null &&
                    'response' in err &&
                    typeof (err as Record<string, unknown>).response === 'object' &&
                    (err as Record<string, unknown>).response !== null &&
                    'data' in ((err as Record<string, unknown>).response as Record<string, unknown>) &&
                    typeof ((err as Record<string, unknown>).response as Record<string, unknown>).data === 'object' &&
                    ((err as Record<string, unknown>).response as Record<string, unknown>).data !== null &&
                    'message' in (((err as Record<string, unknown>).response as Record<string, unknown>).data as Record<string, unknown>)
                  ? String((((err as Record<string, unknown>).response as Record<string, unknown>).data as Record<string, unknown>).message)
                  : 'Erro ao transcrever audio.';
            setError(message);
          });

        // Clean up the stream
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250); // collect data every 250ms
      storeStartRecording();
      startTimeRef.current = Date.now();

      // Duration timer
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setDuration(elapsed);
      }, 1000);
    } catch (err) {
      console.error('[useVoice] startRecording error:', err);
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setError('Permissao de microfone negada. Habilite o microfone nas configuracoes do navegador.');
      } else if (err instanceof DOMException && err.name === 'NotFoundError') {
        setError('Nenhum microfone encontrado. Conecte um microfone e tente novamente.');
      } else if (err instanceof DOMException && err.name === 'NotReadableError') {
        setError('Microfone em uso por outro aplicativo. Feche outros apps e tente novamente.');
      } else {
        setError(
          `Erro ao iniciar gravacao de audio: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }, [storeStartRecording, setProcessing, setTranscription, setStructuredData, setIntent, setError, setDuration, context, encounterId, patientId]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    storeStopRecording();
  }, [storeStopRecording]);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    reset();
  }, [reset]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return {
    status: getStatus(),
    isRecording,
    isProcessing,
    currentTranscription,
    partialTranscription: partialText,
    structuredData,
    error,
    duration,
    intent,
    intentConfidence,
    intentData,
    stream: streamRef.current,
    startRecording,
    stopRecording,
    cancelRecording,
    clearTranscription,
  };
}
