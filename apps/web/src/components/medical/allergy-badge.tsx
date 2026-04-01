'use client';

import { AlertTriangle, ShieldAlert } from 'lucide-react';
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
    bg: 'bg-red-600/20 border-red-600/40',
    text: 'text-red-500 dark:text-red-400',
    label: 'Anafilaxia',
    pulse: true,
    icon: ShieldAlert,
    glow: 'shadow-sm shadow-red-500/20',
  },
  SEVERE: {
    bg: 'bg-red-500/15 border-red-500/30',
    text: 'text-red-500 dark:text-red-400',
    label: 'Grave',
    pulse: false,
    icon: AlertTriangle,
    glow: 'shadow-sm shadow-red-500/10',
  },
  MODERATE: {
    bg: 'bg-amber-500/15 border-amber-500/30',
    text: 'text-amber-600 dark:text-amber-400',
    label: 'Moderada',
    pulse: false,
    icon: AlertTriangle,
    glow: '',
  },
  MILD: {
    bg: 'bg-blue-500/15 border-blue-500/30',
    text: 'text-blue-600 dark:text-blue-400',
    label: 'Leve',
    pulse: false,
    icon: AlertTriangle,
    glow: '',
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
  const IconComponent = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold transition-all duration-200',
              config.bg,
              config.text,
              config.glow,
              config.pulse && 'animate-pulse',
              severity === 'ANAPHYLAXIS' && 'ring-1 ring-red-500/30',
              className,
            )}
          >
            {showWarningIcon && <IconComponent className="h-3 w-3" />}
            {substance}
          </span>
        </TooltipTrigger>
        <TooltipContent
          className={cn(
            'border',
            severity === 'ANAPHYLAXIS' || severity === 'SEVERE'
              ? 'border-red-500/30 bg-red-950/90'
              : '',
          )}
        >
          <div className="text-xs">
            <p className="font-bold">{substance}</p>
            <p
              className={cn(
                severity === 'ANAPHYLAXIS' || severity === 'SEVERE'
                  ? 'text-red-400'
                  : severity === 'MODERATE'
                    ? 'text-amber-400'
                    : 'text-blue-400',
              )}
            >
              Gravidade: {config.label}
            </p>
            {type && <p>Tipo: {type}</p>}
            {severity === 'ANAPHYLAXIS' && (
              <p className="mt-1 font-bold text-red-400">
                RISCO DE ANAFILAXIA
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
