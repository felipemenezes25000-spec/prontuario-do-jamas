import { useCallback, useEffect, useRef } from 'react';
import { useVoiceStore } from '@/stores/voice.store';
import api from '@/lib/api';

export type VoiceStatus = 'idle' | 'requesting-permission' | 'recording' | 'processing' | 'complete' | 'error';

interface UseVoiceOptions {
  context?: string;
  encounterId?: string;
  patientId?: string;
}

interface TranscribeResponse {
  transcriptionId: string;
  text: string;
  confidence: number;
  structuredData: Record<string, unknown>;
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
    startRecording: storeStartRecording,
    stopRecording: storeStopRecording,
    setProcessing,
    setTranscription,
    setPartialText,
    setStructuredData,
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

  const startRecording = useCallback(async () => {
    try {
      chunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
      });

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

        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });

        // Send audio to backend for transcription
        setProcessing(true);

        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');
        if (options?.context) {
          formData.append('context', options.context);
        }
        if (options?.encounterId) {
          formData.append('encounterId', options.encounterId);
        }
        if (options?.patientId) {
          formData.append('patientId', options.patientId);
        }

        api
          .post<TranscribeResponse>('/ai/voice/transcribe', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 30000,
          })
          .then((response) => {
            setTranscription(response.data.text);
            setStructuredData(response.data.structuredData);
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
      setError(
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'Permissao de microfone negada. Habilite o microfone nas configuracoes do navegador.'
          : 'Erro ao iniciar gravacao de audio.',
      );
    }
  }, [storeStartRecording, setProcessing, setTranscription, setStructuredData, setError, setDuration, setPartialText, options]);

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
    startRecording,
    stopRecording,
    cancelRecording,
    clearTranscription,
  };
}
