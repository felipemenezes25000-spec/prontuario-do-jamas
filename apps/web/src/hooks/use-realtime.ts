import { useEffect, useRef, useCallback } from 'react';
import type { Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth.store';
import { useUIStore } from '@/stores/ui.store';
import { connectSocket, disconnectSocket, getSocket } from '@/lib/socket';
import type { ClinicalAlert, VitalSigns } from '@/types';

// ---------------------------------------------------------------------------
// Event type map — mirrors what the gateway emits
// ---------------------------------------------------------------------------

export interface RealtimeEvents {
  'vitals:new': (data: VitalSigns) => void;
  'alert:new': (data: ClinicalAlert) => void;
  'alert:resolved': (data: { id: string }) => void;
  'prescription:updated': (data: { prescriptionId: string; encounterId: string; status: string }) => void;
  'medication:checked': (data: { checkId: string; status: string; nurseId: string }) => void;
  'bed:updated': (data: { bedId: string; status: string; patientId?: string }) => void;
  'transcription:partial': (data: { text: string }) => void;
  'transcription:complete': (data: { encounterId: string; text: string; structuredData?: Record<string, unknown> }) => void;
  'triage:queue-updated': (data: { queue: Array<{ patientId: string; level: string }> }) => void;
  'notification:new': (data: { id: string; type: string; title: string; message: string }) => void;
  'encounter:status-changed': (data: { encounterId: string; status: string }) => void;
}

// ---------------------------------------------------------------------------
// Core hook — manages the socket lifecycle & global event handlers
// ---------------------------------------------------------------------------

export function useRealtime() {
  const socketRef = useRef<Socket | null>(null);
  const { user } = useAuthStore();
  const { addAlert, dismissAlert } = useUIStore();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;

    connectSocket();
    const socket = getSocket();
    socketRef.current = socket;

    // --- Global listeners ------------------------------------------------

    socket.on('connect', () => {
      console.log('[VoxPEP] Realtime connected');
    });

    socket.on('disconnect', () => {
      console.log('[VoxPEP] Realtime disconnected');
    });

    // Vital signs → invalidate query cache
    socket.on('vitals:new', () => {
      void queryClient.invalidateQueries({ queryKey: ['vital-signs'] });
      void queryClient.invalidateQueries({ queryKey: ['encounters'] });
    });

    // New clinical alert → add to UI store + toast
    socket.on('alert:new', (data: ClinicalAlert) => {
      addAlert(data);

      const toastFn =
        data.severity === 'CRITICAL' || data.severity === 'EMERGENCY'
          ? toast.error
          : data.severity === 'WARNING'
            ? toast.warning
            : toast.info;

      toastFn(data.title, { description: data.message, duration: 8000 });
    });

    // Alert resolved → remove from UI store
    socket.on('alert:resolved', (data: { id: string }) => {
      dismissAlert(data.id);
    });

    // Prescription updated → invalidate cache
    socket.on('prescription:updated', () => {
      void queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
      void queryClient.invalidateQueries({ queryKey: ['encounters'] });
    });

    // Encounter status changed → invalidate cache
    socket.on('encounter:status-changed', () => {
      void queryClient.invalidateQueries({ queryKey: ['encounters'] });
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('vitals:new');
      socket.off('alert:new');
      socket.off('alert:resolved');
      socket.off('prescription:updated');
      socket.off('encounter:status-changed');
      disconnectSocket();
      socketRef.current = null;
    };
    // addAlert / dismissAlert are stable Zustand selectors
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, queryClient]);

  // --- Room helpers -------------------------------------------------------

  const on = useCallback(<K extends keyof RealtimeEvents>(
    event: K,
    callback: RealtimeEvents[K],
  ) => {
    const handler = callback as (...args: unknown[]) => void;
    socketRef.current?.on(event as string, handler);
    return () => {
      socketRef.current?.off(event as string, handler);
    };
  }, []);

  const joinEncounter = useCallback((encounterId: string) => {
    socketRef.current?.emit('join:encounter', { encounterId });
  }, []);

  const leaveEncounter = useCallback((encounterId: string) => {
    socketRef.current?.emit('leave:encounter', { encounterId });
  }, []);

  const joinPatient = useCallback((patientId: string) => {
    socketRef.current?.emit('join:patient', { patientId });
  }, []);

  const joinWard = useCallback((ward: string) => {
    socketRef.current?.emit('join:ward', { ward });
  }, []);

  return {
    socket: socketRef.current,
    on,
    joinEncounter,
    leaveEncounter,
    joinPatient,
    joinWard,
  };
}

// ---------------------------------------------------------------------------
// Convenience hook — subscribe to one event with auto cleanup
// ---------------------------------------------------------------------------

export function useRealtimeEvent<K extends keyof RealtimeEvents>(
  eventName: K,
  handler: RealtimeEvents[K],
) {
  const { on } = useRealtime();

  useEffect(() => {
    const unsub = on(eventName, handler);
    return unsub;
    // handler identity may change — callers should memoize if stable ref needed
  }, [on, eventName, handler]);
}
