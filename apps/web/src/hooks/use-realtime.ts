import { useCallback, useEffect, useRef } from 'react';
import type { Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth.store';
import { useUIStore } from '@/stores/ui.store';
import { connectSocket, disconnectSocket, getSocket } from '@/lib/socket';
import type { ClinicalAlert, VitalSigns } from '@/types';

export interface RealtimeEvents {
  'vitals:new': (data: VitalSigns) => void;
  'alert:new': (data: ClinicalAlert) => void;
  'alert:resolved': (data: { id: string }) => void;
  'prescription:updated': (data: {
    prescriptionId: string;
    encounterId: string;
    status: string;
  }) => void;
  'medication:checked': (data: { checkId: string; status: string; nurseId: string }) => void;
  'bed:updated': (data: { bedId: string; status: string; patientId?: string }) => void;
  'transcription:partial': (data: { text: string }) => void;
  'transcription:complete': (data: {
    encounterId: string;
    text: string;
    structuredData?: Record<string, unknown>;
  }) => void;
  'triage:queue-updated': (data: {
    queue: Array<{ patientId: string; level: string }>;
  }) => void;
  'notification:new': (data: {
    id: string;
    type: string;
    title: string;
    message: string;
  }) => void;
  'encounter:status-changed': (data: { encounterId: string; status: string }) => void;
}

/**
 * Owns the singleton Socket.IO lifecycle for the authenticated application.
 * This hook must be mounted once by RealtimeProvider.
 */
export function useRealtime() {
  const socketRef = useRef<Socket | null>(null);
  const user = useAuthStore((state) => state.user);
  const addAlert = useUIStore((state) => state.addAlert);
  const dismissAlert = useUIStore((state) => state.dismissAlert);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;

    connectSocket();
    const socket = getSocket();
    socketRef.current = socket;

    const handleConnect = () => {
      console.info('[StarMed] Realtime connected');
    };

    const handleDisconnect = () => {
      console.info('[StarMed] Realtime disconnected');
    };

    const handleVitals = () => {
      void queryClient.invalidateQueries({ queryKey: ['vital-signs'] });
      void queryClient.invalidateQueries({ queryKey: ['encounters'] });
    };

    const handleAlert = (data: ClinicalAlert) => {
      addAlert(data);

      const toastFn =
        data.severity === 'CRITICAL' || data.severity === 'EMERGENCY'
          ? toast.error
          : data.severity === 'WARNING'
            ? toast.warning
            : toast.info;

      toastFn(data.title, { description: data.message, duration: 8000 });
    };

    const handleAlertResolved = (data: { id: string }) => {
      dismissAlert(data.id);
    };

    const handlePrescriptionUpdated = () => {
      void queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
      void queryClient.invalidateQueries({ queryKey: ['encounters'] });
    };

    const handleEncounterStatusChanged = () => {
      void queryClient.invalidateQueries({ queryKey: ['encounters'] });
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('vitals:new', handleVitals);
    socket.on('alert:new', handleAlert);
    socket.on('alert:resolved', handleAlertResolved);
    socket.on('prescription:updated', handlePrescriptionUpdated);
    socket.on('encounter:status-changed', handleEncounterStatusChanged);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('vitals:new', handleVitals);
      socket.off('alert:new', handleAlert);
      socket.off('alert:resolved', handleAlertResolved);
      socket.off('prescription:updated', handlePrescriptionUpdated);
      socket.off('encounter:status-changed', handleEncounterStatusChanged);
      disconnectSocket();
      socketRef.current = null;
    };
  }, [addAlert, dismissAlert, queryClient, user]);

  const on = useCallback(<K extends keyof RealtimeEvents>(
    event: K,
    callback: RealtimeEvents[K],
  ) => {
    const socket = getSocket();
    const handler = callback as (...args: unknown[]) => void;
    socket.on(event as string, handler);
    return () => socket.off(event as string, handler);
  }, []);

  const joinEncounter = useCallback((encounterId: string) => {
    getSocket().emit('join:encounter', { encounterId });
  }, []);

  const leaveEncounter = useCallback((encounterId: string) => {
    getSocket().emit('leave:encounter', { encounterId });
  }, []);

  const joinPatient = useCallback((patientId: string) => {
    getSocket().emit('join:patient', { patientId });
  }, []);

  const joinWard = useCallback((ward: string) => {
    getSocket().emit('join:ward', { ward });
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

/**
 * Subscribes to an event without owning the socket lifecycle.
 * RealtimeProvider remains the only component allowed to connect/disconnect.
 */
export function useRealtimeEvent<K extends keyof RealtimeEvents>(
  eventName: K,
  handler: RealtimeEvents[K],
) {
  useEffect(() => {
    const socket = getSocket();
    const eventHandler = handler as (...args: unknown[]) => void;
    socket.on(eventName as string, eventHandler);
    return () => socket.off(eventName as string, eventHandler);
  }, [eventName, handler]);
}
