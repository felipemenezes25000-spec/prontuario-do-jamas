import { useState, useMemo, useCallback } from 'react';
import {
  Archive,
  Search,
  FileText,
  Clock,
  AlertTriangle,
  CheckCircle,
  BookOpen,
  ScanLine,
  ArrowLeftRight,
  MapPin,
  CalendarClock,
  Plus,
  Eye,
  Undo2,
  FileDigit,
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

// ============================================================================
// Types
// ============================================================================

type LoanStatus = 'REQUESTED' | 'LOANED' | 'RETURNED' | 'OVERDUE';
type RecordPurpose = 'CLINICAL_CARE' | 'AUDIT' | 'RESEARCH' | 'LEGAL' | 'PATIENT_REQUEST';
type RetentionStatus = 'OK' | 'APPROACHING' | 'EXPIRED';

interface LoanRecord {
  id: string;
  patientId: string;
  title: string;
  status: LoanStatus;
  checkedOutBy: string | null;
  checkedOutAt: string | null;
  currentDepartment: string | null;
  purpose: RecordPurpose | null;
  urgency: string | null;
  digitized: boolean;
  isOverdue: boolean;
  overdueHours: number;
  createdAt: string;
  author: { id: string; name: string } | null;
}

interface RetentionRecord {
  recordId: string;
  patientId: string;
  createdAt: string;
  ageYears: number;
  retentionLimitYears: number;
  retentionStatus: RetentionStatus;
  digitized: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const STATUS_CONFIG: Record<LoanStatus, { label: string; badgeClass: string }> = {
  REQUESTED: { label: 'Solicitado', badgeClass: 'bg-blue-600 text-white' },
  LOANED: { label: 'Emprestado', badgeClass: 'bg-yellow-600 text-white' },
  RETURNED: { label: 'Devolvido', badgeClass: 'bg-green-600 text-white' },
  OVERDUE: { label: 'Atrasado', badgeClass: 'bg-red-600 text-white' },
};

const PURPOSE_LABELS: Record<RecordPurpose, string> = {
  CLINICAL_CARE: 'Assistencia Clinica',
  AUDIT: 'Auditoria',
  RESEARCH: 'Pesquisa',
  LEGAL: 'Juridico',
  PATIENT_REQUEST: 'Solicitacao do Paciente',
};

const RETENTION_CONFIG: Record<RetentionStatus, { label: string; badgeClass: string }> = {
  OK: { label: 'Dentro do prazo', badgeClass: 'bg-green-600 text-white' },
  APPROACHING: { label: 'Proximo do limite', badgeClass: 'bg-yellow-600 text-white' },
  EXPIRED: { label: 'Prazo expirado', badgeClass: 'bg-red-600 text-white' },
};

// ============================================================================
// Mock Data
// ============================================================================

const MOCK_LOANS: LoanRecord[] = [
  {
    id: '1', patientId: 'p1', title: '[MEDICAL_RECORD:LOAN] Maria Silva',
    status: 'LOANED', checkedOutBy: 'Dr. Carlos', checkedOutAt: '2026-03-24T10:00:00Z',
    currentDepartment: 'Cardiologia', purpose: 'CLINICAL_CARE', urgency: 'ROUTINE',
    digitized: false, isOverdue: false, overdueHours: 0,
    createdAt: '2026-03-24T09:00:00Z', author: { id: 'u1', name: 'Recepcionista Ana' },
  },
  {
    id: '2', patientId: 'p2', title: '[MEDICAL_RECORD:LOAN] Joao Santos',
    status: 'OVERDUE', checkedOutBy: 'Dra. Fernanda', checkedOutAt: '2026-03-22T08:00:00Z',
    currentDepartment: 'Auditoria', purpose: 'AUDIT', urgency: 'ROUTINE',
    digitized: true, isOverdue: true, overdueHours: 62,
    createdAt: '2026-03-22T07:00:00Z', author: { id: 'u2', name: 'Arquivista Pedro' },
  },
  {
    id: '3', patientId: 'p3', title: '[MEDICAL_RECORD:LOAN] Ana Oliveira',
    status: 'REQUESTED', checkedOutBy: null, checkedOutAt: null,
    currentDepartment: null, purpose: 'LEGAL', urgency: 'URGENT',
    digitized: false, isOverdue: false, overdueHours: 0,
    createdAt: '2026-03-25T08:00:00Z', author: { id: 'u3', name: 'Juridico' },
  },
];

const MOCK_RETENTION: RetentionRecord[] = [
  { recordId: 'r1', patientId: 'p10', createdAt: '2007-03-01', ageYears: 19.1, retentionLimitYears: 20, retentionStatus: 'APPROACHING', digitized: true },
  { recordId: 'r2', patientId: 'p11', createdAt: '2005-06-15', ageYears: 20.8, retentionLimitYears: 20, retentionStatus: 'EXPIRED', digitized: false },
  { recordId: 'r3', patientId: 'p12', createdAt: '2020-01-10', ageYears: 6.2, retentionLimitYears: 20, retentionStatus: 'OK', digitized: false },
];

// ============================================================================
// Component
// ============================================================================

export default function MedicalRecordsPage() {
  const [activeTab, setActiveTab] = useState('loans');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<LoanRecord | null>(null);

  // Form state
  const [formPatientId, setFormPatientId] = useState('');
  const [formRequestedBy, setFormRequestedBy] = useState('');
  const [formPurpose, setFormPurpose] = useState<RecordPurpose>('CLINICAL_CARE');
  const [formUrgency, setFormUrgency] = useState<'ROUTINE' | 'URGENT'>('ROUTINE');

  const filteredLoans = useMemo(() => {
    return MOCK_LOANS.filter((loan) => {
      const matchesSearch = loan.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        loan.checkedOutBy?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        loan.currentDepartment?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || loan.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [searchTerm, statusFilter]);

  const stats = useMemo(() => {
    const loaned = MOCK_LOANS.filter((l) => l.status === 'LOANED').length;
    const overdue = MOCK_LOANS.filter((l) => l.status === 'OVERDUE').length;
    const requested = MOCK_LOANS.filter((l) => l.status === 'REQUESTED').length;
    const digitized = MOCK_LOANS.filter((l) => l.digitized).length;
    return { loaned, overdue, requested, digitized };
  }, []);

  const handleViewDetail = useCallback((record: LoanRecord) => {
    setSelectedRecord(record);
    setShowDetailDialog(true);
  }, []);

  const extractName = (title: string) => title.replace('[MEDICAL_RECORD:LOAN] ', '');

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">
            <Archive className="mr-2 inline-block h-7 w-7 text-emerald-400" />
            SAME - Servico de Arquivo Medico
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Controle de prontuarios fisicos, emprestimos e digitalizacao
          </p>
        </div>
        <Button
          onClick={() => setShowRequestDialog(true)}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          <Plus className="mr-2 h-4 w-4" />
          Solicitar Prontuario
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-zinc-800 bg-zinc-900">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-yellow-500/10 p-3">
              <ArrowLeftRight className="h-6 w-6 text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-400">Emprestados</p>
              <p className="text-2xl font-bold text-zinc-100">{stats.loaned}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-red-500/10 p-3">
              <AlertTriangle className="h-6 w-6 text-red-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-400">Atrasados (&gt;48h)</p>
              <p className="text-2xl font-bold text-red-400">{stats.overdue}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-blue-500/10 p-3">
              <Clock className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-400">Pendentes</p>
              <p className="text-2xl font-bold text-zinc-100">{stats.requested}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-emerald-500/10 p-3">
              <ScanLine className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-400">Digitalizados</p>
              <p className="text-2xl font-bold text-zinc-100">{stats.digitized}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="border-zinc-800 bg-zinc-900">
          <TabsTrigger value="loans">
            <BookOpen className="mr-2 h-4 w-4" />
            Emprestimos Ativos
          </TabsTrigger>
          <TabsTrigger value="retention">
            <CalendarClock className="mr-2 h-4 w-4" />
            Temporalidade CFM
          </TabsTrigger>
        </TabsList>

        {/* Loans Tab */}
        <TabsContent value="loans" className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <Input
                placeholder="Buscar por paciente, responsavel ou setor..."
                className="border-zinc-700 bg-zinc-900 pl-10 text-zinc-100"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48 border-zinc-700 bg-zinc-900 text-zinc-100">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="border-zinc-700 bg-zinc-900">
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="REQUESTED">Solicitado</SelectItem>
                <SelectItem value="LOANED">Emprestado</SelectItem>
                <SelectItem value="OVERDUE">Atrasado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card className="border-zinc-800 bg-zinc-900">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800 hover:bg-zinc-800/50">
                  <TableHead className="text-zinc-400">Paciente</TableHead>
                  <TableHead className="text-zinc-400">Status</TableHead>
                  <TableHead className="text-zinc-400">Responsavel</TableHead>
                  <TableHead className="text-zinc-400">Setor</TableHead>
                  <TableHead className="text-zinc-400">Finalidade</TableHead>
                  <TableHead className="text-zinc-400">Digital</TableHead>
                  <TableHead className="text-zinc-400">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLoans.map((loan) => (
                  <TableRow key={loan.id} className="border-zinc-800 hover:bg-zinc-800/50">
                    <TableCell className="font-medium text-zinc-100">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-zinc-500" />
                        {extractName(loan.title)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn('text-xs', STATUS_CONFIG[loan.status].badgeClass)}>
                        {STATUS_CONFIG[loan.status].label}
                        {loan.isOverdue && ` (${loan.overdueHours}h)`}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-zinc-300">{loan.checkedOutBy ?? '-'}</TableCell>
                    <TableCell className="text-zinc-300">{loan.currentDepartment ?? '-'}</TableCell>
                    <TableCell className="text-zinc-300">
                      {loan.purpose ? PURPOSE_LABELS[loan.purpose] : '-'}
                    </TableCell>
                    <TableCell>
                      {loan.digitized ? (
                        <CheckCircle className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <span className="text-zinc-500">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-zinc-400 hover:text-zinc-100"
                          onClick={() => handleViewDetail(loan)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {loan.status === 'LOANED' || loan.status === 'OVERDUE' ? (
                          <Button size="sm" variant="ghost" className="text-emerald-400 hover:text-emerald-300">
                            <Undo2 className="h-4 w-4" />
                          </Button>
                        ) : null}
                        {!loan.digitized && (
                          <Button size="sm" variant="ghost" className="text-blue-400 hover:text-blue-300">
                            <FileDigit className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredLoans.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-zinc-500">
                      Nenhum registro encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Retention Tab */}
        <TabsContent value="retention" className="space-y-4">
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader>
              <CardTitle className="text-zinc-100">
                Controle de Temporalidade - CFM (20 anos)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800 hover:bg-zinc-800/50">
                    <TableHead className="text-zinc-400">ID Registro</TableHead>
                    <TableHead className="text-zinc-400">Paciente ID</TableHead>
                    <TableHead className="text-zinc-400">Data Criacao</TableHead>
                    <TableHead className="text-zinc-400">Idade (anos)</TableHead>
                    <TableHead className="text-zinc-400">Status Retencao</TableHead>
                    <TableHead className="text-zinc-400">Digitalizado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_RETENTION.map((record) => (
                    <TableRow key={record.recordId} className="border-zinc-800 hover:bg-zinc-800/50">
                      <TableCell className="font-mono text-sm text-zinc-300">{record.recordId}</TableCell>
                      <TableCell className="text-zinc-300">{record.patientId}</TableCell>
                      <TableCell className="text-zinc-300">
                        {new Date(record.createdAt).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-zinc-300">{record.ageYears}</TableCell>
                      <TableCell>
                        <Badge className={cn('text-xs', RETENTION_CONFIG[record.retentionStatus].badgeClass)}>
                          {RETENTION_CONFIG[record.retentionStatus].label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {record.digitized ? (
                          <CheckCircle className="h-4 w-4 text-emerald-400" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-yellow-400" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Request Dialog */}
      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent className="border-zinc-700 bg-zinc-900 text-zinc-100 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Solicitar Prontuario Fisico</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-zinc-300">ID do Paciente</Label>
              <Input
                className="mt-1 border-zinc-700 bg-zinc-800 text-zinc-100"
                placeholder="UUID do paciente"
                value={formPatientId}
                onChange={(e) => setFormPatientId(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-zinc-300">Solicitante</Label>
              <Input
                className="mt-1 border-zinc-700 bg-zinc-800 text-zinc-100"
                placeholder="Nome do solicitante"
                value={formRequestedBy}
                onChange={(e) => setFormRequestedBy(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-zinc-300">Finalidade</Label>
              <Select value={formPurpose} onValueChange={(v) => setFormPurpose(v as RecordPurpose)}>
                <SelectTrigger className="mt-1 border-zinc-700 bg-zinc-800 text-zinc-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-zinc-700 bg-zinc-900">
                  {Object.entries(PURPOSE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-zinc-300">Urgencia</Label>
              <Select value={formUrgency} onValueChange={(v) => setFormUrgency(v as 'ROUTINE' | 'URGENT')}>
                <SelectTrigger className="mt-1 border-zinc-700 bg-zinc-800 text-zinc-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-zinc-700 bg-zinc-900">
                  <SelectItem value="ROUTINE">Rotina</SelectItem>
                  <SelectItem value="URGENT">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setShowRequestDialog(false)}>
                Cancelar
              </Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                Solicitar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="border-zinc-700 bg-zinc-900 text-zinc-100 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              <MapPin className="mr-2 inline-block h-5 w-5 text-emerald-400" />
              Localizacao do Prontuario
            </DialogTitle>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-3">
              <div className="flex justify-between rounded-lg bg-zinc-800 p-3">
                <span className="text-zinc-400">Paciente</span>
                <span className="font-medium text-zinc-100">{extractName(selectedRecord.title)}</span>
              </div>
              <div className="flex justify-between rounded-lg bg-zinc-800 p-3">
                <span className="text-zinc-400">Status</span>
                <Badge className={cn('text-xs', STATUS_CONFIG[selectedRecord.status].badgeClass)}>
                  {STATUS_CONFIG[selectedRecord.status].label}
                </Badge>
              </div>
              <div className="flex justify-between rounded-lg bg-zinc-800 p-3">
                <span className="text-zinc-400">Setor Atual</span>
                <span className="text-zinc-100">{selectedRecord.currentDepartment ?? 'SAME'}</span>
              </div>
              <div className="flex justify-between rounded-lg bg-zinc-800 p-3">
                <span className="text-zinc-400">Responsavel</span>
                <span className="text-zinc-100">{selectedRecord.checkedOutBy ?? '-'}</span>
              </div>
              <div className="flex justify-between rounded-lg bg-zinc-800 p-3">
                <span className="text-zinc-400">Data Emprestimo</span>
                <span className="text-zinc-100">
                  {selectedRecord.checkedOutAt
                    ? new Date(selectedRecord.checkedOutAt).toLocaleString('pt-BR')
                    : '-'}
                </span>
              </div>
              <div className="flex justify-between rounded-lg bg-zinc-800 p-3">
                <span className="text-zinc-400">Digitalizado</span>
                <span className={selectedRecord.digitized ? 'text-emerald-400' : 'text-zinc-500'}>
                  {selectedRecord.digitized ? 'Sim' : 'Nao'}
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
