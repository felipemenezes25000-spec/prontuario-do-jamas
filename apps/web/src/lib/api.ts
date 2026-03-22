import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { toast } from 'sonner';

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

interface QueueItem {
  resolve: (value: string | null) => void;
  reject: (reason?: unknown) => void;
}

let isRefreshing = false;
let failedQueue: QueueItem[] = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Map frontend 'limit' param to API's 'pageSize'
    if (config.params?.limit !== undefined) {
      config.params.pageSize = config.params.limit;
      delete config.params.limit;
    }

    const stored = localStorage.getItem('voxpep-auth');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const token = parsed?.state?.accessToken;
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        const tenantId = parsed?.state?.user?.tenantId;
        if (tenantId && config.headers) {
          config.headers['X-Tenant-Id'] = tenantId;
        }
      } catch {
        // ignore parse errors
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve: resolve as (value: string | null) => void, reject });
        }).then((token) => {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const stored = localStorage.getItem('voxpep-auth');
        const parsed = stored ? JSON.parse(stored) : null;
        const refreshToken = parsed?.state?.refreshToken;

        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const { data } = await axios.post('/api/v1/auth/refresh', {
          refreshToken,
        });

        const newAccess = data.accessToken;
        const newRefresh = data.refreshToken;

        if (parsed?.state) {
          parsed.state.accessToken = newAccess;
          parsed.state.refreshToken = newRefresh;
          localStorage.setItem('voxpep-auth', JSON.stringify(parsed));
        }

        processQueue(null, newAccess);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        }
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('voxpep-auth');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Global error toasts (non-401)
    const status = error.response?.status;
    const message =
      (error.response?.data as Record<string, unknown>)?.message as
        | string
        | undefined;

    if (status === 403) {
      toast.error('Sem permissão para esta ação.');
    } else if (status === 404) {
      // Silent — pages handle their own 404 UX
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
