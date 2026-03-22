import { useMutation, /* useQuery, */ useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  // VoiceTranscription,
  AITranscriptionResponse,
  TranscriptionContext,
  // PaginatedResponse,
} from '@/types';

// ============================================================================
// Query Keys
// ============================================================================

export const voiceKeys = {
  all: ['voice'] as const,
  transcriptions: () => [...voiceKeys.all, 'transcriptions'] as const,
  transcription: (id: string) => [...voiceKeys.transcriptions(), id] as const,
  byEncounter: (encounterId: string) =>
    [...voiceKeys.transcriptions(), 'encounter', encounterId] as const,
};

// ============================================================================
// Upload Audio
// ============================================================================

export function useUploadAudio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      audioBlob,
      encounterId,
      patientId,
      context,
    }: {
      audioBlob: Blob;
      encounterId?: string;
      patientId?: string;
      context: TranscriptionContext;
    }) => {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      if (encounterId) formData.append('encounterId', encounterId);
      if (patientId) formData.append('patientId', patientId);
      formData.append('context', context);

      const { data } = await api.post<AITranscriptionResponse>('/ai/voice/transcribe', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120_000, // 2 minutes for audio processing
      });
      return data;
    },
    onSuccess: (result) => {
      if (result.transcriptionId) {
        qc.invalidateQueries({ queryKey: voiceKeys.transcriptions() });
      }
    },
  });
}

// ============================================================================
// Transcription Queries
// TODO: Backend endpoints for transcription CRUD do not exist yet.
//       These hooks are commented out until the backend implements them.
// ============================================================================

// TODO: Backend needs GET /ai/voice/transcriptions/:id
// export function useTranscription(id: string) {
//   return useQuery({
//     queryKey: voiceKeys.transcription(id),
//     queryFn: async () => {
//       const { data } = await api.get<VoiceTranscription>(`/ai/voice/transcriptions/${id}`);
//       return data;
//     },
//     enabled: !!id,
//   });
// }

// TODO: Backend needs GET /ai/voice/transcriptions?encounterId=...
// export function useEncounterTranscriptions(encounterId: string) {
//   return useQuery({
//     queryKey: voiceKeys.byEncounter(encounterId),
//     queryFn: async () => {
//       const { data } = await api.get<PaginatedResponse<VoiceTranscription>>(
//         '/ai/voice/transcriptions',
//         { params: { encounterId } },
//       );
//       return data.data;
//     },
//     enabled: !!encounterId,
//   });
// }

// TODO: Backend needs POST /ai/voice/transcriptions/:id/process
// export function useProcessTranscription() {
//   const qc = useQueryClient();
//   return useMutation({
//     mutationFn: async ({
//       transcriptionId,
//       context,
//     }: {
//       transcriptionId: string;
//       context: TranscriptionContext;
//     }) => {
//       const { data } = await api.post<VoiceTranscription>(
//         `/ai/voice/transcriptions/${transcriptionId}/process`,
//         { context },
//       );
//       return data;
//     },
//     onSuccess: (_, vars) => {
//       qc.invalidateQueries({ queryKey: voiceKeys.transcription(vars.transcriptionId) });
//     },
//   });
// }

// TODO: Backend needs PATCH /ai/voice/transcriptions/:id
// export function useEditTranscription() {
//   const qc = useQueryClient();
//   return useMutation({
//     mutationFn: async ({
//       transcriptionId,
//       processedTranscription,
//     }: {
//       transcriptionId: string;
//       processedTranscription: string;
//     }) => {
//       const { data } = await api.patch<VoiceTranscription>(
//         `/ai/voice/transcriptions/${transcriptionId}`,
//         { processedTranscription },
//       );
//       return data;
//     },
//     onSuccess: (_, vars) => {
//       qc.invalidateQueries({ queryKey: voiceKeys.transcription(vars.transcriptionId) });
//     },
//   });
// }

// ============================================================================
// Streaming Transcription (WebSocket-based, returns setup info)
// TODO: Backend streaming endpoints do not exist yet.
// ============================================================================

// TODO: Backend needs POST /ai/voice/stream/start
// export function useStartStreamTranscription() {
//   return useMutation({
//     mutationFn: async ({
//       encounterId,
//       context,
//       language,
//     }: {
//       encounterId?: string;
//       context: TranscriptionContext;
//       language?: string;
//     }) => {
//       const { data } = await api.post<{
//         sessionId: string;
//         wsUrl: string;
//       }>('/ai/voice/stream/start', {
//         encounterId,
//         context,
//         language: language ?? 'pt-BR',
//       });
//       return data;
//     },
//   });
// }

// TODO: Backend needs POST /ai/voice/stream/stop
// export function useStopStreamTranscription() {
//   const qc = useQueryClient();
//   return useMutation({
//     mutationFn: async (sessionId: string) => {
//       const { data } = await api.post<VoiceTranscription>('/ai/voice/stream/stop', { sessionId });
//       return data;
//     },
//     onSuccess: () => {
//       qc.invalidateQueries({ queryKey: voiceKeys.transcriptions() });
//     },
//   });
// }

// ============================================================================
// Delete Transcription
// TODO: Backend needs DELETE /ai/voice/transcriptions/:id
// ============================================================================

// export function useDeleteTranscription() {
//   const qc = useQueryClient();
//   return useMutation({
//     mutationFn: async (id: string) => {
//       await api.delete(`/ai/voice/transcriptions/${id}`);
//     },
//     onSuccess: () => {
//       qc.invalidateQueries({ queryKey: voiceKeys.transcriptions() });
//     },
//   });
// }
