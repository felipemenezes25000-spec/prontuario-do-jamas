'use client';

import * as React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: { value: number; isPositive: boolean };
  color?: 'teal' | 'blue' | 'amber' | 'red';
  className?: string;
}

const colorMap = {
  teal: {
    iconBg: 'bg-teal-500/10',
    iconText: 'text-teal-600 dark:text-teal-400',
  },
  blue: {
    iconBg: 'bg-blue-500/10',
    iconText: 'text-blue-400',
  },
  amber: {
    iconBg: 'bg-amber-500/10',
    iconText: 'text-amber-400',
  },
  red: {
    iconBg: 'bg-red-500/10',
    iconText: 'text-red-400',
  },
};

export function StatCard({
  title,
  value,
  icon,
  trend,
  color = 'teal',
  className,
}: StatCardProps) {
  const c = colorMap[color];

  return (
    <Card className={cn('p-4', className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold tabular-nums text-foreground">
            {value}
          </p>
          {trend && (
            <div
              className={cn(
                'flex items-center gap-1 text-xs font-medium',
                trend.isPositive ? 'text-teal-600 dark:text-teal-400' : 'text-red-400',
              )}
            >
              {trend.isPositive ? (
                <TrendingUp className="h-3.5 w-3.5" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5" />
              )}
              {trend.isPositive ? '+' : ''}
              {trend.value}%
            </div>
          )}
        </div>
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-lg',
            c.iconBg,
            c.iconText,
          )}
        >
          {icon}
        </div>
      </div>
    </Card>
  );
}
