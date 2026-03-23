import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth.store';
import { useUIStore } from '@/stores/ui.store';
import { connectSocket, getSocket } from '@/lib/socket';

interface RealtimeNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  actionUrl?: string;
  createdAt: string;
}

const NOTIFICATION_SOUND_URL = '/notification.mp3';

let audioContext: AudioContext | null = null;

function playNotificationSound(): void {
  try {
    // Try to use Audio API for notification sound
    const audio = new Audio(NOTIFICATION_SOUND_URL);
    audio.volume = 0.5;
    audio.play().catch(() => {
      // If audio file not found, use Web Audio API for a beep
      if (!audioContext) {
        audioContext = new AudioContext();
      }
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = 880;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;
      oscillator.start();
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5);
      oscillator.stop(audioContext.currentTime + 0.5);
    });
  } catch {
    // Audio not supported — silent fallback
  }
}

/**
 * Hook that connects to Socket.IO and listens for real-time notifications.
 * Updates the Zustand store and TanStack Query cache.
 * Plays a sound for critical notifications if sound is enabled.
 */
export function useRealtimeNotifications() {
  const { user } = useAuthStore();
  const { addNotification } = useUIStore();
  const queryClient = useQueryClient();
  const soundEnabledRef = useRef(true);

  const setSoundEnabled = useCallback((enabled: boolean) => {
    soundEnabledRef.current = enabled;
  }, []);

  useEffect(() => {
    if (!user) return;

    connectSocket();
    const socket = getSocket();

    const handleNotification = (data: RealtimeNotification) => {
      // Add to Zustand store
      addNotification({
        id: data.id,
        type: data.type as 'ALERT' | 'REMINDER' | 'MESSAGE' | 'TASK' | 'RESULT' | 'APPOINTMENT' | 'SYSTEM',
        title: data.title,
        body: data.body,
        data: data.data,
        actionUrl: data.actionUrl,
        createdAt: data.createdAt,
      });

      // Invalidate TanStack Query cache
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });

      // Show toast
      const isCritical = data.type === 'ALERT';
      if (isCritical) {
        toast.error(data.title, {
          description: data.body,
          duration: 10000,
        });
        if (soundEnabledRef.current) {
          playNotificationSound();
        }
      } else {
        toast.info(data.title, {
          description: data.body,
          duration: 5000,
        });
      }
    };

    socket.on('notification:new', handleNotification);

    return () => {
      socket.off('notification:new', handleNotification);
    };
    // addNotification is stable from Zustand
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, queryClient]);

  return { setSoundEnabled, soundEnabled: soundEnabledRef.current };
}
