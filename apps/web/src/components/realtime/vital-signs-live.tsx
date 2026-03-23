import { useState, useCallback } from 'react';
import { useRealtimeEvent } from '@/hooks/use-realtime';
import type { VitalSigns } from '@/types';

interface VitalSignsLiveProps {
  /** Filter updates to this patient only. When omitted, all incoming vitals are shown. */
  patientId?: string;
}

interface VitalDisplay {
  label: string;
  value: string;
  unit: string;
}

function formatVitals(v: VitalSigns): VitalDisplay[] {
  const items: VitalDisplay[] = [];

  if (v.heartRate != null) {
    items.push({ label: 'FC', value: String(v.heartRate), unit: 'bpm' });
  }
  if (v.oxygenSaturation != null) {
    items.push({ label: 'SpO₂', value: String(v.oxygenSaturation), unit: '%' });
  }
  if (v.systolicBP != null && v.diastolicBP != null) {
    items.push({ label: 'PA', value: `${v.systolicBP}/${v.diastolicBP}`, unit: 'mmHg' });
  }
  if (v.temperature != null) {
    items.push({ label: 'Temp', value: v.temperature.toFixed(1), unit: '°C' });
  }
  if (v.respiratoryRate != null) {
    items.push({ label: 'FR', value: String(v.respiratoryRate), unit: 'irpm' });
  }

  return items;
}

/**
 * Real-time vital signs display with animated pulse indicator.
 * Renders the last received vital-sign payload streamed via Socket.IO.
 */
export function VitalSignsLive({ patientId }: VitalSignsLiveProps) {
  const [lastVitals, setLastVitals] = useState<VitalSigns | null>(null);
  const [pulse, setPulse] = useState(false);

  const handleVitals = useCallback(
    (data: VitalSigns) => {
      if (patientId && data.patientId !== patientId) return;
      setLastVitals(data);
      // Trigger pulse animation
      setPulse(true);
      setTimeout(() => setPulse(false), 1500);
    },
    [patientId],
  );

  useRealtimeEvent('vitals:new', handleVitals);

  if (!lastVitals) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-3 text-sm text-muted-foreground">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full rounded-full bg-muted opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-muted" />
        </span>
        Aguardando sinais vitais...
      </div>
    );
  }

  const vitals = formatVitals(lastVitals);

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
        {/* Animated pulse dot */}
        <span className="relative flex h-2.5 w-2.5">
          <span
            className={`absolute inline-flex h-full w-full rounded-full bg-emerald-400 transition-opacity ${
              pulse ? 'animate-ping opacity-75' : 'opacity-0'
            }`}
          />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
        </span>
        Sinais vitais em tempo real
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {vitals.map((v) => (
          <div key={v.label} className="flex flex-col">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {v.label}
            </span>
            <span className="text-lg font-semibold tabular-nums text-foreground">
              {v.value}
              <span className="ml-0.5 text-xs font-normal text-muted-foreground">{v.unit}</span>
            </span>
          </div>
        ))}
      </div>

      {lastVitals.recordedAt && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          Atualizado: {new Date(lastVitals.recordedAt).toLocaleTimeString('pt-BR')}
        </p>
      )}
    </div>
  );
}
