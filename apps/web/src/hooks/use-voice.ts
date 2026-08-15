import { useCallback, useEffect, useRef } from 'react';
import { useVoiceStore, type VoiceIntent } from '@/stores/voice.store';
import api from '@/lib/api';

export type VoiceStatus =
  | 'idle'
  | 'requesting-permission'
  | 'recording'
  | 'processing'
  | 'complete'
  | 'error';

interface UseVoiceOptions {
  context?: string;
  encounterId?: string;
  patientId?: string;
}

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
  const cancelledRef = useRef(false);

  const getStatus = (): VoiceStatus => {
    if (error) return 'error';
    if (isProcessing) return 'processing';
    if (isRecording) return 'recording';
    if (currentTranscription) return 'complete';
    return 'idle';
  };

  const context = options?.context;
  const encounterId = options?.encounterId;
  const patientId = options?.patientId;

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      cancelledRef.current = false;

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

      if (cancelledRef.current) {
        stopStream();
        return;
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      const fileExt = mimeType.startsWith('audio/webm')
        ? 'webm'
        : mimeType.startsWith('audio/ogg')
          ? 'ogg'
          : mimeType.startsWith('audio/mp4')
            ? 'mp4'
            : 'audio';

      recorder.ondataavailable = (event) => {
        if (!cancelledRef.current && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        clearTimer();
        stopStream();
        mediaRecorderRef.current = null;

        // A user cancellation must never upload captured audio.
        if (cancelledRef.current) {
          chunksRef.current = [];
          return;
        }

        const blobMimeType = mimeType.split(';')[0];
        const audioBlob = new Blob(chunksRef.current, { type: blobMimeType });
        chunksRef.current = [];

        if (audioBlob.size === 0) {
          setError('Nenhum audio foi capturado. Tente novamente.');
          return;
        }

        setProcessing(true);

        const formData = new FormData();
        formData.append('audio', audioBlob, `recording.${fileExt}`);
        if (context) formData.append('context', context);
        if (encounterId) formData.append('encounterId', encounterId);
        if (patientId) formData.append('patientId', patientId);

        api
          .post<TranscribeResponse>('/ai/voice/transcribe', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 60_000,
          })
          .then((response) => {
            setTranscription(response.data.text);
            setStructuredData(response.data.structuredData);
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
                  ? String(
                      (((err as Record<string, unknown>).response as Record<string, unknown>)
                        .data as Record<string, unknown>).message,
                    )
                  : 'Erro ao transcrever audio.';
            setError(message);
          });
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250);
      storeStartRecording();
      startTimeRef.current = Date.now();

      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setDuration(elapsed);
      }, 1000);
    } catch (err) {
      stopStream();
      clearTimer();
      console.error('[useVoice] startRecording error:', err);
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setError(
          'Permissao de microfone negada. Habilite o microfone nas configuracoes do navegador.',
        );
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
  }, [
    clearTimer,
    context,
    encounterId,
    patientId,
    setDuration,
    setError,
    setIntent,
    setProcessing,
    setStructuredData,
    setTranscription,
    stopStream,
    storeStartRecording,
  ]);

  const stopRecording = useCallback(() => {
    cancelledRef.current = false;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    storeStopRecording();
  }, [storeStopRecording]);

  const cancelRecording = useCallback(() => {
    cancelledRef.current = true;
    chunksRef.current = [];

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    clearTimer();
    stopStream();
    reset();
  }, [clearTimer, reset, stopStream]);

  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      chunksRef.current = [];
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      clearTimer();
      stopStream();
    };
  }, [clearTimer, stopStream]);

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
