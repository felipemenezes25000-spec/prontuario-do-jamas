import { useState } from 'react';
import { toast } from 'sonner';
import {
  IdCard,
  AlertTriangle,
  CheckCircle2,
  Search,
  Plus,
  Clock,
  UserCheck,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useCredentials,
  useExpiringCredentials,
  useCreateCredential,
  useVerifyCRM,
  type CredentialStatus,
  type Credential,
} from '@/services/credentialing.service';

function statusBadge(status: CredentialStatus) {
  const map: Record<CredentialStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    ACTIVE: { label: 'Ativo', variant: 'default' },
    EXPIRING: { label: 'Vencendo', variant: 'secondary' },
    EXPIRED: { label: 'Vencido', variant: 'destructive' },
    PENDING_REVIEW: { label: 'Em Revisão', variant: 'outline' },
  };
  const cfg = map[status];
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

function daysUntil(date?: string) {
  if (!date) return null;
  const diff = Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);
  return diff;
}

function NewCredentialDialog() {
  const [open, setOpen] = useState(false);
  const createCredential = useCreateCredential();
  const [form, setForm] = useState({
    physicianId: '',
    crm: '',
    crmState: '',
    specialty: '',
    hospitalPrivileges: '',
    expiresAt: '',
  });

  const handleSubmit = () => {
    createCredential.mutate(
      {
        physicianId: form.physicianId,
        crm: form.crm,
        crmState: form.crmState,
        specialty: form.specialty,
        hospitalPrivileges: form.hospitalPrivileges.split(',').map((s) => s.trim()).filter(Boolean),
        expiresAt: form.expiresAt || undefined,
      },
      {
        onSuccess: () => {
          toast.success('Credencial cadastrada com sucesso');
          setOpen(false);
          setForm({ physicianId: '', crm: '', crmState: '', specialty: '', hospitalPrivileges: '', expiresAt: '' });
        },
        onError: () => toast.error('Erro ao cadastrar credencial'),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4 mr-2" />
          Nova Credencial
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Cadastrar Credencial Médica</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>ID do Médico</Label>
              <Input
                value={form.physicianId}
                onChange={(e) => setForm((f) => ({ ...f, physicianId: e.target.value }))}
                placeholder="UUID do médico"
              />
            </div>
            <div className="space-y-1">
              <Label>Especialidade</Label>
              <Input
                value={form.specialty}
                onChange={(e) => setForm((f) => ({ ...f, specialty: e.target.value }))}
                placeholder="Cardiologia, Clínica Geral..."
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>CRM</Label>
              <Input
                value={form.crm}
                onChange={(e) => setForm((f) => ({ ...f, crm: e.target.value }))}
                placeholder="123456"
              />
            </div>
            <div className="space-y-1">
              <Label>Estado CRM</Label>
              <Input
                value={form.crmState}
                onChange={(e) => setForm((f) => ({ ...f, crmState: e.target.value }))}
                placeholder="SP"
                maxLength={2}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Privilégios Hospitalares (separados por vírgula)</Label>
            <Input
              value={form.hospitalPrivileges}
              onChange={(e) => setForm((f) => ({ ...f, hospitalPrivileges: e.target.value }))}
              placeholder="Cirurgia, UTI, Emergência"
            />
          </div>
          <div className="space-y-1">
            <Label>Data de Validade</Label>
            <Input
              type="date"
              value={form.expiresAt}
              onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
            />
          </div>
          <Button
            className="w-full bg-emerald-600 hover:bg-emerald-700"
            disabled={!form.physicianId || !form.crm || !form.crmState || createCredential.isPending}
            onClick={handleSubmit}
          >
            {createCredential.isPending ? 'Salvando...' : 'Cadastrar Credencial'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CredentialRow({ credential }: { credential: Credential }) {
  const days = daysUntil(credential.expiresAt);
  return (
    <TableRow>
      <TableCell className="font-medium">{credential.physicianName}</TableCell>
      <TableCell className="font-mono text-sm">
        {credential.crm}-{credential.crmState}
      </TableCell>
      <TableCell>{credential.specialty}</TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {credential.hospitalPrivileges.slice(0, 2).map((p) => (
            <Badge key={p} variant="outline" className="text-xs">
              {p}
            </Badge>
          ))}
          {credential.hospitalPrivileges.length > 2 && (
            <Badge variant="outline" className="text-xs">
              +{credential.hospitalPrivileges.length - 2}
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell>{statusBadge(credential.status)}</TableCell>
      <TableCell className="text-sm">
        {credential.expiresAt ? (
          <span className={days !== null && days < 30 ? 'text-red-400' : ''}>
            {new Date(credential.expiresAt).toLocaleDateString('pt-BR')}
            {days !== null && days >= 0 && ` (${days}d)`}
          </span>
        ) : (
          '—'
        )}
      </TableCell>
    </TableRow>
  );
}

function ActiveCredentialsTab() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<CredentialStatus | 'ALL'>('ALL');
  const { data, isLoading } = useCredentials(
    statusFilter !== 'ALL' ? { status: statusFilter } : undefined,
  );

  const credentials = (data?.data ?? []).filter(
    (c) =>
      !search ||
      c.physicianName.toLowerCase().includes(search.toLowerCase()) ||
      c.crm.includes(search),
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-3 flex-wrap items-center justify-between">
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9 w-64"
              placeholder="Buscar médico ou CRM..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos</SelectItem>
              <SelectItem value="ACTIVE">Ativo</SelectItem>
              <SelectItem value="EXPIRING">Vencendo</SelectItem>
              <SelectItem value="EXPIRED">Vencido</SelectItem>
              <SelectItem value="PENDING_REVIEW">Em Revisão</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <NewCredentialDialog />
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando credenciais...</div>
      ) : credentials.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Nenhuma credencial encontrada</div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Médico</TableHead>
                <TableHead>CRM</TableHead>
                <TableHead>Especialidade</TableHead>
                <TableHead>Privilégios</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Validade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {credentials.map((c) => (
                <CredentialRow key={c.id} credential={c} />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function ExpiringTab() {
  const { data, isLoading } = useExpiringCredentials();
  const credentials = data?.data ?? [];

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : credentials.length === 0 ? (
        <div className="flex flex-col items-center py-16 gap-2 text-muted-foreground">
          <CheckCircle2 className="h-10 w-10 text-emerald-400" />
          <p>Nenhuma credencial vencendo nos próximos 90 dias</p>
        </div>
      ) : (
        <div className="space-y-3">
          {credentials.map((c) => {
            const days = daysUntil(c.expiresAt);
            return (
              <Card key={c.id} className="border-yellow-500/30">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-5 w-5 text-yellow-400" />
                      <div>
                        <p className="font-medium">{c.physicianName}</p>
                        <p className="text-sm text-muted-foreground">
                          CRM {c.crm}-{c.crmState} · {c.specialty}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-yellow-400">
                        {days !== null && days >= 0 ? `Vence em ${days} dias` : 'Vencido'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString('pt-BR') : '—'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function VerifyTab() {
  const verifyCRM = useVerifyCRM();
  const [crm, setCrm] = useState('');
  const [state, setState] = useState('');
  const [result, setResult] = useState<{ valid: boolean; name?: string; specialty?: string; status?: string } | null>(null);

  const handleVerify = () => {
    if (!crm || !state) return;
    verifyCRM.mutate(
      { crm, state },
      {
        onSuccess: (data) => {
          setResult(data);
          if (data.valid) {
            toast.success('CRM válido e ativo');
          } else {
            toast.error('CRM inválido ou inativo');
          }
        },
        onError: () => toast.error('Erro ao verificar CRM'),
      },
    );
  };

  return (
    <div className="max-w-md space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Verificação de CRM</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1">
              <Label>Número do CRM</Label>
              <Input
                value={crm}
                onChange={(e) => setCrm(e.target.value)}
                placeholder="123456"
              />
            </div>
            <div className="space-y-1">
              <Label>UF</Label>
              <Input
                value={state}
                onChange={(e) => setState(e.target.value.toUpperCase())}
                placeholder="SP"
                maxLength={2}
              />
            </div>
          </div>
          <Button
            className="w-full bg-emerald-600 hover:bg-emerald-700"
            disabled={!crm || !state || verifyCRM.isPending}
            onClick={handleVerify}
          >
            <Search className="h-4 w-4 mr-2" />
            {verifyCRM.isPending ? 'Verificando...' : 'Verificar CRM'}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card className={result.valid ? 'border-emerald-500/40' : 'border-red-500/40'}>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              {result.valid ? (
                <CheckCircle2 className="h-6 w-6 text-emerald-400" />
              ) : (
                <AlertTriangle className="h-6 w-6 text-red-400" />
              )}
              <div>
                <p className="font-medium">
                  {result.valid ? 'CRM Válido' : 'CRM Inválido ou Inativo'}
                </p>
                {result.name && <p className="text-sm text-muted-foreground">{result.name}</p>}
                {result.specialty && (
                  <p className="text-sm text-muted-foreground">{result.specialty}</p>
                )}
                {result.status && (
                  <Badge variant="outline" className="mt-1 text-xs">
                    {result.status}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function CredentialingPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <IdCard className="h-7 w-7 text-emerald-400" />
        <div>
          <h1 className="text-2xl font-bold">Credenciamento Médico</h1>
          <p className="text-sm text-muted-foreground">
            Gestão de credenciais, documentos e verificação de CRM junto aos conselhos
          </p>
        </div>
      </div>

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active" className="flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            Credenciais Ativas
          </TabsTrigger>
          <TabsTrigger value="expiring" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Vencendo
          </TabsTrigger>
          <TabsTrigger value="verify" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Verificação CRM
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <ActiveCredentialsTab />
        </TabsContent>
        <TabsContent value="expiring">
          <ExpiringTab />
        </TabsContent>
        <TabsContent value="verify">
          <VerifyTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
