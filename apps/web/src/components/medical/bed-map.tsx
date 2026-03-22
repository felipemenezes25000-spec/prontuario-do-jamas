'use client';

import * as React from 'react';
import { Bed } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

interface BedData {
  id: string;
  ward: string;
  room: string;
  bedNumber: string;
  type: string;
  status: 'AVAILABLE' | 'OCCUPIED' | 'CLEANING' | 'MAINTENANCE' | 'RESERVED';
  patient?: { name: string; admissionDays: number };
}

interface BedMapProps {
  beds: BedData[];
  onBedClick?: (bedId: string) => void;
  className?: string;
}

const statusConfig = {
  AVAILABLE: {
    border: 'border-teal-500/40',
    bg: 'bg-teal-500/5',
    dot: 'bg-teal-500',
    label: 'Disponível',
  },
  OCCUPIED: {
    border: 'border-red-500/40',
    bg: 'bg-red-500/5',
    dot: 'bg-red-500',
    label: 'Ocupado',
  },
  CLEANING: {
    border: 'border-amber-500/40',
    bg: 'bg-amber-500/5',
    dot: 'bg-amber-500',
    label: 'Limpeza',
  },
  MAINTENANCE: {
    border: 'border-slate-500/40',
    bg: 'bg-slate-500/5',
    dot: 'bg-slate-500',
    label: 'Manutenção',
  },
  RESERVED: {
    border: 'border-blue-500/40',
    bg: 'bg-blue-500/5',
    dot: 'bg-blue-500',
    label: 'Reservado',
  },
};

type StatusFilter = BedData['status'] | 'ALL';

export function BedMap({ beds, onBedClick, className }: BedMapProps) {
  const [filter, setFilter] = React.useState<StatusFilter>('ALL');

  const filteredBeds =
    filter === 'ALL' ? beds : beds.filter((b) => b.status === filter);

  const statusCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const bed of beds) {
      counts[bed.status] = (counts[bed.status] || 0) + 1;
    }
    return counts;
  }, [beds]);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Legend / Filter */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setFilter('ALL')}
          className={cn(
            'rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors cursor-pointer',
            filter === 'ALL'
              ? 'bg-foreground/10 text-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          Todos ({beds.length})
        </button>
        {(Object.keys(statusConfig) as Array<keyof typeof statusConfig>).map(
          (key) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors cursor-pointer',
                filter === key
                  ? 'bg-foreground/10 text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <span
                className={cn('h-2 w-2 rounded-full', statusConfig[key].dot)}
              />
              {statusConfig[key].label} ({statusCounts[key] ?? 0})
            </button>
          ),
        )}
      </div>

      {/* Bed grid */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {filteredBeds.map((bed) => {
          const config = statusConfig[bed.status];
          return (
            <Card
              key={bed.id}
              className={cn(
                'cursor-pointer border p-3 transition-all hover:scale-[1.02] hover:shadow-md',
                config.border,
                config.bg,
              )}
              onClick={() => onBedClick?.(bed.id)}
            >
              <div className="flex items-center gap-2">
                <Bed className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-semibold text-foreground">
                  {bed.room}-{bed.bedNumber}
                </span>
              </div>
              {bed.status === 'OCCUPIED' && bed.patient && (
                <div className="mt-2 space-y-0.5">
                  <p
                    className="truncate text-[10px] text-muted-foreground"
                    title={bed.patient.name}
                  >
                    {bed.patient.name}
                  </p>
                  <Badge
                    variant="outline"
                    className="text-[9px] px-1 py-0"
                  >
                    {bed.patient.admissionDays}d internado
                  </Badge>
                </div>
              )}
              {bed.status !== 'OCCUPIED' && (
                <p className="mt-1.5 text-[10px] text-muted-foreground/60">
                  {config.label}
                </p>
              )}
            </Card>
          );
        })}
      </div>

      {filteredBeds.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Nenhum leito encontrado com este filtro.
        </p>
      )}
    </div>
  );
}
