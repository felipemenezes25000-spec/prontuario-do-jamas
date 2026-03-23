import { create } from 'zustand';

export type VoiceIntent =
  | 'SOAP'
  | 'PRESCRIPTION'
  | 'EXAM_REQUEST'
  | 'CERTIFICATE'
  | 'REFERRAL'
  | 'EVOLUTION'
  | 'VITALS'
  | 'DISCHARGE';

interface VoiceStoreState {
  isRecording: boolean;
  isProcessing: boolean;
  currentTranscription: string;
  partialText: string;
  structuredData: Record<string, unknown> | null;
  error: string | null;
  duration: number;
  intent: VoiceIntent | null;
  intentConfidence: number;
  intentData: Record<string, unknown> | null;
  startRecording: () => void;
  stopRecording: () => void;
  setProcessing: (processing: boolean) => void;
  setPartialText: (text: string) => void;
  setTranscription: (text: string) => void;
  appendTranscription: (text: string) => void;
  setStructuredData: (data: Record<string, unknown> | null) => void;
  setIntent: (intent: VoiceIntent, confidence: number, data: Record<string, unknown>) => void;
  setError: (error: string | null) => void;
  setDuration: (duration: number) => void;
  clearTranscription: () => void;
  reset: () => void;
}

export const useVoiceStore = create<VoiceStoreState>()((set) => ({
  isRecording: false,
  isProcessing: false,
  currentTranscription: '',
  partialText: '',
  structuredData: null,
  error: null,
  duration: 0,
  intent: null,
  intentConfidence: 0,
  intentData: null,

  startRecording: () =>
    set({
      isRecording: true,
      isProcessing: false,
      error: null,
      duration: 0,
      partialText: '',
      structuredData: null,
      intent: null,
      intentConfidence: 0,
      intentData: null,
    }),

  stopRecording: () =>
    set({
      isRecording: false,
    }),

  setProcessing: (processing) => set({ isProcessing: processing }),

  setPartialText: (text) => set({ partialText: text }),

  setTranscription: (text) =>
    set({
      currentTranscription: text,
      isProcessing: false,
    }),

  appendTranscription: (text) =>
    set((state) => ({
      currentTranscription: state.currentTranscription
        ? `${state.currentTranscription} ${text}`
        : text,
    })),

  setStructuredData: (data) => set({ structuredData: data }),

  setIntent: (intent, confidence, data) =>
    set({
      intent,
      intentConfidence: confidence,
      intentData: data,
    }),

  setError: (error) =>
    set({
      error,
      isRecording: false,
      isProcessing: false,
    }),

  setDuration: (duration) => set({ duration }),

  clearTranscription: () =>
    set({
      currentTranscription: '',
      partialText: '',
      structuredData: null,
      intent: null,
      intentConfidence: 0,
      intentData: null,
    }),

  reset: () =>
    set({
      isRecording: false,
      isProcessing: false,
      currentTranscription: '',
      partialText: '',
      structuredData: null,
      error: null,
      duration: 0,
      intent: null,
      intentConfidence: 0,
      intentData: null,
    }),
}));
