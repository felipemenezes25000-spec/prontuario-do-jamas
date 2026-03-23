import { useState } from 'react';
import {
  User,
  Mic,
  Bell,
  Palette,
  Save,
  Camera,
  ShieldCheck,
  Copy,
  Download,
  Check,
  Loader2,
  ClipboardList,
  Plus,
  Pencil,
  AlertTriangle,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn, getInitials } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { toast } from 'sonner';
import {
  mfaSetupApi,
  mfaVerifySetupApi,
  mfaDisableApi,
  mfaRegenerateBackupApi,
  type MfaSetupResponse,
} from '@/services/auth.service';
import { WebAuthnSetup } from '@/components/auth/webauthn-setup';
import {
  useProtocols,
  useCreateProtocol,
  useUpdateProtocol,
  useToggleProtocol,
  type ClinicalProtocol,
  type CreateProtocolDto,
  type TriggerCriterion,
  type ProtocolAction,
} from '@/services/protocols.service';
import {
  useAlertRules,
  useCreateAlertRule,
  useUpdateAlertRule,
  useDeleteAlertRule,
  type ClinicalAlertRule,
  type CreateAlertRuleDto,
} from '@/services/alert-rules.service';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type MfaSetupStep = 'idle' | 'qrcode' | 'verify' | 'backup-codes' | 'disable';

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('perfil');

  // Profile state
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState('(11) 98765-4321');

  // Voice settings
  const [autoTranscribe, setAutoTranscribe] = useState(true);
  const [silenceTimeout, setSilenceTimeout] = useState('3');
  const [voiceSpeed, setVoiceSpeed] = useState('normal');

  // Notification settings
  const [notifCriticalAlerts, setNotifCriticalAlerts] = useState(true);
  const [notifLabResults, setNotifLabResults] = useState(true);
  const [notifAppointments, setNotifAppointments] = useState(true);
  const [notifMedChecks, setNotifMedChecks] = useState(false);
  const [notifMessages, setNotifMessages] = useState(true);

  // Appearance
  const [theme, setTheme] = useState('dark');
  const [fontSize, setFontSize] = useState('normal');

  // MFA state
  const [mfaStep, setMfaStep] = useState<MfaSetupStep>('idle');
  const [mfaData, setMfaData] = useState<MfaSetupResponse | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaDisableCode, setMfaDisableCode] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [copiedBackup, setCopiedBackup] = useState(false);
  // TODO: Fetch actual mfaEnabled from profile API. Using a local flag for now.
  const [mfaEnabled, setMfaEnabled] = useState(false);

  // Protocols state
  const { data: protocols = [], isLoading: protocolsLoading } = useProtocols();
  const createProtocol = useCreateProtocol();
  const updateProtocol = useUpdateProtocol();
  const toggleProtocol = useToggleProtocol();
  const [protocolDialogOpen, setProtocolDialogOpen] = useState(false);
  const [editingProtocol, setEditingProtocol] = useState<ClinicalProtocol | null>(null);
  const [protocolForm, setProtocolForm] = useState<CreateProtocolDto>({
    name: '',
    description: '',
    category: 'SEPSIS',
    triggerCriteria: [{ field: '', operator: 'eq', value: '' }],
    actions: [{ type: 'ALERT', params: { message: '' } }],
    priority: 0,
    isActive: true,
  });

  // Alert rules state
  const { data: alertRules = [], isLoading: alertRulesLoading } = useAlertRules();
  const createAlertRule = useCreateAlertRule();
  const updateAlertRule = useUpdateAlertRule();
  const deleteAlertRule = useDeleteAlertRule();
  const [alertRuleDialogOpen, setAlertRuleDialogOpen] = useState(false);
  const [editingAlertRule, setEditingAlertRule] = useState<ClinicalAlertRule | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [alertRuleForm, setAlertRuleForm] = useState<CreateAlertRuleDto>({
    name: '',
    field: 'spo2',
    operator: 'lt',
    value: 0,
    severity: 'WARNING',
    message: '',
    isActive: true,
  });

  const ALERT_FIELDS: Record<string, string> = {
    spo2: 'SpO2 (%)',
    systolicBp: 'PA Sistólica (mmHg)',
    diastolicBp: 'PA Diastólica (mmHg)',
    heartRate: 'Freq. Cardíaca (bpm)',
    respiratoryRate: 'Freq. Respiratória (irpm)',
    temperature: 'Temperatura (°C)',
    gcs: 'Glasgow (GCS)',
    glucose: 'Glicemia (mg/dL)',
    painScale: 'Escala de Dor (0-10)',
  };

  const ALERT_OPERATORS: Record<string, string> = {
    lt: '< Menor que',
    gt: '> Maior que',
    lte: '<= Menor ou igual',
    gte: '>= Maior ou igual',
    eq: '= Igual a',
    between: 'Entre',
  };

  const SEVERITY_LABELS: Record<string, string> = {
    INFO: 'Info',
    WARNING: 'Médio',
    CRITICAL: 'Alto',
    EMERGENCY: 'Emergência',
  };

  const SEVERITY_COLORS: Record<string, string> = {
    INFO: 'bg-blue-500/20 text-blue-400',
    WARNING: 'bg-yellow-500/20 text-yellow-400',
    CRITICAL: 'bg-red-500/20 text-red-400',
    EMERGENCY: 'bg-red-700/20 text-red-300',
  };

  const handleOpenCreateAlertRule = () => {
    setEditingAlertRule(null);
    setAlertRuleForm({
      name: '',
      field: 'spo2',
      operator: 'lt',
      value: 0,
      severity: 'WARNING',
      message: '',
      isActive: true,
    });
    setAlertRuleDialogOpen(true);
  };

  const handleOpenEditAlertRule = (rule: ClinicalAlertRule) => {
    setEditingAlertRule(rule);
    setAlertRuleForm({
      name: rule.name,
      description: rule.description ?? undefined,
      field: rule.field,
      operator: rule.operator,
      value: rule.value,
      value2: rule.value2 ?? undefined,
      severity: rule.severity,
      message: rule.message,
      action: rule.action ?? undefined,
      isActive: rule.isActive,
    });
    setAlertRuleDialogOpen(true);
  };

  const handleSaveAlertRule = async () => {
    try {
      if (editingAlertRule) {
        await updateAlertRule.mutateAsync({ id: editingAlertRule.id, ...alertRuleForm });
        toast.success('Regra de alerta atualizada!');
      } else {
        await createAlertRule.mutateAsync(alertRuleForm);
        toast.success('Regra de alerta criada!');
      }
      setAlertRuleDialogOpen(false);
    } catch {
      toast.error('Erro ao salvar regra de alerta.');
    }
  };

  const handleDeleteAlertRule = async (id: string) => {
    try {
      await deleteAlertRule.mutateAsync(id);
      toast.success('Regra de alerta excluída.');
      setDeleteConfirmId(null);
    } catch {
      toast.error('Erro ao excluir regra de alerta.');
    }
  };

  const handleToggleAlertRule = async (rule: ClinicalAlertRule) => {
    try {
      await updateAlertRule.mutateAsync({ id: rule.id, isActive: !rule.isActive });
      toast.success(rule.isActive ? 'Regra desativada.' : 'Regra ativada.');
    } catch {
      toast.error('Erro ao alterar status da regra.');
    }
  };

  const PROTOCOL_CATEGORIES: Record<string, string> = {
    SEPSIS: 'Sepse',
    ACS: 'Sindrome Coronariana Aguda',
    STROKE: 'AVC',
    FALL: 'Queda',
    DVT: 'TVP',
    PAIN: 'Dor',
    PEDIATRIC: 'Pediatria',
    OBSTETRIC: 'Obstetricia',
  };

  const handleSave = () => {
    toast.success('Configurações salvas com sucesso!');
  };

  const handleOpenCreateProtocol = () => {
    setEditingProtocol(null);
    setProtocolForm({
      name: '',
      description: '',
      category: 'SEPSIS',
      triggerCriteria: [{ field: '', operator: 'eq', value: '' }],
      actions: [{ type: 'ALERT', params: { message: '' } }],
      priority: 0,
      isActive: true,
    });
    setProtocolDialogOpen(true);
  };

  const handleOpenEditProtocol = (protocol: ClinicalProtocol) => {
    setEditingProtocol(protocol);
    setProtocolForm({
      name: protocol.name,
      description: protocol.description,
      category: protocol.category,
      triggerCriteria: protocol.triggerCriteria as TriggerCriterion[],
      actions: protocol.actions as ProtocolAction[],
      priority: protocol.priority,
      isActive: protocol.isActive,
    });
    setProtocolDialogOpen(true);
  };

  const handleSaveProtocol = async () => {
    try {
      if (editingProtocol) {
        await updateProtocol.mutateAsync({ id: editingProtocol.id, ...protocolForm });
        toast.success('Protocolo atualizado com sucesso!');
      } else {
        await createProtocol.mutateAsync(protocolForm);
        toast.success('Protocolo criado com sucesso!');
      }
      setProtocolDialogOpen(false);
    } catch {
      toast.error('Erro ao salvar protocolo.');
    }
  };

  const handleToggleProtocol = async (id: string) => {
    try {
      await toggleProtocol.mutateAsync(id);
      toast.success('Status do protocolo alterado.');
    } catch {
      toast.error('Erro ao alterar status do protocolo.');
    }
  };

  const addTriggerCriterion = () => {
    setProtocolForm((prev) => ({
      ...prev,
      triggerCriteria: [...prev.triggerCriteria, { field: '', operator: 'eq' as const, value: '' }],
    }));
  };

  const removeTriggerCriterion = (index: number) => {
    setProtocolForm((prev) => ({
      ...prev,
      triggerCriteria: prev.triggerCriteria.filter((_, i) => i !== index),
    }));
  };

  const updateTriggerCriterion = (index: number, updates: Partial<TriggerCriterion>) => {
    setProtocolForm((prev) => ({
      ...prev,
      triggerCriteria: prev.triggerCriteria.map((c, i) =>
        i === index ? { ...c, ...updates } : c,
      ),
    }));
  };

  // ===== MFA handlers =====

  const handleMfaSetup = async () => {
    setMfaLoading(true);
    try {
      const data = await mfaSetupApi();
      setMfaData(data);
      setBackupCodes(data.backupCodes);
      setMfaStep('qrcode');
    } catch {
      toast.error('Erro ao iniciar configuração do MFA.');
    } finally {
      setMfaLoading(false);
    }
  };

  const handleMfaVerify = async () => {
    if (mfaCode.length !== 6) return;
    setMfaLoading(true);
    try {
      await mfaVerifySetupApi(mfaCode);
      setMfaEnabled(true);
      setMfaStep('backup-codes');
      toast.success('Autenticação em duas etapas ativada!');
    } catch {
      toast.error('Código inválido. Tente novamente.');
    } finally {
      setMfaLoading(false);
      setMfaCode('');
    }
  };

  const handleMfaDisable = async () => {
    if (mfaDisableCode.length !== 6) return;
    setMfaLoading(true);
    try {
      await mfaDisableApi(mfaDisableCode);
      setMfaEnabled(false);
      setMfaStep('idle');
      setMfaData(null);
      toast.success('Autenticação em duas etapas desativada.');
    } catch {
      toast.error('Código inválido. Tente novamente.');
    } finally {
      setMfaLoading(false);
      setMfaDisableCode('');
    }
  };

  const handleRegenerateBackup = async () => {
    if (mfaCode.length !== 6) return;
    setMfaLoading(true);
    try {
      const result = await mfaRegenerateBackupApi(mfaCode);
      setBackupCodes(result.backupCodes);
      setMfaStep('backup-codes');
      toast.success('Novos códigos de backup gerados!');
    } catch {
      toast.error('Código inválido. Tente novamente.');
    } finally {
      setMfaLoading(false);
      setMfaCode('');
    }
  };

  const handleCopyBackupCodes = async () => {
    const text = backupCodes.join('\n');
    await navigator.clipboard.writeText(text);
    setCopiedBackup(true);
    toast.success('Códigos copiados!');
    setTimeout(() => setCopiedBackup(false), 2000);
  };

  const handleDownloadBackupCodes = () => {
    const text = `VoxPEP - Códigos de Backup MFA\nGerados em: ${new Date().toLocaleString('pt-BR')}\n\n${backupCodes.map((c, i) => `${i + 1}. ${c}`).join('\n')}\n\nGuarde estes códigos em um local seguro.\nCada código só pode ser usado uma vez.`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'voxpep-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="perfil" className="text-xs data-[state=active]:bg-teal-600">
            <User className="mr-1.5 h-3.5 w-3.5" /> Perfil
          </TabsTrigger>
          <TabsTrigger value="seguranca" className="text-xs data-[state=active]:bg-teal-600">
            <ShieldCheck className="mr-1.5 h-3.5 w-3.5" /> Segurança
          </TabsTrigger>
          <TabsTrigger value="voz" className="text-xs data-[state=active]:bg-teal-600">
            <Mic className="mr-1.5 h-3.5 w-3.5" /> Voz
          </TabsTrigger>
          <TabsTrigger value="notificacoes" className="text-xs data-[state=active]:bg-teal-600">
            <Bell className="mr-1.5 h-3.5 w-3.5" /> Notificações
          </TabsTrigger>
          <TabsTrigger value="aparencia" className="text-xs data-[state=active]:bg-teal-600">
            <Palette className="mr-1.5 h-3.5 w-3.5" /> Aparência
          </TabsTrigger>
          <TabsTrigger value="protocolos" className="text-xs data-[state=active]:bg-teal-600">
            <ClipboardList className="mr-1.5 h-3.5 w-3.5" /> Protocolos
          </TabsTrigger>
          <TabsTrigger value="alertas" className="text-xs data-[state=active]:bg-teal-600">
            <AlertTriangle className="mr-1.5 h-3.5 w-3.5" /> Alertas Clínicos
          </TabsTrigger>
        </TabsList>

        {/* Perfil */}
        <TabsContent value="perfil" className="mt-4">
          <Card className="border-border bg-card">
            <CardContent className="space-y-6 pt-6">
              {/* Avatar */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={user?.avatarUrl} />
                    <AvatarFallback className="bg-teal-500/20 text-xl text-teal-600 dark:text-teal-400">
                      {user ? getInitials(user.name) : '?'}
                    </AvatarFallback>
                  </Avatar>
                  <button className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-secondary border border-border hover:bg-muted transition-colors">
                    <Camera className="h-4 w-4" />
                  </button>
                </div>
                <div>
                  <p className="font-medium">{user?.name}</p>
                  <p className="text-sm text-muted-foreground">{user?.specialty ?? user?.role}</p>
                  {user?.crm && <p className="text-xs text-muted-foreground">{user.crm}</p>}
                </div>
              </div>

              <Separator className="bg-secondary" />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Nome Completo</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-secondary/30 border-border" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} className="bg-secondary/30 border-border" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Telefone</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="bg-secondary/30 border-border" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Especialidade</Label>
                  <Input value={user?.specialty ?? ''} disabled className="bg-secondary/30 border-border opacity-60" />
                </div>
              </div>

              <Separator className="bg-secondary" />

              <div>
                <h3 className="text-sm font-medium mb-3">Alterar Senha</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Senha Atual</Label>
                    <Input type="password" placeholder="••••••••" className="bg-secondary/30 border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Nova Senha</Label>
                    <Input type="password" placeholder="••••••••" className="bg-secondary/30 border-border" />
                  </div>
                </div>
              </div>

              <Button onClick={handleSave} className="bg-teal-600 hover:bg-teal-500">
                <Save className="mr-2 h-4 w-4" /> Salvar Alterações
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Segurança — MFA */}
        <TabsContent value="seguranca" className="mt-4">
          <Card className="border-border bg-card">
            <CardContent className="space-y-6 pt-6">
              <div>
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                  Autenticação em Duas Etapas (2FA)
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Adicione uma camada extra de segurança à sua conta usando um aplicativo autenticador (Google Authenticator, Authy, etc.)
                </p>
              </div>

              <Separator className="bg-secondary" />

              {/* Status indicator */}
              <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'h-2.5 w-2.5 rounded-full',
                    mfaEnabled ? 'bg-teal-500 shadow-sm shadow-teal-500/50' : 'bg-muted-foreground',
                  )} />
                  <span className="text-sm">
                    {mfaEnabled ? 'Ativada' : 'Desativada'}
                  </span>
                </div>
              </div>

              {/* MFA Step: Idle (not enabled) */}
              {mfaStep === 'idle' && !mfaEnabled && (
                <Button
                  onClick={handleMfaSetup}
                  disabled={mfaLoading}
                  className="bg-teal-600 hover:bg-teal-500"
                >
                  {mfaLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="mr-2 h-4 w-4" />
                  )}
                  Ativar Autenticação em Duas Etapas
                </Button>
              )}

              {/* MFA Step: Idle (enabled) — show disable option */}
              {mfaStep === 'idle' && mfaEnabled && (
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setMfaStep('disable')}
                      className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                    >
                      Desativar 2FA
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setMfaStep('verify');
                        setMfaCode('');
                      }}
                      className="border-border hover:bg-secondary"
                    >
                      Regenerar Códigos de Backup
                    </Button>
                  </div>
                </div>
              )}

              {/* MFA Step: QR Code */}
              {mfaStep === 'qrcode' && mfaData && (
                <div className="space-y-5">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Passo 1: Escaneie o QR Code</h4>
                    <p className="text-xs text-muted-foreground mb-4">
                      Abra seu aplicativo autenticador e escaneie o QR code abaixo. Se não conseguir escanear, use o código manual.
                    </p>
                  </div>

                  <div className="flex flex-col items-center gap-4">
                    <div className="rounded-xl bg-white p-4">
                      <img
                        src={mfaData.qrCodeDataUrl}
                        alt="QR Code para configuração do 2FA"
                        className="h-48 w-48"
                      />
                    </div>

                    <div className="w-full max-w-sm">
                      <Label className="text-xs text-muted-foreground">Código manual</Label>
                      <div className="mt-1 flex items-center gap-2">
                        <code className="flex-1 rounded border border-border bg-secondary/30 px-3 py-2 text-xs font-mono tracking-wider text-teal-600 dark:text-teal-400">
                          {mfaData.secret}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(mfaData.secret);
                            toast.success('Código copiado!');
                          }}
                          className="h-9 w-9 p-0"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <Separator className="bg-secondary" />

                  <div>
                    <h4 className="text-sm font-medium mb-2">Passo 2: Digite o código de verificação</h4>
                    <p className="text-xs text-muted-foreground mb-3">
                      Digite o código de 6 dígitos gerado pelo seu aplicativo autenticador.
                    </p>
                    <div className="flex items-center gap-3">
                      <Input
                        type="text"
                        inputMode="numeric"
                        placeholder="000000"
                        maxLength={6}
                        value={mfaCode}
                        onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="w-40 text-center text-lg font-mono tracking-[0.3em] bg-secondary/30 border-border"
                      />
                      <Button
                        onClick={handleMfaVerify}
                        disabled={mfaCode.length !== 6 || mfaLoading}
                        className="bg-teal-600 hover:bg-teal-500"
                      >
                        {mfaLoading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="mr-2 h-4 w-4" />
                        )}
                        Verificar e Ativar
                      </Button>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    onClick={() => {
                      setMfaStep('idle');
                      setMfaData(null);
                      setMfaCode('');
                    }}
                    className="text-muted-foreground"
                  >
                    Cancelar
                  </Button>
                </div>
              )}

              {/* MFA Step: Backup Codes */}
              {mfaStep === 'backup-codes' && backupCodes.length > 0 && (
                <div className="space-y-5">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Códigos de Backup</h4>
                    <p className="text-xs text-muted-foreground">
                      Guarde esses códigos em um local seguro. Cada código só pode ser usado uma vez para acessar sua conta caso perca acesso ao aplicativo autenticador.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-secondary/30 p-4">
                    {backupCodes.map((code, i) => (
                      <code key={i} className="text-sm font-mono text-teal-600 dark:text-teal-400 tracking-wider">
                        {code}
                      </code>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={handleCopyBackupCodes}
                      className="border-border"
                    >
                      {copiedBackup ? (
                        <Check className="mr-2 h-4 w-4 text-teal-600 dark:text-teal-400" />
                      ) : (
                        <Copy className="mr-2 h-4 w-4" />
                      )}
                      {copiedBackup ? 'Copiado!' : 'Copiar'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleDownloadBackupCodes}
                      className="border-border"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Baixar
                    </Button>
                  </div>

                  <Button
                    onClick={() => {
                      setMfaStep('idle');
                      setMfaCode('');
                    }}
                    className="bg-teal-600 hover:bg-teal-500"
                  >
                    Concluir
                  </Button>
                </div>
              )}

              {/* MFA Step: Verify for regenerate */}
              {mfaStep === 'verify' && mfaEnabled && (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Regenerar Códigos de Backup</h4>
                    <p className="text-xs text-muted-foreground">
                      Digite o código do aplicativo autenticador para gerar novos códigos de backup. Os códigos antigos serão invalidados.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="000000"
                      maxLength={6}
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="w-40 text-center text-lg font-mono tracking-[0.3em] bg-secondary/30 border-border"
                    />
                    <Button
                      onClick={handleRegenerateBackup}
                      disabled={mfaCode.length !== 6 || mfaLoading}
                      className="bg-teal-600 hover:bg-teal-500"
                    >
                      {mfaLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Regenerar
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setMfaStep('idle');
                      setMfaCode('');
                    }}
                    className="text-muted-foreground"
                  >
                    Cancelar
                  </Button>
                </div>
              )}

              {/* MFA Step: Disable */}
              {mfaStep === 'disable' && (
                <div className="space-y-4">
                  <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
                    <h4 className="text-sm font-medium text-red-400 mb-1">Desativar Autenticação em Duas Etapas</h4>
                    <p className="text-xs text-muted-foreground">
                      Isso tornará sua conta menos segura. Digite o código do aplicativo autenticador para confirmar.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="000000"
                      maxLength={6}
                      value={mfaDisableCode}
                      onChange={(e) => setMfaDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="w-40 text-center text-lg font-mono tracking-[0.3em] bg-secondary/30 border-border"
                    />
                    <Button
                      onClick={handleMfaDisable}
                      disabled={mfaDisableCode.length !== 6 || mfaLoading}
                      variant="destructive"
                    >
                      {mfaLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Desativar
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setMfaStep('idle');
                      setMfaDisableCode('');
                    }}
                    className="text-muted-foreground"
                  >
                    Cancelar
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* WebAuthn / Biometric Authentication */}
          <Card className="mt-4 border-border bg-card">
            <CardContent className="pt-6">
              <WebAuthnSetup />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Voz */}
        <TabsContent value="voz" className="mt-4">
          <Card className="border-border bg-card">
            <CardContent className="space-y-6 pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Transcrição Automática</p>
                  <p className="text-xs text-muted-foreground">Iniciar transcrição automaticamente ao abrir atendimento</p>
                </div>
                <Switch checked={autoTranscribe} onCheckedChange={setAutoTranscribe} />
              </div>

              <Separator className="bg-secondary" />

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Tempo de Silêncio para Parar (segundos)</Label>
                <Select value={silenceTimeout} onValueChange={setSilenceTimeout}>
                  <SelectTrigger className="w-full sm:w-40 bg-secondary/30 border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">2 segundos</SelectItem>
                    <SelectItem value="3">3 segundos</SelectItem>
                    <SelectItem value="5">5 segundos</SelectItem>
                    <SelectItem value="10">10 segundos</SelectItem>
                    <SelectItem value="0">Nunca (manual)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Velocidade de Reprodução</Label>
                <Select value={voiceSpeed} onValueChange={setVoiceSpeed}>
                  <SelectTrigger className="w-full sm:w-40 bg-secondary/30 border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="slow">Lenta (0.75x)</SelectItem>
                    <SelectItem value="normal">Normal (1x)</SelectItem>
                    <SelectItem value="fast">Rápida (1.25x)</SelectItem>
                    <SelectItem value="faster">Muito Rápida (1.5x)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleSave} className="bg-teal-600 hover:bg-teal-500">
                <Save className="mr-2 h-4 w-4" /> Salvar
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notificações */}
        <TabsContent value="notificacoes" className="mt-4">
          <Card className="border-border bg-card">
            <CardContent className="space-y-4 pt-6">
              {[
                { label: 'Alertas Críticos', description: 'Valores críticos de exames, alergias, interações', value: notifCriticalAlerts, onChange: setNotifCriticalAlerts },
                { label: 'Resultados de Exames', description: 'Notificar quando resultados ficarem prontos', value: notifLabResults, onChange: setNotifLabResults },
                { label: 'Agendamentos', description: 'Lembretes de consultas e procedimentos', value: notifAppointments, onChange: setNotifAppointments },
                { label: 'Checagem de Medicamentos', description: 'Alertas de horário de medicação', value: notifMedChecks, onChange: setNotifMedChecks },
                { label: 'Mensagens', description: 'Mensagens de outros profissionais', value: notifMessages, onChange: setNotifMessages },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                    <Switch checked={item.value} onCheckedChange={item.onChange} />
                  </div>
                  <Separator className="mt-4 bg-secondary" />
                </div>
              ))}

              <Button onClick={handleSave} className="bg-teal-600 hover:bg-teal-500">
                <Save className="mr-2 h-4 w-4" /> Salvar
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aparência */}
        <TabsContent value="aparencia" className="mt-4">
          <Card className="border-border bg-card">
            <CardContent className="space-y-6 pt-6">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Tema</Label>
                <div className="flex gap-3">
                  {[
                    { value: 'dark', label: 'Escuro', colors: 'bg-card border-border' },
                    { value: 'light', label: 'Claro', colors: 'bg-white border-slate-300' },
                  ].map((t) => (
                    <button
                      key={t.value}
                      onClick={() => setTheme(t.value)}
                      className={cn(
                        'flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors',
                        theme === t.value ? 'border-teal-500' : 'border-border',
                      )}
                    >
                      <div className={cn('h-12 w-20 rounded', t.colors)} />
                      <span className="text-xs">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Tamanho da Fonte</Label>
                <Select value={fontSize} onValueChange={setFontSize}>
                  <SelectTrigger className="w-full sm:w-40 bg-secondary/30 border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Pequena</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="large">Grande</SelectItem>
                    <SelectItem value="xlarge">Extra Grande</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleSave} className="bg-teal-600 hover:bg-teal-500">
                <Save className="mr-2 h-4 w-4" /> Salvar
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Protocolos Clinicos */}
        <TabsContent value="protocolos" className="mt-4">
          <Card className="border-border bg-card">
            <CardContent className="space-y-4 pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                    Protocolos Clinicos
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Gerencie protocolos de alerta automatico para triagem e atendimentos.
                  </p>
                </div>
                <Button onClick={handleOpenCreateProtocol} className="bg-teal-600 hover:bg-teal-500" size="sm">
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Novo Protocolo
                </Button>
              </div>

              <Separator className="bg-secondary" />

              {protocolsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : protocols.length === 0 ? (
                <div className="flex flex-col items-center py-8">
                  <ClipboardList className="h-8 w-8 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">Nenhum protocolo cadastrado</p>
                </div>
              ) : (
                <div className="rounded-lg border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-secondary/30">
                        <TableHead className="text-xs">Nome</TableHead>
                        <TableHead className="text-xs">Categoria</TableHead>
                        <TableHead className="text-xs text-center">Prioridade</TableHead>
                        <TableHead className="text-xs text-center">Status</TableHead>
                        <TableHead className="text-xs text-right">Acoes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {protocols.map((protocol) => (
                        <TableRow key={protocol.id} className="hover:bg-secondary/20">
                          <TableCell className="text-sm font-medium">{protocol.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs border-teal-500/30 text-teal-600 dark:text-teal-400">
                              {PROTOCOL_CATEGORIES[protocol.category] ?? protocol.category}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center text-sm">{protocol.priority}</TableCell>
                          <TableCell className="text-center">
                            <Switch
                              checked={protocol.isActive}
                              onCheckedChange={() => handleToggleProtocol(protocol.id)}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEditProtocol(protocol)}
                              className="h-8 w-8 p-0"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Protocol Dialog */}
          <Dialog open={protocolDialogOpen} onOpenChange={setProtocolDialogOpen}>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingProtocol ? 'Editar Protocolo' : 'Novo Protocolo'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Nome</Label>
                  <Input
                    value={protocolForm.name}
                    onChange={(e) => setProtocolForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: Protocolo de Sepse"
                    className="bg-secondary/30 border-border"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Descricao</Label>
                  <Input
                    value={protocolForm.description}
                    onChange={(e) => setProtocolForm((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Descreva o protocolo..."
                    className="bg-secondary/30 border-border"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Categoria</Label>
                    <Select
                      value={protocolForm.category}
                      onValueChange={(v) => setProtocolForm((prev) => ({ ...prev, category: v }))}
                    >
                      <SelectTrigger className="bg-secondary/30 border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(PROTOCOL_CATEGORIES).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Prioridade</Label>
                    <Input
                      type="number"
                      min="0"
                      value={protocolForm.priority ?? 0}
                      onChange={(e) => setProtocolForm((prev) => ({ ...prev, priority: parseInt(e.target.value) || 0 }))}
                      className="bg-secondary/30 border-border"
                    />
                  </div>
                </div>

                <Separator className="bg-secondary" />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">Criterios de Disparo</Label>
                    <Button variant="ghost" size="sm" onClick={addTriggerCriterion} className="text-xs h-7">
                      <Plus className="mr-1 h-3 w-3" /> Adicionar
                    </Button>
                  </div>
                  {protocolForm.triggerCriteria.map((criterion, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        placeholder="Campo"
                        value={criterion.field}
                        onChange={(e) => updateTriggerCriterion(idx, { field: e.target.value })}
                        className="flex-1 text-xs bg-secondary/30 border-border"
                      />
                      <Select
                        value={criterion.operator}
                        onValueChange={(v) => updateTriggerCriterion(idx, { operator: v as TriggerCriterion['operator'] })}
                      >
                        <SelectTrigger className="w-20 text-xs bg-secondary/30 border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="eq">=</SelectItem>
                          <SelectItem value="neq">!=</SelectItem>
                          <SelectItem value="gt">&gt;</SelectItem>
                          <SelectItem value="gte">&gt;=</SelectItem>
                          <SelectItem value="lt">&lt;</SelectItem>
                          <SelectItem value="lte">&lt;=</SelectItem>
                          <SelectItem value="contains">contem</SelectItem>
                          <SelectItem value="in">em</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="Valor"
                        value={String(criterion.value)}
                        onChange={(e) => updateTriggerCriterion(idx, { value: e.target.value })}
                        className="flex-1 text-xs bg-secondary/30 border-border"
                      />
                      {protocolForm.triggerCriteria.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTriggerCriterion(idx)}
                          className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
                        >
                          &times;
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="outline" onClick={() => setProtocolDialogOpen(false)} className="border-border">
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSaveProtocol}
                    disabled={createProtocol.isPending || updateProtocol.isPending}
                    className="bg-teal-600 hover:bg-teal-500"
                  >
                    {(createProtocol.isPending || updateProtocol.isPending) && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {editingProtocol ? 'Salvar' : 'Criar'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Alertas Clinicos */}
        <TabsContent value="alertas" className="mt-4">
          <Card className="border-border bg-card">
            <CardContent className="space-y-4 pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                    Regras de Alertas Clínicos (CDS)
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Configure regras automáticas para alertas baseados em sinais vitais e valores laboratoriais.
                  </p>
                </div>
                <Button onClick={handleOpenCreateAlertRule} className="bg-teal-600 hover:bg-teal-500">
                  <Plus className="mr-2 h-4 w-4" /> Nova Regra
                </Button>
              </div>

              <Separator className="bg-secondary" />

              {alertRulesLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : alertRules.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Nenhuma regra de alerta configurada.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Nome</TableHead>
                      <TableHead className="text-xs">Campo</TableHead>
                      <TableHead className="text-xs">Condição</TableHead>
                      <TableHead className="text-xs">Severidade</TableHead>
                      <TableHead className="text-xs">Ativa</TableHead>
                      <TableHead className="text-xs text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alertRules.map((rule) => (
                      <TableRow key={rule.id}>
                        <TableCell className="text-xs font-medium">{rule.name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {ALERT_FIELDS[rule.field] ?? rule.field}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {ALERT_OPERATORS[rule.operator]?.split(' ')[0] ?? rule.operator} {rule.value}
                          {rule.operator === 'between' && rule.value2 != null ? ` - ${rule.value2}` : ''}
                        </TableCell>
                        <TableCell>
                          <Badge className={cn('text-[10px]', SEVERITY_COLORS[rule.severity])}>
                            {SEVERITY_LABELS[rule.severity] ?? rule.severity}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={rule.isActive}
                            onCheckedChange={() => handleToggleAlertRule(rule)}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEditAlertRule(rule)}
                              className="h-7 w-7 p-0"
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            {deleteConfirmId === rule.id ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteAlertRule(rule.id)}
                                className="h-7 px-2 text-xs text-red-400 hover:text-red-300"
                              >
                                Confirmar
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteConfirmId(rule.id)}
                                className="h-7 w-7 p-0 text-red-400 hover:text-red-300"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Alert Rule Create/Edit Dialog */}
          <Dialog open={alertRuleDialogOpen} onOpenChange={setAlertRuleDialogOpen}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {editingAlertRule ? 'Editar Regra de Alerta' : 'Nova Regra de Alerta'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label className="text-xs text-muted-foreground">Nome</Label>
                    <Input
                      value={alertRuleForm.name}
                      onChange={(e) => setAlertRuleForm((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="Ex: SpO2 Baixa"
                      className="bg-secondary/30 border-border text-xs"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Campo</Label>
                    <Select
                      value={alertRuleForm.field}
                      onValueChange={(v) => setAlertRuleForm((prev) => ({ ...prev, field: v }))}
                    >
                      <SelectTrigger className="bg-secondary/30 border-border text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(ALERT_FIELDS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Operador</Label>
                    <Select
                      value={alertRuleForm.operator}
                      onValueChange={(v) => setAlertRuleForm((prev) => ({ ...prev, operator: v }))}
                    >
                      <SelectTrigger className="bg-secondary/30 border-border text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(ALERT_OPERATORS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Valor</Label>
                    <Input
                      type="number"
                      value={alertRuleForm.value}
                      onChange={(e) => setAlertRuleForm((prev) => ({ ...prev, value: parseFloat(e.target.value) || 0 }))}
                      className="bg-secondary/30 border-border text-xs"
                    />
                  </div>
                  {alertRuleForm.operator === 'between' && (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Valor 2</Label>
                      <Input
                        type="number"
                        value={alertRuleForm.value2 ?? ''}
                        onChange={(e) => setAlertRuleForm((prev) => ({ ...prev, value2: parseFloat(e.target.value) || undefined }))}
                        className="bg-secondary/30 border-border text-xs"
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Severidade</Label>
                    <Select
                      value={alertRuleForm.severity}
                      onValueChange={(v) => setAlertRuleForm((prev) => ({ ...prev, severity: v as CreateAlertRuleDto['severity'] }))}
                    >
                      <SelectTrigger className="bg-secondary/30 border-border text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(SEVERITY_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label className="text-xs text-muted-foreground">Mensagem do Alerta</Label>
                    <Input
                      value={alertRuleForm.message}
                      onChange={(e) => setAlertRuleForm((prev) => ({ ...prev, message: e.target.value }))}
                      placeholder="Ex: Avaliar oxigenoterapia"
                      className="bg-secondary/30 border-border text-xs"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label className="text-xs text-muted-foreground">Ação Sugerida (opcional)</Label>
                    <Input
                      value={alertRuleForm.action ?? ''}
                      onChange={(e) => setAlertRuleForm((prev) => ({ ...prev, action: e.target.value || undefined }))}
                      placeholder="Ex: ORDER_O2"
                      className="bg-secondary/30 border-border text-xs"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="outline" onClick={() => setAlertRuleDialogOpen(false)} className="border-border">
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSaveAlertRule}
                    disabled={createAlertRule.isPending || updateAlertRule.isPending}
                    className="bg-teal-600 hover:bg-teal-500"
                  >
                    {(createAlertRule.isPending || updateAlertRule.isPending) && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {editingAlertRule ? 'Salvar' : 'Criar'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}
