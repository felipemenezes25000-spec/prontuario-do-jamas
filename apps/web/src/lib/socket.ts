import { io, type Socket } from 'socket.io-client';

/**
 * Realtime Socket.IO singleton.
 *
 * Connects to the `/realtime` namespace on the API server. The Vite dev proxy
 * forwards `/socket.io` traffic to `http://localhost:3000`, so in dev we only
 * need a relative namespace. In production `VITE_API_URL` should be set.
 */

let socket: Socket | null = null;

function getAuthState(): { accessToken: string | null; tenantId: string | null; userId: string | null } {
  try {
    const raw = localStorage.getItem('voxpep-auth');
    if (!raw) return { accessToken: null, tenantId: null, userId: null };
    const parsed: { state?: { accessToken?: string; user?: { tenantId?: string; id?: string } } } =
      JSON.parse(raw);
    return {
      accessToken: parsed.state?.accessToken ?? null,
      tenantId: parsed.state?.user?.tenantId ?? null,
      userId: parsed.state?.user?.id ?? null,
    };
  } catch {
    return { accessToken: null, tenantId: null, userId: null };
  }
}

/**
 * Return (and lazily create) the singleton socket instance.
 * If the socket already exists it is returned as-is.
 */
export function getSocket(): Socket {
  if (socket) return socket;

  const baseUrl = import.meta.env.VITE_API_URL as string | undefined;
  const { accessToken, tenantId, userId } = getAuthState();

  socket = io(baseUrl ? `${baseUrl}/realtime` : '/realtime', {
    transports: ['websocket', 'polling'],
    autoConnect: false,
    auth: { token: accessToken },
    query: {
      ...(tenantId ? { tenantId } : {}),
      ...(userId ? { userId } : {}),
    },
  });

  return socket;
}

/**
 * Connect the singleton socket.
 * Safe to call multiple times — will no-op if already connected.
 */
export function connectSocket(): void {
  const s = getSocket();
  if (!s.connected) {
    // Refresh query params with latest auth state before connecting
    const { accessToken, tenantId, userId } = getAuthState();
    s.auth = { token: accessToken };
    s.io.opts.query = {
      ...(tenantId ? { tenantId } : {}),
      ...(userId ? { userId } : {}),
    };
    s.connect();
  }
}

/**
 * Disconnect and destroy the singleton socket.
 * A new socket will be created on the next `getSocket()` call.
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
