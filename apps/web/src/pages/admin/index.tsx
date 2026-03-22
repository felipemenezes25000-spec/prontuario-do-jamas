import { useState } from 'react';
import {
  Shield,
  Users,
  Settings,
  FileText,
  ClipboardList,
  Lock,
  Plus,
  Search,
  MoreHorizontal,
  UserPlus,
  Eye,
  Ban,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn, getInitials } from '@/lib/utils';
import { useUsers } from '@/services/users.service';
import { PageLoading } from '@/components/common/page-loading';
import { PageError } from '@/components/common/page-error';
import type { UserRole } from '@/types';

const roleLabels: Record<UserRole, { label: string; color: string }> = {
  ADMIN: { label: 'Administrador', color: 'bg-purple-600' },
  DOCTOR: { label: 'Médico', color: 'bg-teal-600' },
  NURSE: { label: 'Enfermeiro(a)', color: 'bg-blue-600' },
  NURSE_TECH: { label: 'Téc. Enfermagem', color: 'bg-blue-500' },
  RECEPTIONIST: { label: 'Recepção', color: 'bg-amber-600' },
  PHARMACIST: { label: 'Farmacêutico', color: 'bg-teal-600' },
  LAB_TECH: { label: 'Lab. Técnico', color: 'bg-cyan-600' },
  RADIOLOGIST: { label: 'Radiologista', color: 'bg-indigo-600' },
  NUTRITIONIST: { label: 'Nutricionista', color: 'bg-lime-600' },
  PHYSIO: { label: 'Fisioterapeuta', color: 'bg-sky-600' },
  PSYCHOLOGIST: { label: 'Psicólogo(a)', color: 'bg-violet-600' },
  SOCIAL_WORKER: { label: 'Assistente Social', color: 'bg-rose-600' },
  BILLING: { label: 'Faturamento', color: 'bg-orange-600' },
};

const auditLog = [
  { id: 'aud-001', timestamp: '2026-03-21T09:45:00Z', user: 'Dr. Carlos Oliveira', action: 'Assinou prescrição', resource: 'Prescrição #PRESC-001', ip: '192.168.1.45' },
  { id: 'aud-002', timestamp: '2026-03-21T09:30:00Z', user: 'Enf. Marcos Lima', action: 'Registrou sinais vitais', resource: 'Paciente Maria da Silva', ip: '192.168.1.52' },
  { id: 'aud-003', timestamp: '2026-03-21T09:15:00Z', user: 'Dr. Carlos Oliveira', action: 'Visualizou prontuário', resource: 'Paciente José Carlos', ip: '192.168.1.45' },
  { id: 'aud-004', timestamp: '2026-03-21T08:50:00Z', user: 'Camila Ferreira', action: 'Cadastrou paciente', resource: 'Paciente Fernando Souza', ip: '192.168.1.10' },
  { id: 'aud-005', timestamp: '2026-03-21T08:30:00Z', user: 'Dra. Ana Souza', action: 'Iniciou atendimento', resource: 'Atendimento #ENC-004', ip: '192.168.1.48' },
  { id: 'aud-006', timestamp: '2026-03-21T08:00:00Z', user: 'Administrador', action: 'Login realizado', resource: 'Sistema', ip: '192.168.1.1' },
  { id: 'aud-007', timestamp: '2026-03-21T07:45:00Z', user: 'Enf. Juliana Costa', action: 'Checou medicação', resource: 'Checagem #MC-001', ip: '192.168.1.55' },
  { id: 'aud-008', timestamp: '2026-03-20T18:30:00Z', user: 'Dr. Carlos Oliveira', action: 'Exportou relatório', resource: 'Relatório Financeiro', ip: '192.168.1.45' },
];

const lgpdRequests = [
  { id: 'lgpd-001', date: '2026-03-15', requester: 'Maria da Silva Santos', type: 'Acesso', status: 'COMPLETED', description: 'Solicitação de cópia dos dados pessoais' },
  { id: 'lgpd-002', date: '2026-03-10', requester: 'Lucas Gabriel Martins', type: 'Retificação', status: 'IN_PROGRESS', description: 'Correção do endereço residencial' },
  { id: 'lgpd-003', date: '2026-02-28', requester: 'Fernando Souza Dias', type: 'Portabilidade', status: 'PENDING', description: 'Transferência de dados para outra instituição' },
];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('usuarios');
  const [userSearch, setUserSearch] = useState('');
  const [auditSearch, setAuditSearch] = useState('');

  const { data: allUsers = [], isLoading, isError, refetch } = useUsers({ search: userSearch || undefined });

  const filteredUsers = allUsers.filter((u) =>
    !userSearch || u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase()),
  );

  const filteredAudit = auditLog.filter((a) =>
    !auditSearch || a.user.toLowerCase().includes(auditSearch.toLowerCase()) || a.action.toLowerCase().includes(auditSearch.toLowerCase()),
  );

  if (isLoading) return <PageLoading cards={0} showTable />;
  if (isError) return <PageError onRetry={() => refetch()} />;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-2">
        <Shield className="h-6 w-6 text-purple-400" />
        <h1 className="text-2xl font-bold tracking-tight">Administração</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-card border border-border flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="usuarios" className="text-xs data-[state=active]:bg-teal-600">
            <Users className="mr-1.5 h-3.5 w-3.5" /> Usuários
          </TabsTrigger>
          <TabsTrigger value="configuracoes" className="text-xs data-[state=active]:bg-teal-600">
            <Settings className="mr-1.5 h-3.5 w-3.5" /> Configurações
          </TabsTrigger>
          <TabsTrigger value="templates" className="text-xs data-[state=active]:bg-teal-600">
            <FileText className="mr-1.5 h-3.5 w-3.5" /> Templates
          </TabsTrigger>
          <TabsTrigger value="auditoria" className="text-xs data-[state=active]:bg-teal-600">
            <ClipboardList className="mr-1.5 h-3.5 w-3.5" /> Auditoria
          </TabsTrigger>
          <TabsTrigger value="lgpd" className="text-xs data-[state=active]:bg-teal-600">
            <Lock className="mr-1.5 h-3.5 w-3.5" /> LGPD
          </TabsTrigger>
        </TabsList>

        {/* Usuários */}
        <TabsContent value="usuarios" className="space-y-4 mt-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar usuário..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="pl-10 bg-card border-border"
              />
            </div>
            <Button className="bg-teal-600 hover:bg-teal-500">
              <UserPlus className="mr-2 h-4 w-4" /> Novo Usuário
            </Button>
          </div>

          <Card className="border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Usuário</th>
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Email</th>
                    <th className="hidden px-4 py-3 text-xs font-medium text-muted-foreground sm:table-cell">Papel</th>
                    <th className="hidden px-4 py-3 text-xs font-medium text-muted-foreground md:table-cell">Especialidade</th>
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {filteredUsers.map((u) => {
                    const role = roleLabels[u.role];
                    return (
                      <tr key={u.id} className="hover:bg-accent/30">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-secondary text-xs">{getInitials(u.name)}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium">{u.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{u.email}</td>
                        <td className="hidden px-4 py-3 sm:table-cell">
                          <Badge variant="secondary" className={cn('text-[10px] text-white', role?.color)}>
                            {role?.label}
                          </Badge>
                        </td>
                        <td className="hidden px-4 py-3 text-sm text-muted-foreground md:table-cell">
                          {u.specialty ?? '-'}
                        </td>
                        <td className="px-4 py-3">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem><Eye className="mr-2 h-3.5 w-3.5" /> Ver detalhes</DropdownMenuItem>
                              <DropdownMenuItem><Settings className="mr-2 h-3.5 w-3.5" /> Editar</DropdownMenuItem>
                              <DropdownMenuItem className="text-red-400"><Ban className="mr-2 h-3.5 w-3.5" /> Desativar</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* Configurações do Tenant */}
        <TabsContent value="configuracoes" className="mt-4">
          <Card className="border-border bg-card">
            <CardHeader><CardTitle className="text-base">Configurações da Instituição</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Nome da Instituição</Label>
                  <Input defaultValue="Hospital VoxPEP" className="bg-secondary/30 border-border" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">CNPJ</Label>
                  <Input defaultValue="12.345.678/0001-90" className="bg-secondary/30 border-border" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">CNES</Label>
                  <Input defaultValue="1234567" className="bg-secondary/30 border-border" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Telefone</Label>
                  <Input defaultValue="(11) 3456-7890" className="bg-secondary/30 border-border" />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium">Módulo IA Ativo</p>
                  <p className="text-xs text-muted-foreground">Habilitar sugestões de IA durante atendimentos</p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium">Transcrição por Voz</p>
                  <p className="text-xs text-muted-foreground">Permitir gravação e transcrição de áudio</p>
                </div>
                <Switch defaultChecked />
              </div>

              <Button className="bg-teal-600 hover:bg-teal-500">Salvar Configurações</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates */}
        <TabsContent value="templates" className="mt-4">
          <Card className="border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Templates de Documentos</CardTitle>
              <Button variant="outline" className="border-border text-xs">
                <Plus className="mr-2 h-3.5 w-3.5" /> Novo Template
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { name: 'Atestado Médico', type: 'Atestado', updatedAt: '2026-03-15' },
                { name: 'Receita Simples', type: 'Receita', updatedAt: '2026-03-10' },
                { name: 'Receita Controlada', type: 'Receita', updatedAt: '2026-03-10' },
                { name: 'Laudo para Convênio', type: 'Laudo', updatedAt: '2026-03-01' },
                { name: 'Relatório de Alta', type: 'Relatório', updatedAt: '2026-02-28' },
                { name: 'Termo de Consentimento', type: 'Termo', updatedAt: '2026-02-20' },
              ].map((template) => (
                <div key={template.name} className="flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-secondary/50 transition-colors">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{template.name}</p>
                    <p className="text-xs text-muted-foreground">{template.type}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{new Date(template.updatedAt).toLocaleDateString('pt-BR')}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Auditoria */}
        <TabsContent value="auditoria" className="space-y-4 mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por usuário ou ação..."
              value={auditSearch}
              onChange={(e) => setAuditSearch(e.target.value)}
              className="pl-10 bg-card border-border"
            />
          </div>

          <Card className="border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Data/Hora</th>
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Usuário</th>
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Ação</th>
                    <th className="hidden px-4 py-3 text-xs font-medium text-muted-foreground sm:table-cell">Recurso</th>
                    <th className="hidden px-4 py-3 text-xs font-medium text-muted-foreground md:table-cell">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {filteredAudit.map((entry) => (
                    <tr key={entry.id} className="hover:bg-accent/30">
                      <td className="px-4 py-3 text-sm">
                        {new Date(entry.timestamp).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium">{entry.user}</td>
                      <td className="px-4 py-3 text-sm">{entry.action}</td>
                      <td className="hidden px-4 py-3 text-sm text-muted-foreground sm:table-cell">{entry.resource}</td>
                      <td className="hidden px-4 py-3 text-sm text-muted-foreground font-mono md:table-cell">{entry.ip}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* LGPD */}
        <TabsContent value="lgpd" className="mt-4">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Lock className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                Solicitações LGPD
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {lgpdRequests.map((req) => (
                <div key={req.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{req.requester}</p>
                      <Badge variant="secondary" className="bg-secondary text-[10px]">{req.type}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{req.description}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Solicitado em {new Date(req.date).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className={cn(
                      'text-[10px] text-white',
                      req.status === 'COMPLETED' ? 'bg-green-600' :
                      req.status === 'IN_PROGRESS' ? 'bg-blue-600' :
                      'bg-yellow-600',
                    )}
                  >
                    {req.status === 'COMPLETED' ? 'Concluída' : req.status === 'IN_PROGRESS' ? 'Em Andamento' : 'Pendente'}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
