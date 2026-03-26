import { useState } from 'react';
import {
  Shield,
  FileSearch,
  Users,
  ScrollText,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
  useIHEProfiles,
  useXDSDocuments,
  useATNAAuditTrail,
  usePIXQuery,
  useXDSQuery,
  type ComplianceStatus,
  type IHEProfile,
  type XDSDocument,
  type ATNAAuditEntry,
} from '@/services/ihe-profiles.service';

// ─── helpers ───────────────────────────────────────────────────────────────

const COMPLIANCE_LABEL: Record<ComplianceStatus, string> = {
  IMPLEMENTADO: 'Implementado',
  PARCIAL: 'Parcial',
  PENDENTE: 'Pendente',
};

const COMPLIANCE_CLASS: Record<ComplianceStatus, string> = {
  IMPLEMENTADO: 'bg-emerald-900/40 text-emerald-300 border-emerald-700',
  PARCIAL: 'bg-yellow-900/40 text-yellow-300 border-yellow-700',
  PENDENTE: 'bg-red-900/40 text-red-300 border-red-700',
};

const COMPLIANCE_ICON: Record<ComplianceStatus, typeof CheckCircle2> = {
  IMPLEMENTADO: CheckCircle2,
  PARCIAL: Clock,
  PENDENTE: AlertCircle,
};

const OUTCOME_CLASS: Record<ATNAAuditEntry['eventOutcome'], string> = {
  SUCCESS: 'bg-emerald-900/40 text-emerald-300 border-emerald-700',
  MINOR_FAILURE: 'bg-yellow-900/40 text-yellow-300 border-yellow-700',
  SERIOUS_FAILURE: 'bg-orange-900/40 text-orange-300 border-orange-700',
  MAJOR_FAILURE: 'bg-red-900/40 text-red-300 border-red-700',
};

const OUTCOME_LABEL: Record<ATNAAuditEntry['eventOutcome'], string> = {
  SUCCESS: 'Sucesso',
  MINOR_FAILURE: 'Falha Menor',
  SERIOUS_FAILURE: 'Falha Grave',
  MAJOR_FAILURE: 'Falha Crítica',
};

const ACTION_LABEL: Record<ATNAAuditEntry['eventAction'], string> = {
  CREATE: 'Criar',
  READ: 'Ler',
  UPDATE: 'Atualizar',
  DELETE: 'Excluir',
  EXECUTE: 'Executar',
};

// ─── Profiles Tab ───────────────────────────────────────────────────────────

function ProfilesTab() {
  const { data: profiles, isLoading } = useIHEProfiles();

  if (isLoading) return <p className="text-gray-400 text-center py-8">Carregando perfis…</p>;
  if (!profiles || profiles.length === 0) {
    return (
      <div className="text-center py-12">
        <Shield className="w-10 h-10 mx-auto text-gray-600 mb-3" />
        <p className="text-gray-400">Nenhum perfil IHE cadastrado.</p>
      </div>
    );
  }

  const stats = {
    total: profiles.length,
    implemented: profiles.filter((p: IHEProfile) => p.complianceStatus === 'IMPLEMENTADO').length,
    partial: profiles.filter((p: IHEProfile) => p.complianceStatus === 'PARCIAL').length,
    pending: profiles.filter((p: IHEProfile) => p.complianceStatus === 'PENDENTE').length,
  };

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid gap-3 md:grid-cols-4">
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-white">{stats.total}</p>
            <p className="text-xs text-gray-400">Total de Perfis</p>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-emerald-400">{stats.implemented}</p>
            <p className="text-xs text-gray-400">Implementados</p>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-yellow-400">{stats.partial}</p>
            <p className="text-xs text-gray-400">Parciais</p>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-red-400">{stats.pending}</p>
            <p className="text-xs text-gray-400">Pendentes</p>
          </CardContent>
        </Card>
      </div>

      {/* Profiles table */}
      <Table>
        <TableHeader>
          <TableRow className="border-gray-700">
            <TableHead className="text-gray-400">Sigla</TableHead>
            <TableHead className="text-gray-400">Nome</TableHead>
            <TableHead className="text-gray-400">Domínio</TableHead>
            <TableHead className="text-gray-400">Descrição</TableHead>
            <TableHead className="text-gray-400">Status</TableHead>
            <TableHead className="text-gray-400">Último Teste</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {profiles.map((profile: IHEProfile) => {
            const StatusIcon = COMPLIANCE_ICON[profile.complianceStatus];
            return (
              <TableRow key={profile.id} className="border-gray-700 hover:bg-gray-800/50">
                <TableCell>
                  <span className="text-white font-mono font-bold">{profile.acronym}</span>
                </TableCell>
                <TableCell className="text-white font-medium">{profile.name}</TableCell>
                <TableCell>
                  <Badge className="text-xs bg-gray-800 text-gray-300 border-gray-600">{profile.domain}</Badge>
                </TableCell>
                <TableCell className="text-gray-300 text-sm max-w-[250px] truncate">{profile.description}</TableCell>
                <TableCell>
                  <Badge className={cn('text-xs border flex items-center gap-1 w-fit', COMPLIANCE_CLASS[profile.complianceStatus])}>
                    <StatusIcon className="w-3 h-3" />
                    {COMPLIANCE_LABEL[profile.complianceStatus]}
                  </Badge>
                </TableCell>
                <TableCell className="text-gray-300 text-sm">
                  {profile.lastTestedAt ? new Date(profile.lastTestedAt).toLocaleDateString('pt-BR') : '—'}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── XDS.b Tab ──────────────────────────────────────────────────────────────

function XdsTab() {
  const { data: documents, isLoading: docsLoading } = useXDSDocuments();
  const xdsQuery = useXDSQuery();
  const [searchPatientId, setSearchPatientId] = useState('');

  async function handleSearch() {
    if (!searchPatientId.trim()) {
      toast.error('Informe o ID do paciente.');
      return;
    }
    try {
      const results = await xdsQuery.mutateAsync({ patientId: searchPatientId });
      toast.success(`${results.length} documento(s) encontrado(s).`);
    } catch {
      toast.error('Erro na busca XDS.b.');
    }
  }

  const displayDocs = xdsQuery.data ?? documents ?? [];

  return (
    <div className="space-y-4">
      <div className="flex gap-3 max-w-lg">
        <div className="flex-1">
          <Label className="text-gray-300">Buscar Documentos por Paciente</Label>
          <Input
            className="bg-gray-800 border-gray-700 text-white mt-1"
            value={searchPatientId}
            onChange={(e) => setSearchPatientId(e.target.value)}
            placeholder="ID do paciente"
          />
        </div>
        <div className="flex items-end">
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSearch} disabled={xdsQuery.isPending}>
            <Search className="h-4 w-4 mr-2" />
            {xdsQuery.isPending ? 'Buscando…' : 'Buscar'}
          </Button>
        </div>
      </div>

      {docsLoading ? (
        <p className="text-gray-400 text-center py-8">Carregando documentos…</p>
      ) : displayDocs.length === 0 ? (
        <div className="text-center py-12">
          <FileSearch className="w-10 h-10 mx-auto text-gray-600 mb-3" />
          <p className="text-gray-400">Nenhum documento XDS.b encontrado.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="border-gray-700">
              <TableHead className="text-gray-400">Título</TableHead>
              <TableHead className="text-gray-400">Paciente</TableHead>
              <TableHead className="text-gray-400">Classe</TableHead>
              <TableHead className="text-gray-400">Formato</TableHead>
              <TableHead className="text-gray-400">Data</TableHead>
              <TableHead className="text-gray-400">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayDocs.map((doc: XDSDocument) => (
              <TableRow key={doc.id} className="border-gray-700 hover:bg-gray-800/50">
                <TableCell className="text-white font-medium">{doc.title}</TableCell>
                <TableCell className="text-gray-300 text-sm">{doc.patientName}</TableCell>
                <TableCell>
                  <Badge className="text-xs bg-gray-800 text-gray-300 border-gray-600">{doc.classCode}</Badge>
                </TableCell>
                <TableCell className="text-gray-300 text-sm">{doc.formatCode}</TableCell>
                <TableCell className="text-gray-300 text-sm">
                  {new Date(doc.creationTime).toLocaleDateString('pt-BR')}
                </TableCell>
                <TableCell>
                  <Badge className={doc.status === 'APROVADO'
                    ? 'bg-emerald-900/40 text-emerald-300 border-emerald-700 text-xs border'
                    : 'bg-gray-800 text-gray-400 border-gray-600 text-xs border'
                  }>
                    {doc.status === 'APROVADO' ? 'Aprovado' : 'Deprecado'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

// ─── PIX Tab ────────────────────────────────────────────────────────────────

function PixTab() {
  const pixQuery = usePIXQuery();
  const [form, setForm] = useState({
    patientId: '',
    sourceAuthority: '',
    targetAuthorities: '',
  });

  async function handleQuery() {
    if (!form.patientId || !form.sourceAuthority) {
      toast.error('Preencha o ID do paciente e a autoridade de origem.');
      return;
    }
    try {
      const result = await pixQuery.mutateAsync({
        patientId: form.patientId,
        sourceAuthority: form.sourceAuthority,
        targetAuthorities: form.targetAuthorities.split(',').map((s) => s.trim()).filter(Boolean),
      });
      toast.success(`Cross-referencing encontrado — ${result.domains.length} domínio(s).`);
    } catch {
      toast.error('Erro na consulta PIX.');
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-gray-400 text-sm">
        Patient Identifier Cross-Referencing — consulte identificadores do paciente em múltiplos domínios.
      </p>
      <div className="max-w-lg space-y-3">
        <div>
          <Label className="text-gray-300">ID do Paciente</Label>
          <Input
            className="bg-gray-800 border-gray-700 text-white mt-1"
            value={form.patientId}
            onChange={(e) => setForm((f) => ({ ...f, patientId: e.target.value }))}
            placeholder="Identificador do paciente"
          />
        </div>
        <div>
          <Label className="text-gray-300">Autoridade de Origem</Label>
          <Input
            className="bg-gray-800 border-gray-700 text-white mt-1"
            value={form.sourceAuthority}
            onChange={(e) => setForm((f) => ({ ...f, sourceAuthority: e.target.value }))}
            placeholder="Ex: 2.16.840.1.113883.3.1"
          />
        </div>
        <div>
          <Label className="text-gray-300">Autoridades Alvo (separadas por vírgula)</Label>
          <Input
            className="bg-gray-800 border-gray-700 text-white mt-1"
            value={form.targetAuthorities}
            onChange={(e) => setForm((f) => ({ ...f, targetAuthorities: e.target.value }))}
            placeholder="2.16.840.1.113883.3.2, 2.16.840.1.113883.3.3"
          />
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleQuery} disabled={pixQuery.isPending}>
          <Users className="h-4 w-4 mr-2" />
          {pixQuery.isPending ? 'Consultando…' : 'Consultar PIX'}
        </Button>
      </div>

      {pixQuery.data && (
        <Card className="border-gray-700 bg-gray-800 max-w-lg mt-4">
          <CardHeader>
            <CardTitle className="text-white text-sm">Resultado PIX — Confiança: {(pixQuery.data.matchConfidence * 100).toFixed(0)}%</CardTitle>
          </CardHeader>
          <CardContent>
            {pixQuery.data.domains.length === 0 ? (
              <p className="text-gray-400 text-sm">Nenhum domínio cruzado encontrado.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700">
                    <TableHead className="text-gray-400">Autoridade</TableHead>
                    <TableHead className="text-gray-400">Identificador</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pixQuery.data.domains.map((d, i) => (
                    <TableRow key={i} className="border-gray-700">
                      <TableCell className="text-gray-300 text-sm font-mono">{d.authority}</TableCell>
                      <TableCell className="text-white font-mono">{d.identifier}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── ATNA Tab ───────────────────────────────────────────────────────────────

function AtnaTab() {
  const { data: auditEntries, isLoading } = useATNAAuditTrail();

  return (
    <div className="space-y-4">
      <p className="text-gray-400 text-sm">
        Audit Trail and Node Authentication — trilha de auditoria em tempo real (atualiza a cada 30s).
      </p>

      {isLoading ? (
        <p className="text-gray-400 text-center py-8">Carregando trilha de auditoria…</p>
      ) : !auditEntries || auditEntries.length === 0 ? (
        <div className="text-center py-12">
          <ScrollText className="w-10 h-10 mx-auto text-gray-600 mb-3" />
          <p className="text-gray-400">Nenhum registro de auditoria encontrado.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="border-gray-700">
              <TableHead className="text-gray-400">Tipo</TableHead>
              <TableHead className="text-gray-400">Ação</TableHead>
              <TableHead className="text-gray-400">Resultado</TableHead>
              <TableHead className="text-gray-400">Usuário</TableHead>
              <TableHead className="text-gray-400">Descrição</TableHead>
              <TableHead className="text-gray-400">Data/Hora</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {auditEntries.map((entry: ATNAAuditEntry) => (
              <TableRow key={entry.id} className="border-gray-700 hover:bg-gray-800/50">
                <TableCell className="text-white text-sm">{entry.eventType}</TableCell>
                <TableCell>
                  <Badge className="text-xs bg-gray-800 text-gray-300 border-gray-600">
                    {ACTION_LABEL[entry.eventAction]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className={cn('text-xs border', OUTCOME_CLASS[entry.eventOutcome])}>
                    {OUTCOME_LABEL[entry.eventOutcome]}
                  </Badge>
                </TableCell>
                <TableCell className="text-gray-300 text-sm">{entry.userId}</TableCell>
                <TableCell className="text-gray-300 text-sm max-w-[200px] truncate">{entry.description}</TableCell>
                <TableCell className="text-gray-300 text-sm">
                  {new Date(entry.timestamp).toLocaleString('pt-BR')}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function IHEProfilesPage() {
  const [tab, setTab] = useState('profiles');

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-purple-900/40 flex items-center justify-center">
          <Shield className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">IHE Profiles</h1>
          <p className="text-sm text-gray-400">Perfis de integração IHE — XDS.b, PIX, PDQ, ATNA, MHD, XCA</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-gray-800 border border-gray-700">
          <TabsTrigger value="profiles" className="data-[state=active]:bg-gray-700 text-gray-300">
            <Shield className="w-4 h-4 mr-2" /> Perfis Suportados
          </TabsTrigger>
          <TabsTrigger value="xds" className="data-[state=active]:bg-gray-700 text-gray-300">
            <FileSearch className="w-4 h-4 mr-2" /> XDS.b
          </TabsTrigger>
          <TabsTrigger value="pix" className="data-[state=active]:bg-gray-700 text-gray-300">
            <Users className="w-4 h-4 mr-2" /> PIX
          </TabsTrigger>
          <TabsTrigger value="atna" className="data-[state=active]:bg-gray-700 text-gray-300">
            <ScrollText className="w-4 h-4 mr-2" /> ATNA
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profiles">
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Perfis IHE Suportados</CardTitle>
            </CardHeader>
            <CardContent><ProfilesTab /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="xds">
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">XDS.b — Repositório e Registro de Documentos</CardTitle>
            </CardHeader>
            <CardContent><XdsTab /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pix">
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">PIX — Cross-Referencing de Identificadores</CardTitle>
            </CardHeader>
            <CardContent><PixTab /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="atna">
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">ATNA — Audit Trail</CardTitle>
            </CardHeader>
            <CardContent><AtnaTab /></CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
