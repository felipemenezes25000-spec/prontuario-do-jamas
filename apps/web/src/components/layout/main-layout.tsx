import { Outlet } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/ui.store';
import { RealtimeProvider } from '@/components/realtime/realtime-provider';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { Breadcrumbs } from './breadcrumbs';

export function MainLayout() {
  const { sidebarCollapsed } = useUIStore();

  return (
    <RealtimeProvider>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div
          className={cn(
            'flex min-h-screen flex-col transition-all duration-300',
            sidebarCollapsed ? 'lg:pl-[68px]' : 'lg:pl-64',
          )}
        >
          <Header />
          <main className="flex-1 p-4 lg:p-6">
            <Breadcrumbs />
            <Outlet />
          </main>
        </div>
      </div>
    </RealtimeProvider>
  );
}
