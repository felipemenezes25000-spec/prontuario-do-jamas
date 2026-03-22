'use client';

import * as React from 'react';
import { Stethoscope, AlertTriangle, Bed, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

interface EncounterTimelineProps {
  encounters: Array<{
    id: string;
    date: string;
    type: string;
    doctor: string;
    status: string;
    summary?: string;
  }>;
  className?: string;
}

const typeConfig: Record<
  string,
  { icon: React.ReactNode; color: string; dotColor: string; label: string }
> = {
  OUTPATIENT: {
    icon: <Stethoscope className="h-3.5 w-3.5" />,
    color: 'text-teal-600 dark:text-teal-400',
    dotColor: 'bg-teal-500',
    label: 'Ambulatorial',
  },
  EMERGENCY: {
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
    color: 'text-red-400',
    dotColor: 'bg-red-500',
    label: 'Emergência',
  },
  INPATIENT: {
    icon: <Bed className="h-3.5 w-3.5" />,
    color: 'text-blue-400',
    dotColor: 'bg-blue-500',
    label: 'Internação',
  },
};

const defaultType = {
  icon: <FileText className="h-3.5 w-3.5" />,
  color: 'text-muted-foreground',
  dotColor: 'bg-muted-foreground',
  label: 'Atendimento',
};

function formatDate(dateStr: string): { date: string; time: string } {
  const d = new Date(dateStr);
  const date = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  const time = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  return { date, time };
}

export function EncounterTimeline({
  encounters,
  className,
}: EncounterTimelineProps) {
  return (
    <div className={cn('relative space-y-0', className)}>
      {encounters.map((encounter, i) => {
        const config = typeConfig[encounter.type] ?? defaultType;
        const { date, time } = formatDate(encounter.date);
        const isLast = i === encounters.length - 1;

        return (
          <div key={encounter.id} className="relative flex gap-4 pb-6">
            {/* Date column */}
            <div className="w-20 shrink-0 pt-1 text-right">
              <p className="text-xs font-medium text-foreground">{date}</p>
              <p className="text-[10px] text-muted-foreground">{time}</p>
            </div>

            {/* Timeline line + dot */}
            <div className="relative flex flex-col items-center">
              <div
                className={cn(
                  'z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 border-background',
                  config.dotColor,
                )}
              >
                <span className="text-white">{config.icon}</span>
              </div>
              {!isLast && (
                <div className="absolute top-7 h-[calc(100%-28px)] w-px bg-border" />
              )}
            </div>

            {/* Content card */}
            <Card className="flex-1 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={cn('text-xs font-semibold', config.color)}>
                      {config.label}
                    </span>
                    <Badge
                      variant={
                        encounter.status === 'COMPLETED'
                          ? 'success'
                          : encounter.status === 'IN_PROGRESS'
                            ? 'warning'
                            : 'outline'
                      }
                      className="text-[9px] px-1.5 py-0"
                    >
                      {encounter.status === 'COMPLETED'
                        ? 'Finalizado'
                        : encounter.status === 'IN_PROGRESS'
                          ? 'Em andamento'
                          : encounter.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Dr(a). {encounter.doctor}
                  </p>
                  {encounter.summary && (
                    <p className="text-xs leading-relaxed text-muted-foreground/80">
                      {encounter.summary}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          </div>
        );
      })}

      {encounters.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Nenhum atendimento registrado.
        </p>
      )}
    </div>
  );
}
