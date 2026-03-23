import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Stethoscope,
  BedDouble,
  Scissors,
  Pill,
  TestTube,
  HeartPulse,
  BarChart3,
  Receipt,
  Settings,
  Shield,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Syringe,
  CalendarClock,
  ClipboardList,
  Droplets,
  ArrowRightLeft,
  ShieldAlert,
  UsersRound,
  Heart,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { useUIStore } from '@/stores/ui.store';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getInitials } from '@/lib/utils';

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  adminOnly?: boolean;
  isSubItem?: boolean;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
  { label: 'Agenda', icon: Calendar, href: '/agenda' },
  { label: 'Pacientes', icon: Users, href: '/pacientes' },
  { label: 'Atendimentos', icon: Stethoscope, href: '/atendimentos' },
  { label: 'Internações', icon: BedDouble, href: '/internacoes' },
  { label: 'Centro Cirúrgico', icon: Scissors, href: '/centro-cirurgico' },
  { label: 'Farmácia', icon: Pill, href: '/farmacia' },
  { label: 'Exames', icon: TestTube, href: '/exames' },
  { label: 'Enfermagem', icon: HeartPulse, href: '/enfermagem' },
  { label: 'Aprazamento', icon: CalendarClock, href: '/enfermagem/aprazamento', isSubItem: true },
  { label: 'SAE', icon: ClipboardList, href: '/enfermagem/sae', isSubItem: true },
  { label: 'Balanço Hídrico', icon: Droplets, href: '/enfermagem/balanco-hidrico', isSubItem: true },
  { label: 'Passagem de Plantão', icon: ArrowRightLeft, href: '/enfermagem/passagem-plantao', isSubItem: true },
  { label: 'Quimioterapia', icon: Syringe, href: '/quimioterapia' },
  { label: 'Saúde Populacional', icon: UsersRound, href: '/saude-populacional' },
  { label: 'CCIH', icon: ShieldAlert, href: '/ccih' },
  { label: 'Portal do Paciente', icon: Heart, href: '/portal-paciente' },
  { label: 'Relatórios', icon: BarChart3, href: '/relatorios' },
  { label: 'Faturamento', icon: Receipt, href: '/faturamento' },
  { label: 'Configurações', icon: Settings, href: '/configuracoes' },
  { label: 'Admin', icon: Shield, href: '/admin', adminOnly: true },
];

export function Sidebar() {
  const { user, logout } = useAuthStore();
  const { sidebarCollapsed, toggleSidebar, sidebarMobileOpen, setSidebarMobileOpen } = useUIStore();
  const navigate = useNavigate();

  const filteredItems = navItems.filter(
    (item) => !item.adminOnly || user?.role === 'ADMIN',
  );

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      {/* Mobile overlay */}
      {sidebarMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setSidebarMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-border bg-sidebar transition-all duration-300',
          sidebarCollapsed ? 'w-[68px]' : 'w-64',
          sidebarMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-2 px-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary">
            <Stethoscope className="h-5 w-5 text-primary-foreground" />
          </div>
          {!sidebarCollapsed && (
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight">
                Vox<span className="text-primary">PEP</span>
              </span>
              <span className="text-[10px] leading-none text-muted-foreground">
                Prontuário Inteligente
              </span>
            </div>
          )}
        </div>

        <Separator />

        {/* Navigation */}
        <ScrollArea className="flex-1 px-2 py-4">
          <nav className="flex flex-col gap-1">
            {filteredItems.map((item) => (
              <Tooltip key={item.href} delayDuration={0}>
                <TooltipTrigger asChild>
                  <NavLink
                    to={item.href}
                    end={!item.isSubItem}
                    onClick={() => setSidebarMobileOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-sidebar-accent text-primary'
                          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground',
                        sidebarCollapsed && 'justify-center px-2',
                        item.isSubItem && !sidebarCollapsed && 'pl-9 py-1.5 text-xs',
                        item.isSubItem && sidebarCollapsed && 'hidden',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon
                          className={cn(
                            'shrink-0',
                            item.isSubItem ? 'h-3.5 w-3.5' : 'h-5 w-5',
                            isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-sidebar-foreground',
                          )}
                        />
                        {!sidebarCollapsed && <span>{item.label}</span>}
                        {isActive && (
                          <div className="absolute left-0 h-6 w-[3px] rounded-r-full bg-primary" />
                        )}
                      </>
                    )}
                  </NavLink>
                </TooltipTrigger>
                {sidebarCollapsed && (
                  <TooltipContent side="right" className="font-medium">
                    {item.label}
                  </TooltipContent>
                )}
              </Tooltip>
            ))}
          </nav>
        </ScrollArea>

        <Separator />

        {/* User info */}
        <div className={cn('p-3', sidebarCollapsed && 'flex flex-col items-center')}>
          {user && (
            <div className={cn('flex items-center gap-3', sidebarCollapsed && 'flex-col')}>
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarImage src={user.avatarUrl} alt={user.name} />
                <AvatarFallback className="bg-primary/20 text-xs text-primary">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              {!sidebarCollapsed && (
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium">{user.name}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {user.specialty ?? user.role}
                  </span>
                </div>
              )}
            </div>
          )}

          <div className={cn('mt-3 flex gap-1', sidebarCollapsed && 'flex-col items-center')}>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side={sidebarCollapsed ? 'right' : 'top'}>Sair</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Collapse toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute -right-3 top-20 hidden h-6 w-6 rounded-full border border-border bg-card hover:bg-accent lg:flex"
          onClick={toggleSidebar}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </Button>
      </aside>
    </>
  );
}
