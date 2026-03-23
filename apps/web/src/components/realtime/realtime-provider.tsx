import { useRealtime } from '@/hooks/use-realtime';

/**
 * Wrapper component that activates the global Socket.IO connection.
 * Place it once inside the authenticated layout so the socket is connected
 * while the user is logged in and disconnected when they log out / navigate away.
 */
export function RealtimeProvider({ children }: { children?: React.ReactNode }) {
  useRealtime();
  return <>{children}</>;
}
