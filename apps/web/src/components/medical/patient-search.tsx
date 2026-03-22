'use client';

import * as React from 'react';
import { Search, Mic } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command';

interface PatientSearchResult {
  id: string;
  name: string;
  mrn: string;
  cpf?: string;
  age?: number;
  avatarUrl?: string;
}

interface PatientSearchProps {
  onSelect: (patient: { id: string; name: string; mrn: string }) => void;
  className?: string;
}

// Mock data for search demonstration
const mockPatients: PatientSearchResult[] = [
  { id: '1', name: 'Maria Silva Santos', mrn: 'MRN-001234', cpf: '123.456.789-00', age: 45 },
  { id: '2', name: 'João Pedro Oliveira', mrn: 'MRN-001235', cpf: '987.654.321-00', age: 67 },
  { id: '3', name: 'Ana Beatriz Costa', mrn: 'MRN-001236', cpf: '456.789.123-00', age: 32 },
  { id: '4', name: 'Carlos Eduardo Lima', mrn: 'MRN-001237', cpf: '321.654.987-00', age: 58 },
  { id: '5', name: 'Francisca Souza Pereira', mrn: 'MRN-001238', cpf: '654.321.789-00', age: 73 },
];

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('');
}

export function PatientSearch({ onSelect, className }: PatientSearchProps) {
  const [open, setOpen] = React.useState(false);

  // Keyboard shortcut: Ctrl+K / Cmd+K
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  function handleSelect(patient: PatientSearchResult) {
    onSelect({ id: patient.id, name: patient.name, mrn: patient.mrn });
    setOpen(false);
  }

  return (
    <>
      {/* Search trigger button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'flex h-9 w-full max-w-sm items-center gap-2 rounded-md border border-input bg-background px-3 text-sm text-muted-foreground transition-colors hover:bg-accent cursor-pointer',
          className,
        )}
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Buscar paciente...</span>
        <kbd className="hidden rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground sm:inline-block">
          Ctrl+K
        </kbd>
      </button>

      {/* Command dialog */}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <div className="flex items-center border-b border-border">
          <div className="flex flex-1 items-center">
            <CommandInput placeholder="Buscar por nome, CPF ou prontuário..." />
          </div>
          <button
            type="button"
            className="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 transition-colors hover:bg-teal-500/20 cursor-pointer"
            aria-label="Busca por voz"
          >
            <Mic className="h-4 w-4" />
          </button>
        </div>
        <CommandList>
          <CommandEmpty>Nenhum paciente encontrado.</CommandEmpty>
          <CommandGroup heading="Pacientes">
            {mockPatients.map((patient) => (
              <CommandItem
                key={patient.id}
                value={`${patient.name} ${patient.mrn} ${patient.cpf ?? ''}`}
                onSelect={() => handleSelect(patient)}
                className="flex items-center gap-3 px-3 py-2.5"
              >
                {/* Avatar */}
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                  {patient.avatarUrl ? (
                    <img
                      src={patient.avatarUrl}
                      alt=""
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    getInitials(patient.name)
                  )}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {patient.name}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="px-1.5 py-0 text-[10px]"
                    >
                      {patient.mrn}
                    </Badge>
                    {patient.age != null && (
                      <span className="text-[10px] text-muted-foreground">
                        {patient.age} anos
                      </span>
                    )}
                  </div>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
