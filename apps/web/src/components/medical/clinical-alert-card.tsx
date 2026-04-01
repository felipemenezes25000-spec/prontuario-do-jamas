'use client';

import { AlertTriangle, Info, ShieldAlert, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface ClinicalAlertCardProps {
  alert: {
    type: string;
    severity: 'INFO' | 'WARNING' | 'CRITICAL';
    title: string;
    message: string;
    triggeredAt: string;
  };
  onAcknowledge?: () => void;
  onResolve?: () => void;
  className?: string;
}

const severityConfig = {
  CRITICAL: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/40',
    icon: <ShieldAlert className="h-5 w-5 text-red-400" />,
    titleColor: 'text-red-400',
    pulse: true,
    glowClass: 'shadow-red-500/10',
    stripColor: 'bg-red-500',
  },
  WARNING: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/40',
    icon: <AlertTriangle className="h-5 w-5 text-amber-400" />,
    titleColor: 'text-amber-400',
    pulse: false,
    glowClass: 'shadow-amber-500/5',
    stripColor: 'bg-amber-500',
  },
  INFO: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/40',
    icon: <Info className="h-5 w-5 text-blue-400" />,
    titleColor: 'text-blue-400',
    pulse: false,
    glowClass: '',
    stripColor: 'bg-blue-500',
  },
};

function getTimeSince(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMin = Math.floor((now - then) / 60000);
  if (diffMin < 1) return 'agora';
  if (diffMin < 60) return `ha ${diffMin}min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `ha ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  return `ha ${diffD}d`;
}

export function ClinicalAlertCard({
  alert,
  onAcknowledge,
  onResolve,
  className,
}: ClinicalAlertCardProps) {
  const config = severityConfig[alert.severity];

  return (
    <Card
      className={cn(
        'relative overflow-hidden border p-4 transition-all duration-200',
        config.bg,
        config.border,
        config.glowClass && `shadow-lg ${config.glowClass}`,
        config.pulse && 'clinical-alert-pulse',
        className,
      )}
    >
      <style>{alertStyles}</style>

      {/* Severity color strip on left */}
      <div className={cn('absolute inset-y-0 left-0 w-1', config.stripColor)} />

      <div className="flex items-start gap-3 pl-2">
        <div className={cn('mt-0.5 shrink-0', config.pulse && 'animate-bounce')} style={config.pulse ? { animationDuration: '2s' } : undefined}>
          {config.icon}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <h4
              className={cn(
                'text-sm font-semibold',
                config.titleColor,
                alert.severity === 'CRITICAL' && 'font-bold uppercase tracking-wide',
              )}
            >
              {alert.severity === 'CRITICAL' && '!! '}
              {alert.title}
            </h4>
            <span className="shrink-0 text-[10px] text-muted-foreground">
              {getTimeSince(alert.triggeredAt)}
            </span>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {alert.message}
          </p>
          {(onAcknowledge || onResolve) && (
            <div className="flex items-center gap-2 pt-1.5">
              {onAcknowledge && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onAcknowledge}
                  className="h-7 gap-1 text-xs"
                >
                  <CheckCircle2 className="h-3 w-3" />
                  Reconhecer
                </Button>
              )}
              {onResolve && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onResolve}
                  className="h-7 gap-1 text-xs"
                >
                  <XCircle className="h-3 w-3" />
                  Resolver
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

const alertStyles = `
  @keyframes clinical-alert-border-pulse {
    0%, 100% {
      border-color: rgba(239, 68, 68, 0.4);
      box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
    }
    50% {
      border-color: rgba(239, 68, 68, 0.8);
      box-shadow: 0 0 12px 4px rgba(239, 68, 68, 0.15);
    }
  }

  .clinical-alert-pulse {
    animation: clinical-alert-border-pulse 2s ease-in-out infinite;
  }
`;
