'use client';

import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type NEWSClassification = 'LOW' | 'MEDIUM' | 'HIGH';

interface NEWSParameter {
  name: string;
  value: number | string | null;
  score: number;
}

interface NEWSBadgeProps {
  score: number;
  classification?: NEWSClassification;
  parameters?: NEWSParameter[];
  compact?: boolean;
  className?: string;
}

const classificationConfig: Record<NEWSClassification, {
  label: string;
  bg: string;
  text: string;
  border: string;
}> = {
  LOW: {
    label: 'Baixo',
    bg: 'bg-green-500/15',
    text: 'text-green-500',
    border: 'border-green-500/30',
  },
  MEDIUM: {
    label: 'Médio',
    bg: 'bg-yellow-500/15',
    text: 'text-yellow-500',
    border: 'border-yellow-500/30',
  },
  HIGH: {
    label: 'Alto',
    bg: 'bg-red-500/15',
    text: 'text-red-500',
    border: 'border-red-500/30',
  },
};

function deriveClassification(score: number, parameters?: NEWSParameter[]): NEWSClassification {
  if (score >= 7) return 'HIGH';
  const hasScore3 = parameters?.some((p) => p.score === 3) ?? false;
  if (score >= 5 || hasScore3) return 'MEDIUM';
  return 'LOW';
}

export function NEWSBadge({ score, classification, parameters, compact = false, className }: NEWSBadgeProps) {
  const resolvedClassification = classification ?? deriveClassification(score, parameters);
  const config = classificationConfig[resolvedClassification];
  const isHigh = resolvedClassification === 'HIGH';

  const badge = (
    <Badge
      variant="outline"
      className={cn(
        'gap-1 font-mono font-bold',
        config.bg,
        config.text,
        config.border,
        isHigh && 'animate-pulse',
        className,
      )}
    >
      {isHigh && <AlertTriangle className="h-3 w-3" />}
      <span>NEWS {score}</span>
      {isHigh && !compact && <span className="text-[10px] font-semibold">TRR</span>}
    </Badge>
  );

  if (!parameters || parameters.length === 0) {
    return badge;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-1">
            <p className="text-xs font-semibold">
              NEWS Score: {score} — {config.label}
            </p>
            <div className="space-y-0.5">
              {parameters.map((param) => (
                <div
                  key={param.name}
                  className="flex items-center justify-between gap-3 text-xs"
                >
                  <span className="text-muted-foreground">{param.name}</span>
                  <div className="flex items-center gap-1">
                    <span>{param.value ?? '—'}</span>
                    <span
                      className={cn(
                        'inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold',
                        param.score === 0 && 'bg-green-500/20 text-green-500',
                        param.score === 1 && 'bg-yellow-500/20 text-yellow-500',
                        param.score === 2 && 'bg-orange-500/20 text-orange-500',
                        param.score === 3 && 'bg-red-500/20 text-red-500',
                      )}
                    >
                      {param.score}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            {isHigh && (
              <p className="mt-1 text-[10px] font-semibold text-red-400">
                Acionar Time de Resposta Rápida (TRR)
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
