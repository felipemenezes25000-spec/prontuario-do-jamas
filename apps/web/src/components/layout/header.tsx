import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Menu,
  Search,
  AlertTriangle,
  User,
  Settings,
  LogOut,
  Mic,
  LayoutDashboard,
  Users,
  Stethoscope,
  HeartPulse,
  ChevronRight,
  Sparkles,
  Shield,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { useUIStore } from '@/stores/ui.store';
import { useVoiceStore } from '@/stores/voice.store';
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
import { getInitials } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Breadcrumb label map                                               */
/* ------------------------------------------------------------------ */
const ROUTE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  pacientes: 'Pacientes',
  atendimentos: 'Atendimentos',
  enfermagem: 'Enfermagem',
  prescricoes: 'Prescrições',
  emergencia: 'Emergência',
  uti: 'UTI',
  cirurgico: 'Centro Cirúrgico',
  laboratorio: 'Laboratório',
  radiologia: 'Radiologia',
  farmacia: 'Farmácia',
  faturamento: 'Faturamento',
  configuracoes: 'Configurações',
  telemedicina: 'Telemedicina',
  governanca: 'Governança',
  novo: 'Novo',
};

/* ------------------------------------------------------------------ */
/*  Waveform bars (shown while recording)                              */
/* ------------------------------------------------------------------ */
function VoiceWaveform() {
  return (
    <div className="flex items-center gap-[3px]" aria-hidden>
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className="inline-block w-[3px] rounded-full bg-emerald-400"
          style={{
            animation: `header-waveform 1s ease-in-out ${i * 0.12}s infinite alternate`,
            height: `${10 + (i % 3) * 4}px`,
          }}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export function Header() {
  const { user, logout } = useAuthStore();
  const { setSidebarMobileOpen, activeAlerts, setCommandOpen, commandOpen } = useUIStore();
  const { isRecording } = useVoiceStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchFocused, setSearchFocused] = useState(false);

  /* ---- Cmd+K shortcut ---- */
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandOpen(!commandOpen);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [commandOpen, setCommandOpen]);

  const handleLogout = useCallback(() => {
    logout();
    navigate('/login');
  }, [logout, navigate]);

  const criticalAlertCount = activeAlerts.filter((a) => a.severity === 'CRITICAL').length;

  /* ---- Breadcrumbs from current path ---- */
  const breadcrumbs = location.pathname
    .split('/')
    .filter(Boolean)
    .map((segment) => ({
      segment,
      label: ROUTE_LABELS[segment] ?? segment.charAt(0).toUpperCase() + segment.slice(1),
    }));

  /* ---- Role label in Portuguese ---- */
  const roleLabels: Record<string, string> = {
    ADMIN: 'Administrador',
    DOCTOR: 'Médico(a)',
    NURSE: 'Enfermeiro(a)',
    RECEPTIONIST: 'Recepcionista',
    PHARMACIST: 'Farmacêutico(a)',
    LAB_TECH: 'Técnico de Lab',
  };

  const userRole = (user as Record<string, unknown> | null)?.role as string | undefined;

  return (
    <>
      {/* Keyframe injection (scoped, only once) */}
      <style>{`
        @keyframes header-waveform {
          0%   { height: 6px; }
          100% { height: 18px; }
        }
        @keyframes header-pulse-ring {
          0%   { transform: scale(1);   opacity: 0.5; }
          100% { transform: scale(1.8); opacity: 0; }
        }
        @keyframes header-badge-pop {
          0%   { transform: scale(0.5); opacity: 0; }
          60%  { transform: scale(1.15); }
          100% { transform: scale(1);   opacity: 1; }
        }
        @keyframes header-glow-shift {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>

      <header
        className={cn(
          'sticky top-0 z-30 flex h-16 items-center gap-4 px-4 lg:px-6',
          'border-b border-white/[0.06] dark:border-white/[0.06]',
          'bg-white/70 dark:bg-zinc-950/70',
          'backdrop-blur-xl backdrop-saturate-150',
          'shadow-[0_1px_0_0_rgba(16,185,129,0.08)]',
          'transition-all duration-300',
        )}
      >
        {/* ---- Subtle bottom glow line ---- */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px"
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, rgba(16,185,129,0.15) 20%, rgba(16,185,129,0.25) 50%, rgba(16,185,129,0.15) 80%, transparent 100%)',
          }}
        />

        {/* ---- Mobile menu button ---- */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'lg:hidden h-9 w-9 rounded-xl',
            'hover:bg-emerald-500/10 active:scale-95',
            'transition-all duration-200',
          )}
          onClick={() => setSidebarMobileOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* ---- Breadcrumbs (desktop only) ---- */}
        {breadcrumbs.length > 0 && (
          <nav
            aria-label="Navegação"
            className="hidden items-center gap-1 text-xs text-muted-foreground lg:flex"
          >
            {breadcrumbs.map((crumb, idx) => (
              <span key={crumb.segment} className="flex items-center gap-1">
                {idx > 0 && <ChevronRight className="h-3 w-3 opacity-40" />}
                <span
                  className={cn(
                    'transition-colors duration-200',
                    idx === breadcrumbs.length - 1
                      ? 'font-medium text-foreground/80'
                      : 'hover:text-foreground/60 cursor-default',
                  )}
                >
                  {crumb.label}
                </span>
              </span>
            ))}
          </nav>
        )}

        {/* ---- Search bar ---- */}
        <div className="flex flex-1 items-center justify-end gap-4 lg:justify-center">
          <Button
            variant="ghost"
            className={cn(
              'relative h-10 justify-start gap-3 rounded-xl border px-4',
              'border-white/[0.08] dark:border-white/[0.08]',
              'bg-white/50 dark:bg-white/[0.04]',
              'text-sm text-muted-foreground',
              'shadow-sm shadow-black/[0.03]',
              'hover:bg-white/70 dark:hover:bg-white/[0.07]',
              'hover:border-emerald-500/20',
              'hover:shadow-emerald-500/5',
              'active:scale-[0.99]',
              'transition-all duration-300 ease-out',
              searchFocused ? 'w-full md:w-[32rem]' : 'w-full md:w-80 lg:w-96',
            )}
            onClick={() => {
              setSearchFocused(true);
              setCommandOpen(true);
            }}
            onBlur={() => setSearchFocused(false)}
          >
            <Search className={cn(
              'h-4 w-4 shrink-0 transition-colors duration-300',
              searchFocused ? 'text-emerald-500' : 'text-muted-foreground/60',
            )} />
            <span className="hidden truncate sm:inline">
              Buscar paciente por nome, CPF ou prontuário...
            </span>
            <span className="sm:hidden">Buscar...</span>
            <kbd
              className={cn(
                'pointer-events-none ml-auto hidden select-none items-center gap-1 rounded-md',
                'border border-border/50 bg-muted/60 px-1.5 py-0.5',
                'font-mono text-[10px] font-medium',
                'transition-opacity duration-300',
                searchFocused ? 'opacity-0' : 'opacity-100',
                'sm:flex',
              )}
            >
              <span className="text-xs">⌘</span>K
            </kbd>
          </Button>
        </div>

        {/* ---- Right side actions ---- */}
        <div className="flex items-center gap-1.5">
          {/* Voice / Microphone button */}
          <div className="relative">
            {isRecording && (
              <span
                className="absolute inset-0 rounded-xl bg-emerald-500/30"
                style={{ animation: 'header-pulse-ring 1.5s ease-out infinite' }}
              />
            )}
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'relative h-9 w-9 rounded-xl transition-all duration-300',
                isRecording
                  ? 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 ring-2 ring-emerald-500/40'
                  : 'hover:bg-emerald-500/10 active:scale-95',
              )}
              aria-label={isRecording ? 'Gravando áudio' : 'Gravar áudio'}
            >
              {isRecording ? (
                <VoiceWaveform />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Recording label */}
          {isRecording && (
            <div className="hidden items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 sm:flex">
              <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              <span className="text-xs font-semibold tracking-wide text-emerald-400">
                Gravando
              </span>
            </div>
          )}

          {/* Critical alerts */}
          {criticalAlertCount > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'relative h-9 w-9 rounded-xl',
                'text-red-400 hover:bg-red-500/10 active:scale-95',
                'transition-all duration-200',
              )}
              aria-label={`${criticalAlertCount} alertas críticos`}
            >
              <AlertTriangle className="h-4 w-4" />
              <span
                className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white"
                style={{ animation: 'header-badge-pop 0.3s ease-out' }}
              >
                {criticalAlertCount}
              </span>
            </Button>
          )}

          {/* Divider */}
          <div className="mx-1 hidden h-6 w-px bg-border/50 sm:block" />

          {/* Theme toggle */}
          <ThemeToggle />

          {/* Notifications */}
          <NotificationBell />

          {/* Divider */}
          <div className="mx-1 hidden h-6 w-px bg-border/50 sm:block" />

          {/* User dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  'relative h-9 gap-2 rounded-xl px-1.5 pr-2',
                  'hover:bg-white/[0.06] active:scale-[0.98]',
                  'transition-all duration-200',
                )}
              >
                <Avatar className="h-8 w-8 ring-2 ring-emerald-500/20 transition-all duration-300 hover:ring-emerald-500/40">
                  <AvatarImage src={user?.avatarUrl} alt={user?.name ?? ''} />
                  <AvatarFallback className="bg-emerald-500/15 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    {user ? getInitials(user.name) : '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden flex-col items-start lg:flex">
                  <span className="max-w-[120px] truncate text-xs font-medium leading-tight">
                    {user?.name}
                  </span>
                  <span className="text-[10px] leading-tight text-muted-foreground">
                    {userRole ? (roleLabels[userRole] ?? userRole) : ''}
                  </span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className={cn(
                'w-60 rounded-xl border-white/[0.08] p-1',
                'bg-white/90 dark:bg-zinc-900/90',
                'backdrop-blur-xl',
                'shadow-xl shadow-black/10',
              )}
              align="end"
              forceMount
              sideOffset={8}
            >
              <DropdownMenuLabel className="rounded-lg px-3 py-3 font-normal">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 ring-2 ring-emerald-500/20">
                    <AvatarImage src={user?.avatarUrl} alt={user?.name ?? ''} />
                    <AvatarFallback className="bg-emerald-500/15 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                      {user ? getInitials(user.name) : '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-0.5">
                    <p className="text-sm font-semibold leading-none">{user?.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                    {userRole && (
                      <span className="mt-1 inline-flex w-fit items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                        <Shield className="h-2.5 w-2.5" />
                        {roleLabels[userRole] ?? userRole}
                      </span>
                    )}
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="mx-2 bg-border/50" />
              <DropdownMenuItem
                onClick={() => navigate('/configuracoes')}
                className="gap-3 rounded-lg px-3 py-2.5 transition-colors duration-150 focus:bg-emerald-500/10"
              >
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Perfil</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigate('/configuracoes')}
                className="gap-3 rounded-lg px-3 py-2.5 transition-colors duration-150 focus:bg-emerald-500/10"
              >
                <Settings className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Configurações</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="mx-2 bg-border/50" />
              <DropdownMenuItem
                onClick={handleLogout}
                className="gap-3 rounded-lg px-3 py-2.5 text-red-500 transition-colors duration-150 focus:bg-red-500/10 focus:text-red-500"
              >
                <LogOut className="h-4 w-4" />
                <span className="font-medium">Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* ---- Command palette ---- */}
        <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
          <div className="flex items-center gap-2 border-b border-border/50 px-3">
            <Sparkles className="h-4 w-4 text-emerald-500" />
            <CommandInput
              placeholder="Buscar paciente por nome, CPF ou prontuário..."
              className="border-0"
            />
          </div>
          <CommandList className="max-h-[min(60vh,400px)]">
            <CommandEmpty>
              <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                <Search className="h-8 w-8 opacity-30" />
                <p className="text-sm">Nenhum resultado encontrado.</p>
                <p className="text-xs opacity-60">Tente buscar por nome, CPF ou prontuário</p>
              </div>
            </CommandEmpty>
            <CommandGroup heading="Ações rápidas">
              <CommandItem
                onSelect={() => {
                  setCommandOpen(false);
                  navigate('/atendimentos/novo');
                }}
                className="gap-3 rounded-lg px-3 py-2.5"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
                  <Mic className="h-4 w-4 text-emerald-500" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">Novo atendimento por voz</span>
                  <span className="text-xs text-muted-foreground">Iniciar consulta com gravação</span>
                </div>
              </CommandItem>
              <CommandItem
                onSelect={() => {
                  setCommandOpen(false);
                  navigate('/pacientes/novo');
                }}
                className="gap-3 rounded-lg px-3 py-2.5"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
                  <User className="h-4 w-4 text-blue-500" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">Cadastrar novo paciente</span>
                  <span className="text-xs text-muted-foreground">Registro completo com CPF</span>
                </div>
              </CommandItem>
            </CommandGroup>
            <CommandGroup heading="Navegação">
              <CommandItem
                onSelect={() => {
                  setCommandOpen(false);
                  navigate('/dashboard');
                }}
                className="gap-3 rounded-lg px-3 py-2"
              >
                <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
                Dashboard
              </CommandItem>
              <CommandItem
                onSelect={() => {
                  setCommandOpen(false);
                  navigate('/pacientes');
                }}
                className="gap-3 rounded-lg px-3 py-2"
              >
                <Users className="h-4 w-4 text-muted-foreground" />
                Pacientes
              </CommandItem>
              <CommandItem
                onSelect={() => {
                  setCommandOpen(false);
                  navigate('/atendimentos');
                }}
                className="gap-3 rounded-lg px-3 py-2"
              >
                <Stethoscope className="h-4 w-4 text-muted-foreground" />
                Atendimentos
              </CommandItem>
              <CommandItem
                onSelect={() => {
                  setCommandOpen(false);
                  navigate('/enfermagem');
                }}
                className="gap-3 rounded-lg px-3 py-2"
              >
                <HeartPulse className="h-4 w-4 text-muted-foreground" />
                Enfermagem
              </CommandItem>
              <CommandItem
                onSelect={() => {
                  setCommandOpen(false);
                  navigate('/emergencia');
                }}
                className="gap-3 rounded-lg px-3 py-2"
              >
                <Activity className="h-4 w-4 text-muted-foreground" />
                Emergência
              </CommandItem>
            </CommandGroup>
          </CommandList>
          <div className="flex items-center justify-between border-t border-border/50 px-4 py-2 text-[11px] text-muted-foreground/60">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="rounded bg-muted/60 px-1 py-0.5 text-[10px]">↑↓</kbd>
                navegar
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded bg-muted/60 px-1 py-0.5 text-[10px]">↵</kbd>
                selecionar
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded bg-muted/60 px-1 py-0.5 text-[10px]">esc</kbd>
                fechar
              </span>
            </div>
            <span className="flex items-center gap-1 text-emerald-500/60">
              <Sparkles className="h-3 w-3" />
              VoxPEP
            </span>
          </div>
        </CommandDialog>
      </header>
    </>
  );
}
