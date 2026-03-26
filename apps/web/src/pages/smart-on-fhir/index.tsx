import { useState } from 'react';
import {
  Blocks,
  Plus,
  ExternalLink,
  ToggleLeft,
  ToggleRight,
  Settings2,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  useSMARTApps,
  useRegisterSMARTApp,
  useLaunchSMARTApp,
  useToggleSMARTApp,
  type AppStatus,
  type RegisterAppPayload,
} from '@/services/smart-on-fhir.service';

// ─── helpers ───────────────────────────────────────────────────────────────

const APP_STATUS_LABEL: Record<AppStatus, string> = {
  ATIVO: 'Ativo',
  INATIVO: 'Inativo',
  PENDENTE: 'Pendente',
};

const APP_STATUS_CLASS: Record<AppStatus, string> = {
  ATIVO: 'bg-emerald-900/40 text-emerald-300 border-emerald-700',
  INATIVO: 'bg-gray-800 text-gray-400 border-gray-600',
  PENDENTE: 'bg-yellow-900/40 text-yellow-300 border-yellow-700',
};

const APP_STATUS_ICON: Record<AppStatus, typeof CheckCircle2> = {
  ATIVO: CheckCircle2,
  INATIVO: XCircle,
  PENDENTE: Clock,
};

// ─── Register App Dialog ────────────────────────────────────────────────────

function RegisterAppDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const register = useRegisterSMARTApp();
  const [form, setForm] = useState<RegisterAppPayload>({
    name: '',
    description: '',
    clientId: '',
    redirectUri: '',
    scopes: [],
    vendor: '',
    launchUrl: '',
    iconUrl: '',
  });
  const [scopesInput, setScopesInput] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload: RegisterAppPayload = {
      ...form,
      scopes: scopesInput.split(',').map((s) => s.trim()).filter(Boolean),
    };
    if (form.iconUrl) {
      payload.iconUrl = form.iconUrl;
    }
    register.mutate(payload, {
      onSuccess: () => {
        toast.success('App SMART registrado com sucesso.');
        onClose();
        setForm({ name: '', description: '', clientId: '', redirectUri: '', scopes: [], vendor: '', launchUrl: '', iconUrl: '' });
        setScopesInput('');
      },
      onError: () => toast.error('Erro ao registrar app.'),
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg bg-gray-900 border-gray-700 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">Registrar App SMART on FHIR</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-gray-300">Nome do App</Label>
            <Input
              required
              className="bg-gray-800 border-gray-700 text-white mt-1"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Ex: Growth Charts"
            />
          </div>

          <div>
            <Label className="text-gray-300">Descrição</Label>
            <Input
              required
              className="bg-gray-800 border-gray-700 text-white mt-1"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Breve descrição do app"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-gray-300">Client ID</Label>
              <Input
                required
                className="bg-gray-800 border-gray-700 text-white mt-1"
                value={form.clientId}
                onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value }))}
                placeholder="client-id-uuid"
              />
            </div>
            <div>
              <Label className="text-gray-300">Vendor</Label>
              <Input
                required
                className="bg-gray-800 border-gray-700 text-white mt-1"
                value={form.vendor}
                onChange={(e) => setForm((f) => ({ ...f, vendor: e.target.value }))}
                placeholder="Nome do fornecedor"
              />
            </div>
          </div>

          <div>
            <Label className="text-gray-300">Redirect URI</Label>
            <Input
              required
              className="bg-gray-800 border-gray-700 text-white mt-1"
              value={form.redirectUri}
              onChange={(e) => setForm((f) => ({ ...f, redirectUri: e.target.value }))}
              placeholder="https://app.example.com/callback"
            />
          </div>

          <div>
            <Label className="text-gray-300">Launch URL</Label>
            <Input
              required
              className="bg-gray-800 border-gray-700 text-white mt-1"
              value={form.launchUrl}
              onChange={(e) => setForm((f) => ({ ...f, launchUrl: e.target.value }))}
              placeholder="https://app.example.com/launch"
            />
          </div>

          <div>
            <Label className="text-gray-300">Scopes (separados por vírgula)</Label>
            <Input
              required
              className="bg-gray-800 border-gray-700 text-white mt-1"
              value={scopesInput}
              onChange={(e) => setScopesInput(e.target.value)}
              placeholder="patient/Patient.read, patient/Observation.read"
            />
          </div>

          <div>
            <Label className="text-gray-300">URL do Ícone (opcional)</Label>
            <Input
              className="bg-gray-800 border-gray-700 text-white mt-1"
              value={form.iconUrl ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, iconUrl: e.target.value }))}
              placeholder="https://..."
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" className="border-gray-600 text-gray-300" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={register.isPending}>
              {register.isPending ? 'Registrando…' : 'Registrar App'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function SMARTOnFHIRPage() {
  const { data: apps, isLoading } = useSMARTApps();
  const launchApp = useLaunchSMARTApp();
  const toggleApp = useToggleSMARTApp();
  const [dialogOpen, setDialogOpen] = useState(false);

  async function handleLaunch(appId: string) {
    try {
      const result = await launchApp.mutateAsync(appId);
      window.open(result.launchUrl, '_blank', 'noopener,noreferrer');
    } catch {
      toast.error('Erro ao iniciar app.');
    }
  }

  function handleToggle(appId: string, currentStatus: AppStatus) {
    const newStatus: AppStatus = currentStatus === 'ATIVO' ? 'INATIVO' : 'ATIVO';
    toggleApp.mutate(
      { appId, status: newStatus },
      {
        onSuccess: () => toast.success(`App ${newStatus === 'ATIVO' ? 'ativado' : 'desativado'}.`),
        onError: () => toast.error('Erro ao alterar status do app.'),
      },
    );
  }

  const appList = apps ?? [];
  const activeCount = appList.filter((a) => a.status === 'ATIVO').length;
  const inactiveCount = appList.filter((a) => a.status === 'INATIVO').length;
  const pendingCount = appList.filter((a) => a.status === 'PENDENTE').length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-orange-900/40 flex items-center justify-center">
            <Blocks className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">SMART on FHIR Apps</h1>
            <p className="text-sm text-gray-400">Aplicações SMART registradas e configuração OAuth</p>
          </div>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Registrar App
        </Button>
      </div>

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="pt-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-900/40 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{activeCount}</p>
              <p className="text-xs text-gray-400">Apps Ativos</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="pt-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-gray-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{inactiveCount}</p>
              <p className="text-xs text-gray-400">Apps Inativos</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="pt-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-900/40 flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{pendingCount}</p>
              <p className="text-xs text-gray-400">Apps Pendentes</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Apps table */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Apps Registrados</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-gray-400 text-center py-8">Carregando apps…</p>
          ) : appList.length === 0 ? (
            <div className="text-center py-12">
              <Blocks className="w-10 h-10 mx-auto text-gray-600 mb-3" />
              <p className="text-gray-400">Nenhum app SMART on FHIR registrado.</p>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white mt-4"
                onClick={() => setDialogOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" /> Registrar Primeiro App
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700">
                  <TableHead className="text-gray-400">App</TableHead>
                  <TableHead className="text-gray-400">Vendor</TableHead>
                  <TableHead className="text-gray-400">Client ID</TableHead>
                  <TableHead className="text-gray-400">Scopes</TableHead>
                  <TableHead className="text-gray-400">Status</TableHead>
                  <TableHead className="text-gray-400">Último Uso</TableHead>
                  <TableHead className="text-gray-400">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appList.map((app) => {
                  const StatusIcon = APP_STATUS_ICON[app.status];
                  return (
                    <TableRow key={app.id} className="border-gray-700 hover:bg-gray-800/50">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {app.iconUrl ? (
                            <img src={app.iconUrl} alt="" className="w-8 h-8 rounded" />
                          ) : (
                            <div className="w-8 h-8 rounded bg-gray-800 flex items-center justify-center">
                              <Blocks className="w-4 h-4 text-gray-500" />
                            </div>
                          )}
                          <div>
                            <p className="text-white font-medium">{app.name}</p>
                            <p className="text-gray-400 text-xs">{app.description}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-300 text-sm">{app.vendor}</TableCell>
                      <TableCell className="text-gray-300 text-sm font-mono text-xs">{app.clientId}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {app.scopes.slice(0, 3).map((scope) => (
                            <Badge key={scope} className="text-[10px] bg-gray-800 text-gray-300 border-gray-600">
                              {scope}
                            </Badge>
                          ))}
                          {app.scopes.length > 3 && (
                            <Badge className="text-[10px] bg-gray-800 text-gray-400 border-gray-600">
                              +{app.scopes.length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn('text-xs border flex items-center gap-1 w-fit', APP_STATUS_CLASS[app.status])}>
                          <StatusIcon className="w-3 h-3" />
                          {APP_STATUS_LABEL[app.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-300 text-sm">
                        {app.lastLaunchedAt ? new Date(app.lastLaunchedAt).toLocaleDateString('pt-BR') : '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {app.status === 'ATIVO' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-emerald-700 text-emerald-300 hover:bg-emerald-900/30 text-xs"
                              onClick={() => handleLaunch(app.id)}
                              disabled={launchApp.isPending}
                            >
                              <ExternalLink className="w-3 h-3 mr-1" /> Abrir
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className={app.status === 'ATIVO'
                              ? 'border-gray-600 text-gray-300 hover:bg-gray-800 text-xs'
                              : 'border-emerald-700 text-emerald-300 hover:bg-emerald-900/30 text-xs'
                            }
                            onClick={() => handleToggle(app.id, app.status)}
                            disabled={toggleApp.isPending}
                          >
                            {app.status === 'ATIVO' ? (
                              <><ToggleRight className="w-3 h-3 mr-1" /> Desativar</>
                            ) : (
                              <><ToggleLeft className="w-3 h-3 mr-1" /> Ativar</>
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* OAuth Config Info */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-gray-400" /> Configuração OAuth 2.0
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <div>
                <Label className="text-gray-400 text-xs">Authorization Endpoint</Label>
                <Input
                  readOnly
                  className="bg-gray-800 border-gray-700 text-gray-300 font-mono text-sm mt-1"
                  value="/api/smart-on-fhir/authorize"
                />
              </div>
              <div>
                <Label className="text-gray-400 text-xs">Token Endpoint</Label>
                <Input
                  readOnly
                  className="bg-gray-800 border-gray-700 text-gray-300 font-mono text-sm mt-1"
                  value="/api/smart-on-fhir/token"
                />
              </div>
            </div>
            <div className="space-y-2">
              <div>
                <Label className="text-gray-400 text-xs">FHIR Base URL</Label>
                <Input
                  readOnly
                  className="bg-gray-800 border-gray-700 text-gray-300 font-mono text-sm mt-1"
                  value="/api/fhir"
                />
              </div>
              <div>
                <Label className="text-gray-400 text-xs">Well-Known Configuration</Label>
                <Input
                  readOnly
                  className="bg-gray-800 border-gray-700 text-gray-300 font-mono text-sm mt-1"
                  value="/api/fhir/.well-known/smart-configuration"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <RegisterAppDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </div>
  );
}
