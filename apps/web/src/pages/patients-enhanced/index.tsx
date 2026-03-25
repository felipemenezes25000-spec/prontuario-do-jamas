import { useState } from 'react';
import {
  Search,
  Users,
  Baby,
  MapPin,
  Globe,
  Upload,
  Merge,
  CheckCircle,
  AlertTriangle,
  Plus,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  useMpiSearch,
  useMpiMerge,
  usePhoneticSearch,
  useRegisterNewborn,
  usePatientAddresses,
  useAddAddress,
  useGeocodeAddress,
  useImportLegacyData,
  type MpiSearchParams,
  type AddressPayload,
} from '@/services/patients-enhanced.service';

// ─── helpers ────────────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
  const pct = Math.round(score);
  const color =
    pct >= 80 ? 'bg-emerald-600' : pct >= 50 ? 'bg-yellow-600' : 'bg-red-700';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold text-white ${color}`}>
      {pct}%
    </span>
  );
}

// ============================================================================
// Tab 1 — MPI: Master Patient Index
// ============================================================================

function MpiTab() {
  const [params, setParams] = useState<MpiSearchParams>({});
  const [searchEnabled, setSearchEnabled] = useState(false);
  const [mergeTarget, setMergeTarget] = useState<{ keepId: string; mergeId: string } | null>(null);
  const [showMergeDialog, setShowMergeDialog] = useState(false);

  const { data: candidates = [], isFetching } = useMpiSearch(params, searchEnabled);
  const merge = useMpiMerge();

  function handleSearch() {
    if (!params.fullName && !params.cpf && !params.birthDate) {
      toast.warning('Informe ao menos um critério de busca.');
      return;
    }
    setSearchEnabled(true);
  }

  function handleMergeConfirm() {
    if (!mergeTarget) return;
    merge.mutate(mergeTarget, {
      onSuccess: () => {
        toast.success('Pacientes mesclados com sucesso.');
        setShowMergeDialog(false);
        setMergeTarget(null);
      },
      onError: () => toast.error('Erro ao mesclar pacientes.'),
    });
  }

  return (
    <div className="space-y-4">
      <Card className="bg-[#12121a] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400" />
            Busca MPI — Master Patient Index
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <Label className="text-gray-400 text-xs">Nome Completo</Label>
            <Input
              className="bg-[#0a0a0f] border-gray-700 text-white mt-1"
              placeholder="Maria da Silva..."
              value={params.fullName ?? ''}
              onChange={(e) => { setParams((p) => ({ ...p, fullName: e.target.value })); setSearchEnabled(false); }}
            />
          </div>
          <div>
            <Label className="text-gray-400 text-xs">CPF</Label>
            <Input
              className="bg-[#0a0a0f] border-gray-700 text-white mt-1"
              placeholder="000.000.000-00"
              value={params.cpf ?? ''}
              onChange={(e) => { setParams((p) => ({ ...p, cpf: e.target.value })); setSearchEnabled(false); }}
            />
          </div>
          <div>
            <Label className="text-gray-400 text-xs">Data de Nascimento</Label>
            <Input
              type="date"
              className="bg-[#0a0a0f] border-gray-700 text-white mt-1"
              value={params.birthDate ?? ''}
              onChange={(e) => { setParams((p) => ({ ...p, birthDate: e.target.value })); setSearchEnabled(false); }}
            />
          </div>
          <div className="flex items-end">
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleSearch}
              disabled={isFetching}
            >
              {isFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4 mr-1" />}
              Buscar
            </Button>
          </div>
        </CardContent>
      </Card>

      {candidates.length > 0 && (
        <Card className="bg-[#12121a] border-gray-800">
          <CardHeader>
            <CardTitle className="text-white text-sm">{candidates.length} candidato(s) encontrado(s)</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-gray-800">
                  <TableHead className="text-gray-400">Nome</TableHead>
                  <TableHead className="text-gray-400">CPF</TableHead>
                  <TableHead className="text-gray-400">Nascimento</TableHead>
                  <TableHead className="text-gray-400">MRN</TableHead>
                  <TableHead className="text-gray-400">Score</TableHead>
                  <TableHead className="text-gray-400">Detalhes</TableHead>
                  <TableHead className="text-gray-400">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {candidates.map((c) => (
                  <TableRow key={c.id} className="border-gray-800">
                    <TableCell className="text-white">{c.fullName}</TableCell>
                    <TableCell className="text-gray-300">{c.cpf ?? '—'}</TableCell>
                    <TableCell className="text-gray-300">
                      {c.birthDate ? new Date(c.birthDate).toLocaleDateString('pt-BR') : '—'}
                    </TableCell>
                    <TableCell className="text-gray-300 font-mono text-xs">{c.mrn}</TableCell>
                    <TableCell><ScoreBadge score={c.matchScore} /></TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {c.matchDetails.cpfMatch && <Badge className="bg-emerald-800 text-xs">CPF</Badge>}
                        {c.matchDetails.birthDateMatch && <Badge className="bg-blue-800 text-xs">Data</Badge>}
                        {c.matchDetails.phoneticMatch && <Badge className="bg-purple-800 text-xs">Fonético</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-yellow-700 text-yellow-400 hover:bg-yellow-900/20 text-xs"
                        onClick={() => {
                          if (candidates[0] && c.id !== candidates[0].id) {
                            setMergeTarget({ keepId: candidates[0].id, mergeId: c.id });
                            setShowMergeDialog(true);
                          }
                        }}
                        disabled={c.id === candidates[0]?.id}
                      >
                        <Merge className="w-3 h-3 mr-1" />
                        Mesclar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={showMergeDialog} onOpenChange={setShowMergeDialog}>
        <DialogContent className="bg-[#12121a] border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              Confirmar Mesclagem de Pacientes
            </DialogTitle>
          </DialogHeader>
          <p className="text-gray-300 text-sm">
            Esta ação irá mesclar o paciente duplicado no registro principal. Esta operação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" className="border-gray-700" onClick={() => setShowMergeDialog(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-yellow-600 hover:bg-yellow-700 text-white"
              onClick={handleMergeConfirm}
              disabled={merge.isPending}
            >
              {merge.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Confirmar Mesclagem
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// Tab 2 — Busca Fonética
// ============================================================================

function PhoneticSearchTab() {
  const [query, setQuery] = useState('');
  const [searchEnabled, setSearchEnabled] = useState(false);
  const { data: results = [], isFetching } = usePhoneticSearch(query, searchEnabled);

  function handleSearch() {
    if (query.trim().length < 2) {
      toast.warning('Digite ao menos 2 caracteres.');
      return;
    }
    setSearchEnabled(true);
  }

  return (
    <div className="space-y-4">
      <Card className="bg-[#12121a] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <Search className="w-4 h-4 text-emerald-400" />
            Busca Fonética (Soundex pt-BR)
          </CardTitle>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Input
            className="bg-[#0a0a0f] border-gray-700 text-white flex-1"
            placeholder="Digite o nome (ex: Joao, João, Joan — retornam o mesmo resultado)..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSearchEnabled(false); }}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={handleSearch}
            disabled={isFetching}
          >
            {isFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </Button>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card className="bg-[#12121a] border-gray-800">
          <CardContent className="pt-4">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-800">
                  <TableHead className="text-gray-400">Nome</TableHead>
                  <TableHead className="text-gray-400">CPF</TableHead>
                  <TableHead className="text-gray-400">MRN</TableHead>
                  <TableHead className="text-gray-400">Score Fonético</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((r) => (
                  <TableRow key={r.id} className="border-gray-800">
                    <TableCell className="text-white">{r.fullName}</TableCell>
                    <TableCell className="text-gray-300">{r.cpf ?? '—'}</TableCell>
                    <TableCell className="text-gray-300 font-mono text-xs">{r.mrn}</TableCell>
                    <TableCell><ScoreBadge score={r.matchScore} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {searchEnabled && !isFetching && results.length === 0 && (
        <p className="text-gray-500 text-center py-8">Nenhum paciente encontrado com som similar a "{query}".</p>
      )}
    </div>
  );
}

// ============================================================================
// Tab 3 — Recém-nascido
// ============================================================================

function NewbornTab() {
  const [form, setForm] = useState({
    motherId: '',
    fullName: '',
    birthDate: '',
    birthTime: '',
    gender: '',
    weight: '',
    length: '',
    apgar1: '',
    apgar5: '',
    notes: '',
  });

  const register = useRegisterNewborn();

  function handleSubmit() {
    if (!form.motherId || !form.fullName || !form.birthDate || !form.gender) {
      toast.warning('Preencha os campos obrigatórios: mãe, nome, data e sexo.');
      return;
    }
    register.mutate(
      {
        motherId: form.motherId,
        fullName: form.fullName,
        birthDate: form.birthDate,
        birthTime: form.birthTime || undefined,
        gender: form.gender,
        weight: form.weight ? parseFloat(form.weight) : undefined,
        length: form.length ? parseFloat(form.length) : undefined,
        apgar1: form.apgar1 ? parseInt(form.apgar1) : undefined,
        apgar5: form.apgar5 ? parseInt(form.apgar5) : undefined,
        notes: form.notes || undefined,
      },
      {
        onSuccess: (data) => {
          toast.success(`Recém-nascido ${data.newborn?.fullName ?? ''} cadastrado com sucesso.`);
          setForm({
            motherId: '', fullName: '', birthDate: '', birthTime: '', gender: '',
            weight: '', length: '', apgar1: '', apgar5: '', notes: '',
          });
        },
        onError: () => toast.error('Erro ao cadastrar recém-nascido.'),
      },
    );
  }

  const field = (
    label: string,
    key: keyof typeof form,
    type = 'text',
    placeholder = '',
  ) => (
    <div>
      <Label className="text-gray-400 text-xs">{label}</Label>
      <Input
        type={type}
        className="bg-[#0a0a0f] border-gray-700 text-white mt-1"
        placeholder={placeholder}
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
      />
    </div>
  );

  return (
    <Card className="bg-[#12121a] border-gray-800">
      <CardHeader>
        <CardTitle className="text-white text-sm flex items-center gap-2">
          <Baby className="w-4 h-4 text-emerald-400" />
          Cadastro de Recém-Nascido
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {field('ID da Mãe *', 'motherId', 'text', 'UUID da paciente mãe')}
          {field('Nome do Recém-Nascido *', 'fullName', 'text', 'RN de Maria Silva')}
          {field('Data de Nascimento *', 'birthDate', 'date')}
          {field('Hora do Nascimento', 'birthTime', 'time')}
          <div>
            <Label className="text-gray-400 text-xs">Sexo *</Label>
            <Select value={form.gender} onValueChange={(v) => setForm((f) => ({ ...f, gender: v }))}>
              <SelectTrigger className="bg-[#0a0a0f] border-gray-700 text-white mt-1">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent className="bg-[#12121a] border-gray-700 text-white">
                <SelectItem value="MALE">Masculino</SelectItem>
                <SelectItem value="FEMALE">Feminino</SelectItem>
                <SelectItem value="INDETERMINATE">Indeterminado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {field('Peso (g)', 'weight', 'number', '3200')}
          {field('Comprimento (cm)', 'length', 'number', '48')}
          {field('Apgar 1 minuto', 'apgar1', 'number', '0-10')}
          {field('Apgar 5 minutos', 'apgar5', 'number', '0-10')}
        </div>
        <div>
          <Label className="text-gray-400 text-xs">Observações</Label>
          <Textarea
            className="bg-[#0a0a0f] border-gray-700 text-white mt-1"
            placeholder="Intercorrências, observações clínicas..."
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          />
        </div>
        <Button
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
          onClick={handleSubmit}
          disabled={register.isPending}
        >
          {register.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Baby className="w-4 h-4 mr-2" />}
          Cadastrar Recém-Nascido
        </Button>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Tab 4 — Múltiplos Endereços
// ============================================================================

function AddressesTab() {
  const [patientId, setPatientId] = useState('');
  const [lookupId, setLookupId] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Omit<AddressPayload, 'patientId'>>({
    type: 'RESIDENTIAL',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    zipCode: '',
    isPrimary: false,
  });

  const { data: addresses = [], isFetching } = usePatientAddresses(lookupId);
  const addAddress = useAddAddress();

  function handleLookup() {
    if (!patientId.trim()) return;
    setLookupId(patientId.trim());
  }

  function handleAdd() {
    if (!lookupId || !form.street || !form.city || !form.state || !form.zipCode) {
      toast.warning('Preencha os campos obrigatórios do endereço.');
      return;
    }
    addAddress.mutate(
      { ...form, patientId: lookupId },
      {
        onSuccess: () => {
          toast.success('Endereço adicionado com sucesso.');
          setShowForm(false);
          setForm({ type: 'RESIDENTIAL', street: '', number: '', complement: '', neighborhood: '', city: '', state: '', zipCode: '', isPrimary: false });
        },
        onError: () => toast.error('Erro ao adicionar endereço.'),
      },
    );
  }

  const typeLabels: Record<string, string> = { RESIDENTIAL: 'Residencial', WORK: 'Trabalho', TEMPORARY: 'Temporário' };

  return (
    <div className="space-y-4">
      <Card className="bg-[#12121a] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-400" />
            Gerenciar Endereços
          </CardTitle>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Input
            className="bg-[#0a0a0f] border-gray-700 text-white flex-1"
            placeholder="ID do paciente (UUID)"
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
          />
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleLookup}>
            Buscar
          </Button>
        </CardContent>
      </Card>

      {lookupId && (
        <Card className="bg-[#12121a] border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white text-sm">
              {isFetching ? 'Carregando...' : `${addresses.length} endereço(s) cadastrado(s)`}
            </CardTitle>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setShowForm(!showForm)}>
              <Plus className="w-4 h-4 mr-1" />
              Novo Endereço
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {showForm && (
              <div className="bg-[#0a0a0f] rounded-lg p-4 space-y-3 border border-gray-800">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-gray-400 text-xs">Tipo</Label>
                    <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as AddressPayload['type'] }))}>
                      <SelectTrigger className="bg-[#12121a] border-gray-700 text-white mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#12121a] border-gray-700 text-white">
                        <SelectItem value="RESIDENTIAL">Residencial</SelectItem>
                        <SelectItem value="WORK">Trabalho</SelectItem>
                        <SelectItem value="TEMPORARY">Temporário</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-gray-400 text-xs">Logradouro *</Label>
                    <Input className="bg-[#12121a] border-gray-700 text-white mt-1" value={form.street} onChange={(e) => setForm((f) => ({ ...f, street: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-gray-400 text-xs">Número</Label>
                    <Input className="bg-[#12121a] border-gray-700 text-white mt-1" value={form.number ?? ''} onChange={(e) => setForm((f) => ({ ...f, number: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-gray-400 text-xs">Complemento</Label>
                    <Input className="bg-[#12121a] border-gray-700 text-white mt-1" value={form.complement ?? ''} onChange={(e) => setForm((f) => ({ ...f, complement: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-gray-400 text-xs">Bairro</Label>
                    <Input className="bg-[#12121a] border-gray-700 text-white mt-1" value={form.neighborhood ?? ''} onChange={(e) => setForm((f) => ({ ...f, neighborhood: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-gray-400 text-xs">Cidade *</Label>
                    <Input className="bg-[#12121a] border-gray-700 text-white mt-1" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-gray-400 text-xs">Estado *</Label>
                    <Input className="bg-[#12121a] border-gray-700 text-white mt-1" placeholder="SP" maxLength={2} value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value.toUpperCase() }))} />
                  </div>
                  <div>
                    <Label className="text-gray-400 text-xs">CEP *</Label>
                    <Input className="bg-[#12121a] border-gray-700 text-white mt-1" placeholder="00000-000" value={form.zipCode} onChange={(e) => setForm((f) => ({ ...f, zipCode: e.target.value }))} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleAdd} disabled={addAddress.isPending}>
                    {addAddress.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle className="w-4 h-4 mr-1" />}
                    Salvar Endereço
                  </Button>
                  <Button variant="outline" className="border-gray-700" onClick={() => setShowForm(false)}>Cancelar</Button>
                </div>
              </div>
            )}
            {addresses.map((addr) => (
              <div key={addr.id} className="flex items-start justify-between p-3 rounded-lg bg-[#0a0a0f] border border-gray-800">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className="bg-blue-800 text-xs">{typeLabels[addr.type] ?? addr.type}</Badge>
                    {addr.isPrimary && <Badge className="bg-emerald-800 text-xs">Principal</Badge>}
                  </div>
                  <p className="text-white text-sm">
                    {addr.street}{addr.number ? `, ${addr.number}` : ''}{addr.complement ? ` — ${addr.complement}` : ''}
                  </p>
                  <p className="text-gray-400 text-xs">
                    {addr.neighborhood ? `${addr.neighborhood}, ` : ''}{addr.city} — {addr.state}, CEP {addr.zipCode}
                  </p>
                  {addr.latitude && addr.longitude && (
                    <p className="text-gray-500 text-xs mt-0.5">
                      Coords: {addr.latitude.toFixed(4)}, {addr.longitude.toFixed(4)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================================================
// Tab 5 — Geolocalização
// ============================================================================

function GeoTab() {
  const [zipCode, setZipCode] = useState('');
  const [lookupZip, setLookupZip] = useState('');
  const { data: geoResult, isFetching, isError } = useGeocodeAddress(lookupZip, !!lookupZip);

  function handleLookup() {
    const clean = zipCode.replace(/\D/g, '');
    if (clean.length !== 8) {
      toast.warning('CEP deve ter 8 dígitos.');
      return;
    }
    setLookupZip(clean);
  }

  return (
    <div className="space-y-4">
      <Card className="bg-[#12121a] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <Globe className="w-4 h-4 text-emerald-400" />
            Geocodificação de Endereço por CEP
          </CardTitle>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Input
            className="bg-[#0a0a0f] border-gray-700 text-white flex-1"
            placeholder="Digite o CEP (ex: 01310-100)"
            value={zipCode}
            onChange={(e) => setZipCode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
          />
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleLookup} disabled={isFetching}>
            {isFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </Button>
        </CardContent>
      </Card>

      {isError && (
        <Card className="bg-[#12121a] border-red-900">
          <CardContent className="pt-4">
            <p className="text-red-400 text-sm">CEP não encontrado ou serviço indisponível.</p>
          </CardContent>
        </Card>
      )}

      {geoResult && (
        <Card className="bg-[#12121a] border-gray-800">
          <CardContent className="pt-4 space-y-3">
            <p className="text-emerald-400 font-semibold">{geoResult.formatted}</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-gray-500 text-xs">Logradouro</p>
                <p className="text-white">{geoResult.street}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Bairro</p>
                <p className="text-white">{geoResult.neighborhood}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Cidade</p>
                <p className="text-white">{geoResult.city}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Estado</p>
                <p className="text-white">{geoResult.state}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Latitude</p>
                <p className="text-white font-mono">{geoResult.latitude.toFixed(6)}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Longitude</p>
                <p className="text-white font-mono">{geoResult.longitude.toFixed(6)}</p>
              </div>
            </div>
            <div className="bg-[#0a0a0f] rounded p-3 border border-gray-800">
              <p className="text-gray-400 text-xs font-mono">
                Mapa: https://www.openstreetmap.org/?mlat={geoResult.latitude}&mlon={geoResult.longitude}&zoom=15
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================================================
// Tab 6 — Importação / Migração
// ============================================================================

function ImportTab() {
  const [format, setFormat] = useState<'CSV' | 'HL7' | 'FHIR'>('CSV');
  const [data, setData] = useState('');
  const importData = useImportLegacyData();

  const placeholders: Record<string, string> = {
    CSV: 'nome,cpf,dataNasc,telefone\nMaria Silva,123.456.789-00,1980-05-15,11999990000\n...',
    HL7: 'MSH|^~\\&|SISTEMA|HOSP|VoxPEP|2024...\nPID|1||MRN123^^^HOSP||SILVA^MARIA...',
    FHIR: '{\n  "resourceType": "Patient",\n  "id": "example",\n  "name": [{"use": "official", "family": "Silva", "given": ["Maria"]}]\n}',
  };

  function handleImport() {
    if (!data.trim()) {
      toast.warning('Cole os dados para importação.');
      return;
    }
    importData.mutate(
      { format, data },
      {
        onSuccess: (result) => {
          toast.success(`Importação enfileirada: ${result.message} (ID: ${result.importId.slice(0, 8)}...)`);
          setData('');
        },
        onError: () => toast.error('Erro ao enfileirar importação.'),
      },
    );
  }

  return (
    <Card className="bg-[#12121a] border-gray-800">
      <CardHeader>
        <CardTitle className="text-white text-sm flex items-center gap-2">
          <Upload className="w-4 h-4 text-emerald-400" />
          Importação / Migração de Dados Legados (ETL)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-gray-400 text-xs">Formato de Origem</Label>
          <Select value={format} onValueChange={(v) => setFormat(v as typeof format)}>
            <SelectTrigger className="bg-[#0a0a0f] border-gray-700 text-white mt-1 w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#12121a] border-gray-700 text-white">
              <SelectItem value="CSV">CSV</SelectItem>
              <SelectItem value="HL7">HL7 v2.x</SelectItem>
              <SelectItem value="FHIR">FHIR R4 (JSON)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-gray-400 text-xs">Dados</Label>
          <Textarea
            className="bg-[#0a0a0f] border-gray-700 text-white mt-1 font-mono text-xs min-h-48"
            placeholder={placeholders[format]}
            value={data}
            onChange={(e) => setData(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-4">
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={handleImport}
            disabled={importData.isPending}
          >
            {importData.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
            Enfileirar Importação
          </Button>
          <p className="text-gray-500 text-xs">
            Os dados serão processados assincronamente via BullMQ.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Main Page
// ============================================================================

export default function PatientsEnhancedPage() {
  return (
    <div className="bg-[#0a0a0f] min-h-screen p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Cadastro Avançado de Pacientes</h1>
        <p className="text-gray-400 text-sm mt-1">
          MPI, busca fonética, recém-nascido, múltiplos endereços, geolocalização e migração.
        </p>
      </div>

      <Tabs defaultValue="mpi">
        <TabsList className="bg-[#12121a] border border-gray-800">
          <TabsTrigger value="mpi" className="data-[state=active]:bg-emerald-700 data-[state=active]:text-white text-gray-400 text-xs">
            MPI
          </TabsTrigger>
          <TabsTrigger value="phonetic" className="data-[state=active]:bg-emerald-700 data-[state=active]:text-white text-gray-400 text-xs">
            Busca Fonética
          </TabsTrigger>
          <TabsTrigger value="newborn" className="data-[state=active]:bg-emerald-700 data-[state=active]:text-white text-gray-400 text-xs">
            Recém-Nascido
          </TabsTrigger>
          <TabsTrigger value="addresses" className="data-[state=active]:bg-emerald-700 data-[state=active]:text-white text-gray-400 text-xs">
            Endereços
          </TabsTrigger>
          <TabsTrigger value="geo" className="data-[state=active]:bg-emerald-700 data-[state=active]:text-white text-gray-400 text-xs">
            Geolocalização
          </TabsTrigger>
          <TabsTrigger value="import" className="data-[state=active]:bg-emerald-700 data-[state=active]:text-white text-gray-400 text-xs">
            Importação
          </TabsTrigger>
        </TabsList>

        <div className="mt-4">
          <TabsContent value="mpi"><MpiTab /></TabsContent>
          <TabsContent value="phonetic"><PhoneticSearchTab /></TabsContent>
          <TabsContent value="newborn"><NewbornTab /></TabsContent>
          <TabsContent value="addresses"><AddressesTab /></TabsContent>
          <TabsContent value="geo"><GeoTab /></TabsContent>
          <TabsContent value="import"><ImportTab /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
