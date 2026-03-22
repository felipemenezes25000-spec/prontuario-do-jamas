import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, X, AlertTriangle, Shield, Pill } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useDrugSearch, type Drug } from '@/services/drugs.service';

// ============================================================================
// Types
// ============================================================================

interface DrugSearchProps {
  onSelect: (drug: Drug) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  excludeIds?: string[];
}

// ============================================================================
// Component
// ============================================================================

export function DrugSearch({
  onSelect,
  placeholder = 'Buscar medicamento...',
  disabled = false,
  className,
  excludeIds = [],
}: DrugSearchProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useDrugSearch(query, { limit: 10 });

  const results = (data?.data ?? []).filter((d) => !excludeIds.includes(d.id));

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = useCallback(
    (drug: Drug) => {
      onSelect(drug);
      setQuery('');
      setIsOpen(false);
    },
    [onSelect],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            if (query.length >= 2) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="pl-10 pr-8 bg-card border-border"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Dropdown results */}
      {isOpen && query.length >= 2 && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-card shadow-xl max-h-[320px] overflow-y-auto">
          {isLoading ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              Buscando...
            </div>
          ) : results.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              Nenhum medicamento encontrado
            </div>
          ) : (
            results.map((drug) => (
              <button
                key={drug.id}
                type="button"
                onClick={() => handleSelect(drug)}
                className="w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors border-b border-border/50 last:border-b-0"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{drug.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {drug.activeIngredient} — {drug.therapeuticClass}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {drug.pharmaceuticalForm} | {drug.defaultRoute ?? 'N/A'} | {drug.defaultFrequency ?? 'N/A'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1 shrink-0">
                    {drug.isHighAlert && (
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                        <AlertTriangle className="mr-0.5 h-3 w-3" />
                        Alto Alerta
                      </Badge>
                    )}
                    {drug.isControlled && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-amber-500/20 text-amber-400">
                        <Shield className="mr-0.5 h-3 w-3" />
                        Controlado
                      </Badge>
                    )}
                    {drug.isAntimicrobial && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-blue-500/20 text-blue-400">
                        <Pill className="mr-0.5 h-3 w-3" />
                        Antimicrobiano
                      </Badge>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
