import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  FileSignature,
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  History,
  Lock,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  usePendingDocuments,
  useSignatureHistory,
  useSignDocument,
  useVerifySignature,
  type PendingDocument,
  type VerificationResult,
} from '@/services/digital-signature.service';

// ─── Constants ──────────────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  LOW: { label: 'Baixa', color: 'text-blue-400' },
  MEDIUM: { label: 'Média', color: 'text-yellow-400' },
  HIGH: { label: 'Alta', color: 'text-orange-400' },
  URGENT: { label: 'Urgente', color: 'text-red-400' },
};

const CERTIFICATE_LABELS: Record<string, string> = {
  ICP_BRASIL_A1: 'ICP-Brasil A1 (Software/.pfx)',
  ICP_BRASIL_A3: 'ICP-Brasil A3 (Token/Smart Card)',
  CLOUD_CERTIFICATE: 'Certificado em Nuvem',
};

const SIGNATURE_STANDARDS = [
  { value: 'CADES_BES', label: 'CAdES-BES (Assinatura Básica)' },
  { value: 'CADES_T', label: 'CAdES-T (Com Carimbo de Tempo)' },
  { value: 'PADES_B', label: 'PAdES-B (PDF Básico)' },
  { value: 'XADES_BES', label: 'XAdES-BES (XML Básico)' },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─── Sign Dialog ────────────────────────────────────────────────────────────

function SignDialog({
  document,
  open,
  onOpenChange,
}: {
  document: PendingDocument | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const signDocument = useSignDocument();
  const [certFile, setCertFile] = useState<File | null>(null);
  const [certPassword, setCertPassword] = useState('');
  const [sigStandard, setSigStandard] = useState('CADES_BES');

  const handleSign = useCallback(async () => {
    if (!document || !certFile) {
      toast.warning('Selecione o certificado digital');
      return;
    }
    if (!certPassword.trim()) {
      toast.warning('Informe a senha do certificado');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1] ?? '';
      signDocument.mutate(
        {
          documentId: document.id,
          certificateBase64: base64,
          certificatePassword: certPassword,
          signatureStandard: sigStandard,
        },
        {
          onSuccess: () => {
            toast.success('Documento assinado com sucesso');
            onOpenChange(false);
            setCertFile(null);
            setCertPassword('');
          },
          onError: () => toast.error('Erro ao assinar documento'),
        },
      );
    };
    reader.readAsDataURL(certFile);
  }, [document, certFile, certPassword, sigStandard, signDocument, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5 text-emerald-400" />
            Assinar Documento
          </DialogTitle>
        </DialogHeader>
        {document && (
          <div className="space-y-4 pt-2">
            <div className="p-3 rounded-md bg-muted/50 space-y-1">
              <p className="text-sm font-medium">{document.documentTitle}</p>
              <p className="text-xs text-muted-foreground">
                Tipo: {document.documentType} | Paciente: {document.patientName}
              </p>
              <p className="text-xs text-muted-foreground">
                Solicitado por: {document.requestedBy} em {formatDateTime(document.requestedAt)}
              </p>
            </div>

            <div className="space-y-1">
              <Label>Certificado Digital (.pfx / .p12)</Label>
              <Input
                type="file"
                accept=".pfx,.p12"
                onChange={(e) => setCertFile(e.target.files?.[0] ?? null)}
              />
            </div>

            <div className="space-y-1">
              <Label>Senha do Certificado</Label>
              <Input
                type="password"
                value={certPassword}
                onChange={(e) => setCertPassword(e.target.value)}
                placeholder="Digite a senha..."
              />
            </div>

            <div className="space-y-1">
              <Label>Padrão de Assinatura</Label>
              <Select value={sigStandard} onValueChange={setSigStandard}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SIGNATURE_STANDARDS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 p-3 rounded-md bg-yellow-500/10 border border-yellow-500/30 text-sm text-yellow-300">
              <Lock className="h-4 w-4 shrink-0" />
              A senha do certificado é usada apenas para esta operação e não é armazenada.
            </div>

            <Button
              className="w-full"
              onClick={handleSign}
              disabled={signDocument.isPending || !certFile}
            >
              <ShieldCheck className="h-4 w-4 mr-1" />
              {signDocument.isPending ? 'Assinando...' : 'Assinar com Certificado ICP-Brasil'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Verification Dialog ────────────────────────────────────────────────────

function VerificationDialog({
  result,
  open,
  onOpenChange,
}: {
  result: VerificationResult | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Resultado da Verificação
          </DialogTitle>
        </DialogHeader>
        {result && (
          <div className="space-y-4 pt-2">
            <div className={`flex items-center gap-3 p-4 rounded-md border ${
              result.valid
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-red-500/10 border-red-500/30 text-red-300'
            }`}>
              {result.valid ? (
                <CheckCircle2 className="h-6 w-6 shrink-0" />
              ) : (
                <XCircle className="h-6 w-6 shrink-0" />
              )}
              <div>
                <p className="font-semibold">
                  {result.valid ? 'Assinatura Válida' : 'Assinatura Inválida'}
                </p>
                <p className="text-sm opacity-80">
                  Assinante: {result.signerName}
                </p>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Emissor</span>
                <span>{result.certificateIssuer}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Data da Assinatura</span>
                <span>{formatDateTime(result.signedAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Validade do Certificado</span>
                <span>{formatDateTime(result.certificateExpiry)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cadeia de Confiança</span>
                <Badge variant={result.chainValid ? 'default' : 'destructive'}>
                  {result.chainValid ? 'Válida' : 'Inválida'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Carimbo de Tempo</span>
                <Badge variant={result.timestampValid ? 'default' : 'secondary'}>
                  {result.timestampValid ? 'Válido' : 'Ausente'}
                </Badge>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-destructive">Erros encontrados:</p>
                {result.errors.map((err, idx) => (
                  <p key={idx} className="text-xs text-destructive/80 ml-3">
                    {err}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Pending Tab ────────────────────────────────────────────────────────────

function PendingTab() {
  const { data: pendingData, isLoading } = usePendingDocuments();
  const [signDoc, setSignDoc] = useState<PendingDocument | null>(null);
  const [signOpen, setSignOpen] = useState(false);

  const handleSignClick = useCallback((doc: PendingDocument) => {
    setSignDoc(doc);
    setSignOpen(true);
  }, []);

  const documents = pendingData?.data ?? [];

  return (
    <div className="space-y-4">
      <SignDialog document={signDoc} open={signOpen} onOpenChange={setSignOpen} />

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando documentos...</div>
      ) : documents.length === 0 ? (
        <div className="flex flex-col items-center py-16 gap-2 text-muted-foreground">
          <CheckCircle2 className="h-10 w-10 text-emerald-400" />
          <p>Nenhum documento pendente de assinatura</p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Documento</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Paciente</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Solicitado em</TableHead>
                <TableHead>Expira em</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => {
                const priority = PRIORITY_CONFIG[doc.priority] ?? { label: doc.priority, color: 'text-gray-400' };
                return (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium text-sm max-w-xs truncate">
                      {doc.documentTitle}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{doc.documentType}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{doc.patientName}</TableCell>
                    <TableCell>
                      <span className={`text-sm font-medium ${priority.color}`}>
                        {priority.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateTime(doc.requestedAt)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateTime(doc.expiresAt)}
                    </TableCell>
                    <TableCell>
                      <Button size="sm" onClick={() => handleSignClick(doc)}>
                        <FileSignature className="h-3 w-3 mr-1" />
                        Assinar
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ─── History Tab ────────────────────────────────────────────────────────────

function HistoryTab() {
  const [page, setPage] = useState(1);
  const { data: historyData, isLoading } = useSignatureHistory(page);
  const verifySignature = useVerifySignature();
  const [verifyResult, setVerifyResult] = useState<VerificationResult | null>(null);
  const [verifyOpen, setVerifyOpen] = useState(false);

  const handleVerify = useCallback((signatureId: string) => {
    verifySignature.mutate(signatureId, {
      onSuccess: (result) => {
        setVerifyResult(result);
        setVerifyOpen(true);
      },
      onError: () => toast.error('Erro ao verificar assinatura'),
    });
  }, [verifySignature]);

  const records = historyData?.data ?? [];
  const totalPages = historyData?.totalPages ?? 1;

  return (
    <div className="space-y-4">
      <VerificationDialog result={verifyResult} open={verifyOpen} onOpenChange={setVerifyOpen} />

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando histórico...</div>
      ) : records.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Nenhuma assinatura no histórico</div>
      ) : (
        <>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Documento</TableHead>
                  <TableHead>Assinante</TableHead>
                  <TableHead>Certificado</TableHead>
                  <TableHead>Emissor</TableHead>
                  <TableHead>Padrão</TableHead>
                  <TableHead>Assinado em</TableHead>
                  <TableHead>Verificado</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((rec) => (
                  <TableRow key={rec.id}>
                    <TableCell className="font-medium text-sm max-w-[200px] truncate">
                      {rec.documentTitle}
                    </TableCell>
                    <TableCell className="text-sm">{rec.signerName}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {CERTIFICATE_LABELS[rec.certificateType] ?? rec.certificateType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">
                      {rec.certificateIssuer}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {rec.signatureStandard}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateTime(rec.signedAt)}
                    </TableCell>
                    <TableCell>
                      {rec.verified ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <Clock className="h-4 w-4 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleVerify(rec.id)}
                        disabled={verifySignature.isPending}
                      >
                        <ShieldCheck className="h-3 w-3 mr-1" />
                        Verificar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground">
                Página {page} de {totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Próxima
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Main ───────────────────────────────────────────────────────────────────

export default function DigitalSignaturePage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <FileSignature className="h-7 w-7 text-emerald-400" />
        <div>
          <h1 className="text-2xl font-bold">Assinatura Digital ICP-Brasil</h1>
          <p className="text-sm text-muted-foreground">
            Assinatura, verificação e histórico de documentos com certificado digital
          </p>
        </div>
      </div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Pendentes
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <PendingTab />
        </TabsContent>
        <TabsContent value="history">
          <HistoryTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
