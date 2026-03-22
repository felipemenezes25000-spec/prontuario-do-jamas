import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface PageErrorProps {
  /** Error title (default: generic message) */
  title?: string;
  /** Error description */
  message?: string;
  /** Retry callback - if provided, a retry button is shown */
  onRetry?: () => void;
}

export function PageError({
  title = 'Erro ao carregar dados',
  message = 'Ocorreu um problema ao buscar as informacoes. Tente novamente.',
  onRetry,
}: PageErrorProps) {
  return (
    <div className="flex items-center justify-center py-16">
      <Card className="w-full max-w-md border-destructive/30 bg-destructive/5">
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground">{message}</p>
          </div>
          {onRetry && (
            <Button variant="outline" onClick={onRetry} className="mt-2 gap-2">
              <RefreshCw className="h-4 w-4" />
              Tentar novamente
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
