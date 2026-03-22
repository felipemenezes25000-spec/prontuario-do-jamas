'use client';

import {
  Pencil,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface PrescriptionItemCardProps {
  item: {
    medicationName: string;
    dose: string;
    route: string;
    frequency: string;
    duration?: string;
    isControlled?: boolean;
    isHighAlert?: boolean;
    isAntibiotic?: boolean;
    status: string;
    interactionAlerts?: Array<{ message: string }>;
    allergyAlerts?: Array<{ message: string }>;
  };
  onEdit?: () => void;
  onDelete?: () => void;
  onCheck?: () => void;
  className?: string;
}

export function PrescriptionItemCard({
  item,
  onEdit,
  onDelete,
  onCheck,
  className,
}: PrescriptionItemCardProps) {
  const borderColor = item.isHighAlert
    ? 'border-l-red-500'
    : item.isControlled
      ? 'border-l-amber-500'
      : 'border-l-teal-500';

  const hasAlerts =
    (item.interactionAlerts && item.interactionAlerts.length > 0) ||
    (item.allergyAlerts && item.allergyAlerts.length > 0);

  return (
    <Card
      className={cn(
        'border-l-4 p-3 transition-colors hover:bg-accent/30',
        borderColor,
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1.5">
          {/* Medication name and badges */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-semibold text-foreground">
              {item.medicationName}
            </span>
            {item.isControlled && (
              <Badge className="bg-amber-500/15 px-1.5 py-0 text-[10px] font-semibold text-amber-400 border-amber-500/30">
                Controlado
              </Badge>
            )}
            {item.isHighAlert && (
              <Badge className="bg-red-500/15 px-1.5 py-0 text-[10px] font-semibold text-red-400 border-red-500/30">
                Alto Alerta
              </Badge>
            )}
            {item.isAntibiotic && (
              <Badge className="bg-blue-500/15 px-1.5 py-0 text-[10px] font-semibold text-blue-400 border-blue-500/30">
                Antibiótico
              </Badge>
            )}
          </div>

          {/* Dose/Route/Frequency */}
          <p className="text-xs text-muted-foreground">
            {item.dose} &middot; {item.route} &middot; {item.frequency}
          </p>

          {/* Duration */}
          {item.duration && (
            <Badge variant="outline" className="text-[10px]">
              {item.duration}
            </Badge>
          )}

          {/* Alerts */}
          {hasAlerts && (
            <div className="mt-1 space-y-1">
              {item.interactionAlerts?.map((alert, i) => (
                <div
                  key={`int-${i}`}
                  className="flex items-center gap-1.5 text-[10px] text-amber-400"
                >
                  <ShieldAlert className="h-3 w-3 shrink-0" />
                  {alert.message}
                </div>
              ))}
              {item.allergyAlerts?.map((alert, i) => (
                <div
                  key={`all-${i}`}
                  className="flex items-center gap-1.5 text-[10px] text-red-400"
                >
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                  {alert.message}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <TooltipProvider>
            {onCheck && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-teal-600 dark:text-teal-400 hover:bg-teal-500/10 hover:text-teal-300"
                    onClick={onCheck}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Checar medicação</TooltipContent>
              </Tooltip>
            )}
            {onEdit && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={onEdit}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Editar</TooltipContent>
              </Tooltip>
            )}
            {onDelete && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-red-400"
                    onClick={onDelete}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Remover</TooltipContent>
              </Tooltip>
            )}
          </TooltipProvider>
        </div>
      </div>
    </Card>
  );
}
