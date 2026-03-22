import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { queryClient } from './lib/query-client';
import { AppRoutes } from './routes';

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <AppRoutes />
          <Toaster theme="dark" position="top-right" richColors />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
