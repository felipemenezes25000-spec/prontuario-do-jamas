'use client';

import { cn } from '@/lib/utils';

interface SignatureBlockUser {
  name: string;
  crm?: string;
  crmState?: string;
  specialty?: string;
}

interface SignatureBlockProps {
  user: SignatureBlockUser;
  dateTime?: Date;
  className?: string;
  compact?: boolean;
}

/**
 * CFM-standard signature block for clinical notes and PDFs.
 *
 * Format:
 * ─────────────────────────────────
 * Dr(a). [Nome completo]
 * CRM [Número] - [UF]
 * [Especialidade]
 * Data: DD/MM/YYYY Hora: HH:mm
 * ─────────────────────────────────
 */
export function SignatureBlock({ user, dateTime, className, compact = false }: SignatureBlockProps) {
  const now = dateTime ?? new Date();
  const dateStr = now.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const separator = '─'.repeat(35);

  return (
    <div className={cn('font-mono text-xs leading-relaxed text-muted-foreground', className)}>
      <p className="text-muted-foreground/60">{separator}</p>
      <p className={cn('font-semibold text-foreground', compact && 'text-[11px]')}>
        Dr(a). {user.name}
      </p>
      {user.crm && (
        <p>CRM {user.crm}{user.crmState ? ` - ${user.crmState}` : ''}</p>
      )}
      {user.specialty && <p>{user.specialty}</p>}
      <p>Data: {dateStr} Hora: {timeStr}</p>
      <p className="text-muted-foreground/60">{separator}</p>
    </div>
  );
}

/**
 * Generate the signature block as a plain text string for storage.
 */
export function generateSignatureText(user: SignatureBlockUser, dateTime?: Date): string {
  const now = dateTime ?? new Date();
  const dateStr = now.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const separator = '─'.repeat(35);
  const lines = [
    separator,
    `Dr(a). ${user.name}`,
    ...(user.crm ? [`CRM ${user.crm}${user.crmState ? ` - ${user.crmState}` : ''}`] : []),
    ...(user.specialty ? [user.specialty] : []),
    `Data: ${dateStr} Hora: ${timeStr}`,
    separator,
  ];

  return lines.join('\n');
}
