import { useState, useEffect } from 'react';
import { AlertTriangle, ShieldAlert, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { usePatientAlerts, useAcknowledgeAlert } from '@/services/alerts.service';
import { cn } from '@/lib/utils';
import type { ClinicalAlert, AlertSeverity } from '@/types';

const SEVERITY_CONFIG: Record<
  AlertSeverity,
  { color: string; bg: string; border: string; label: string }
> = {
  EMERGENCY: {
    color: 'text-red-300',
    bg: 'bg-red-900/40',
    border: 'border-red-500/50',
    label: 'Emergência',
  },
  CRITICAL: {
    color: 'text-red-400',
    bg: 'bg-red-900/30',
    border: 'border-red-500/40',
    label: 'Crítico',
  },
  WARNING: {
    color: 'text-yellow-400',
    bg: 'bg-yellow-900/20',
    border: 'border-yellow-500/30',
    label: 'Médio',
  },
  INFO: {
    color: 'text-blue-400',
    bg: 'bg-blue-900/20',
    border: 'border-blue-500/30',
    label: 'Info',
  },
};

interface EncounterAlertsProps {
  patientId: string;
  encounterId: string;
}

/**
 * Shows alerts for a patient on the encounter page:
 * - CRITICAL/EMERGENCY: interruptive dialog popup on mount
 * - WARNING/INFO: banner at top + badge in header
 */
export function EncounterAlerts({ patientId }: EncounterAlertsProps) {
  const { data: alertsRaw } = usePatientAlerts(patientId);
  const acknowledgeAlert = useAcknowledgeAlert();
  const [popupDismissed, setPopupDismissed] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // The query may return paginated or direct array
  const alerts: ClinicalAlert[] = Array.isArray(alertsRaw)
    ? alertsRaw
    : (alertsRaw as unknown as { data?: ClinicalAlert[] })?.data ?? [];

  const activeAlerts = alerts.filter((a) => a.isActive && !a.acknowledgedAt);
  const criticalAlerts = activeAlerts.filter(
    (a) => a.severity === 'CRITICAL' || a.severity === 'EMERGENCY',
  );
  const otherAlerts = activeAlerts.filter(
    (a) => a.severity !== 'CRITICAL' && a.severity !== 'EMERGENCY',
  );

  // Show popup for critical alerts on first render
  const showPopup = criticalAlerts.length > 0 && !popupDismissed;

  // Reset popup state when new critical alerts appear
  useEffect(() => {
    if (criticalAlerts.length > 0) {
      setPopupDismissed(false);
    }
  }, [criticalAlerts.length]);

  const handleAcknowledge = (alertId: string) => {
    acknowledgeAlert.mutate({ id: alertId });
  };

  if (activeAlerts.length === 0) return null;

  return (
    <>
      {/* Banner for medium/low alerts */}
      {otherAlerts.length > 0 && !bannerDismissed && (
        <div className="flex items-center gap-3 rounded-lg border border-yellow-500/30 bg-yellow-900/20 px-4 py-2.5">
          <AlertTriangle className="h-4 w-4 shrink-0 text-yellow-400" />
          <div className="flex-1">
            <p className="text-sm font-medium text-yellow-300">
              {otherAlerts.length} alerta(s) ativo(s)
            </p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {otherAlerts.slice(0, 3).map((alert) => (
                <Badge
                  key={alert.id}
                  className={cn(
                    'text-[10px]',
                    SEVERITY_CONFIG[alert.severity].bg,
                    SEVERITY_CONFIG[alert.severity].color,
                  )}
                >
                  {alert.title}
                </Badge>
              ))}
              {otherAlerts.length > 3 && (
                <Badge variant="outline" className="text-[10px]">
                  +{otherAlerts.length - 3} mais
                </Badge>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-yellow-400 hover:text-yellow-300"
            onClick={() => setBannerDismissed(true)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Critical alerts badge (always visible when critical) */}
      {criticalAlerts.length > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-red-500/40 bg-red-900/30 px-4 py-2.5">
          <ShieldAlert className="h-4 w-4 shrink-0 text-red-400 animate-pulse" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-300">
              {criticalAlerts.length} alerta(s) crítico(s)
            </p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {criticalAlerts.map((alert) => (
                <Badge
                  key={alert.id}
                  className="text-[10px] bg-red-500/20 text-red-300"
                >
                  {alert.title}
                </Badge>
              ))}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="text-xs border-red-500/40 text-red-300 hover:bg-red-900/40"
            onClick={() => setPopupDismissed(false)}
          >
            Ver detalhes
          </Button>
        </div>
      )}

      {/* Critical alert interruptive popup */}
      <Dialog open={showPopup} onOpenChange={(open) => !open && setPopupDismissed(true)}>
        <DialogContent className="sm:max-w-lg border-red-500/40">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <ShieldAlert className="h-5 w-5" />
              Alertas Críticos — Atenção Imediata
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {criticalAlerts.map((alert) => {
              const config = SEVERITY_CONFIG[alert.severity];
              return (
                <div
                  key={alert.id}
                  className={cn(
                    'flex items-start gap-3 rounded-lg border p-3',
                    config.bg,
                    config.border,
                  )}
                >
                  <AlertTriangle className={cn('mt-0.5 h-4 w-4 shrink-0', config.color)} />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className={cn('text-sm font-medium', config.color)}>
                        {alert.title}
                      </p>
                      <Badge className={cn('text-[10px]', config.bg, config.color)}>
                        {config.label}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{alert.message}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => handleAcknowledge(alert.id)}
                    disabled={acknowledgeAlert.isPending}
                  >
                    <Check className="mr-1 h-3 w-3" />
                    Ciente
                  </Button>
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button
              onClick={() => setPopupDismissed(true)}
              className="bg-teal-600 hover:bg-teal-500"
            >
              Entendi — Prosseguir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Badge to show in headers — shows count of active alerts with color.
 */
export function AlertCountBadge({ patientId }: { patientId: string }) {
  const { data: alertsRaw } = usePatientAlerts(patientId);

  const alerts: ClinicalAlert[] = Array.isArray(alertsRaw)
    ? alertsRaw
    : (alertsRaw as unknown as { data?: ClinicalAlert[] })?.data ?? [];

  const activeCount = alerts.filter((a) => a.isActive).length;
  const hasCritical = alerts.some(
    (a) =>
      a.isActive &&
      (a.severity === 'CRITICAL' || a.severity === 'EMERGENCY'),
  );

  if (activeCount === 0) return null;

  return (
    <Badge
      className={cn(
        'text-[10px]',
        hasCritical
          ? 'bg-red-500/20 text-red-400 border-red-500/30'
          : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      )}
    >
      <AlertTriangle className="mr-1 h-3 w-3" />
      {activeCount} alerta(s)
    </Badge>
  );
}
