import { useState, useCallback, useRef } from 'react';
import { useAuthStore } from '@/stores/auth.store';

interface StreamingSoapOptions {
  onToken?: (token: string) => void;
  onComplete?: (fullText: string) => void;
  onError?: (error: string) => void;
}

interface SoapFields {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  diagnosisCodes: string[];
  suggestedExams: string[];
  suggestedMedications: Array<{
    name: string;
    dose: string;
    route: string;
    frequency: string;
    duration: string;
  }>;
}

export function useStreamingSOAP(options?: StreamingSoapOptions) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedText, setStreamedText] = useState('');
  const [soapFields, setSoapFields] = useState<SoapFields | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const { accessToken: token } = useAuthStore();

  const startStreaming = useCallback(
    async (
      transcription: string,
      encounterId?: string,
      doctorSpecialty?: string,
    ) => {
      if (!transcription || isStreaming) return;

      setIsStreaming(true);
      setStreamedText('');
      setSoapFields(null);
      abortRef.current = new AbortController();

      const params = new URLSearchParams({ transcription });
      if (encounterId) params.set('encounterId', encounterId);
      if (doctorSpecialty) params.set('doctorSpecialty', doctorSpecialty);

      try {
        const baseUrl = import.meta.env.VITE_API_URL || '/api/v1';
        const response = await fetch(`${baseUrl}/ai/soap/stream?${params}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: abortRef.current.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response body');

        const decoder = new TextDecoder();
        let accumulated = '';
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          // Keep the last incomplete line in the buffer
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data: ')) continue;

            const payload = trimmed.slice(6);
            if (payload === '[DONE]') {
              // Try to parse the accumulated text as JSON (SOAP response)
              try {
                const parsed = JSON.parse(accumulated) as SoapFields;
                setSoapFields(parsed);
                options?.onComplete?.(accumulated);
              } catch {
                // If not valid JSON, the accumulated text is the raw SOAP
                options?.onComplete?.(accumulated);
              }
              continue;
            }

            try {
              const data = JSON.parse(payload) as { text?: string; error?: string };
              if (data.error) {
                options?.onError?.(data.error);
                continue;
              }
              if (data.text) {
                accumulated += data.text;
                setStreamedText(accumulated);
                options?.onToken?.(data.text);
              }
            } catch {
              // Skip malformed SSE chunks
            }
          }
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          const message = err instanceof Error ? err.message : 'Erro ao gerar SOAP';
          options?.onError?.(message);
        }
      } finally {
        setIsStreaming(false);
      }
    },
    [isStreaming, token, options],
  );

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
  }, []);

  return {
    isStreaming,
    streamedText,
    soapFields,
    startStreaming,
    stopStreaming,
  };
}
