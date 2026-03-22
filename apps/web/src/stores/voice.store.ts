import { create } from 'zustand';

interface VoiceStoreState {
  isRecording: boolean;
  isProcessing: boolean;
  currentTranscription: string;
  partialText: string;
  structuredData: Record<string, unknown> | null;
  error: string | null;
  duration: number;
  startRecording: () => void;
  stopRecording: () => void;
  setProcessing: (processing: boolean) => void;
  setPartialText: (text: string) => void;
  setTranscription: (text: string) => void;
  appendTranscription: (text: string) => void;
  setStructuredData: (data: Record<string, unknown> | null) => void;
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

  startRecording: () =>
    set({
      isRecording: true,
      isProcessing: false,
      error: null,
      duration: 0,
      partialText: '',
      structuredData: null,
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
    }),
}));
