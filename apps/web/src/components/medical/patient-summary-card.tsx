'use client';

import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AllergyBadge } from './allergy-badge';
import { Heart, Activity, Thermometer, Droplets } from 'lucide-react';

interface VitalsPreview {
  heartRate?: number;
  bloodPressure?: string;
  temperature?: number;
  spO2?: number;
}

interface PatientSummaryCardProps {
  patient: {
    name: string;
    age: number;
    gender: string;
    conditions: string[];
    allergies: Array<{ substance: string; severity: string }>;
    medications: string[];
    riskScore: number;
    lastVisit?: string;
    summary?: string;
    vitals?: VitalsPreview;
  };
  compact?: boolean;
  className?: string;
  onClick?: () => void;
}

function getRiskConfig(score: number) {
  if (score >= 7)
    return {
      gradient: 'from-red-500/20 to-red-600/5',
      border: 'border-red-500/30',
      badge: 'bg-red-500/15 text-red-400',
      label: 'Alto Risco',
      barColor: 'bg-gradient-to-r from-red-500 to-red-600',
      ringColor: 'ring-red-500/20',
    };
  if (score >= 4)
    return {
      gradient: 'from-amber-500/20 to-amber-600/5',
      border: 'border-amber-500/30',
      badge: 'bg-amber-500/15 text-amber-400',
      label: 'Risco Moderado',
      barColor: 'bg-gradient-to-r from-amber-500 to-amber-600',
      ringColor: 'ring-amber-500/20',
    };
  return {
    gradient: 'from-teal-500/20 to-teal-600/5',
    border: 'border-teal-500/30',
    badge: 'bg-teal-500/15 text-teal-600 dark:text-teal-400',
    label: 'Baixo Risco',
    barColor: 'bg-gradient-to-r from-teal-500 to-emerald-500',
    ringColor: 'ring-teal-500/20',
  };
}

function getTimeSince(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'hoje';
  if (diffDays === 1) return 'ontem';
  return `ha ${diffDays} dias`;
}

function VitalMini({
  icon,
  value,
  unit,
  alert,
}: {
  icon: React.ReactNode;
  value: string | number;
  unit: string;
  alert?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px]',
        alert
          ? 'bg-red-500/10 text-red-400'
          : 'bg-muted/50 text-muted-foreground',
      )}
    >
      {icon}
      <span className="font-medium">{value}</span>
      <span className="opacity-60">{unit}</span>
    </div>
  );
}

export function PatientSummaryCard({
  patient,
  compact = false,
  className,
  onClick,
}: PatientSummaryCardProps) {
  const risk = getRiskConfig(patient.riskScore);

  return (
    <Card
      className={cn(
        'overflow-hidden border transition-all duration-200',
        risk.border,
        onClick && 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md active:scale-[0.99]',
        className,
      )}
      onClick={onClick}
    >
      {/* Gradient top bar with risk indicator */}
      <div className={cn('h-1.5 w-full', risk.barColor)} />

      <CardHeader className={cn(compact ? 'p-3' : 'p-4 pb-2')}>
        <div className="flex items-start justify-between">
          <div>
            <h3 className={cn('font-semibold text-foreground', compact ? 'text-sm' : 'text-base')}>
              {patient.name}
            </h3>
            <p className="text-xs text-muted-foreground">
              {patient.age} anos &middot;{' '}
              {patient.gender === 'M'
                ? 'Masculino'
                : patient.gender === 'F'
                  ? 'Feminino'
                  : patient.gender}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span
              className={cn(
                'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold',
                risk.badge,
              )}
            >
              {patient.riskScore}/10 &mdash; {risk.label}
            </span>
            {/* Risk score visual bar */}
            <div className="flex h-1 w-16 overflow-hidden rounded-full bg-muted/30">
              <div
                className={cn('h-full rounded-full transition-all', risk.barColor)}
                style={{ width: `${patient.riskScore * 10}%` }}
              />
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className={cn(compact ? 'p-3 pt-0' : 'p-4 pt-0', 'space-y-3')}>
        {/* Vitals preview mini-bar */}
        {patient.vitals && !compact && (
          <div className="flex flex-wrap gap-1.5">
            {patient.vitals.heartRate != null && (
              <VitalMini
                icon={<Heart className="h-3 w-3" />}
                value={patient.vitals.heartRate}
                unit="bpm"
                alert={patient.vitals.heartRate > 100 || patient.vitals.heartRate < 50}
              />
            )}
            {patient.vitals.bloodPressure != null && (
              <VitalMini
                icon={<Activity className="h-3 w-3" />}
                value={patient.vitals.bloodPressure}
                unit="mmHg"
              />
            )}
            {patient.vitals.temperature != null && (
              <VitalMini
                icon={<Thermometer className="h-3 w-3" />}
                value={patient.vitals.temperature.toFixed(1)}
                unit="C"
                alert={patient.vitals.temperature > 38.0}
              />
            )}
            {patient.vitals.spO2 != null && (
              <VitalMini
                icon={<Droplets className="h-3 w-3" />}
                value={`${patient.vitals.spO2}%`}
                unit="SpO2"
                alert={patient.vitals.spO2 < 92}
              />
            )}
          </div>
        )}

        {/* AI Summary */}
        {patient.summary && !compact && (
          <p className="rounded-md bg-muted/30 p-2 text-sm italic leading-relaxed text-muted-foreground">
            &ldquo;{patient.summary}&rdquo;
          </p>
        )}

        {/* Conditions */}
        {patient.conditions.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {patient.conditions
              .slice(0, compact ? 3 : undefined)
              .map((c) => (
                <Badge key={c} variant="secondary" className="text-[10px]">
                  {c}
                </Badge>
              ))}
            {compact && patient.conditions.length > 3 && (
              <Badge variant="outline" className="text-[10px]">
                +{patient.conditions.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Allergies */}
        {patient.allergies.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {patient.allergies
              .slice(0, compact ? 2 : undefined)
              .map((a) => (
                <AllergyBadge
                  key={a.substance}
                  substance={a.substance}
                  severity={
                    a.severity as
                      | 'MILD'
                      | 'MODERATE'
                      | 'SEVERE'
                      | 'ANAPHYLAXIS'
                  }
                />
              ))}
          </div>
        )}

        {/* Medications */}
        {!compact && patient.medications.length > 0 && (
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase text-muted-foreground">
              Medicamentos em uso
            </p>
            <ul className="space-y-0.5">
              {patient.medications.slice(0, 5).map((m) => (
                <li key={m} className="text-xs text-muted-foreground">
                  &bull; {m}
                </li>
              ))}
              {patient.medications.length > 5 && (
                <li className="text-xs text-muted-foreground/60">
                  +{patient.medications.length - 5} medicamentos
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Last visit */}
        {patient.lastVisit && (
          <p className="text-[10px] text-muted-foreground/60">
            Ultima visita: {getTimeSince(patient.lastVisit)}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
