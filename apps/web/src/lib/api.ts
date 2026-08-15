import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth.store';

const APP_API_BASE_URL = '/api/v1';
const DEMO_ACCESS_TOKEN = 'demo-access-token';
const DEMO_API_BASE_URL =
  (import.meta.env.VITE_DEMO_API_URL as string | undefined)?.replace(/\/$/, '') ??
  'https://starmed-mock-api.vercel.app/api/v1';

const api = axios.create({
  baseURL: APP_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30_000,
});

interface QueueItem {
  resolve: (value: string | null) => void;
  reject: (reason?: unknown) => void;
}

let isRefreshing = false;
let failedQueue: QueueItem[] = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((promise) => {
    if (error) promise.reject(error);
    else promise.resolve(token);
  });
  failedQueue = [];
};

function isDemoBootstrap(config: InternalAxiosRequestConfig, accessToken: string | null) {
  return !accessToken && config.method?.toLowerCase() === 'get' && config.url === '/auth/me';
}

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (config.params?.limit !== undefined) {
      config.params.pageSize = config.params.limit;
      delete config.params.limit;
    }

    const { accessToken, user } = useAuthStore.getState();
    const isDemoSession = accessToken === DEMO_ACCESS_TOKEN;

    if (isDemoSession || isDemoBootstrap(config, accessToken)) {
      config.baseURL = DEMO_API_BASE_URL;
      if (config.headers) {
        delete config.headers.Authorization;
      }
    } else {
      config.baseURL = APP_API_BASE_URL;
      if (accessToken && config.headers) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }
    }

    if (user?.tenantId && config.headers) {
      config.headers['X-Tenant-Id'] = user.tenantId;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;

    const { accessToken } = useAuthStore.getState();
    const isDemoSession = accessToken === DEMO_ACCESS_TOKEN;

    if (error.response?.status === 401 && isDemoSession) {
      useAuthStore.getState().logout();
      window.location.assign('/login');
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise<string | null>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          if (token && originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { refreshToken, refreshTokens } = useAuthStore.getState();
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post<{
          accessToken: string;
          refreshToken: string;
        }>('/api/v1/auth/refresh', { refreshToken });

        refreshTokens(data.accessToken, data.refreshToken);
        processQueue(null, data.accessToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        }
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        useAuthStore.getState().logout();
        window.location.assign('/login');
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    const status = error.response?.status;
    const message = (error.response?.data as Record<string, unknown> | undefined)?.message as
      | string
      | undefined;

    if (status === 403) {
      toast.error('Sem permissão para esta ação.');
    } else if (status === 404) {
      // Pages handle their own not-found UX.
    } else if (status === 422) {
      toast.error(`Dados inválidos: ${message ?? 'verifique os campos'}`);
    } else if (status === 503) {
      toast.error('Serviço temporariamente indisponível. Tente novamente.');
    } else if (status && status >= 500) {
      toast.error(message ?? 'Erro interno do servidor.');
    } else if (error.code === 'ERR_NETWORK') {
      toast.error('Sem conexão com o servidor. Verifique sua rede.');
    }

    return Promise.reject(error);
  },
);

export { api };
export default api;
