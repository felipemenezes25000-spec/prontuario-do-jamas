'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface TriageBadgeProps {
  level: 'RED' | 'ORANGE' | 'YELLOW' | 'GREEN' | 'BLUE';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showWaitTime?: boolean;
  className?: string;
}

const triageConfig = {
  RED: {
    color: '#DC2626',
    label: 'Emergência',
    waitTime: '0min',
    glow: true,
  },
  ORANGE: {
    color: '#EA580C',
    label: 'Muito Urgente',
    waitTime: '10min',
    glow: true,
  },
  YELLOW: {
    color: '#CA8A04',
    label: 'Urgente',
    waitTime: '60min',
    glow: false,
  },
  GREEN: {
    color: '#16A34A',
    label: 'Pouco Urgente',
    waitTime: '120min',
    glow: false,
  },
  BLUE: {
    color: '#2563EB',
    label: 'Não Urgente',
    waitTime: '240min',
    glow: false,
  },
};

const sizeConfig = {
  sm: { circle: 'h-8 w-8 text-xs', text: 'text-[10px]' },
  md: { circle: 'h-12 w-12 text-sm', text: 'text-xs' },
  lg: { circle: 'h-20 w-20 text-lg', text: 'text-sm' },
};

export function TriageBadge({
  level,
  size = 'md',
  showLabel = true,
  showWaitTime = false,
  className,
}: TriageBadgeProps) {
  const config = triageConfig[level];
  const sizeConf = sizeConfig[size];

  return (
    <div className={cn('flex flex-col items-center gap-1.5', className)}>
      <style>{triageStyles}</style>
      <div
        className={cn(
          'relative flex items-center justify-center rounded-full font-bold text-white shadow-lg',
          sizeConf.circle,
          config.glow && 'triage-glow',
        )}
        style={{
          backgroundColor: config.color,
          '--triage-glow-color': config.color,
        } as React.CSSProperties}
      >
        {level[0]}
      </div>
      {showLabel && (
        <span
          className={cn('font-semibold', sizeConf.text)}
          style={{ color: config.color }}
        >
          {config.label}
        </span>
      )}
      {showWaitTime && (
        <span className={cn('text-muted-foreground', sizeConf.text)}>
          Espera: {config.waitTime}
        </span>
      )}
    </div>
  );
}

const triageStyles = `
  @keyframes triage-glow-pulse {
    0%, 100% {
      box-shadow: 0 0 8px 2px var(--triage-glow-color, #DC2626);
    }
    50% {
      box-shadow: 0 0 20px 6px var(--triage-glow-color, #DC2626);
    }
  }

  .triage-glow {
    animation: triage-glow-pulse 2s ease-in-out infinite;
  }
`;
