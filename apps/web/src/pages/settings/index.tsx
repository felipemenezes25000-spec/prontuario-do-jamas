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

  const handleSave = () => {
    toast.success('Configurações salvas com sucesso!');
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
      </Tabs>
    </div>
  );
}
