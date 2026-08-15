import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  ChevronRight,
  FileText,
  HeartPulse,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  Mic,
  Pill,
  Search,
  Settings,
  Shield,
  Sparkles,
  Square,
  Stethoscope,
  User,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn, getInitials } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { useUIStore } from '@/stores/ui.store';
import { useVoice } from '@/hooks/use-voice';
import { useGlobalSearch, type SearchResultItem } from '@/services/search.service';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from './theme-toggle';
import { NotificationBell } from './notification-bell';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

const ROUTE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  pacientes: 'Pacientes',
  atendimentos: 'Atendimentos',
  enfermagem: 'Enfermagem',
  prescricoes: 'Prescrições',
  emergencia: 'Emergência',
  uti: 'UTI',
  'centro-cirurgico': 'Centro Cirúrgico',
  laboratorio: 'Laboratório',
  exames: 'Exames',
  farmacia: 'Farmácia',
  faturamento: 'Faturamento',
  configuracoes: 'Configurações',
  telemedicina: 'Telemedicina',
  governanca: 'Governança',
  alertas: 'Alertas',
  busca: 'Busca',
  novo: 'Novo',
};

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  DOCTOR: 'Médico(a)',
  NURSE: 'Enfermeiro(a)',
  RECEPTIONIST: 'Recepcionista',
  PHARMACIST: 'Farmacêutico(a)',
  LAB_TECH: 'Técnico de Lab',
};

const SEARCH_ICONS = {
  patients: Users,
  encounters: Stethoscope,
  documents: FileText,
  drugs: Pill,
} as const;

function VoiceWaveform() {
  return (
    <div className="flex items-center gap-[2px]" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((index) => (
        <span
          key={index}
          className="inline-block w-[2px] animate-pulse rounded-full bg-emerald-400"
          style={{ height: `${8 + (index % 3) * 4}px`, animationDelay: `${index * 90}ms` }}
        />
      ))}
    </div>
  );
}

function SearchResult({
  result,
  onSelect,
}: {
  result: SearchResultItem;
  onSelect: (result: SearchResultItem) => void;
}) {
  const Icon = SEARCH_ICONS[result.type];
  return (
    <CommandItem
      value={`${result.title} ${result.subtitle} ${result.highlight ?? ''}`}
      onSelect={() => onSelect(result)}
      className="gap-3 rounded-xl px-3 py-3"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{result.title}</p>
        <p className="truncate text-xs text-muted-foreground">{result.subtitle}</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50" />
    </CommandItem>
  );
}

export function Header() {
  const { user, logout } = useAuthStore();
  const { setSidebarMobileOpen, activeAlerts, setCommandOpen, commandOpen } = useUIStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');

  const {
    isRecording,
    isProcessing,
    error: voiceError,
    duration,
    startRecording,
    stopRecording,
    cancelRecording,
  } = useVoice({ context: 'GLOBAL_NAVIGATION' });

  const { data: searchData, isFetching: searchLoading } = useGlobalSearch(searchQuery);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setCommandOpen(!commandOpen);
      }
    };
    document.addEventListener('keydown', handleShortcut);
    return () => document.removeEventListener('keydown', handleShortcut);
  }, [commandOpen, setCommandOpen]);

  useEffect(() => {
    if (voiceError) toast.error(voiceError);
  }, [voiceError]);

  const handleLogout = useCallback(() => {
    logout();
    navigate('/login');
  }, [logout, navigate]);

  const closeSearch = useCallback(() => {
    setCommandOpen(false);
    setSearchQuery('');
  }, [setCommandOpen]);

  const handleSearchResult = useCallback(
    (result: SearchResultItem) => {
      closeSearch();
      navigate(result.url);
    },
    [closeSearch, navigate],
  );

  const handleVoiceClick = useCallback(() => {
    if (isProcessing) return;
    if (isRecording) stopRecording();
    else void startRecording();
  }, [isProcessing, isRecording, startRecording, stopRecording]);

  const criticalAlertCount = useMemo(
    () =>
      activeAlerts.filter(
        (alert) => alert.severity === 'CRITICAL' || alert.severity === 'EMERGENCY',
      ).length,
    [activeAlerts],
  );

  const breadcrumbs = useMemo(
    () =>
      location.pathname
        .split('/')
        .filter(Boolean)
        .map((segment) => ({
          segment,
          label: ROUTE_LABELS[segment] ?? segment.charAt(0).toUpperCase() + segment.slice(1),
        })),
    [location.pathname],
  );

  const searchResults = useMemo(
    () => [
      ...(searchData?.patients ?? []),
      ...(searchData?.encounters ?? []),
      ...(searchData?.documents ?? []),
      ...(searchData?.drugs ?? []),
    ],
    [searchData],
  );

  const userRole = (user as Record<string, unknown> | null)?.role as string | undefined;

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/60 bg-background/88 px-3 shadow-[0_1px_18px_rgba(0,0,0,0.04)] backdrop-blur-xl lg:px-6">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-emerald-500/25 to-transparent" />

        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-xl lg:hidden"
          aria-label="Abrir navegação"
          onClick={() => setSidebarMobileOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>

        {breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="hidden items-center gap-1 text-xs lg:flex">
            {breadcrumbs.map((crumb, index) => (
              <span key={`${crumb.segment}-${index}`} className="flex items-center gap-1">
                {index > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground/40" />}
                <span
                  className={cn(
                    index === breadcrumbs.length - 1
                      ? 'font-medium text-foreground'
                      : 'text-muted-foreground',
                  )}
                >
                  {crumb.label}
                </span>
              </span>
            ))}
          </nav>
        )}

        <div className="flex min-w-0 flex-1 justify-center">
          <button
            type="button"
            onClick={() => setCommandOpen(true)}
            className="group flex h-10 w-full max-w-xl items-center gap-3 rounded-xl border border-border/60 bg-muted/30 px-3 text-left text-sm text-muted-foreground shadow-sm transition-all hover:border-emerald-500/30 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
            aria-label="Abrir busca global"
          >
            <Search className="h-4 w-4 shrink-0 transition-colors group-hover:text-emerald-500" />
            <span className="min-w-0 flex-1 truncate">
              Buscar pacientes, atendimentos, documentos ou medicamentos
            </span>
            <kbd className="hidden rounded-md border border-border/70 bg-background/60 px-1.5 py-0.5 font-mono text-[10px] sm:block">
              ⌘K
            </kbd>
          </button>
        </div>

        <div className="flex items-center gap-1">
          <div className="relative flex items-center">
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'relative h-9 w-9 rounded-xl',
                isRecording && 'bg-emerald-500/10 text-emerald-500 ring-1 ring-emerald-500/30',
              )}
              disabled={isProcessing}
              aria-label={
                isProcessing
                  ? 'Processando áudio'
                  : isRecording
                    ? 'Parar gravação'
                    : 'Iniciar gravação por voz'
              }
              onClick={handleVoiceClick}
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isRecording ? (
                <VoiceWaveform />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>

            {isRecording && (
              <Button
                variant="ghost"
                size="icon"
                className="ml-1 hidden h-9 w-9 rounded-xl text-red-500 hover:bg-red-500/10 sm:inline-flex"
                aria-label="Cancelar gravação"
                onClick={cancelRecording}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {isRecording && (
            <div className="hidden items-center gap-2 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-600 md:flex dark:text-emerald-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              {Math.floor(duration / 60)}:{String(duration % 60).padStart(2, '0')}
              <Square className="h-2.5 w-2.5 fill-current" />
            </div>
          )}

          {criticalAlertCount > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="relative h-9 w-9 rounded-xl text-red-500 hover:bg-red-500/10"
              aria-label={`${criticalAlertCount} alertas críticos. Abrir alertas.`}
              onClick={() => navigate('/alertas')}
            >
              <AlertTriangle className="h-4 w-4" />
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                {criticalAlertCount > 9 ? '9+' : criticalAlertCount}
              </span>
            </Button>
          )}

          <div className="mx-1 hidden h-5 w-px bg-border/60 sm:block" />
          <ThemeToggle />
          <NotificationBell />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-10 gap-2 rounded-xl px-1.5 sm:pr-2">
                <Avatar className="h-8 w-8 ring-2 ring-emerald-500/15">
                  <AvatarImage src={user?.avatarUrl} alt={user?.name ?? ''} />
                  <AvatarFallback className="bg-emerald-500/10 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    {user ? getInitials(user.name) : '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden max-w-36 flex-col items-start lg:flex">
                  <span className="w-full truncate text-xs font-medium">{user?.name}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {userRole ? ROLE_LABELS[userRole] ?? userRole : ''}
                  </span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 rounded-xl p-1" align="end" sideOffset={8}>
              <DropdownMenuLabel className="px-3 py-3 font-normal">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 ring-2 ring-emerald-500/15">
                    <AvatarImage src={user?.avatarUrl} alt={user?.name ?? ''} />
                    <AvatarFallback className="bg-emerald-500/10 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                      {user ? getInitials(user.name) : '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{user?.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
                    {userRole && (
                      <span className="mt-1 inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
                        <Shield className="h-3 w-3" />
                        {ROLE_LABELS[userRole] ?? userRole}
                      </span>
                    )}
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/configuracoes')} className="gap-3 rounded-lg">
                <User className="h-4 w-4" />
                Perfil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/configuracoes')} className="gap-3 rounded-lg">
                <Settings className="h-4 w-4" />
                Configurações
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="gap-3 rounded-lg text-red-500 focus:text-red-500"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <CommandDialog
        open={commandOpen}
        onOpenChange={(open) => {
          setCommandOpen(open);
          if (!open) setSearchQuery('');
        }}
      >
        <div className="flex items-center gap-2 border-b border-border/60 px-3">
          <Sparkles className="h-4 w-4 text-emerald-500" />
          <CommandInput
            value={searchQuery}
            onValueChange={setSearchQuery}
            placeholder="Buscar em todo o StarMed..."
            className="border-0"
          />
          {searchLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>

        <CommandList className="max-h-[min(65vh,460px)]">
          {searchQuery.length >= 2 && searchResults.length === 0 && !searchLoading && (
            <CommandEmpty>
              <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                <Search className="h-8 w-8 opacity-30" />
                <p className="text-sm">Nenhum resultado encontrado.</p>
                <button
                  type="button"
                  className="text-xs text-emerald-500 hover:underline"
                  onClick={() => {
                    const query = searchQuery;
                    closeSearch();
                    navigate(`/busca?q=${encodeURIComponent(query)}`);
                  }}
                >
                  Abrir busca avançada
                </button>
              </div>
            </CommandEmpty>
          )}

          {searchQuery.length >= 2 && searchResults.length > 0 && (
            <CommandGroup heading={`Resultados (${searchData?.total ?? searchResults.length})`}>
              {searchResults.slice(0, 12).map((result) => (
                <SearchResult key={`${result.type}-${result.id}`} result={result} onSelect={handleSearchResult} />
              ))}
              {(searchData?.total ?? 0) > 12 && (
                <CommandItem
                  value="ver todos os resultados"
                  className="justify-center rounded-xl text-emerald-500"
                  onSelect={() => {
                    const query = searchQuery;
                    closeSearch();
                    navigate(`/busca?q=${encodeURIComponent(query)}`);
                  }}
                >
                  Ver todos os resultados
                </CommandItem>
              )}
            </CommandGroup>
          )}

          {searchQuery.length < 2 && (
            <>
              <CommandGroup heading="Ações rápidas">
                <CommandItem onSelect={() => { closeSearch(); navigate('/atendimentos/novo'); }} className="gap-3 rounded-xl">
                  <Stethoscope className="h-4 w-4 text-emerald-500" />
                  Novo atendimento
                </CommandItem>
                <CommandItem onSelect={() => { closeSearch(); navigate('/pacientes/novo'); }} className="gap-3 rounded-xl">
                  <User className="h-4 w-4 text-blue-500" />
                  Cadastrar paciente
                </CommandItem>
                <CommandItem onSelect={() => { closeSearch(); navigate('/prescricoes'); }} className="gap-3 rounded-xl">
                  <Pill className="h-4 w-4 text-violet-500" />
                  Prescrições
                </CommandItem>
              </CommandGroup>
              <CommandGroup heading="Navegação">
                <CommandItem onSelect={() => { closeSearch(); navigate('/dashboard'); }} className="gap-3 rounded-xl">
                  <LayoutDashboard className="h-4 w-4" /> Dashboard
                </CommandItem>
                <CommandItem onSelect={() => { closeSearch(); navigate('/pacientes'); }} className="gap-3 rounded-xl">
                  <Users className="h-4 w-4" /> Pacientes
                </CommandItem>
                <CommandItem onSelect={() => { closeSearch(); navigate('/atendimentos'); }} className="gap-3 rounded-xl">
                  <Stethoscope className="h-4 w-4" /> Atendimentos
                </CommandItem>
                <CommandItem onSelect={() => { closeSearch(); navigate('/enfermagem'); }} className="gap-3 rounded-xl">
                  <HeartPulse className="h-4 w-4" /> Enfermagem
                </CommandItem>
                <CommandItem onSelect={() => { closeSearch(); navigate('/emergencia'); }} className="gap-3 rounded-xl">
                  <Activity className="h-4 w-4" /> Emergência
                </CommandItem>
              </CommandGroup>
            </>
          )}
        </CommandList>

        <div className="flex items-center justify-between border-t border-border/60 px-4 py-2 text-[10px] text-muted-foreground">
          <span>⌘K busca global · ESC fecha</span>
          <span className="flex items-center gap-1 font-medium text-emerald-500">
            <Sparkles className="h-3 w-3" /> StarMed
          </span>
        </div>
      </CommandDialog>
    </>
  );
}
