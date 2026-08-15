import type { ComponentType } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowRightLeft,
  BarChart3,
  BedDouble,
  Calendar,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Droplets,
  Heart,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  Pill,
  Receipt,
  Scissors,
  Settings,
  Shield,
  ShieldAlert,
  Stethoscope,
  Syringe,
  TestTube,
  Users,
  UsersRound,
} from 'lucide-react';
import { cn, getInitials } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { useUIStore } from '@/stores/ui.store';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent } from '@/components/ui/sheet';

type NavIcon = ComponentType<{ className?: string }>;

interface NavItem {
  label: string;
  icon: NavIcon;
  href: string;
  adminOnly?: boolean;
  isSubItem?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: 'PRINCIPAL',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
      { label: 'Agenda', icon: Calendar, href: '/agenda' },
      { label: 'Pacientes', icon: Users, href: '/pacientes' },
    ],
  },
  {
    title: 'CLÍNICO',
    items: [
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
    ],
  },
  {
    title: 'OPERACIONAL',
    items: [
      { label: 'Saúde Populacional', icon: UsersRound, href: '/saude-populacional' },
      { label: 'CCIH', icon: ShieldAlert, href: '/ccih' },
      { label: 'Portal do Paciente', icon: Heart, href: '/portal-paciente' },
      { label: 'Relatórios', icon: BarChart3, href: '/relatorios' },
      { label: 'Faturamento', icon: Receipt, href: '/faturamento' },
    ],
  },
  {
    title: 'GESTÃO',
    items: [
      { label: 'Configurações', icon: Settings, href: '/configuracoes' },
      { label: 'Administração', icon: Shield, href: '/admin', adminOnly: true },
    ],
  },
];

function Brand({ collapsed }: { collapsed: boolean }) {
  return (
    <div className={cn('flex h-16 shrink-0 items-center', collapsed ? 'justify-center px-2' : 'gap-3 px-4')}>
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/15">
        <Activity className="h-5 w-5 text-white" />
        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-sidebar bg-emerald-300" />
      </div>
      {!collapsed && (
        <div className="min-w-0">
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold tracking-tight text-foreground">Star</span>
            <span className="text-lg font-bold tracking-tight text-primary">Med</span>
          </div>
          <p className="truncate text-[9px] font-medium uppercase tracking-[0.17em] text-muted-foreground">
            Inteligência Hospitalar
          </p>
        </div>
      )}
    </div>
  );
}

function Navigation({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean;
  onNavigate: () => void;
}) {
  const user = useAuthStore((state) => state.user);

  return (
    <ScrollArea className="flex-1 px-2 pb-3">
      <nav aria-label="Navegação principal" className="space-y-5 py-3">
        {navSections.map((section) => {
          const items = section.items.filter((item) => !item.adminOnly || user?.role === 'ADMIN');
          if (items.length === 0) return null;

          return (
            <div key={section.title}>
              {!collapsed && (
                <p className="mb-1.5 px-3 text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
                  {section.title}
                </p>
              )}
              <div className="space-y-0.5">
                {items.map((item) => {
                  if (item.isSubItem && collapsed) return null;
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.href}
                      to={item.href}
                      end={!item.isSubItem}
                      title={collapsed ? item.label : undefined}
                      onClick={onNavigate}
                      className={({ isActive }) =>
                        cn(
                          'group relative flex min-h-9 items-center gap-3 rounded-xl text-[12px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/40',
                          collapsed ? 'justify-center px-2' : 'px-3',
                          item.isSubItem && !collapsed && 'ml-5 min-h-8 pl-3 text-[11px]',
                          isActive
                            ? 'bg-primary/10 text-primary'
                            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && (
                            <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-primary shadow-[0_0_10px_color-mix(in_srgb,var(--color-primary)_45%,transparent)]" />
                          )}
                          <Icon
                            className={cn(
                              'shrink-0 transition-colors',
                              item.isSubItem ? 'h-3.5 w-3.5' : 'h-[17px] w-[17px]',
                              isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-accent-foreground',
                            )}
                          />
                          {!collapsed && <span className="truncate">{item.label}</span>}
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>
    </ScrollArea>
  );
}

function UserFooter({ collapsed }: { collapsed: boolean }) {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="shrink-0 border-t border-border/70 p-2">
      {!collapsed ? (
        <div className="rounded-2xl border border-border/70 bg-muted/30 p-2.5">
          <div className="flex items-center gap-2.5">
            <Avatar className="h-9 w-9 ring-1 ring-primary/25">
              <AvatarImage src={user?.avatarUrl} alt={user?.name ?? ''} />
              <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                {user ? getInitials(user.name) : '?'}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-foreground">{user?.name}</p>
              <p className="truncate text-[10px] text-muted-foreground">{user?.specialty ?? user?.role}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              aria-label="Sair"
              onClick={handleLogout}
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
          <Button
            variant="ghost"
            className="mt-2 h-8 w-full justify-between rounded-xl px-2 text-[10px] text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            onClick={toggleSidebar}
          >
            Recolher menu <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1.5">
          <Avatar className="h-9 w-9 ring-1 ring-primary/25">
            <AvatarImage src={user?.avatarUrl} alt={user?.name ?? ''} />
            <AvatarFallback className="bg-primary/10 text-[10px] font-semibold text-primary">
              {user ? getInitials(user.name) : '?'}
            </AvatarFallback>
          </Avatar>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-xl text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            title="Expandir menu"
            aria-label="Expandir menu"
            onClick={toggleSidebar}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

function SidebarShell({
  collapsed,
  mobile = false,
  onNavigate,
}: {
  collapsed: boolean;
  mobile?: boolean;
  onNavigate: () => void;
}) {
  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <Brand collapsed={collapsed && !mobile} />
      <div className="mx-3 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      <Navigation collapsed={collapsed && !mobile} onNavigate={onNavigate} />
      <UserFooter collapsed={collapsed && !mobile} />
    </div>
  );
}

export function Sidebar() {
  const sidebarCollapsed = useUIStore((state) => state.sidebarCollapsed);
  const sidebarMobileOpen = useUIStore((state) => state.sidebarMobileOpen);
  const setSidebarMobileOpen = useUIStore((state) => state.setSidebarMobileOpen);

  return (
    <>
      <aside
        aria-label="Menu lateral"
        className={cn(
          'fixed inset-y-0 left-0 z-40 hidden border-r border-border/70 bg-sidebar shadow-[8px_0_30px_rgba(0,0,0,0.06)] transition-[width] duration-200 lg:block',
          sidebarCollapsed ? 'w-[68px]' : 'w-64',
        )}
      >
        <SidebarShell collapsed={sidebarCollapsed} onNavigate={() => undefined} />
      </aside>

      <Sheet open={sidebarMobileOpen} onOpenChange={setSidebarMobileOpen}>
        <SheetContent side="left" className="w-[88vw] max-w-[300px] border-r border-border bg-sidebar p-0">
          <SidebarShell collapsed={false} mobile onNavigate={() => setSidebarMobileOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
