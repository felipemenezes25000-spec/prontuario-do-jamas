import { useState, useEffect, useMemo } from 'react';
import { Clock, User, Monitor } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useTriageQueue } from '@/services/triage.service';
import type { TriageQueueItem } from '@/services/triage.service';
import type { TriageLevel } from '@/types';

// ============================================================================
// Constants
// ============================================================================

const MANCHESTER_COLORS: Record<TriageLevel, string> = {
  RED: '#ef4444',
  ORANGE: '#f97316',
  YELLOW: '#eab308',
  GREEN: '#22c55e',
  BLUE: '#3b82f6',
};

const MANCHESTER_LABELS: Record<TriageLevel, string> = {
  RED: 'Emergencia',
  ORANGE: 'Muito Urgente',
  YELLOW: 'Urgente',
  GREEN: 'Pouco Urgente',
  BLUE: 'Nao Urgente',
};

const MAX_WAIT_MINUTES: Record<TriageLevel, number> = {
  RED: 0,
  ORANGE: 10,
  YELLOW: 60,
  GREEN: 120,
  BLUE: 240,
};

// ============================================================================
// TV Panel (Fullscreen)
// ============================================================================

export default function TriagePanelPage() {
  const { data: queueData } = useTriageQueue();
  const [now, setNow] = useState(Date.now());
  const [clockStr, setClockStr] = useState('');

  const queue = queueData?.data ?? [];

  // Update timers every second
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
      setClockStr(
        new Date().toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
      );
    }, 1000);
    setClockStr(
      new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
    );
    return () => clearInterval(interval);
  }, []);

  // Count by level
  const counts = useMemo(() => {
    const c: Record<TriageLevel, number> = { RED: 0, ORANGE: 0, YELLOW: 0, GREEN: 0, BLUE: 0 };
    for (const item of queue) {
      if (item.level && c[item.level] !== undefined) {
        c[item.level]++;
      }
    }
    return c;
  }, [queue]);

  return (
    <div className="fixed inset-0 bg-background text-foreground flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-3">
          <Monitor className="h-6 w-6 text-emerald-400" />
          <h1 className="text-xl font-bold">Painel de Triagem</h1>
        </div>
        <div className="flex items-center gap-4">
          {/* Level counters */}
          <div className="flex gap-2">
            {(Object.entries(counts) as Array<[TriageLevel, number]>).map(([level, count]) => (
              <div
                key={level}
                className="flex items-center gap-1.5 rounded-full px-3 py-1"
                style={{ backgroundColor: `${MANCHESTER_COLORS[level]}20` }}
              >
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: MANCHESTER_COLORS[level] }}
                />
                <span
                  className="text-sm font-bold"
                  style={{ color: MANCHESTER_COLORS[level] }}
                >
                  {count}
                </span>
              </div>
            ))}
          </div>
          <div className="text-2xl font-mono font-bold text-emerald-400">
            {clockStr}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {queue.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <User className="h-16 w-16 text-muted-foreground" />
            <p className="mt-4 text-xl text-muted-foreground">Nenhum paciente na fila</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {queue.map((item) => (
              <PanelCard key={item.encounterId} item={item} now={now} />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-center py-2 border-t border-border bg-card text-xs text-muted-foreground shrink-0">
        VoxPEP — Protocolo Manchester | Atualizacao automatica a cada 15 segundos
      </div>
    </div>
  );
}

// ============================================================================
// Panel Card
// ============================================================================

interface PanelCardProps {
  item: TriageQueueItem;
  now: number;
}

function PanelCard({ item, now }: PanelCardProps) {
  const maxWait = item.level ? MAX_WAIT_MINUTES[item.level] : 999;
  const referenceTime = item.triagedAt ?? item.arrivedAt;
  const elapsedMs = referenceTime ? now - new Date(referenceTime).getTime() : 0;
  const elapsedMinutes = Math.max(0, Math.floor(elapsedMs / 60000));
  const elapsedSeconds = Math.max(0, Math.floor((elapsedMs % 60000) / 1000));
  const isOverdue = maxWait > 0 && elapsedMinutes >= maxWait;
  const isImmediate = maxWait === 0;

  const formatTimer = (mins: number, secs: number): string => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    const s = String(secs).padStart(2, '0');
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${s}`;
    return `${m}:${s}`;
  };

  const color = item.level ? MANCHESTER_COLORS[item.level] : '#6b7280';
  const label = item.level ? MANCHESTER_LABELS[item.level] : 'Sem classificacao';

  return (
    <div
      className={cn(
        'rounded-xl border-2 p-4 transition-all',
        isOverdue || isImmediate ? 'animate-pulse' : '',
      )}
      style={{ borderColor: color }}
    >
      {/* Color bar header */}
      <div
        className="flex items-center justify-between rounded-lg px-3 py-1.5 mb-3"
        style={{ backgroundColor: color }}
      >
        <span className="text-white font-bold text-sm">{label}</span>
        {isOverdue && (
          <Badge variant="secondary" className="text-[10px] bg-white/20 text-white">
            EXCEDIDO
          </Badge>
        )}
      </div>

      {/* Patient info */}
      <p className="font-bold text-lg truncate">{item.patientName}</p>
      <p className="text-sm text-muted-foreground truncate mt-0.5">
        {item.chiefComplaint}
      </p>

      {/* Timer */}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Clock className={cn('h-4 w-4', isOverdue || isImmediate ? 'text-red-400' : 'text-muted-foreground')} />
          <span
            className={cn(
              'text-xl font-mono font-bold',
              isOverdue || isImmediate ? 'text-red-400' : 'text-foreground',
            )}
          >
            {formatTimer(elapsedMinutes, elapsedSeconds)}
          </span>
        </div>
      </div>
    </div>
  );
}
