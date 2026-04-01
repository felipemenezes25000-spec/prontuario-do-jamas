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
  Syringe,
  CalendarClock,
  ClipboardList,
  Droplets,
  ArrowRightLeft,
  ShieldAlert,
  UsersRound,
  Heart,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { useUIStore } from '@/stores/ui.store';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { getInitials } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  adminOnly?: boolean;
  isSubItem?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

// ---------------------------------------------------------------------------
// Navigation data — same routes, grouped into logical sections
// ---------------------------------------------------------------------------

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
    title: 'ADMIN',
    items: [
      { label: 'Configurações', icon: Settings, href: '/configuracoes' },
      { label: 'Admin', icon: Shield, href: '/admin', adminOnly: true },
    ],
  },
];

// ---------------------------------------------------------------------------
// Sidebar navigation item
// ---------------------------------------------------------------------------

function SidebarNavItem({
  item,
  collapsed,
  index,
  onNavigate,
}: {
  item: NavItem;
  collapsed: boolean;
  index: number;
  onNavigate: () => void;
}) {
  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <NavLink
          to={item.href}
          end={!item.isSubItem}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium',
              'transition-all duration-200 ease-out',
              'outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40',
              isActive
                ? 'bg-emerald-500/10 text-emerald-400'
                : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200',
              collapsed && 'justify-center px-2',
              item.isSubItem && !collapsed && 'ml-4 pl-4 py-1.5 text-xs',
              item.isSubItem && collapsed && 'hidden',
            )
          }
          style={{ animationDelay: `${index * 20}ms` }}
        >
          {({ isActive }) => (
            <>
              {/* Active glow indicator — left border */}
              {isActive && (
                <span
                  className={cn(
                    'absolute left-0 top-1/2 -translate-y-1/2',
                    'h-6 w-[3px] rounded-r-full bg-emerald-400',
                    'shadow-[0_0_8px_rgba(16,185,129,0.6),0_0_20px_rgba(16,185,129,0.3)]',
                    'animate-in fade-in slide-in-from-left-1 duration-300',
                  )}
                />
              )}

              <item.icon
                className={cn(
                  'shrink-0 transition-all duration-200 ease-out',
                  item.isSubItem ? 'h-3.5 w-3.5' : 'h-[18px] w-[18px]',
                  isActive
                    ? 'text-emerald-400 drop-shadow-[0_0_6px_rgba(16,185,129,0.5)]'
                    : 'text-zinc-500 group-hover:text-zinc-300',
                )}
              />

              {!collapsed && (
                <span
                  className={cn(
                    'truncate transition-opacity duration-200 ease-out',
                    collapsed ? 'opacity-0' : 'opacity-100',
                  )}
                >
                  {item.label}
                </span>
              )}
            </>
          )}
        </NavLink>
      </TooltipTrigger>
      {collapsed && !item.isSubItem && (
        <TooltipContent
          side="right"
          className="border-zinc-800 bg-zinc-900 text-zinc-200 shadow-xl"
        >
          {item.label}
        </TooltipContent>
      )}
    </Tooltip>
  );
}

// ---------------------------------------------------------------------------
// Sidebar content (shared between desktop and mobile sheet)
// ---------------------------------------------------------------------------

function SidebarContent({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean;
  onNavigate: () => void;
}) {
  const { user, logout } = useAuthStore();
  const { toggleSidebar } = useUIStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Filter admin items based on role
  const filteredSections = navSections.map((section) => ({
    ...section,
    items: section.items.filter(
      (item) => !item.adminOnly || user?.role === 'ADMIN',
    ),
  })).filter((section) => section.items.length > 0);

  let globalIndex = 0;

  return (
    <div className="flex h-full flex-col">
      {/* ── Logo area ── */}
      <div className="relative flex h-16 shrink-0 items-center gap-3 px-4">
        <div
          className={cn(
            'relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
            'bg-gradient-to-br from-emerald-500 to-teal-600',
            'shadow-[0_0_16px_rgba(16,185,129,0.25)]',
          )}
        >
          <Activity className="h-[18px] w-[18px] text-white" />
          {/* Pulse ring */}
          <span className="absolute inset-0 animate-ping rounded-xl bg-emerald-400/20 [animation-duration:3s]" />
        </div>

        {!collapsed && (
          <div className="flex flex-col overflow-hidden">
            <span className="text-lg font-bold tracking-tight">
              <span className="bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
                Vox
              </span>
              <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                PEP
              </span>
            </span>
            <span className="text-[10px] leading-none tracking-wide text-zinc-500">
              Prontuário Inteligente
            </span>
          </div>
        )}
      </div>

      {/* Subtle divider */}
      <div className="mx-3 h-px bg-gradient-to-r from-transparent via-zinc-700/50 to-transparent" />

      {/* ── Navigation ── */}
      <ScrollArea className="flex-1 py-3">
        <nav className="flex flex-col gap-0.5 px-2">
          {filteredSections.map((section, sIdx) => (
            <div key={section.title}>
              {/* Section divider (not before first section) */}
              {sIdx > 0 && (
                <div className="mx-2 my-2 h-px bg-gradient-to-r from-transparent via-zinc-700/40 to-transparent" />
              )}

              {/* Section label */}
              {!collapsed && (
                <span
                  className={cn(
                    'mb-1 block px-3 pt-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-600',
                    'select-none transition-opacity duration-200',
                  )}
                >
                  {section.title}
                </span>
              )}

              {/* Items */}
              {section.items.map((item) => {
                const idx = globalIndex++;
                return (
                  <SidebarNavItem
                    key={item.href}
                    item={item}
                    collapsed={collapsed}
                    index={idx}
                    onNavigate={onNavigate}
                  />
                );
              })}
            </div>
          ))}
        </nav>
      </ScrollArea>

      {/* Subtle divider */}
      <div className="mx-3 h-px bg-gradient-to-r from-transparent via-zinc-700/50 to-transparent" />

      {/* ── User profile ── */}
      <div className={cn('shrink-0 p-3', collapsed && 'flex flex-col items-center')}>
        {user && (
          <div className={cn('flex items-center gap-3', collapsed && 'flex-col')}>
            {/* Avatar with gradient ring + online dot */}
            <div className="relative shrink-0">
              <div className="rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 p-[2px]">
                <Avatar className="h-9 w-9 border-2 border-zinc-900">
                  <AvatarImage src={user.avatarUrl} alt={user.name} />
                  <AvatarFallback className="bg-zinc-800 text-xs font-semibold text-emerald-400">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
              </div>
              {/* Online indicator */}
              <span
                className={cn(
                  'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full',
                  'border-2 border-zinc-900 bg-emerald-500',
                  'shadow-[0_0_6px_rgba(16,185,129,0.6)]',
                )}
              />
            </div>

            {!collapsed && (
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium text-zinc-200">
                  {user.name}
                </span>
                <span className="truncate text-[11px] text-zinc-500">
                  {user.specialty ?? user.role}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className={cn('mt-3 flex gap-1', collapsed && 'flex-col items-center')}>
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'h-8 w-8 rounded-lg text-zinc-500',
                  'transition-all duration-200 ease-out',
                  'hover:bg-red-500/10 hover:text-red-400',
                )}
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent
              side={collapsed ? 'right' : 'top'}
              className="border-zinc-800 bg-zinc-900 text-zinc-200"
            >
              Sair
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* ── Collapse toggle (desktop only) ── */}
      <button
        type="button"
        onClick={toggleSidebar}
        className={cn(
          'absolute -right-3 top-20 hidden h-6 w-6 lg:flex',
          'items-center justify-center rounded-full',
          'border border-zinc-700/60 bg-zinc-900',
          'text-zinc-400 shadow-lg backdrop-blur-sm',
          'transition-all duration-200 ease-out',
          'hover:border-emerald-500/40 hover:bg-zinc-800 hover:text-emerald-400',
          'hover:shadow-[0_0_8px_rgba(16,185,129,0.2)]',
        )}
      >
        <ChevronLeft
          className={cn(
            'h-3 w-3 transition-transform duration-300 ease-out',
            collapsed && 'rotate-180',
          )}
        />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Sidebar export
// ---------------------------------------------------------------------------

export function Sidebar() {
  const { sidebarCollapsed, sidebarMobileOpen, setSidebarMobileOpen } = useUIStore();

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 hidden h-screen flex-col lg:flex',
          'border-r border-white/[0.06] bg-zinc-950/80 backdrop-blur-xl',
          'transition-[width] duration-300 ease-out',
          sidebarCollapsed ? 'w-[68px]' : 'w-64',
        )}
      >
        {/* Subtle inner glow along the right edge */}
        <div className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-emerald-500/10 via-transparent to-emerald-500/5" />

        <SidebarContent
          collapsed={sidebarCollapsed}
          onNavigate={() => {/* noop on desktop */}}
        />
      </aside>

      {/* ── Mobile sidebar (Sheet overlay with backdrop blur) ── */}
      <Sheet open={sidebarMobileOpen} onOpenChange={setSidebarMobileOpen}>
        <SheetContent
          side="left"
          className={cn(
            'w-72 border-r border-white/[0.06] bg-zinc-950/95 p-0 backdrop-blur-xl',
            '[&>button]:text-zinc-400 [&>button]:hover:text-zinc-200',
          )}
        >
          <SidebarContent
            collapsed={false}
            onNavigate={() => setSidebarMobileOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
