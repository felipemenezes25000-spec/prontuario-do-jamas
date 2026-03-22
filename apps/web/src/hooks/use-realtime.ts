import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/auth.store';

interface RealtimeEvents {
  'vitals:new': (data: { patientId: string; encounterId?: string; values: Record<string, number> }) => void;
  'alert:new': (data: { patientId: string; type: string; severity: string; message: string }) => void;
  'prescription:updated': (data: { prescriptionId: string; status: string }) => void;
  'medication:checked': (data: { checkId: string; status: string; nurseId: string }) => void;
  'bed:updated': (data: { bedId: string; status: string; patientId?: string }) => void;
  'transcription:partial': (data: { text: string }) => void;
  'transcription:complete': (data: { encounterId: string; text: string; structuredData?: Record<string, unknown> }) => void;
  'triage:queue-updated': (data: { queue: Array<{ patientId: string; level: string }> }) => void;
  'notification:new': (data: { id: string; type: string; title: string; message: string }) => void;
  'encounter:status-changed': (data: { encounterId: string; status: string }) => void;
}

export function useRealtime() {
  const socketRef = useRef<Socket | null>(null);
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user) return;

    const socket = io('/realtime', {
      query: {
        tenantId: user.tenantId,
        userId: user.id,
      },
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[VoxPEP] Realtime connected');
    });

    socket.on('disconnect', () => {
      console.log('[VoxPEP] Realtime disconnected');
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user]);

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

/**
 * Subscribe to a specific realtime event with automatic cleanup.
 * The handler is called whenever the event fires, and unsubscribed on unmount.
 */
export function useRealtimeEvent<K extends keyof RealtimeEvents>(
  eventName: K,
  handler: RealtimeEvents[K],
) {
  const { socket } = useRealtime();

  useEffect(() => {
    if (!socket) return;
    const h = handler as (...args: unknown[]) => void;
    socket.on(eventName as string, h);
    return () => {
      socket.off(eventName as string, h);
    };
  }, [socket, eventName, handler]);
}
