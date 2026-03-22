'use client';

import * as React from 'react';
import {
  Heart,
  Activity,
  Wind,
  Thermometer,
  Droplets,
  Frown,
  Cookie,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';

interface VitalSignsCardProps {
  vitals: {
    systolicBP?: number;
    diastolicBP?: number;
    heartRate?: number;
    respiratoryRate?: number;
    temperature?: number;
    oxygenSaturation?: number;
    painScale?: number;
    glucoseLevel?: number;
  };
  compact?: boolean;
  className?: string;
}

interface VitalConfig {
  label: string;
  icon: React.ReactNode;
  getValue: (v: VitalSignsCardProps['vitals']) => string | null;
  isAbnormal: (v: VitalSignsCardProps['vitals']) => boolean;
  unit: string;
}

const vitalConfigs: VitalConfig[] = [
  {
    label: 'PA',
    icon: <Heart className="h-4 w-4" />,
    getValue: (v) =>
      v.systolicBP != null && v.diastolicBP != null
        ? `${v.systolicBP}/${v.diastolicBP}`
        : null,
    isAbnormal: (v) =>
      (v.systolicBP != null && (v.systolicBP > 140 || v.systolicBP < 90)) ||
      (v.diastolicBP != null && (v.diastolicBP > 90 || v.diastolicBP < 60)),
    unit: 'mmHg',
  },
  {
    label: 'FC',
    icon: <Activity className="h-4 w-4" />,
    getValue: (v) => (v.heartRate != null ? `${v.heartRate}` : null),
    isAbnormal: (v) =>
      v.heartRate != null && (v.heartRate > 100 || v.heartRate < 60),
    unit: 'bpm',
  },
  {
    label: 'FR',
    icon: <Wind className="h-4 w-4" />,
    getValue: (v) =>
      v.respiratoryRate != null ? `${v.respiratoryRate}` : null,
    isAbnormal: (v) =>
      v.respiratoryRate != null &&
      (v.respiratoryRate > 20 || v.respiratoryRate < 12),
    unit: 'irpm',
  },
  {
    label: 'Temp',
    icon: <Thermometer className="h-4 w-4" />,
    getValue: (v) =>
      v.temperature != null ? `${v.temperature.toFixed(1)}` : null,
    isAbnormal: (v) =>
      v.temperature != null && (v.temperature > 38 || v.temperature < 35),
    unit: '\u00B0C',
  },
  {
    label: 'SpO2',
    icon: <Droplets className="h-4 w-4" />,
    getValue: (v) =>
      v.oxygenSaturation != null ? `${v.oxygenSaturation}` : null,
    isAbnormal: (v) =>
      v.oxygenSaturation != null && v.oxygenSaturation < 92,
    unit: '%',
  },
  {
    label: 'Dor',
    icon: <Frown className="h-4 w-4" />,
    getValue: (v) => (v.painScale != null ? `${v.painScale}/10` : null),
    isAbnormal: (v) => v.painScale != null && v.painScale >= 7,
    unit: '',
  },
  {
    label: 'Glicemia',
    icon: <Cookie className="h-4 w-4" />,
    getValue: (v) =>
      v.glucoseLevel != null ? `${v.glucoseLevel}` : null,
    isAbnormal: (v) =>
      v.glucoseLevel != null &&
      (v.glucoseLevel > 200 || v.glucoseLevel < 70),
    unit: 'mg/dL',
  },
];

export function VitalSignsCard({
  vitals,
  compact = false,
  className,
}: VitalSignsCardProps) {
  const activeVitals = vitalConfigs.filter(
    (vc) => vc.getValue(vitals) !== null,
  );

  return (
    <Card className={cn('p-4', className)}>
      <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
        Sinais Vitais
      </h3>
      <div
        className={cn(
          'grid gap-2',
          compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4',
        )}
      >
        {activeVitals.map((vc) => {
          const value = vc.getValue(vitals);
          const abnormal = vc.isAbnormal(vitals);

          return (
            <div
              key={vc.label}
              className={cn(
                'flex flex-col gap-1 rounded-lg border p-2.5 transition-colors',
                abnormal
                  ? 'border-red-500/30 bg-red-500/5'
                  : 'border-border bg-card',
              )}
            >
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    abnormal ? 'text-red-400' : 'text-muted-foreground',
                  )}
                >
                  {vc.icon}
                </span>
                <span className="text-[10px] font-medium uppercase text-muted-foreground">
                  {vc.label}
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span
                  className={cn(
                    'text-lg font-bold tabular-nums',
                    abnormal ? 'text-red-400' : 'text-foreground',
                  )}
                >
                  {value}
                </span>
                {vc.unit && (
                  <span className="text-[10px] text-muted-foreground">
                    {vc.unit}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
