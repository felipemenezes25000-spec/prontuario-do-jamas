import { useState } from 'react';
import {
  Clock,
  ListChecks,
  Pill,
  Baby,
  Droplets,
  Cpu,
  Plus,
  User,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  useProblems,
  useCreateProblem,
  useHomeMedications,
  useCreateHomeMedication,
  useObstetricHistory,
  useCreateObstetricHistory,
  useTransfusionHistory,
  useCreateTransfusionHistory,
  useImplantedDevices,
  useCreateImplantedDevice,
  usePatientTimeline,
  type ProblemListItem,
  type HomeMedication,
  type TransfusionHistory,
  type ImplantedDevice,
} from '@/services/clinical-history.service';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR');
}

function statusBadge(status: ProblemListItem['status']) {
  const map: Record<ProblemListItem['status'], { label: string; className: string }> = {
    ACTIVE:   { label: 'Ativo',    className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    CHRONIC:  { label: 'Crônico',  className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
    RESOLVED: { label: 'Resolvido', className: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30' },
    INACTIVE: { label: 'Inativo',  className: 'bg-zinc-700/40 text-zinc-500 border-zinc-700/30' },
  };
  const cfg = map[status] ?? { label: status, className: '' };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

function mriColor(v: ImplantedDevice['mriCompatibility']) {
  if (v === 'SAFE') return 'text-emerald-400';
  if (v === 'CONDITIONAL') return 'text-yellow-400';
  if (v === 'UNSAFE') return 'text-red-400';
  return 'text-zinc-400';
}

// ─── Timeline Tab ─────────────────────────────────────────────────────────────

function TimelineTab({ patientId }: { patientId: string }) {
  const { data, isLoading } = usePatientTimeline(patientId);
  if (isLoading) return <p className="text-sm text-zinc-400 py-6 text-center">Carregando...</p>;
  if (!data?.length) return <p className="text-sm text-zinc-400 py-6 text-center">Nenhum registro encontrado.</p>;
  return (
    <div className="space-y-3">
      {data.map((event) => (
        <div key={event.id} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 mt-1.5" />
            <div className="flex-1 w-px bg-zinc-800" />
          </div>
          <Card className="flex-1 bg-zinc-900 border-zinc-800 mb-1">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">{event.title}</span>
                <span className="text-xs text-zinc-500">{formatDate(event.date)}</span>
              </div>
              {event.description && <p className="text-xs text-zinc-400">{event.description}</p>}
              {event.type && (
                <div className="flex gap-1 mt-2">
                  <Badge variant="outline" className="text-xs">{event.type}</Badge>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
}

// ─── Problem List Tab ─────────────────────────────────────────────────────────

function AddProblemDialog({ patientId, open, onClose }: { patientId: string; open: boolean; onClose: () => void }) {
  const createProblem = useCreateProblem();
  const [description, setDescription] = useState('');
  const [icdCode, setIcdCode] = useState('');
  const [status, setStatus] = useState<ProblemListItem['status']>('ACTIVE');
  const [onset, setOnset] = useState('');

  const handleSave = () => {
    if (!description.trim()) { toast.error('Informe a descrição do problema.'); return; }
    createProblem.mutate(
      { patientId, description, icdCode: icdCode || undefined, status, onset: onset || undefined },
      {
        onSuccess: () => { toast.success('Problema adicionado.'); onClose(); setDescription(''); setIcdCode(''); setOnset(''); },
        onError: () => toast.error('Erro ao adicionar problema.'),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Problema</DialogTitle>
          <DialogDescription>Registre um novo problema na lista ativa do paciente.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Descrição *</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} className="bg-zinc-950 border-zinc-700" placeholder="ex: Hipertensão arterial sistêmica" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>CID-10</Label>
              <Input value={icdCode} onChange={(e) => setIcdCode(e.target.value)} className="bg-zinc-950 border-zinc-700" placeholder="ex: I10" />
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as ProblemListItem['status'])}>
                <SelectTrigger className="bg-zinc-950 border-zinc-700"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Ativo</SelectItem>
                  <SelectItem value="CHRONIC">Crônico</SelectItem>
                  <SelectItem value="RESOLVED">Resolvido</SelectItem>
                  <SelectItem value="INACTIVE">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Início</Label>
            <Input type="date" value={onset} onChange={(e) => setOnset(e.target.value)} className="bg-zinc-950 border-zinc-700" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-zinc-700">Cancelar</Button>
          <Button onClick={handleSave} disabled={createProblem.isPending} className="bg-emerald-600 hover:bg-emerald-700">
            {createProblem.isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProblemListTab({ patientId }: { patientId: string }) {
  const { data, isLoading } = useProblems(patientId);
  const [dialogOpen, setDialogOpen] = useState(false);
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setDialogOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4 mr-1" /> Adicionar
        </Button>
      </div>
      {isLoading ? (
        <p className="text-sm text-zinc-400 text-center py-6">Carregando...</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-800">
              <TableHead>Problema</TableHead>
              <TableHead>CID-10</TableHead>
              <TableHead>Início</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data ?? []).length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center text-zinc-500 py-8">Nenhum problema registrado.</TableCell></TableRow>
            ) : (
              (data ?? []).map((item) => (
                <TableRow key={item.id} className="border-zinc-800 hover:bg-zinc-800/50">
                  <TableCell className="font-medium">{item.description}</TableCell>
                  <TableCell>{item.icdCode ?? '—'}</TableCell>
                  <TableCell>{item.onset ? formatDate(item.onset) : '—'}</TableCell>
                  <TableCell>{statusBadge(item.status)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}
      <AddProblemDialog patientId={patientId} open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </div>
  );
}

// ─── Home Medications Tab ─────────────────────────────────────────────────────

function AddMedicationDialog({ patientId, open, onClose }: { patientId: string; open: boolean; onClose: () => void }) {
  const addMed = useCreateHomeMedication();
  const [name, setName] = useState('');
  const [dose, setDose] = useState('');
  const [route, setRoute] = useState('');
  const [frequency, setFrequency] = useState('');
  const [indication, setIndication] = useState('');

  const handleSave = () => {
    if (!name.trim() || !dose.trim() || !route.trim() || !frequency.trim()) {
      toast.error('Preencha nome, dose, via e frequência.'); return;
    }
    addMed.mutate(
      { patientId, name, dose, route, frequency, indication: indication || undefined },
      {
        onSuccess: () => { toast.success('Medicamento adicionado.'); onClose(); setName(''); setDose(''); setRoute(''); setFrequency(''); setIndication(''); },
        onError: () => toast.error('Erro ao adicionar medicamento.'),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Medicamento Domiciliar</DialogTitle>
          <DialogDescription>Registre um medicamento em uso pelo paciente em casa.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Nome *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-zinc-950 border-zinc-700" placeholder="ex: Losartana 50mg" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Dose *</Label>
              <Input value={dose} onChange={(e) => setDose(e.target.value)} className="bg-zinc-950 border-zinc-700" placeholder="ex: 50mg" />
            </div>
            <div className="space-y-1">
              <Label>Via *</Label>
              <Input value={route} onChange={(e) => setRoute(e.target.value)} className="bg-zinc-950 border-zinc-700" placeholder="ex: VO" />
            </div>
            <div className="space-y-1">
              <Label>Frequência *</Label>
              <Input value={frequency} onChange={(e) => setFrequency(e.target.value)} className="bg-zinc-950 border-zinc-700" placeholder="ex: 1x/dia" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Indicação</Label>
            <Input value={indication} onChange={(e) => setIndication(e.target.value)} className="bg-zinc-950 border-zinc-700" placeholder="ex: Hipertensão" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-zinc-700">Cancelar</Button>
          <Button onClick={handleSave} disabled={addMed.isPending} className="bg-emerald-600 hover:bg-emerald-700">
            {addMed.isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function HomeMedicationsTab({ patientId }: { patientId: string }) {
  const { data, isLoading } = useHomeMedications(patientId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const meds: HomeMedication[] = data ?? [];
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setDialogOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4 mr-1" /> Adicionar
        </Button>
      </div>
      {isLoading ? (
        <p className="text-sm text-zinc-400 text-center py-6">Carregando...</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-800">
              <TableHead>Medicamento</TableHead>
              <TableHead>Dose</TableHead>
              <TableHead>Via</TableHead>
              <TableHead>Frequência</TableHead>
              <TableHead>Indicação</TableHead>
              <TableHead>Ativo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {meds.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-zinc-500 py-8">Nenhum medicamento registrado.</TableCell></TableRow>
            ) : (
              meds.map((m) => (
                <TableRow key={m.id} className="border-zinc-800 hover:bg-zinc-800/50">
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell>{m.dose}</TableCell>
                  <TableCell>{m.route}</TableCell>
                  <TableCell>{m.frequency}</TableCell>
                  <TableCell>{m.indication ?? '—'}</TableCell>
                  <TableCell>
                    <span className={m.active ? 'text-emerald-400' : 'text-zinc-500'}>{m.active ? 'Sim' : 'Não'}</span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}
      <AddMedicationDialog patientId={patientId} open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </div>
  );
}

// ─── Obstetric History Tab ────────────────────────────────────────────────────

function ObstetricTab({ patientId }: { patientId: string }) {
  const { data, isLoading } = useObstetricHistory(patientId);
  const createObstetric = useCreateObstetricHistory();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [g, setG] = useState('0');
  const [p, setP] = useState('0');
  const [a, setA] = useState('0');
  const [lmp, setLmp] = useState('');
  const [prenatal, setPrenatal] = useState(false);

  const handleSave = () => {
    createObstetric.mutate(
      { patientId, gravida: Number(g), para: Number(p), abortus: Number(a), livingChildren: Number(p), lastMenstrualPeriod: lmp || undefined, prenatalCare: prenatal },
      {
        onSuccess: () => { toast.success('História obstétrica salva.'); setDialogOpen(false); },
        onError: () => toast.error('Erro ao salvar história obstétrica.'),
      },
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setDialogOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4 mr-1" /> Registrar
        </Button>
      </div>
      {isLoading ? (
        <p className="text-sm text-zinc-400 text-center py-6">Carregando...</p>
      ) : !data ? (
        <p className="text-sm text-zinc-400 text-center py-6">Nenhuma história obstétrica registrada.</p>
      ) : (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-zinc-500 mb-0.5">Gestações (G)</p>
              <p className="text-2xl font-bold text-emerald-400">{data.gravida}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-0.5">Partos (P)</p>
              <p className="text-2xl font-bold text-emerald-400">{data.para}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-0.5">Abortos (A)</p>
              <p className="text-2xl font-bold text-emerald-400">{data.abortus}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-0.5">Filhos Vivos</p>
              <p className="text-2xl font-bold text-emerald-400">{data.livingChildren}</p>
            </div>
            {data.lastMenstrualPeriod && (
              <div className="col-span-2">
                <p className="text-xs text-zinc-500 mb-0.5">Última Menstruação</p>
                <p className="text-sm">{formatDate(data.lastMenstrualPeriod)}</p>
              </div>
            )}
            <div className="col-span-2">
              <p className="text-xs text-zinc-500 mb-0.5">Pré-natal</p>
              <p className={`text-sm font-medium ${data.prenatalCare ? 'text-emerald-400' : 'text-zinc-400'}`}>{data.prenatalCare ? 'Realizado' : 'Não realizado'}</p>
            </div>
          </CardContent>
        </Card>
      )}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-sm">
          <DialogHeader>
            <DialogTitle>História Obstétrica</DialogTitle>
            <DialogDescription>Preencha o formulário G-P-A.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1"><Label>G</Label><Input type="number" min={0} value={g} onChange={(e) => setG(e.target.value)} className="bg-zinc-950 border-zinc-700" /></div>
              <div className="space-y-1"><Label>P</Label><Input type="number" min={0} value={p} onChange={(e) => setP(e.target.value)} className="bg-zinc-950 border-zinc-700" /></div>
              <div className="space-y-1"><Label>A</Label><Input type="number" min={0} value={a} onChange={(e) => setA(e.target.value)} className="bg-zinc-950 border-zinc-700" /></div>
            </div>
            <div className="space-y-1"><Label>DUM</Label><Input type="date" value={lmp} onChange={(e) => setLmp(e.target.value)} className="bg-zinc-950 border-zinc-700" /></div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="prenatal-check" checked={prenatal} onChange={(e) => setPrenatal(e.target.checked)} className="accent-emerald-500" />
              <label htmlFor="prenatal-check" className="text-sm">Pré-natal realizado</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-zinc-700">Cancelar</Button>
            <Button onClick={handleSave} disabled={createObstetric.isPending} className="bg-emerald-600 hover:bg-emerald-700">
              {createObstetric.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Transfusion History Tab ──────────────────────────────────────────────────

function TransfusionTab({ patientId }: { patientId: string }) {
  const { data, isLoading } = useTransfusionHistory(patientId);
  const addTransfusion = useCreateTransfusionHistory();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [date, setDate] = useState('');
  const [product, setProduct] = useState('');
  const [units, setUnits] = useState('1');
  const [indication, setIndication] = useState('');
  const [reactions, setReactions] = useState('');

  const handleSave = () => {
    if (!date || !product.trim() || !indication.trim()) { toast.error('Preencha data, hemocomponente e indicação.'); return; }
    addTransfusion.mutate(
      { patientId, date, bloodProduct: product, units: Number(units), indication, reactions: reactions || undefined },
      {
        onSuccess: () => { toast.success('Transfusão registrada.'); setDialogOpen(false); setDate(''); setProduct(''); setUnits('1'); setIndication(''); setReactions(''); },
        onError: () => toast.error('Erro ao registrar transfusão.'),
      },
    );
  };

  const records: TransfusionHistory[] = data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setDialogOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4 mr-1" /> Adicionar
        </Button>
      </div>
      {isLoading ? (
        <p className="text-sm text-zinc-400 text-center py-6">Carregando...</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-800">
              <TableHead>Data</TableHead>
              <TableHead>Hemocomponente</TableHead>
              <TableHead>Unidades</TableHead>
              <TableHead>Indicação</TableHead>
              <TableHead>Reações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-zinc-500 py-8">Nenhuma transfusão registrada.</TableCell></TableRow>
            ) : (
              records.map((t) => (
                <TableRow key={t.id} className="border-zinc-800 hover:bg-zinc-800/50">
                  <TableCell>{formatDate(t.date)}</TableCell>
                  <TableCell className="font-medium">{t.bloodProduct}</TableCell>
                  <TableCell>{t.units}</TableCell>
                  <TableCell>{t.indication}</TableCell>
                  <TableCell>{t.reactions ?? <span className="text-zinc-500">—</span>}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Transfusão</DialogTitle>
            <DialogDescription>Adicione um evento transfusional ao histórico.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Data *</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-zinc-950 border-zinc-700" /></div>
              <div className="space-y-1"><Label>Unidades *</Label><Input type="number" min={1} value={units} onChange={(e) => setUnits(e.target.value)} className="bg-zinc-950 border-zinc-700" /></div>
            </div>
            <div className="space-y-1"><Label>Hemocomponente *</Label><Input value={product} onChange={(e) => setProduct(e.target.value)} className="bg-zinc-950 border-zinc-700" placeholder="ex: Concentrado de Hemácias" /></div>
            <div className="space-y-1"><Label>Indicação *</Label><Input value={indication} onChange={(e) => setIndication(e.target.value)} className="bg-zinc-950 border-zinc-700" placeholder="ex: Anemia grave" /></div>
            <div className="space-y-1"><Label>Reações</Label><Input value={reactions} onChange={(e) => setReactions(e.target.value)} className="bg-zinc-950 border-zinc-700" placeholder="ex: Febre leve" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-zinc-700">Cancelar</Button>
            <Button onClick={handleSave} disabled={addTransfusion.isPending} className="bg-emerald-600 hover:bg-emerald-700">
              {addTransfusion.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Implanted Devices Tab ────────────────────────────────────────────────────

function ImplantedDevicesTab({ patientId }: { patientId: string }) {
  const { data, isLoading } = useImplantedDevices(patientId);
  const addDevice = useCreateImplantedDevice();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deviceType, setDeviceType] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [implantDate, setImplantDate] = useState('');
  const [site, setSite] = useState('');
  const [mri, setMri] = useState<ImplantedDevice['mriCompatibility']>('UNKNOWN');

  const handleSave = () => {
    if (!deviceType.trim()) { toast.error('Informe o tipo de dispositivo.'); return; }
    addDevice.mutate(
      { patientId, deviceType, manufacturer: manufacturer || undefined, implantDate: implantDate || undefined, site: site || undefined, mriCompatibility: mri },
      {
        onSuccess: () => { toast.success('Dispositivo registrado.'); setDialogOpen(false); setDeviceType(''); setManufacturer(''); setImplantDate(''); setSite(''); setMri('UNKNOWN'); },
        onError: () => toast.error('Erro ao registrar dispositivo.'),
      },
    );
  };

  const devices: ImplantedDevice[] = data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setDialogOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4 mr-1" /> Adicionar
        </Button>
      </div>
      {isLoading ? (
        <p className="text-sm text-zinc-400 text-center py-6">Carregando...</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-800">
              <TableHead>Dispositivo</TableHead>
              <TableHead>Fabricante</TableHead>
              <TableHead>Data Implante</TableHead>
              <TableHead>Local</TableHead>
              <TableHead>RM</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {devices.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-zinc-500 py-8">Nenhum dispositivo registrado.</TableCell></TableRow>
            ) : (
              devices.map((d) => (
                <TableRow key={d.id} className="border-zinc-800 hover:bg-zinc-800/50">
                  <TableCell className="font-medium">{d.deviceType}</TableCell>
                  <TableCell>{d.manufacturer ?? '—'}</TableCell>
                  <TableCell>{d.implantDate ? formatDate(d.implantDate) : '—'}</TableCell>
                  <TableCell>{d.site ?? '—'}</TableCell>
                  <TableCell className={`font-medium ${mriColor(d.mriCompatibility)}`}>{d.mriCompatibility}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-md">
          <DialogHeader>
            <DialogTitle>Dispositivo Implantado</DialogTitle>
            <DialogDescription>Registre um dispositivo implantado no paciente.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1"><Label>Tipo *</Label><Input value={deviceType} onChange={(e) => setDeviceType(e.target.value)} className="bg-zinc-950 border-zinc-700" placeholder="ex: Marcapasso, Prótese de quadril" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Fabricante</Label><Input value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} className="bg-zinc-950 border-zinc-700" /></div>
              <div className="space-y-1"><Label>Data implante</Label><Input type="date" value={implantDate} onChange={(e) => setImplantDate(e.target.value)} className="bg-zinc-950 border-zinc-700" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Local</Label><Input value={site} onChange={(e) => setSite(e.target.value)} className="bg-zinc-950 border-zinc-700" placeholder="ex: VE, quadril esq." /></div>
              <div className="space-y-1">
                <Label>Compatibilidade RM</Label>
                <Select value={mri} onValueChange={(v) => setMri(v as ImplantedDevice['mriCompatibility'])}>
                  <SelectTrigger className="bg-zinc-950 border-zinc-700"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SAFE">Seguro</SelectItem>
                    <SelectItem value="CONDITIONAL">Condicional</SelectItem>
                    <SelectItem value="UNSAFE">Contraindicado</SelectItem>
                    <SelectItem value="UNKNOWN">Desconhecido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-zinc-700">Cancelar</Button>
            <Button onClick={handleSave} disabled={addDevice.isPending} className="bg-emerald-600 hover:bg-emerald-700">
              {addDevice.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const MOCK_PATIENTS = [
  { id: 'pat-001', name: 'Maria Oliveira' },
  { id: 'pat-002', name: 'João Silva' },
  { id: 'pat-003', name: 'Ana Santos' },
];

export default function ClinicalHistoryPage() {
  const [selectedPatientId, setSelectedPatientId] = useState('');

  const selectedPatient = MOCK_PATIENTS.find((p) => p.id === selectedPatientId);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Histórico Clínico</h1>
          <p className="text-sm text-zinc-400 mt-0.5">Linha do tempo, problemas, medicações e histórico especial do paciente.</p>
        </div>
      </div>

      {/* Patient Selector */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <User className="h-5 w-5 text-zinc-400 shrink-0" />
            <div className="flex-1 max-w-sm space-y-1">
              <Label htmlFor="patient-select">Paciente</Label>
              <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
                <SelectTrigger id="patient-select" className="bg-zinc-950 border-zinc-700">
                  <SelectValue placeholder="Selecione o paciente..." />
                </SelectTrigger>
                <SelectContent>
                  {MOCK_PATIENTS.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedPatient && (
              <div className="ml-auto">
                <Badge variant="outline" className="text-emerald-400 border-emerald-500/30">
                  {selectedPatient.name}
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs — only visible when a patient is selected */}
      {!selectedPatientId ? (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="py-16 text-center">
            <User className="h-10 w-10 text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-400">Selecione um paciente para visualizar o histórico clínico.</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="timeline">
          <TabsList className="bg-zinc-900 border border-zinc-800 h-auto flex-wrap">
            <TabsTrigger value="timeline" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
              <Clock className="h-4 w-4 mr-1.5" />
              Linha do Tempo
            </TabsTrigger>
            <TabsTrigger value="problems" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
              <ListChecks className="h-4 w-4 mr-1.5" />
              Lista de Problemas
            </TabsTrigger>
            <TabsTrigger value="medications" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
              <Pill className="h-4 w-4 mr-1.5" />
              Medicações Domiciliares
            </TabsTrigger>
            <TabsTrigger value="obstetric" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
              <Baby className="h-4 w-4 mr-1.5" />
              Histórico Obstétrico
            </TabsTrigger>
            <TabsTrigger value="transfusion" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
              <Droplets className="h-4 w-4 mr-1.5" />
              Histórico Transfusional
            </TabsTrigger>
            <TabsTrigger value="devices" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
              <Cpu className="h-4 w-4 mr-1.5" />
              Dispositivos Implantados
            </TabsTrigger>
          </TabsList>

          <TabsContent value="timeline" className="mt-4">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4 text-emerald-400" />
                  Linha do Tempo Clínica
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TimelineTab patientId={selectedPatientId} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="problems" className="mt-4">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ListChecks className="h-4 w-4 text-emerald-400" />
                  Lista de Problemas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ProblemListTab patientId={selectedPatientId} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="medications" className="mt-4">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Pill className="h-4 w-4 text-emerald-400" />
                  Medicações Domiciliares
                </CardTitle>
              </CardHeader>
              <CardContent>
                <HomeMedicationsTab patientId={selectedPatientId} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="obstetric" className="mt-4">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Baby className="h-4 w-4 text-emerald-400" />
                  Histórico Obstétrico
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ObstetricTab patientId={selectedPatientId} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transfusion" className="mt-4">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Droplets className="h-4 w-4 text-emerald-400" />
                  Histórico Transfusional
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TransfusionTab patientId={selectedPatientId} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="devices" className="mt-4">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-emerald-400" />
                  Dispositivos Implantados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ImplantedDevicesTab patientId={selectedPatientId} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
