'use client';

import { useState, useCallback } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  FileSignature,
  Upload,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Lock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SignatureInfo {
  id: string;
  signerId: string;
  signerName: string;
  signerEmail: string;
  signatureType: string;
  certificateType: string;
  certificateSubject: string;
  certificateIssuer: string;
  certificateSerial: string;
  certificateNotBefore: string;
  certificateNotAfter: string;
  signatureHash: string;
  signatureStandard: string;
  signedAt: string;
  verified: boolean;
  verifiedAt: string | null;
  verificationChain: string | null;
  timestampToken: string | null;
}

interface DigitalSignaturePanelProps {
  /** ID of the document/note/prescription to sign */
  targetId: string;
  /** Type of target being signed */
  targetType: 'document' | 'clinical-note' | 'prescription';
  /** Existing signatures for the target */
  signatures: SignatureInfo[];
  /** Callback when a new signature is created */
  onSign?: (data: {
    certificateBase64: string;
    certificatePassword: string;
    signatureStandard: string;
  }) => Promise<void>;
  /** Callback to verify a signature */
  onVerify?: (signatureId: string) => Promise<void>;
  /** Whether the panel is in a loading state */
  loading?: boolean;
  className?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const signatureStandardLabels: Record<string, string> = {
  CADES_BES: 'CAdES-BES (Assinatura Eletronica Basica)',
  CADES_T: 'CAdES-T (Com carimbo de tempo)',
  PADES_B: 'PAdES-B (PDF basico)',
  XADES_BES: 'XAdES-BES (XML basico)',
};

const certificateTypeLabels: Record<string, string> = {
  ICP_BRASIL_A1: 'ICP-Brasil A1 (Software)',
  ICP_BRASIL_A3: 'ICP-Brasil A3 (Token/Smart Card)',
  CLOUD_CERTIFICATE: 'Certificado em Nuvem',
};

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function extractCN(subject: string): string {
  const match = subject.match(/CN=([^,]+)/);
  return match?.[1] ?? subject;
}

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

function SignatureCard({
  signature,
  onVerify,
}: {
  signature: SignatureInfo;
  onVerify?: (signatureId: string) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={cn(
        'rounded-lg border p-3 transition-colors',
        signature.verified
          ? 'border-teal-500/40 bg-teal-500/5'
          : 'border-amber-500/40 bg-amber-500/5',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          {signature.verified ? (
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-teal-600 dark:text-teal-400" />
          ) : (
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
          )}
          <div className="space-y-0.5">
            <p className="text-sm font-medium text-foreground">
              {extractCN(signature.certificateSubject)}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatDateTime(signature.signedAt)}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="rounded p-1 text-muted-foreground hover:bg-muted"
          aria-label={expanded ? 'Recolher detalhes' : 'Expandir detalhes'}
        >
          {expanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Summary badges */}
      <div className="mt-2 flex flex-wrap gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
          <Lock className="h-2.5 w-2.5" />
          {signatureStandardLabels[signature.signatureStandard] ??
            signature.signatureStandard}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
          <User className="h-2.5 w-2.5" />
          {certificateTypeLabels[signature.certificateType] ??
            signature.certificateType}
        </span>
        {signature.verified && (
          <span className="inline-flex items-center gap-1 rounded-full bg-teal-500/10 px-2 py-0.5 text-[10px] font-medium text-teal-600 dark:text-teal-400">
            <CheckCircle2 className="h-2.5 w-2.5" />
            Verificada
          </span>
        )}
        {signature.timestampToken && (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-400">
            <Clock className="h-2.5 w-2.5" />
            Carimbo de tempo
          </span>
        )}
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="mt-3 space-y-2 border-t border-border/50 pt-3">
          <DetailRow label="Assinante" value={extractCN(signature.certificateSubject)} />
          <DetailRow label="E-mail" value={signature.signerEmail} />
          <DetailRow label="Emissor" value={extractCN(signature.certificateIssuer)} />
          <DetailRow label="Serial" value={signature.certificateSerial} />
          <DetailRow
            label="Validade do certificado"
            value={`${formatDateTime(signature.certificateNotBefore)} - ${formatDateTime(signature.certificateNotAfter)}`}
          />
          <DetailRow label="Hash (SHA-256)" value={signature.signatureHash} mono />
          <DetailRow
            label="Padrao"
            value={
              signatureStandardLabels[signature.signatureStandard] ??
              signature.signatureStandard
            }
          />
          {signature.verifiedAt && (
            <DetailRow
              label="Verificada em"
              value={formatDateTime(signature.verifiedAt)}
            />
          )}
          {signature.verificationChain && (
            <div className="space-y-1">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Cadeia de certificacao
              </p>
              <ChainVisualization chain={signature.verificationChain} />
            </div>
          )}
          {onVerify && !signature.verified && (
            <Button
              size="sm"
              variant="outline"
              className="mt-2 h-7 gap-1 text-xs"
              onClick={() => onVerify(signature.id)}
            >
              <ShieldCheck className="h-3 w-3" />
              Verificar assinatura
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          'text-xs text-foreground',
          mono && 'break-all font-mono text-[11px]',
        )}
      >
        {value}
      </p>
    </div>
  );
}

function ChainVisualization({ chain }: { chain: string }) {
  try {
    const parsed = JSON.parse(chain) as Record<string, string>;
    const entries = Object.entries(parsed).filter(
      ([key]) => key !== 'verifiedAt',
    );
    return (
      <div className="space-y-1">
        {entries.map(([key, value], index) => (
          <div key={key} className="flex items-center gap-2">
            {index > 0 && (
              <span className="ml-2 text-xs text-muted-foreground">|</span>
            )}
            <span className="inline-block rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              {value}
            </span>
          </div>
        ))}
      </div>
    );
  } catch {
    return (
      <p className="break-all font-mono text-[10px] text-muted-foreground">
        {chain}
      </p>
    );
  }
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * DigitalSignaturePanel — ICP-Brasil digital signature UI
 *
 * Shows signature status, allows signing with PFX/P12 certificate upload,
 * and displays verification details. All text in Portuguese Brazilian.
 * Theme compatible with teal accent. Supports light/dark mode.
 *
 * Compliant with CFM Resolution 2.299/2021.
 */
export function DigitalSignaturePanel({
  targetId,
  targetType,
  signatures,
  onSign,
  onVerify,
  loading = false,
  className,
}: DigitalSignaturePanelProps) {
  const [showSignForm, setShowSignForm] = useState(false);
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [certificatePassword, setCertificatePassword] = useState('');
  const [signatureStandard, setSignatureStandard] = useState('CADES_BES');
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSigned = signatures.length > 0;

  const targetTypeLabels: Record<string, string> = {
    document: 'documento',
    'clinical-note': 'nota clinica',
    prescription: 'prescricao',
  };

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        setCertificateFile(file);
        setError(null);
      }
    },
    [],
  );

  const handleSign = useCallback(async () => {
    if (!certificateFile) {
      setError('Selecione o arquivo do certificado digital (.pfx ou .p12)');
      return;
    }

    if (!certificatePassword) {
      setError('Informe a senha do certificado');
      return;
    }

    if (!onSign) return;

    setSigning(true);
    setError(null);

    try {
      const buffer = await certificateFile.arrayBuffer();
      const base64 = btoa(
        String.fromCharCode(...new Uint8Array(buffer)),
      );

      await onSign({
        certificateBase64: base64,
        certificatePassword,
        signatureStandard,
      });

      // Reset form on success
      setCertificateFile(null);
      setCertificatePassword('');
      setShowSignForm(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Erro ao assinar o documento. Tente novamente.';
      setError(message);
    } finally {
      setSigning(false);
    }
  }, [certificateFile, certificatePassword, signatureStandard, onSign]);

  return (
    <Card
      className={cn('border border-border bg-card p-4', className)}
      data-testid={`digital-signature-panel-${targetId}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileSignature className="h-5 w-5 text-teal-600 dark:text-teal-400" />
          <h3 className="text-sm font-semibold text-foreground">
            Assinatura Digital
          </h3>
        </div>
        {isSigned ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-teal-500/10 px-2.5 py-1 text-xs font-medium text-teal-600 dark:text-teal-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Assinado ({signatures.length})
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-400">
            <XCircle className="h-3.5 w-3.5" />
            Pendente
          </span>
        )}
      </div>

      <p className="mt-1 text-xs text-muted-foreground">
        Conforme Resolucao CFM 2.299/2021 — Certificado ICP-Brasil obrigatorio
      </p>

      {/* Existing signatures */}
      {signatures.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Assinaturas ({signatures.length})
          </p>
          {signatures.map((sig) => (
            <SignatureCard
              key={sig.id}
              signature={sig}
              onVerify={onVerify}
            />
          ))}
        </div>
      )}

      {/* Sign button */}
      {onSign && !showSignForm && (
        <Button
          onClick={() => setShowSignForm(true)}
          disabled={loading}
          className="mt-4 w-full gap-2 bg-teal-600 text-white hover:bg-teal-700"
        >
          <FileSignature className="h-4 w-4" />
          Assinar {targetTypeLabels[targetType] ?? 'documento'}
        </Button>
      )}

      {/* Sign form */}
      {showSignForm && (
        <div className="mt-4 space-y-3 rounded-lg border border-border/50 bg-muted/30 p-3">
          <p className="text-xs font-medium text-foreground">
            Assinar {targetTypeLabels[targetType] ?? 'documento'} com certificado ICP-Brasil
          </p>

          {/* Certificate file upload */}
          <div className="space-y-1">
            <label
              htmlFor={`cert-file-${targetId}`}
              className="text-[11px] font-medium text-muted-foreground"
            >
              Certificado digital (.pfx / .p12)
            </label>
            <div className="flex items-center gap-2">
              <label
                htmlFor={`cert-file-${targetId}`}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground transition-colors hover:border-teal-500/50 hover:bg-teal-500/5',
                  certificateFile && 'border-teal-500/40 bg-teal-500/5 text-teal-600 dark:text-teal-400',
                )}
              >
                <Upload className="h-3.5 w-3.5" />
                {certificateFile
                  ? certificateFile.name
                  : 'Selecionar certificado'}
              </label>
              <input
                id={`cert-file-${targetId}`}
                type="file"
                accept=".pfx,.p12"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Certificate password */}
          <div className="space-y-1">
            <label
              htmlFor={`cert-pass-${targetId}`}
              className="text-[11px] font-medium text-muted-foreground"
            >
              Senha do certificado
            </label>
            <Input
              id={`cert-pass-${targetId}`}
              type="password"
              placeholder="Senha do certificado digital"
              value={certificatePassword}
              onChange={(e) => setCertificatePassword(e.target.value)}
              className="h-8 text-xs"
            />
          </div>

          {/* Signature standard selector */}
          <div className="space-y-1">
            <label
              htmlFor={`sig-standard-${targetId}`}
              className="text-[11px] font-medium text-muted-foreground"
            >
              Padrao de assinatura
            </label>
            <select
              id={`sig-standard-${targetId}`}
              value={signatureStandard}
              onChange={(e) => setSignatureStandard(e.target.value)}
              className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground"
            >
              <option value="CADES_BES">CAdES-BES (Basica)</option>
              <option value="CADES_T">CAdES-T (Com carimbo de tempo)</option>
              <option value="PADES_B">PAdES-B (PDF)</option>
              <option value="XADES_BES">XAdES-BES (XML)</option>
            </select>
          </div>

          {/* Error message */}
          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              onClick={handleSign}
              disabled={signing || loading}
              className="h-8 flex-1 gap-1.5 bg-teal-600 text-xs text-white hover:bg-teal-700"
            >
              {signing ? (
                <>
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Assinando...
                </>
              ) : (
                <>
                  <FileSignature className="h-3.5 w-3.5" />
                  Confirmar assinatura
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowSignForm(false);
                setError(null);
              }}
              disabled={signing}
              className="h-8 text-xs"
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
