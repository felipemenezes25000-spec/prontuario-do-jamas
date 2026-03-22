import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  mfaToken: string | null;
  mfaPending: boolean;
  login: (user: User, accessToken: string, refreshToken: string) => void;
  logout: () => void;
  setUser: (user: User) => void;
  refreshTokens: (accessToken: string, refreshToken: string) => void;
  setMfaPending: (mfaToken: string) => void;
  clearMfaPending: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      mfaToken: null,
      mfaPending: false,

      login: (user, accessToken, refreshToken) =>
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
          mfaToken: null,
          mfaPending: false,
        }),

      logout: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          mfaToken: null,
          mfaPending: false,
        }),

      setUser: (user) => set({ user }),

      refreshTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken }),

      setMfaPending: (mfaToken) =>
        set({
          mfaToken,
          mfaPending: true,
          isAuthenticated: false,
        }),

      clearMfaPending: () =>
        set({
          mfaToken: null,
          mfaPending: false,
        }),
    }),
    {
      name: 'voxpep-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        // Don't persist MFA state — it's short-lived
      }),
    },
  ),
);
