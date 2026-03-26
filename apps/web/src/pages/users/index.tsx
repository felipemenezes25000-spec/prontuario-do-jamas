import { useState, useCallback } from 'react';
import {
  Users,
  Search,
  Plus,
  ShieldCheck,
  Pen,
  Trash2,
  Loader2,
  UserCheck,
  UserX,
  Stethoscope,
  Mail,
  Phone,
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useUsers } from '@/services/users.service';
import api from '@/lib/api';
import type { User, UserRole } from '@/types';

// ─── helpers ───────────────────────────────────────────────────────────────

const ROLE_CONFIG: Record<UserRole, { label: string; className: string }> = {
  ADMIN: { label: 'Admin', className: 'bg-red-900/40 text-red-300 border-red-700' },
  DOCTOR: { label: 'Médico', className: 'bg-emerald-900/40 text-emerald-300 border-emerald-700' },
  NURSE: { label: 'Enfermeiro(a)', className: 'bg-blue-900/40 text-blue-300 border-blue-700' },
  NURSE_TECH: { label: 'Téc. Enfermagem', className: 'bg-blue-900/30 text-blue-200 border-blue-600' },
  PHARMACIST: { label: 'Farmacêutico(a)', className: 'bg-purple-900/40 text-purple-300 border-purple-700' },
  RECEPTIONIST: { label: 'Recepção', className: 'bg-gray-700 text-gray-300 border-gray-600' },
  LAB_TECH: { label: 'Téc. Laboratório', className: 'bg-yellow-900/40 text-yellow-300 border-yellow-700' },
  RADIOLOGIST: { label: 'Radiologista', className: 'bg-cyan-900/40 text-cyan-300 border-cyan-700' },
  NUTRITIONIST: { label: 'Nutricionista', className: 'bg-lime-900/40 text-lime-300 border-lime-700' },
  PHYSIO: { label: 'Fisioterapeuta', className: 'bg-teal-900/40 text-teal-300 border-teal-700' },
  PSYCHOLOGIST: { label: 'Psicólogo(a)', className: 'bg-pink-900/40 text-pink-300 border-pink-700' },
  SOCIAL_WORKER: { label: 'Assistente Social', className: 'bg-amber-900/40 text-amber-300 border-amber-700' },
  BILLING: { label: 'Faturamento', className: 'bg-indigo-900/40 text-indigo-300 border-indigo-700' },
};

const ALL_ROLES: UserRole[] = Object.keys(ROLE_CONFIG) as UserRole[];

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
}

interface UserFormData {
  name: string;
  email: string;
  role: UserRole;
  phone: string;
  specialty: string;
  crm: string;
  password: string;
  isActive: boolean;
}

const emptyForm: UserFormData = {
  name: '',
  email: '',
  role: 'DOCTOR',
  phone: '',
  specialty: '',
  crm: '',
  password: '',
  isActive: true,
};

// ─── User Form Dialog ─────────────────────────────────────────────────────

function UserFormDialog({
  open,
  onClose,
  user,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  user?: User | null;
  onSaved: () => void;
}) {
  const isEditing = !!user;
  const [form, setForm] = useState<UserFormData>(
    user
      ? {
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone ?? '',
          specialty: user.specialty ?? '',
          crm: user.crm ?? '',
          password: '',
          isActive: user.isActive ?? true,
        }
      : { ...emptyForm },
  );
  const [saving, setSaving] = useState(false);

  const handleField = useCallback((field: keyof UserFormData, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!form.name || !form.email) {
      toast.error('Nome e email são obrigatórios.');
      return;
    }
    if (!isEditing && !form.password) {
      toast.error('Senha é obrigatória para novo usuário.');
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        email: form.email,
        role: form.role,
        phone: form.phone || undefined,
        specialty: form.specialty || undefined,
        crm: form.crm || undefined,
        isActive: form.isActive,
      };
      if (form.password) {
        payload.password = form.password;
      }

      if (isEditing && user) {
        await api.patch(`/users/${user.id}`, payload);
        toast.success('Usuário atualizado!');
      } else {
        await api.post('/users', payload);
        toast.success('Usuário criado!');
      }
      onSaved();
      onClose();
    } catch {
      toast.error('Erro ao salvar usuário.');
    } finally {
      setSaving(false);
    }
  }, [form, isEditing, user, onSaved, onClose]);

  const showMedFields = form.role === 'DOCTOR';

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg bg-gray-900 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            {isEditing ? <Pen className="w-5 h-5 text-emerald-400" /> : <Plus className="w-5 h-5 text-emerald-400" />}
            {isEditing ? 'Editar Usuário' : 'Novo Usuário'}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            {isEditing ? 'Atualize os dados do usuário.' : 'Cadastre um novo usuário no sistema.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label className="text-gray-300">Nome completo *</Label>
              <Input
                className="bg-gray-800 border-gray-700 text-white mt-1"
                value={form.name}
                onChange={(e) => handleField('name', e.target.value)}
                placeholder="Dr. João Silva"
              />
            </div>
            <div>
              <Label className="text-gray-300">Email *</Label>
              <Input
                className="bg-gray-800 border-gray-700 text-white mt-1"
                type="email"
                value={form.email}
                onChange={(e) => handleField('email', e.target.value)}
                placeholder="joao@hospital.com"
              />
            </div>
            <div>
              <Label className="text-gray-300">Telefone</Label>
              <Input
                className="bg-gray-800 border-gray-700 text-white mt-1"
                value={form.phone}
                onChange={(e) => handleField('phone', e.target.value)}
                placeholder="(11) 99999-9999"
              />
            </div>
            <div>
              <Label className="text-gray-300">Perfil *</Label>
              <Select value={form.role} onValueChange={(v) => handleField('role', v)}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700 max-h-60">
                  {ALL_ROLES.map((r) => (
                    <SelectItem key={r} value={r} className="text-white">
                      {ROLE_CONFIG[r].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-300">{isEditing ? 'Nova Senha (opcional)' : 'Senha *'}</Label>
              <Input
                className="bg-gray-800 border-gray-700 text-white mt-1"
                type="password"
                value={form.password}
                onChange={(e) => handleField('password', e.target.value)}
                placeholder={isEditing ? 'Deixe vazio para manter' : 'Mínimo 8 caracteres'}
              />
            </div>
          </div>

          {showMedFields && (
            <div className="grid grid-cols-2 gap-4 p-3 bg-gray-800 rounded-lg border border-gray-700">
              <div className="col-span-2 flex items-center gap-2 mb-1">
                <Stethoscope className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-medium text-gray-300">Credenciamento Médico</span>
              </div>
              <div>
                <Label className="text-gray-400 text-xs">CRM</Label>
                <Input
                  className="bg-gray-900 border-gray-600 text-white mt-1"
                  value={form.crm}
                  onChange={(e) => handleField('crm', e.target.value)}
                  placeholder="CRM/SP 123456"
                />
              </div>
              <div>
                <Label className="text-gray-400 text-xs">Especialidade</Label>
                <Input
                  className="bg-gray-900 border-gray-600 text-white mt-1"
                  value={form.specialty}
                  onChange={(e) => handleField('specialty', e.target.value)}
                  placeholder="Cardiologia"
                />
              </div>
            </div>
          )}

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
                <><UserCheck className="w-3 h-3 mr-1" /> Ativo</>
              ) : (
                <><UserX className="w-3 h-3 mr-1" /> Inativo</>
              )}
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" className="border-gray-600 text-gray-300" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            disabled={saving}
            onClick={handleSubmit}
          >
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {isEditing ? 'Salvar' : 'Criar Usuário'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Delete Confirm Dialog ────────────────────────────────────────────────

function DeleteConfirmDialog({
  user,
  open,
  onClose,
  onConfirm,
}: {
  user: User;
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    try {
      await api.delete(`/users/${user.id}`);
      toast.success('Usuário removido.');
      onConfirm();
      onClose();
    } catch {
      toast.error('Erro ao remover usuário.');
    } finally {
      setDeleting(false);
    }
  }, [user.id, onConfirm, onClose]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm bg-gray-900 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white">Confirmar Remoção</DialogTitle>
          <DialogDescription className="text-gray-400">
            Tem certeza que deseja remover <strong className="text-white">{user.name}</strong>? Esta ação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" className="border-gray-600 text-gray-300" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            className="bg-red-600 hover:bg-red-700 text-white"
            disabled={deleting}
            onClick={handleDelete}
          >
            {deleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
            Remover
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  const filters = {
    search: search || undefined,
    role: roleFilter !== 'all' ? roleFilter : undefined,
  };

  const { data: users = [], isLoading, isError, refetch } = useUsers(filters);

  const handleNew = useCallback(() => {
    setEditingUser(null);
    setFormOpen(true);
  }, []);

  const handleEdit = useCallback((user: User) => {
    setEditingUser(user);
    setFormOpen(true);
  }, []);

  // Stats
  const activeCount = users.filter((u) => u.isActive !== false).length;
  const doctorCount = users.filter((u) => u.role === 'DOCTOR').length;
  const adminCount = users.filter((u) => u.role === 'ADMIN').length;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <Users className="w-7 h-7 text-emerald-400" />
          Gestão de Usuários
        </h1>
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleNew}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Usuário
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="pt-4 pb-4 text-center">
            <Users className="w-6 h-6 mx-auto text-blue-400 mb-1" />
            <p className="text-2xl font-bold text-white">{users.length}</p>
            <p className="text-xs text-gray-400">Total</p>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="pt-4 pb-4 text-center">
            <UserCheck className="w-6 h-6 mx-auto text-emerald-400 mb-1" />
            <p className="text-2xl font-bold text-white">{activeCount}</p>
            <p className="text-xs text-gray-400">Ativos</p>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="pt-4 pb-4 text-center">
            <Stethoscope className="w-6 h-6 mx-auto text-teal-400 mb-1" />
            <p className="text-2xl font-bold text-white">{doctorCount}</p>
            <p className="text-xs text-gray-400">Médicos</p>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="pt-4 pb-4 text-center">
            <ShieldCheck className="w-6 h-6 mx-auto text-red-400 mb-1" />
            <p className="text-2xl font-bold text-white">{adminCount}</p>
            <p className="text-xs text-gray-400">Admins</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            className="pl-10 bg-gray-800 border-gray-700 text-white"
            placeholder="Buscar por nome ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full sm:w-48 bg-gray-800 border-gray-700 text-gray-200">
            <SelectValue placeholder="Perfil" />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-700 max-h-60">
            <SelectItem value="all" className="text-white">Todos os perfis</SelectItem>
            {ALL_ROLES.map((r) => (
              <SelectItem key={r} value={r} className="text-white">
                {ROLE_CONFIG[r].label}
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
              <p className="text-gray-400">Erro ao carregar usuários.</p>
              <Button variant="outline" size="sm" className="mt-3 border-gray-600 text-gray-300" onClick={() => refetch()}>
                Tentar novamente
              </Button>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-10 h-10 mx-auto text-gray-600 mb-3" />
              <p className="text-gray-400">Nenhum usuário encontrado.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700">
                  <TableHead className="text-gray-400">Usuário</TableHead>
                  <TableHead className="text-gray-400">Perfil</TableHead>
                  <TableHead className="text-gray-400">Contato</TableHead>
                  <TableHead className="text-gray-400">Credenciamento</TableHead>
                  <TableHead className="text-gray-400">Status</TableHead>
                  <TableHead className="text-gray-400">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => {
                  const roleConf = ROLE_CONFIG[user.role] ?? ROLE_CONFIG.RECEPTIONIST;
                  const isActive = user.isActive !== false;
                  return (
                    <TableRow key={user.id} className="border-gray-800 hover:bg-gray-800/50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={user.avatarUrl} />
                            <AvatarFallback className="bg-gray-700 text-gray-300 text-xs">
                              {getInitials(user.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium text-white">{user.name}</p>
                            <p className="text-xs text-gray-500">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn('border text-xs', roleConf.className)}>
                          {roleConf.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          {user.email && (
                            <p className="text-xs text-gray-400 flex items-center gap-1">
                              <Mail className="w-3 h-3" /> {user.email}
                            </p>
                          )}
                          {user.phone && (
                            <p className="text-xs text-gray-400 flex items-center gap-1">
                              <Phone className="w-3 h-3" /> {user.phone}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.role === 'DOCTOR' ? (
                          <div className="space-y-0.5">
                            {user.crm && (
                              <p className="text-xs text-emerald-400 flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3" /> {user.crm}
                              </p>
                            )}
                            {user.specialty && (
                              <p className="text-xs text-gray-400">{user.specialty}</p>
                            )}
                            {!user.crm && !user.specialty && (
                              <span className="text-xs text-yellow-400">Pendente</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-600">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={cn(
                          'border text-xs',
                          isActive
                            ? 'bg-emerald-900/40 text-emerald-300 border-emerald-700'
                            : 'bg-red-900/40 text-red-300 border-red-700',
                        )}>
                          {isActive ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-gray-400 hover:text-white h-8 w-8 p-0"
                            title="Editar"
                            onClick={() => handleEdit(user)}
                          >
                            <Pen className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-400 hover:text-red-300 h-8 w-8 p-0"
                            title="Remover"
                            onClick={() => setDeletingUser(user)}
                          >
                            <Trash2 className="w-4 h-4" />
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
        <UserFormDialog
          open={formOpen}
          onClose={() => { setFormOpen(false); setEditingUser(null); }}
          user={editingUser}
          onSaved={() => refetch()}
        />
      )}
      {deletingUser && (
        <DeleteConfirmDialog
          user={deletingUser}
          open={!!deletingUser}
          onClose={() => setDeletingUser(null)}
          onConfirm={() => refetch()}
        />
      )}
    </div>
  );
}
