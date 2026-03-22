import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menu,
  Search,
  Bell,
  AlertTriangle,
  User,
  Settings,
  LogOut,
  Mic,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { useUIStore } from '@/stores/ui.store';
import { useVoiceStore } from '@/stores/voice.store';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from './theme-toggle';
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

export function Header() {
  const { user, logout } = useAuthStore();
  const { setSidebarMobileOpen, unreadCount, activeAlerts, setCommandOpen, commandOpen } = useUIStore();
  const { isRecording } = useVoiceStore();
  const navigate = useNavigate();

  // Cmd+K shortcut
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

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const criticalAlertCount = activeAlerts.filter((a) => a.severity === 'CRITICAL').length;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:px-6">
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={() => setSidebarMobileOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Search bar */}
      <div className="flex flex-1 items-center gap-4">
        <Button
          variant="outline"
          className="relative h-9 w-full justify-start gap-2 text-sm text-muted-foreground md:w-80 lg:w-96"
          onClick={() => setCommandOpen(true)}
        >
          <Search className="h-4 w-4" />
          <span className="hidden sm:inline">Buscar paciente por nome, CPF ou prontuário...</span>
          <span className="sm:hidden">Buscar...</span>
          <kbd className="pointer-events-none ml-auto hidden select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
            <span className="text-xs">⌘</span>K
          </kbd>
        </Button>
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-2">
        {/* Voice indicator */}
        {isRecording && (
          <div className="flex items-center gap-2 rounded-full bg-red-500/10 px-3 py-1.5">
            <div className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            <span className="text-xs font-medium text-red-500">Gravando</span>
          </div>
        )}

        {/* Microphone button */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'relative h-9 w-9',
            isRecording && 'text-red-500 animate-voice-pulse-red',
          )}
        >
          <Mic className="h-4 w-4" />
        </Button>

        {/* Alerts */}
        {criticalAlertCount > 0 && (
          <Button variant="ghost" size="icon" className="relative h-9 w-9">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {criticalAlertCount}
            </span>
          </Button>
        )}

        {/* Theme toggle */}
        <ThemeToggle />

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>

        {/* User dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              <Avatar className="h-9 w-9">
                <AvatarImage src={user?.avatarUrl} alt={user?.name ?? ''} />
                <AvatarFallback className="bg-primary/20 text-xs text-primary">
                  {user ? getInitials(user.name) : '?'}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user?.name}</p>
                <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/configuracoes')}>
              <User className="mr-2 h-4 w-4" />
              Perfil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/configuracoes')}>
              <Settings className="mr-2 h-4 w-4" />
              Configurações
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Command palette */}
      <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
        <CommandInput placeholder="Buscar paciente por nome, CPF ou prontuário..." />
        <CommandList>
          <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
          <CommandGroup heading="Ações rápidas">
            <CommandItem onSelect={() => { setCommandOpen(false); navigate('/atendimentos/novo'); }}>
              <Mic className="mr-2 h-4 w-4" />
              Novo atendimento por voz
            </CommandItem>
            <CommandItem onSelect={() => { setCommandOpen(false); navigate('/pacientes/novo'); }}>
              <User className="mr-2 h-4 w-4" />
              Cadastrar novo paciente
            </CommandItem>
          </CommandGroup>
          <CommandGroup heading="Navegação">
            <CommandItem onSelect={() => { setCommandOpen(false); navigate('/dashboard'); }}>
              Dashboard
            </CommandItem>
            <CommandItem onSelect={() => { setCommandOpen(false); navigate('/pacientes'); }}>
              Pacientes
            </CommandItem>
            <CommandItem onSelect={() => { setCommandOpen(false); navigate('/atendimentos'); }}>
              Atendimentos
            </CommandItem>
            <CommandItem onSelect={() => { setCommandOpen(false); navigate('/enfermagem'); }}>
              Enfermagem
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </header>
  );
}
