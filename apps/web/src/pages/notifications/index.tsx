import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Bell,
  CheckCircle2,
  Mail,
  MailOpen,
  Filter,
  CheckCheck,
  AlertTriangle,
  FlaskConical,
  Clock,
  Stethoscope,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Settings,
  ExternalLink,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { PageLoading } from '@/components/common/page-loading';
import { PageError } from '@/components/common/page-error';
import {
  useNotifications,
  useUnreadCount,
  useMarkRead,
  useMarkAllRead,
} from '@/services/notifications.service';

// ─── Constants ──────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<string, { label: string; icon: typeof Bell; color: string }> = {
  CLINICAL_ALERT: { label: 'Alerta Clínico', icon: AlertTriangle, color: 'text-red-400' },
  LAB_RESULT: { label: 'Resultado Lab.', icon: FlaskConical, color: 'text-blue-400' },
  REMINDER: { label: 'Lembrete', icon: Clock, color: 'text-yellow-400' },
  APPOINTMENT: { label: 'Agendamento', icon: Calendar, color: 'text-purple-400' },
  CONSULTATION: { label: 'Consulta', icon: Stethoscope, color: 'text-emerald-400' },
  SYSTEM: { label: 'Sistema', icon: Bell, color: 'text-gray-400' },
};

const NOTIFICATION_TYPES = ['ALL', 'CLINICAL_ALERT', 'LAB_RESULT', 'REMINDER', 'APPOINTMENT', 'CONSULTATION', 'SYSTEM'] as const;

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMin < 1) return 'Agora';
  if (diffMin < 60) return `${diffMin}min atrás`;
  if (diffHours < 24) return `${diffHours}h atrás`;
  if (diffDays < 7) return `${diffDays}d atrás`;
  return date.toLocaleDateString('pt-BR');
}

// ─── Notification List Tab ──────────────────────────────────────────────────

function NotificationListTab() {
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNREAD' | 'READ'>('ALL');

  const { data: notifData, isLoading, error, refetch } = useNotifications(page);
  const { data: unreadData } = useUnreadCount();
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  const handleMarkRead = useCallback((id: string) => {
    markRead.mutate(id, {
      onSuccess: () => toast.success('Marcada como lida'),
      onError: () => toast.error('Erro ao marcar como lida'),
    });
  }, [markRead]);

  const handleMarkAllRead = useCallback(() => {
    markAllRead.mutate(undefined, {
      onSuccess: () => toast.success('Todas marcadas como lidas'),
      onError: () => toast.error('Erro ao marcar todas como lidas'),
    });
  }, [markAllRead]);

  if (isLoading) return <PageLoading cards={2} />;
  if (error) return <PageError onRetry={() => refetch()} />;

  const notifications = notifData?.data ?? [];
  const totalPages = notifData?.totalPages ?? 1;
  const unreadCount = unreadData?.unreadCount ?? 0;

  const filtered = notifications.filter((n) => {
    const typeOk = typeFilter === 'ALL' || n.type === typeFilter;
    const statusOk =
      statusFilter === 'ALL' ||
      (statusFilter === 'UNREAD' && !n.readAt) ||
      (statusFilter === 'READ' && !!n.readAt);
    return typeOk && statusOk;
  });

  return (
    <div className="space-y-4">
      {/* Summary & actions */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <Card className="px-4 py-2">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-emerald-400" />
              <span className="text-sm font-medium">{unreadCount} não lidas</span>
            </div>
          </Card>
          <Card className="px-4 py-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{notifData?.total ?? 0} total</span>
            </div>
          </Card>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleMarkAllRead}
          disabled={markAllRead.isPending || unreadCount === 0}
        >
          <CheckCheck className="h-3 w-3 mr-1" />
          Marcar Todas como Lidas
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos os Tipos</SelectItem>
              {NOTIFICATION_TYPES.filter((t) => t !== 'ALL').map((t) => {
                const cfg = TYPE_CONFIG[t];
                return (
                  <SelectItem key={t} value={t}>
                    {cfg?.label ?? t}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todas</SelectItem>
            <SelectItem value="UNREAD">Não Lidas</SelectItem>
            <SelectItem value="READ">Lidas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16 gap-2 text-muted-foreground">
          <Bell className="h-10 w-10 text-emerald-400" />
          <p>Nenhuma notificação encontrada</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((notif) => {
            const cfg = TYPE_CONFIG[notif.type] ?? { label: notif.type, icon: Bell, color: 'text-gray-400' };
            const Icon = cfg.icon;
            const isUnread = !notif.readAt;
            return (
              <Card
                key={notif.id}
                className={`transition-colors ${
                  isUnread ? 'border-emerald-500/30 bg-emerald-500/5' : ''
                }`}
              >
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 shrink-0 ${cfg.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className={`text-sm font-medium ${isUnread ? '' : 'text-muted-foreground'}`}>
                          {notif.title}
                        </h4>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {cfg.label}
                        </Badge>
                        {isUnread && (
                          <div className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{notif.body}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{formatRelativeTime(notif.createdAt)}</span>
                        {notif.readAt && (
                          <span className="flex items-center gap-1">
                            <MailOpen className="h-3 w-3" />
                            Lida em {new Date(notif.readAt).toLocaleString('pt-BR')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {notif.actionUrl && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => window.location.href = notif.actionUrl!}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      )}
                      {isUnread && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleMarkRead(notif.id)}
                          disabled={markRead.isPending}
                        >
                          <CheckCircle2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {page} de {totalPages}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Próxima
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Preferences Tab ────────────────────────────────────────────────────────

function PreferencesTab() {
  const [prefs, setPrefs] = useState({
    clinicalAlerts: true,
    labResults: true,
    reminders: true,
    appointments: true,
    consultations: true,
    system: false,
    emailEnabled: true,
    pushEnabled: true,
    smsEnabled: false,
    quietHoursEnabled: false,
    quietStart: '22:00',
    quietEnd: '07:00',
  });

  const togglePref = useCallback((key: keyof typeof prefs) => {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleSave = useCallback(() => {
    toast.success('Preferências salvas com sucesso');
  }, []);

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Notification types */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Tipos de Notificação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: 'clinicalAlerts' as const, label: 'Alertas Clínicos', desc: 'Resultados críticos, interações medicamentosas' },
            { key: 'labResults' as const, label: 'Resultados de Exames', desc: 'Novos resultados laboratoriais disponíveis' },
            { key: 'reminders' as const, label: 'Lembretes', desc: 'Lembretes de tarefas e follow-ups' },
            { key: 'appointments' as const, label: 'Agendamentos', desc: 'Confirmações e alterações de agenda' },
            { key: 'consultations' as const, label: 'Consultas', desc: 'Pareceres e teleconsultorias' },
            { key: 'system' as const, label: 'Sistema', desc: 'Manutenção, atualizações do sistema' },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">{label}</Label>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
              <Switch checked={prefs[key]} onCheckedChange={() => togglePref(key)} />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Channels */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Canais de Entrega</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: 'emailEnabled' as const, label: 'E-mail', desc: 'Receber notificações por e-mail' },
            { key: 'pushEnabled' as const, label: 'Push (Navegador)', desc: 'Notificações push no navegador' },
            { key: 'smsEnabled' as const, label: 'SMS', desc: 'Receber alertas críticos por SMS' },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">{label}</Label>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
              <Switch checked={prefs[key]} onCheckedChange={() => togglePref(key)} />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Quiet hours */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Horário Silencioso</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Ativar Horário Silencioso</Label>
              <p className="text-xs text-muted-foreground">
                Silenciar notificações não-críticas durante o período
              </p>
            </div>
            <Switch
              checked={prefs.quietHoursEnabled}
              onCheckedChange={() => togglePref('quietHoursEnabled')}
            />
          </div>
          {prefs.quietHoursEnabled && (
            <div className="flex gap-4 items-end">
              <div className="space-y-1">
                <Label className="text-xs">Início</Label>
                <input
                  type="time"
                  value={prefs.quietStart}
                  onChange={(e) => setPrefs((p) => ({ ...p, quietStart: e.target.value }))}
                  className="flex h-9 w-32 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Fim</Label>
                <input
                  type="time"
                  value={prefs.quietEnd}
                  onChange={(e) => setPrefs((p) => ({ ...p, quietEnd: e.target.value }))}
                  className="flex h-9 w-32 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors"
                />
              </div>
            </div>
          )}
          <p className="text-xs text-yellow-400 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Alertas clínicos críticos sempre são entregues, mesmo em horário silencioso.
          </p>
        </CardContent>
      </Card>

      <Button onClick={handleSave}>Salvar Preferências</Button>
    </div>
  );
}

// ─── Main ───────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Bell className="h-7 w-7 text-emerald-400" />
        <div>
          <h1 className="text-2xl font-bold">Central de Notificações</h1>
          <p className="text-sm text-muted-foreground">
            Alertas clínicos, resultados, lembretes e configuração de preferências
          </p>
        </div>
      </div>

      <Tabs defaultValue="notifications" className="space-y-4">
        <TabsList>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notificações
          </TabsTrigger>
          <TabsTrigger value="preferences" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Preferências
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notifications">
          <NotificationListTab />
        </TabsContent>
        <TabsContent value="preferences">
          <PreferencesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
