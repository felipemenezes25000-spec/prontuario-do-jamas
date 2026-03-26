import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AccessibilityProvider } from '@/components/accessibility/AccessibilityProvider';
import { queryClient } from './lib/query-client';
import { AppRoutes } from './routes';
import { InstallPrompt } from './components/pwa/install-prompt';

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AccessibilityProvider>
        <TooltipProvider>
          <BrowserRouter>
            <AppRoutes />
            <Toaster theme="dark" position="top-right" richColors />
            <InstallPrompt />
          </BrowserRouter>
        </TooltipProvider>
      </AccessibilityProvider>
    </QueryClientProvider>
  );
}
