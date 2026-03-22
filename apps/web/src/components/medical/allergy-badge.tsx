'use client';

import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface AllergyBadgeProps {
  substance: string;
  severity: 'MILD' | 'MODERATE' | 'SEVERE' | 'ANAPHYLAXIS';
  type?: string;
  showIcon?: boolean;
  className?: string;
}

const severityConfig = {
  ANAPHYLAXIS: {
    bg: 'bg-red-600/15 border-red-600/30',
    text: 'text-red-400',
    label: 'Anafilaxia',
  },
  SEVERE: {
    bg: 'bg-red-500/15 border-red-500/30',
    text: 'text-red-400',
    label: 'Grave',
  },
  MODERATE: {
    bg: 'bg-amber-500/15 border-amber-500/30',
    text: 'text-amber-400',
    label: 'Moderada',
  },
  MILD: {
    bg: 'bg-blue-500/15 border-blue-500/30',
    text: 'text-blue-400',
    label: 'Leve',
  },
};

export function AllergyBadge({
  substance,
  severity,
  type,
  showIcon = true,
  className,
}: AllergyBadgeProps) {
  const config = severityConfig[severity];
  const showWarningIcon =
    showIcon && (severity === 'SEVERE' || severity === 'ANAPHYLAXIS');

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
              config.bg,
              config.text,
              className,
            )}
          >
            {showWarningIcon && <AlertTriangle className="h-3 w-3" />}
            {substance}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs">
            <p className="font-semibold">{substance}</p>
            <p>Gravidade: {config.label}</p>
            {type && <p>Tipo: {type}</p>}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
