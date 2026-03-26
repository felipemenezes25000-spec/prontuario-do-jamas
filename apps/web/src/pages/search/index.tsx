import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Users,
  Stethoscope,
  FileText,
  Pill,
  Loader2,
  Filter,
  ArrowRight,
  X,
  Mic,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  useGlobalSearch,
  type SearchCategory,
  type SearchResultItem,
} from '@/services/search.service';

// ─── helpers ───────────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<SearchCategory, { label: string; icon: typeof Users; className: string; route: string }> = {
  patients: {
    label: 'Pacientes',
    icon: Users,
    className: 'bg-blue-900/40 text-blue-300 border-blue-700',
    route: '/pacientes',
  },
  encounters: {
    label: 'Atendimentos',
    icon: Stethoscope,
    className: 'bg-emerald-900/40 text-emerald-300 border-emerald-700',
    route: '/atendimentos',
  },
  documents: {
    label: 'Documentos',
    icon: FileText,
    className: 'bg-purple-900/40 text-purple-300 border-purple-700',
    route: '/documentacao-clinica',
  },
  drugs: {
    label: 'Medicamentos',
    icon: Pill,
    className: 'bg-orange-900/40 text-orange-300 border-orange-700',
    route: '/medicamentos',
  },
};

const ALL_CATEGORIES: SearchCategory[] = ['patients', 'encounters', 'documents', 'drugs'];

// ─── Result Card ──────────────────────────────────────────────────────────

function ResultCard({ item }: { item: SearchResultItem }) {
  const navigate = useNavigate();
  const config = CATEGORY_CONFIG[item.type];
  const Icon = config.icon;

  return (
    <div
      className="flex items-start gap-3 p-3 rounded-lg bg-gray-800 border border-gray-700 hover:border-emerald-700 cursor-pointer transition-colors group"
      onClick={() => navigate(item.url)}
    >
      <div className={cn('p-2 rounded-lg border shrink-0', config.className)}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-white truncate">{item.title}</p>
          <Badge className={cn('border text-xs shrink-0', config.className)}>
            {config.label}
          </Badge>
        </div>
        <p className="text-xs text-gray-400 truncate mt-0.5">{item.subtitle}</p>
        {item.highlight && (
          <p
            className="text-xs text-gray-500 mt-1 line-clamp-2"
            dangerouslySetInnerHTML={{ __html: item.highlight }}
          />
        )}
      </div>
      <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-emerald-400 transition-colors shrink-0 mt-1" />
    </div>
  );
}

// ─── Results Group ────────────────────────────────────────────────────────

function ResultsGroup({
  category,
  items,
}: {
  category: SearchCategory;
  items: SearchResultItem[];
}) {
  const config = CATEGORY_CONFIG[category];
  const Icon = config.icon;
  const [expanded, setExpanded] = useState(false);

  const visible = expanded ? items : items.slice(0, 5);

  if (items.length === 0) return null;

  return (
    <Card className="bg-gray-900 border-gray-700">
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-white flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Icon className="w-5 h-5 text-emerald-400" />
            {config.label}
            <Badge className="bg-gray-800 text-gray-300 border border-gray-600 text-xs">
              {items.length}
            </Badge>
          </span>
          {items.length > 5 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white text-xs"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? 'Mostrar menos' : `Ver todos (${items.length})`}
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {visible.map((item) => (
          <ResultCard key={`${item.type}-${item.id}`} item={item} />
        ))}
      </CardContent>
    </Card>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function GlobalSearchPage() {
  const [query, setQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<SearchCategory[]>([]);

  const activeCategories = selectedCategories.length > 0 ? selectedCategories : undefined;
  const { data: results, isLoading, isFetched } = useGlobalSearch(query, activeCategories);

  const toggleCategory = (cat: SearchCategory) => {
    setSelectedCategories((prev) =>
      prev.includes(cat)
        ? prev.filter((c) => c !== cat)
        : [...prev, cat],
    );
  };

  const totalResults = results?.total ?? 0;

  const hasResults = results && (
    results.patients.length > 0 ||
    results.encounters.length > 0 ||
    results.documents.length > 0 ||
    results.drugs.length > 0
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="text-center pt-4">
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
          Busca Global
        </h1>
        <p className="text-gray-400 text-sm">
          Busque pacientes, atendimentos, documentos e medicamentos em um só lugar.
        </p>
      </div>

      {/* Search Bar */}
      <div className="max-w-2xl mx-auto">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 transition-colors group-focus-within:text-emerald-400" />
          <Input
            className="pl-12 pr-12 h-14 text-lg bg-gray-800 border-gray-700 text-white rounded-xl transition-all focus:border-emerald-500/50 focus:ring-emerald-500/20 focus:ring-2"
            placeholder="Buscar por nome, CPF, prontuário, medicamento..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          {query && (
            <button
              type="button"
              className="absolute right-12 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              onClick={() => setQuery('')}
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-emerald-400 transition-colors"
          >
            <Mic className="w-5 h-5" />
          </button>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-2 mt-3 justify-center flex-wrap">
          <Filter className="w-4 h-4 text-gray-500" />
          {ALL_CATEGORIES.map((cat) => {
            const config = CATEGORY_CONFIG[cat];
            const Icon = config.icon;
            const isActive = selectedCategories.includes(cat);
            return (
              <Button
                key={cat}
                variant="outline"
                size="sm"
                className={cn(
                  'border text-xs',
                  isActive
                    ? 'bg-emerald-900/40 text-emerald-300 border-emerald-700'
                    : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-600',
                )}
                onClick={() => toggleCategory(cat)}
              >
                <Icon className="w-3 h-3 mr-1" />
                {config.label}
              </Button>
            );
          })}
          {selectedCategories.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-500 text-xs"
              onClick={() => setSelectedCategories([])}
            >
              Limpar filtros
            </Button>
          )}
        </div>
      </div>

      {/* Loading */}
      {isLoading && query.length >= 2 && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
          <span className="ml-3 text-gray-400">Buscando...</span>
        </div>
      )}

      {/* Results */}
      {isFetched && query.length >= 2 && !isLoading && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="text-center">
            <p className="text-sm text-gray-400">
              {totalResults > 0
                ? `${totalResults} resultado(s) encontrado(s)`
                : 'Nenhum resultado encontrado.'}
            </p>
          </div>

          {hasResults && (
            <div className="space-y-4">
              <ResultsGroup category="patients" items={results.patients} />
              <ResultsGroup category="encounters" items={results.encounters} />
              <ResultsGroup category="documents" items={results.documents} />
              <ResultsGroup category="drugs" items={results.drugs} />
            </div>
          )}

          {!hasResults && (
            <div className="text-center py-12">
              <Search className="w-12 h-12 mx-auto text-gray-700 mb-4" />
              <p className="text-gray-400">Nenhum resultado para &quot;{query}&quot;</p>
              <p className="text-gray-500 text-sm mt-1">
                Tente buscar por nome completo, CPF ou termos diferentes.
              </p>
              <p className="text-gray-600 text-xs mt-2">
                A busca fonética reconhece variações de grafia de nomes.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {query.length < 2 && (
        <div className="text-center py-16">
          <Search className="w-16 h-16 mx-auto text-gray-800 mb-4" />
          <p className="text-gray-500">Digite pelo menos 2 caracteres para iniciar a busca.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {[
              { label: 'Pacientes por nome', example: 'Maria Silva' },
              { label: 'Por CPF', example: '123.456.789-00' },
              { label: 'Medicamento', example: 'Dipirona' },
            ].map((hint) => (
              <button
                key={hint.label}
                type="button"
                className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-xs text-gray-400 hover:border-emerald-700 hover:text-emerald-400 transition-colors"
                onClick={() => setQuery(hint.example)}
              >
                {hint.label}: <span className="text-gray-300">{hint.example}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
