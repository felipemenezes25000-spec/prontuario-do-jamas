import { useState, useCallback } from 'react';
import {
  Building2,
  Search,
  Plus,
  Pen,
  Loader2,
  Users,
  Activity,
  HardDrive,
  Stethoscope,
  CheckCircle2,
  XCircle,
  BarChart3,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
  useTenants,
  useTenantStats,
  useCreateTenant,
  useUpdateTenant,
  type Tenant,
  type CreateTenantDto,
} from '@/services/tenants.service';

// ─── helpers ───────────────────────────────────────────────────────────────

type PlanType = Tenant['plan'];

const PLAN_CONFIG: Record<PlanType, { label: string; className: string }> = {
  FREE: { label: 'Gratuito', className: 'bg-gray-700 text-gray-300 border-gray-600' },
  BASIC: { label: 'Básico', className: 'bg-blue-900/40 text-blue-300 border-blue-700' },
  PROFESSIONAL: { label: 'Profissional', className: 'bg-emerald-900/40 text-emerald-300 border-emerald-700' },
  ENTERPRISE: { label: 'Enterprise', className: 'bg-purple-900/40 text-purple-300 border-purple-700' },
};

const ALL_PLANS: PlanType[] = ['FREE', 'BASIC', 'PROFESSIONAL', 'ENTERPRISE'];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR');
}

function formatStorage(mb: number): string {
  if (mb < 1024) return `${mb} MB`;
  return `${(mb / 1024).toFixed(1)} GB`;
}

// ─── Tenant Form Dialog ───────────────────────────────────────────────────

interface TenantFormData {
  name: string;
  slug: string;
  cnpj: string;
  plan: PlanType;
  maxUsers: number;
  email: string;
  phone: string;
  address: string;
  isActive: boolean;
}

const emptyForm: TenantFormData = {
  name: '',
  slug: '',
  cnpj: '',
  plan: 'BASIC',
  maxUsers: 50,
  email: '',
  phone: '',
  address: '',
  isActive: true,
};

function TenantFormDialog({
  open,
  onClose,
  tenant,
}: {
  open: boolean;
  onClose: () => void;
  tenant?: Tenant | null;
}) {
  const isEditing = !!tenant;
  const createTenant = useCreateTenant();
  const updateTenant = useUpdateTenant();

  const [form, setForm] = useState<TenantFormData>(
    tenant
      ? {
          name: tenant.name,
          slug: tenant.slug,
          cnpj: tenant.cnpj ?? '',
          plan: tenant.plan,
          maxUsers: tenant.maxUsers,
          email: tenant.email ?? '',
          phone: tenant.phone ?? '',
          address: tenant.address ?? '',
          isActive: tenant.isActive,
        }
      : { ...emptyForm },
  );

  const handleField = useCallback((field: keyof TenantFormData, value: string | number | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleAutoSlug = useCallback(() => {
    if (!form.slug && form.name) {
      const slug = form.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      setForm((prev) => ({ ...prev, slug }));
    }
  }, [form.name, form.slug]);

  const handleSubmit = useCallback(() => {
    if (!form.name || !form.slug) {
      toast.error('Nome e slug são obrigatórios.');
      return;
    }

    const payload: CreateTenantDto = {
      name: form.name,
      slug: form.slug,
      cnpj: form.cnpj || undefined,
      plan: form.plan,
      maxUsers: form.maxUsers,
      email: form.email || undefined,
      phone: form.phone || undefined,
      address: form.address || undefined,
    };

    if (isEditing && tenant) {
      updateTenant.mutate(
        { id: tenant.id, ...payload, isActive: form.isActive },
        {
          onSuccess: () => { toast.success('Tenant atualizado!'); onClose(); },
          onError: () => toast.error('Erro ao atualizar tenant.'),
        },
      );
    } else {
      createTenant.mutate(payload, {
        onSuccess: () => { toast.success('Tenant criado!'); onClose(); },
        onError: () => toast.error('Erro ao criar tenant.'),
      });
    }
  }, [form, isEditing, tenant, createTenant, updateTenant, onClose]);

  const isPending = createTenant.isPending || updateTenant.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg bg-gray-900 border-gray-700 max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            {isEditing ? <Pen className="w-5 h-5 text-emerald-400" /> : <Plus className="w-5 h-5 text-emerald-400" />}
            {isEditing ? 'Editar Tenant' : 'Novo Tenant'}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            {isEditing ? 'Atualize a configuração da organização.' : 'Cadastre uma nova organização/hospital.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label className="text-gray-300">Nome da Organização *</Label>
              <Input
                className="bg-gray-800 border-gray-700 text-white mt-1"
                value={form.name}
                onChange={(e) => handleField('name', e.target.value)}
                onBlur={handleAutoSlug}
                placeholder="Hospital São Lucas"
              />
            </div>
            <div>
              <Label className="text-gray-300">Slug *</Label>
              <Input
                className="bg-gray-800 border-gray-700 text-white mt-1"
                value={form.slug}
                onChange={(e) => handleField('slug', e.target.value)}
                placeholder="hospital-sao-lucas"
              />
            </div>
            <div>
              <Label className="text-gray-300">CNPJ</Label>
              <Input
                className="bg-gray-800 border-gray-700 text-white mt-1"
                value={form.cnpj}
                onChange={(e) => handleField('cnpj', e.target.value)}
                placeholder="00.000.000/0001-00"
              />
            </div>
            <div>
              <Label className="text-gray-300">Plano *</Label>
              <Select value={form.plan} onValueChange={(v) => handleField('plan', v)}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {ALL_PLANS.map((p) => (
                    <SelectItem key={p} value={p} className="text-white">
                      {PLAN_CONFIG[p].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-300">Máx. Usuários</Label>
              <Input
                className="bg-gray-800 border-gray-700 text-white mt-1"
                type="number"
                min={1}
                value={form.maxUsers}
                onChange={(e) => handleField('maxUsers', parseInt(e.target.value, 10) || 1)}
              />
            </div>
            <div>
              <Label className="text-gray-300">Email</Label>
              <Input
                className="bg-gray-800 border-gray-700 text-white mt-1"
                type="email"
                value={form.email}
                onChange={(e) => handleField('email', e.target.value)}
                placeholder="contato@hospital.com"
              />
            </div>
            <div>
              <Label className="text-gray-300">Telefone</Label>
              <Input
                className="bg-gray-800 border-gray-700 text-white mt-1"
                value={form.phone}
                onChange={(e) => handleField('phone', e.target.value)}
                placeholder="(11) 3333-4444"
              />
            </div>
            <div className="col-span-2">
              <Label className="text-gray-300">Endereço</Label>
              <Input
                className="bg-gray-800 border-gray-700 text-white mt-1"
                value={form.address}
                onChange={(e) => handleField('address', e.target.value)}
                placeholder="Av. Paulista, 1000 - São Paulo/SP"
              />
            </div>
          </div>

          {isEditing && (
            <div className="flex items-center gap-3">
              <Label className="text-gray-300">Status:</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn(
                  'border',
                  form.isActive
                    ? 'bg-emerald-900/40 text-emerald-300 border-emerald-700'
                    : 'bg-red-900/40 text-red-300 border-red-700',
                )}
                onClick={() => handleField('isActive', !form.isActive)}
              >
                {form.isActive ? (
                  <><CheckCircle2 className="w-3 h-3 mr-1" /> Ativo</>
                ) : (
                  <><XCircle className="w-3 h-3 mr-1" /> Inativo</>
                )}
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" className="border-gray-600 text-gray-300" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            disabled={isPending}
            onClick={handleSubmit}
          >
            {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {isEditing ? 'Salvar' : 'Criar Tenant'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Stats Dialog ─────────────────────────────────────────────────────────

function StatsDialog({
  tenant,
  open,
  onClose,
}: {
  tenant: Tenant;
  open: boolean;
  onClose: () => void;
}) {
  const { data: stats, isLoading } = useTenantStats(tenant.id);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md bg-gray-900 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-400" />
            Estatísticas — {tenant.name}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
          </div>
        ) : stats ? (
          <div className="grid grid-cols-2 gap-4">
            <StatCard icon={Users} label="Pacientes" value={stats.totalPatients} color="text-blue-400" />
            <StatCard icon={Stethoscope} label="Atendimentos" value={stats.totalEncounters} color="text-emerald-400" />
            <StatCard icon={Users} label="Usuários" value={stats.totalUsers} color="text-purple-400" />
            <StatCard icon={HardDrive} label="Armazenamento" value={formatStorage(stats.storageUsedMb)} color="text-yellow-400" />
            <StatCard
              icon={Activity}
              label="Atendimentos Hoje"
              value={stats.activeEncountersToday}
              color="text-cyan-400"
              className="col-span-2"
            />
          </div>
        ) : (
          <p className="text-gray-400 text-center py-8">Estatísticas não disponíveis.</p>
        )}

        <DialogFooter>
          <Button variant="outline" className="border-gray-600 text-gray-300" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  className,
}: {
  icon: typeof Users;
  label: string;
  value: string | number;
  color: string;
  className?: string;
}) {
  return (
    <Card className={cn('bg-gray-800 border-gray-700', className)}>
      <CardContent className="pt-4 pb-4 text-center">
        <Icon className={cn('w-6 h-6 mx-auto mb-1', color)} />
        <p className="text-xl font-bold text-white">{value}</p>
        <p className="text-xs text-gray-400">{label}</p>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function TenantsPage() {
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [statsTenant, setStatsTenant] = useState<Tenant | null>(null);

  const filters = {
    search: search || undefined,
    plan: planFilter !== 'all' ? (planFilter as PlanType) : undefined,
  };

  const { data: tenantsData, isLoading, isError, refetch } = useTenants(filters);
  const tenants = tenantsData?.data ?? [];

  const handleNew = useCallback(() => {
    setEditingTenant(null);
    setFormOpen(true);
  }, []);

  const handleEdit = useCallback((tenant: Tenant) => {
    setEditingTenant(tenant);
    setFormOpen(true);
  }, []);

  // Stats
  const activeCount = tenants.filter((t) => t.isActive).length;
  const totalUsers = tenants.reduce((sum, t) => sum + t.currentUsers, 0);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <Building2 className="w-7 h-7 text-emerald-400" />
          Gestão de Tenants
        </h1>
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleNew}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Tenant
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="pt-4 pb-4 text-center">
            <Building2 className="w-6 h-6 mx-auto text-blue-400 mb-1" />
            <p className="text-2xl font-bold text-white">{tenants.length}</p>
            <p className="text-xs text-gray-400">Total de Tenants</p>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="pt-4 pb-4 text-center">
            <CheckCircle2 className="w-6 h-6 mx-auto text-emerald-400 mb-1" />
            <p className="text-2xl font-bold text-white">{activeCount}</p>
            <p className="text-xs text-gray-400">Ativos</p>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="pt-4 pb-4 text-center">
            <Users className="w-6 h-6 mx-auto text-purple-400 mb-1" />
            <p className="text-2xl font-bold text-white">{totalUsers}</p>
            <p className="text-xs text-gray-400">Usuários Totais</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            className="pl-10 bg-gray-800 border-gray-700 text-white"
            placeholder="Buscar por nome ou CNPJ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={planFilter} onValueChange={setPlanFilter}>
          <SelectTrigger className="w-full sm:w-44 bg-gray-800 border-gray-700 text-gray-200">
            <SelectValue placeholder="Plano" />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-700">
            <SelectItem value="all" className="text-white">Todos os planos</SelectItem>
            {ALL_PLANS.map((p) => (
              <SelectItem key={p} value={p} className="text-white">
                {PLAN_CONFIG[p].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="bg-gray-900 border-gray-700">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
            </div>
          ) : isError ? (
            <div className="text-center py-12">
              <p className="text-gray-400">Erro ao carregar tenants.</p>
              <Button variant="outline" size="sm" className="mt-3 border-gray-600 text-gray-300" onClick={() => refetch()}>
                Tentar novamente
              </Button>
            </div>
          ) : tenants.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="w-10 h-10 mx-auto text-gray-600 mb-3" />
              <p className="text-gray-400">Nenhum tenant encontrado.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700">
                  <TableHead className="text-gray-400">Organização</TableHead>
                  <TableHead className="text-gray-400">Plano</TableHead>
                  <TableHead className="text-gray-400">Usuários</TableHead>
                  <TableHead className="text-gray-400">Status</TableHead>
                  <TableHead className="text-gray-400">Criado em</TableHead>
                  <TableHead className="text-gray-400">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants.map((tenant) => {
                  const planConf = PLAN_CONFIG[tenant.plan] ?? PLAN_CONFIG.FREE;
                  const usagePct = tenant.maxUsers > 0
                    ? Math.round((tenant.currentUsers / tenant.maxUsers) * 100)
                    : 0;
                  return (
                    <TableRow key={tenant.id} className="border-gray-800 hover:bg-gray-800/50">
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium text-white">{tenant.name}</p>
                          <p className="text-xs text-gray-500">{tenant.slug}</p>
                          {tenant.cnpj && (
                            <p className="text-xs text-gray-600">{tenant.cnpj}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn('border text-xs', planConf.className)}>
                          {planConf.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm text-white">
                            {tenant.currentUsers} / {tenant.maxUsers}
                          </p>
                          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden mt-1 w-20">
                            <div
                              className={cn(
                                'h-full rounded-full transition-all',
                                usagePct >= 90 ? 'bg-red-500' : usagePct >= 70 ? 'bg-yellow-500' : 'bg-emerald-500',
                              )}
                              style={{ width: `${Math.min(usagePct, 100)}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn(
                          'border text-xs',
                          tenant.isActive
                            ? 'bg-emerald-900/40 text-emerald-300 border-emerald-700'
                            : 'bg-red-900/40 text-red-300 border-red-700',
                        )}>
                          {tenant.isActive ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-400 text-sm">
                        {formatDate(tenant.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-gray-400 hover:text-white h-8 w-8 p-0"
                            title="Estatísticas"
                            onClick={() => setStatsTenant(tenant)}
                          >
                            <BarChart3 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-gray-400 hover:text-white h-8 w-8 p-0"
                            title="Editar"
                            onClick={() => handleEdit(tenant)}
                          >
                            <Pen className="w-4 h-4" />
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

      {/* Dialogs */}
      {formOpen && (
        <TenantFormDialog
          open={formOpen}
          onClose={() => { setFormOpen(false); setEditingTenant(null); }}
          tenant={editingTenant}
        />
      )}
      {statsTenant && (
        <StatsDialog
          tenant={statsTenant}
          open={!!statsTenant}
          onClose={() => setStatsTenant(null)}
        />
      )}
    </div>
  );
}
