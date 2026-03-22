import { Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface PageEmptyProps {
  /** Icon to display (default: Inbox) */
  icon?: React.ReactNode;
  /** Title text */
  title?: string;
  /** Description text */
  description?: string;
  /** CTA button label */
  actionLabel?: string;
  /** CTA callback */
  onAction?: () => void;
}

export function PageEmpty({
  icon,
  title = 'Nenhum registro encontrado',
  description = 'Ainda nao existem dados para exibir aqui.',
  actionLabel,
  onAction,
}: PageEmptyProps) {
  return (
    <div className="flex items-center justify-center py-16">
      <Card className="w-full max-w-md border-dashed">
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            {icon ?? <Inbox className="h-7 w-7 text-muted-foreground" />}
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          {actionLabel && onAction && (
            <Button onClick={onAction} className="mt-2">
              {actionLabel}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
