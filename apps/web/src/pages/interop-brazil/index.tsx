import { useState } from 'react';
import {
  Send,
  Search,
  AlertCircle,
  Building2,
  UserCheck,
  Baby,
  Skull,
  Pill,
  MessageCircle,
  Heart,
  FileText,
  Plus,
  Upload,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
import {
  useSinanNotifications,
  useCreateSinanNotification,
  useSubmitSinanNotification,
  useLookupCns,
  useExportEsus,
  useSendDigitalPrescription,
  useSendWhatsApp,
} from '@/services/interop-brazil.service';

// ─── helpers ───────────────────────────────────────────────────────────────

const SINAN_STATUS_CLASS: Record<string, string> = {
  DRAFT: 'bg-yellow-900/40 text-yellow-300 border-yellow-700',
  SUBMITTED: 'bg-emerald-900/40 text-emerald-300 border-emerald-700',
  ERROR: 'bg-red-900/40 text-red-300 border-red-700',
};

const SINAN_STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Rascunho',
  SUBMITTED: 'Enviada',
  ERROR: 'Erro',
};

// ─── New Notification Dialog ────────────────────────────────────────────────

function NewNotificationDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateSinanNotification();
  const [form, setForm] = useState({
    patientId: '',
    disease: '',
    cidCode: '',
    symptomOnsetDate: '',
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    create.mutate(form, {
      onSuccess: () => {
        toast.success('Notificação criada com sucesso.');
        onClose();
        setForm({ patientId: '', disease: '', cidCode: '', symptomOnsetDate: '' });
      },
      onError: () => toast.error('Erro ao criar notificação.'),
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg bg-gray-900 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white">Nova Notificação Compulsória</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-gray-300">ID do Paciente</Label>
            <Input
              required
              className="bg-gray-800 border-gray-700 text-white mt-1"
              value={form.patientId}
              onChange={(e) => setForm((f) => ({ ...f, patientId: e.target.value }))}
              placeholder="UUID do paciente"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-gray-300">Doença</Label>
              <Input
                required
                className="bg-gray-800 border-gray-700 text-white mt-1"
                value={form.disease}
                onChange={(e) => setForm((f) => ({ ...f, disease: e.target.value }))}
                placeholder="Ex: Dengue"
              />
            </div>
            <div>
              <Label className="text-gray-300">CID-10</Label>
              <Input
                required
                className="bg-gray-800 border-gray-700 text-white mt-1"
                value={form.cidCode}
                onChange={(e) => setForm((f) => ({ ...f, cidCode: e.target.value }))}
                placeholder="Ex: A90"
              />
            </div>
          </div>
          <div>
            <Label className="text-gray-300">Data de Início dos Sintomas</Label>
            <Input
              type="date"
              required
              className="bg-gray-800 border-gray-700 text-white mt-1"
              value={form.symptomOnsetDate}
              onChange={(e) => setForm((f) => ({ ...f, symptomOnsetDate: e.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" className="border-gray-600 text-gray-300" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={create.isPending}>
              {create.isPending ? 'Criando…' : 'Criar Notificação'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── SINAN Tab ──────────────────────────────────────────────────────────────

function SinanTab() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: sinanData, isLoading } = useSinanNotifications({ page: 1, pageSize: 50 });
  const submitSinan = useSubmitSinanNotification();
  const notifications = sinanData?.data ?? [];

  async function handleSubmit(notificationId: string) {
    try {
      await submitSinan.mutateAsync(notificationId);
      toast.success('Notificação enviada ao SINAN.');
    } catch {
      toast.error('Erro ao enviar notificação.');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-gray-400 text-sm">
          Doenças de notificação compulsória detectadas automaticamente por CID.
        </p>
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Nova Notificação
        </Button>
      </div>

      {isLoading ? (
        <p className="text-gray-400 text-center py-8">Carregando…</p>
      ) : notifications.length === 0 ? (
        <div className="text-center py-12">
          <AlertCircle className="w-10 h-10 mx-auto text-gray-600 mb-3" />
          <p className="text-gray-400">Nenhuma notificação SINAN registrada.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="border-gray-700">
              <TableHead className="text-gray-400">Doença</TableHead>
              <TableHead className="text-gray-400">CID</TableHead>
              <TableHead className="text-gray-400">Paciente</TableHead>
              <TableHead className="text-gray-400">Status</TableHead>
              <TableHead className="text-gray-400">Data</TableHead>
              <TableHead className="text-gray-400">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {notifications.map((n) => (
              <TableRow key={n.notificationId} className="border-gray-700 hover:bg-gray-800/50">
                <TableCell className="text-white font-medium">{n.disease}</TableCell>
                <TableCell className="text-gray-300">{n.cidCode}</TableCell>
                <TableCell className="text-gray-300">{n.patientName ?? '—'}</TableCell>
                <TableCell>
                  <Badge className={`text-xs border ${SINAN_STATUS_CLASS[n.status] ?? 'bg-gray-800 text-gray-400 border-gray-600'}`}>
                    {SINAN_STATUS_LABEL[n.status] ?? n.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-gray-300 text-sm">
                  {new Date(n.notificationDate).toLocaleDateString('pt-BR')}
                </TableCell>
                <TableCell>
                  {n.status !== 'SUBMITTED' && (
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => handleSubmit(n.notificationId)}
                      disabled={submitSinan.isPending}
                    >
                      <Send className="h-3 w-3 mr-1" /> Enviar
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <NewNotificationDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </div>
  );
}

// ─── CADSUS Tab ─────────────────────────────────────────────────────────────

function CadsusTab() {
  const [cpf, setCpf] = useState('');
  const lookupCns = useLookupCns();

  async function handleLookup() {
    const cleanCpf = cpf.replace(/\D/g, '');
    if (cleanCpf.length < 11) {
      toast.error('Digite um CPF válido (11 dígitos).');
      return;
    }
    try {
      const result = await lookupCns.mutateAsync(cleanCpf);
      if (result.status === 'FOUND') {
        toast.success(`CNS encontrado: ${result.cns}`);
      } else {
        toast.error('CNS não encontrado para este CPF.');
      }
    } catch {
      toast.error('Erro ao consultar CADSUS.');
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-gray-400 text-sm">Consulte o Cartão Nacional de Saúde (CNS) pelo CPF do paciente.</p>
      <div className="flex gap-3 max-w-md">
        <div className="flex-1">
          <Label className="text-gray-300">CPF do Paciente</Label>
          <Input
            className="bg-gray-800 border-gray-700 text-white mt-1"
            value={cpf}
            onChange={(e) => setCpf(e.target.value.replace(/\D/g, ''))}
            placeholder="00000000000"
            maxLength={11}
          />
        </div>
        <div className="flex items-end">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleLookup} disabled={lookupCns.isPending}>
            <Search className="h-4 w-4 mr-2" />
            {lookupCns.isPending ? 'Consultando…' : 'Consultar'}
          </Button>
        </div>
      </div>
      {lookupCns.data && (
        <Card className="border-gray-700 bg-gray-800 max-w-md">
          <CardContent className="pt-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Status:</span>
                <Badge className={lookupCns.data.status === 'FOUND' ? 'bg-emerald-900/40 text-emerald-300 border-emerald-700' : 'bg-red-900/40 text-red-300 border-red-700'}>
                  {lookupCns.data.status === 'FOUND' ? 'Encontrado' : 'Não encontrado'}
                </Badge>
              </div>
              {lookupCns.data.cns && (
                <div className="flex justify-between">
                  <span className="text-gray-400">CNS:</span>
                  <span className="text-white font-mono">{lookupCns.data.cns}</span>
                </div>
              )}
              {lookupCns.data.fullName && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Nome:</span>
                  <span className="text-white">{lookupCns.data.fullName}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── CNES Tab ───────────────────────────────────────────────────────────────

function CnesTab() {
  const [cnesCode, setCnesCode] = useState('');
  const [validationResult, setValidationResult] = useState<{ valid: boolean; name?: string; city?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleValidate() {
    if (!cnesCode.trim()) {
      toast.error('Informe o código CNES.');
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/interop-brazil/cnes/validate/${cnesCode}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Erro na validação');
      const data = await res.json();
      setValidationResult(data);
      if (data.valid) {
        toast.success('Estabelecimento válido!');
      } else {
        toast.error('Estabelecimento não encontrado.');
      }
    } catch {
      toast.error('Erro ao validar CNES.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-gray-400 text-sm">Valide estabelecimentos de saúde pelo código CNES.</p>
      <div className="flex gap-3 max-w-md">
        <div className="flex-1">
          <Label className="text-gray-300">Código CNES</Label>
          <Input
            className="bg-gray-800 border-gray-700 text-white mt-1"
            value={cnesCode}
            onChange={(e) => setCnesCode(e.target.value)}
            placeholder="0000000"
            maxLength={7}
          />
        </div>
        <div className="flex items-end">
          <Button className="bg-purple-600 hover:bg-purple-700 text-white" onClick={handleValidate} disabled={loading}>
            <Building2 className="h-4 w-4 mr-2" />
            {loading ? 'Validando…' : 'Validar'}
          </Button>
        </div>
      </div>
      {validationResult && (
        <Card className="border-gray-700 bg-gray-800 max-w-md">
          <CardContent className="pt-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Status:</span>
                <Badge className={validationResult.valid ? 'bg-emerald-900/40 text-emerald-300 border-emerald-700' : 'bg-red-900/40 text-red-300 border-red-700'}>
                  {validationResult.valid ? 'Válido' : 'Inválido'}
                </Badge>
              </div>
              {validationResult.name && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Nome:</span>
                  <span className="text-white">{validationResult.name}</span>
                </div>
              )}
              {validationResult.city && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Município:</span>
                  <span className="text-white">{validationResult.city}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── e-SUS Tab ──────────────────────────────────────────────────────────────

function EsusTab() {
  const [encounterId, setEncounterId] = useState('');
  const exportEsus = useExportEsus();

  async function handleExport() {
    if (!encounterId.trim()) {
      toast.error('Informe o ID do atendimento.');
      return;
    }
    try {
      await exportEsus.mutateAsync(encounterId);
      toast.success('Atendimento exportado para o e-SUS com sucesso.');
      setEncounterId('');
    } catch {
      toast.error('Erro ao exportar para o e-SUS.');
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-gray-400 text-sm">
        Exporte registros de atendimento no formato PEC/CDS para alimentar o SISAB.
      </p>
      <div className="flex gap-3 max-w-lg">
        <div className="flex-1">
          <Label className="text-gray-300">ID do Atendimento</Label>
          <Input
            className="bg-gray-800 border-gray-700 text-white mt-1"
            value={encounterId}
            onChange={(e) => setEncounterId(e.target.value)}
            placeholder="UUID do atendimento"
          />
        </div>
        <div className="flex items-end">
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleExport} disabled={exportEsus.isPending}>
            <Upload className="h-4 w-4 mr-2" />
            {exportEsus.isPending ? 'Exportando…' : 'Exportar'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── SIM Tab ────────────────────────────────────────────────────────────────

function SimTab() {
  return (
    <div className="space-y-4">
      <p className="text-gray-400 text-sm">
        Emita declarações de óbito digitais e envie automaticamente ao Sistema de Informação de Mortalidade (SIM).
      </p>
      <div className="text-center py-8">
        <Skull className="w-10 h-10 mx-auto text-gray-600 mb-3" />
        <p className="text-gray-400">Nenhuma declaração de óbito registrada.</p>
        <Button className="bg-gray-700 hover:bg-gray-600 text-white mt-4">
          <Plus className="w-4 h-4 mr-2" /> Nova Declaração de Óbito
        </Button>
      </div>
    </div>
  );
}

// ─── SINASC Tab ─────────────────────────────────────────────────────────────

function SinascTab() {
  return (
    <div className="space-y-4">
      <p className="text-gray-400 text-sm">
        Emita Declarações de Nascido Vivo (DNV) digitais com dados do parto e envie ao SINASC.
      </p>
      <div className="text-center py-8">
        <Baby className="w-10 h-10 mx-auto text-pink-500 mb-3" />
        <p className="text-gray-400">Nenhuma DNV registrada.</p>
        <Button className="bg-pink-600 hover:bg-pink-700 text-white mt-4">
          <Plus className="w-4 h-4 mr-2" /> Nova Certidão de Nascimento
        </Button>
      </div>
    </div>
  );
}

// ─── NOTIVISA Tab ───────────────────────────────────────────────────────────

function NotivisaTab() {
  return (
    <div className="space-y-4">
      <p className="text-gray-400 text-sm">
        Notifique reações adversas a medicamentos, eventos de tecnovigilância e queixas de qualidade à ANVISA.
      </p>
      <div className="text-center py-8">
        <Pill className="w-10 h-10 mx-auto text-orange-500 mb-3" />
        <p className="text-gray-400">Nenhuma notificação NOTIVISA registrada.</p>
        <Button className="bg-orange-600 hover:bg-orange-700 text-white mt-4">
          <Plus className="w-4 h-4 mr-2" /> Nova Notificação Farmacovigilância
        </Button>
      </div>
    </div>
  );
}

// ─── Memed Tab ──────────────────────────────────────────────────────────────

function MemedTab() {
  const [prescriptionId, setPrescriptionId] = useState('');
  const sendPrescription = useSendDigitalPrescription();

  async function handleSend() {
    if (!prescriptionId.trim()) {
      toast.error('Informe o ID da prescrição.');
      return;
    }
    try {
      await sendPrescription.mutateAsync({ prescriptionId, channel: 'memed' });
      toast.success('Receita enviada pela Memed com sucesso.');
      setPrescriptionId('');
    } catch {
      toast.error('Erro ao enviar receita digital.');
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-gray-400 text-sm">
        Envie receitas digitais assinadas eletronicamente via plataforma Memed.
      </p>
      <div className="flex gap-3 max-w-lg">
        <div className="flex-1">
          <Label className="text-gray-300">ID da Prescrição</Label>
          <Input
            className="bg-gray-800 border-gray-700 text-white mt-1"
            value={prescriptionId}
            onChange={(e) => setPrescriptionId(e.target.value)}
            placeholder="UUID da prescrição"
          />
        </div>
        <div className="flex items-end">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleSend} disabled={sendPrescription.isPending}>
            <FileText className="h-4 w-4 mr-2" />
            {sendPrescription.isPending ? 'Enviando…' : 'Enviar Receita'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── WhatsApp Tab ───────────────────────────────────────────────────────────

function WhatsAppTab() {
  const sendWa = useSendWhatsApp();
  const [form, setForm] = useState({ patientId: '', templateName: 'appointment_reminder', message: '' });

  async function handleSend() {
    if (!form.patientId.trim()) {
      toast.error('Informe o ID do paciente.');
      return;
    }
    try {
      await sendWa.mutateAsync({
        patientId: form.patientId,
        templateName: form.templateName,
        templateParams: { message: form.message },
      });
      toast.success('Mensagem WhatsApp enviada com sucesso.');
      setForm({ patientId: '', templateName: 'appointment_reminder', message: '' });
    } catch {
      toast.error('Erro ao enviar mensagem WhatsApp.');
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-gray-400 text-sm">
        Envie lembretes de consulta, resultados de exames e mensagens personalizadas via WhatsApp Business API.
      </p>
      <div className="max-w-lg space-y-3">
        <div>
          <Label className="text-gray-300">ID do Paciente</Label>
          <Input
            className="bg-gray-800 border-gray-700 text-white mt-1"
            value={form.patientId}
            onChange={(e) => setForm((f) => ({ ...f, patientId: e.target.value }))}
            placeholder="UUID do paciente"
          />
        </div>
        <div>
          <Label className="text-gray-300">Template</Label>
          <Input
            className="bg-gray-800 border-gray-700 text-white mt-1"
            value={form.templateName}
            onChange={(e) => setForm((f) => ({ ...f, templateName: e.target.value }))}
            placeholder="appointment_reminder"
          />
        </div>
        <div>
          <Label className="text-gray-300">Mensagem Personalizada</Label>
          <Input
            className="bg-gray-800 border-gray-700 text-white mt-1"
            value={form.message}
            onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
            placeholder="Texto opcional"
          />
        </div>
        <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleSend} disabled={sendWa.isPending}>
          <MessageCircle className="h-4 w-4 mr-2" />
          {sendWa.isPending ? 'Enviando…' : 'Enviar WhatsApp'}
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-3 mt-6">
        <Card className="border-gray-700 bg-gray-800">
          <CardContent className="pt-4 text-center">
            <p className="text-white font-medium">Lembrete de Consulta</p>
            <p className="text-xs text-gray-400 mt-1">24h antes do agendamento</p>
          </CardContent>
        </Card>
        <Card className="border-gray-700 bg-gray-800">
          <CardContent className="pt-4 text-center">
            <p className="text-white font-medium">Resultado Disponível</p>
            <p className="text-xs text-gray-400 mt-1">Notifica quando exame fica pronto</p>
          </CardContent>
        </Card>
        <Card className="border-gray-700 bg-gray-800">
          <CardContent className="pt-4 text-center">
            <p className="text-white font-medium">Chatbot Agendamento</p>
            <p className="text-xs text-gray-400 mt-1">Paciente agenda pelo WhatsApp</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

const SYSTEMS = [
  { key: 'sinan', name: 'SINAN', desc: 'Notificação Compulsória', icon: AlertCircle, color: 'text-red-500' },
  { key: 'cadsus', name: 'CADSUS', desc: 'Cadastro Nacional de Saúde', icon: UserCheck, color: 'text-blue-500' },
  { key: 'cnes', name: 'CNES', desc: 'Estabelecimentos de Saúde', icon: Building2, color: 'text-purple-500' },
  { key: 'esus', name: 'e-SUS', desc: 'Atenção Primária', icon: Heart, color: 'text-emerald-500' },
  { key: 'sim', name: 'SIM', desc: 'Declaração de Óbito', icon: Skull, color: 'text-zinc-400' },
  { key: 'sinasc', name: 'SINASC', desc: 'Nascidos Vivos', icon: Baby, color: 'text-pink-500' },
  { key: 'notivisa', name: 'NOTIVISA', desc: 'Farmacovigilância', icon: Pill, color: 'text-orange-500' },
  { key: 'memed', name: 'Memed', desc: 'Receita Digital', icon: FileText, color: 'text-cyan-500' },
  { key: 'whatsapp', name: 'WhatsApp', desc: 'Mensagens', icon: MessageCircle, color: 'text-green-500' },
] as const;

export default function InteropBrazilPage() {
  const [tab, setTab] = useState('sinan');

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-emerald-900/40 flex items-center justify-center">
          <RefreshCw className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Interoperabilidade Brasil</h1>
          <p className="text-sm text-gray-400">Integração com sistemas nacionais de saúde</p>
        </div>
      </div>

      {/* System cards */}
      <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-5">
        {SYSTEMS.map((sys) => (
          <Card
            key={sys.key}
            className={`border-gray-700 cursor-pointer transition-colors ${tab === sys.key ? 'bg-gray-800 border-emerald-700' : 'bg-gray-900 hover:bg-gray-800/50'}`}
            onClick={() => setTab(sys.key)}
          >
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <sys.icon className={`h-5 w-5 ${sys.color}`} />
                <div>
                  <p className="text-sm font-bold text-white">{sys.name}</p>
                  <p className="text-xs text-gray-400">{sys.desc}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tab content */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-gray-800 border border-gray-700 flex-wrap h-auto">
          <TabsTrigger value="sinan" className="data-[state=active]:bg-gray-700 text-gray-300">SINAN</TabsTrigger>
          <TabsTrigger value="cadsus" className="data-[state=active]:bg-gray-700 text-gray-300">CADSUS</TabsTrigger>
          <TabsTrigger value="cnes" className="data-[state=active]:bg-gray-700 text-gray-300">CNES</TabsTrigger>
          <TabsTrigger value="esus" className="data-[state=active]:bg-gray-700 text-gray-300">e-SUS</TabsTrigger>
          <TabsTrigger value="sim" className="data-[state=active]:bg-gray-700 text-gray-300">SIM</TabsTrigger>
          <TabsTrigger value="sinasc" className="data-[state=active]:bg-gray-700 text-gray-300">SINASC</TabsTrigger>
          <TabsTrigger value="notivisa" className="data-[state=active]:bg-gray-700 text-gray-300">NOTIVISA</TabsTrigger>
          <TabsTrigger value="memed" className="data-[state=active]:bg-gray-700 text-gray-300">Memed</TabsTrigger>
          <TabsTrigger value="whatsapp" className="data-[state=active]:bg-gray-700 text-gray-300">WhatsApp</TabsTrigger>
        </TabsList>

        <TabsContent value="sinan">
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" /> SINAN — Notificações Compulsórias
              </CardTitle>
            </CardHeader>
            <CardContent><SinanTab /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cadsus">
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-blue-500" /> CADSUS — Busca de CNS por CPF
              </CardTitle>
            </CardHeader>
            <CardContent><CadsusTab /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cnes">
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-purple-500" /> CNES — Validação de Estabelecimento
              </CardTitle>
            </CardHeader>
            <CardContent><CnesTab /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="esus">
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Heart className="w-5 h-5 text-emerald-500" /> e-SUS — Exportação de Atendimentos
              </CardTitle>
            </CardHeader>
            <CardContent><EsusTab /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sim">
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Skull className="w-5 h-5 text-zinc-400" /> SIM — Declarações de Óbito
              </CardTitle>
            </CardHeader>
            <CardContent><SimTab /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sinasc">
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Baby className="w-5 h-5 text-pink-500" /> SINASC — Certidões de Nascimento
              </CardTitle>
            </CardHeader>
            <CardContent><SinascTab /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notivisa">
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Pill className="w-5 h-5 text-orange-500" /> NOTIVISA — Farmacovigilância
              </CardTitle>
            </CardHeader>
            <CardContent><NotivisaTab /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="memed">
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-cyan-500" /> Memed — Receita Digital
              </CardTitle>
            </CardHeader>
            <CardContent><MemedTab /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="whatsapp">
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-green-500" /> WhatsApp — Mensagens
              </CardTitle>
            </CardHeader>
            <CardContent><WhatsAppTab /></CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
