import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Notification, ClinicalAlert } from '@/types';

interface UIState {
  sidebarCollapsed: boolean;
  sidebarMobileOpen: boolean;
  commandOpen: boolean;
  activeAlerts: ClinicalAlert[];
  notifications: Notification[];
  unreadCount: number;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSidebarMobileOpen: (open: boolean) => void;
  setCommandOpen: (open: boolean) => void;
  setAlerts: (alerts: ClinicalAlert[]) => void;
  addAlert: (alert: ClinicalAlert) => void;
  dismissAlert: (id: string) => void;
  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Notification) => void;
  markNotificationRead: (id: string) => void;
  markAllRead: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      sidebarMobileOpen: false,
      commandOpen: false,
      activeAlerts: [],
      notifications: [],
      unreadCount: 0,

      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

      setSidebarMobileOpen: (open) => set({ sidebarMobileOpen: open }),

      setCommandOpen: (open) => set({ commandOpen: open }),

      setAlerts: (alerts) => set({ activeAlerts: alerts }),

      addAlert: (alert) =>
        set((state) => ({ activeAlerts: [alert, ...state.activeAlerts] })),

      dismissAlert: (id) =>
        set((state) => ({
          activeAlerts: state.activeAlerts.filter((a) => a.id !== id),
        })),

      setNotifications: (notifications) =>
        set({
          notifications,
          unreadCount: notifications.filter((n) => !n.read).length,
        }),

      addNotification: (notification) =>
        set((state) => ({
          notifications: [notification, ...state.notifications],
          unreadCount: state.unreadCount + 1,
        })),

      markNotificationRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n,
          ),
          unreadCount: Math.max(0, state.unreadCount - 1),
        })),

      markAllRead: () =>
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
          unreadCount: 0,
        })),
    }),
    {
      name: 'voxpep-ui',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    },
  ),
);
