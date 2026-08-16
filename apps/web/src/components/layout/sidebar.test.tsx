import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Sidebar } from './sidebar';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  NavLink: ({
    to,
    children,
    className,
    onClick,
  }: {
    to: string;
    children: ((props: { isActive: boolean }) => React.ReactNode) | React.ReactNode;
    className?: string | ((props: { isActive: boolean }) => string);
    onClick?: () => void;
  }) => {
    const isActive = to === '/dashboard';
    const resolvedClass = typeof className === 'function' ? className({ isActive }) : className;
    return (
      <a href={to} className={resolvedClass} onClick={onClick} data-testid={`navlink-${to}`}>
        {typeof children === 'function' ? children({ isActive }) : children}
      </a>
    );
  },
}));

interface MockUser {
  id: string;
  name: string;
  email: string;
  role: string;
  specialty?: string;
  avatarUrl?: string;
  tenantId: string;
}

interface MockAuthState {
  user: MockUser | null;
  logout: () => void;
}

const mockLogout = vi.fn();
let mockUser: MockUser | null = {
  id: '1',
  name: 'Dr. Carlos Eduardo',
  email: 'carlos@starmed.com',
  role: 'ADMIN',
  specialty: 'Cardiologia',
  tenantId: 't1',
};

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: <T,>(selector?: (state: MockAuthState) => T) => {
    const state: MockAuthState = { user: mockUser, logout: mockLogout };
    return selector ? selector(state) : state;
  },
}));

interface MockUIState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  sidebarMobileOpen: boolean;
  setSidebarMobileOpen: (open: boolean) => void;
}

let mockSidebarCollapsed = false;
let mockSidebarMobileOpen = false;
const mockToggleSidebar = vi.fn();
const mockSetSidebarMobileOpen = vi.fn();

vi.mock('@/stores/ui.store', () => ({
  useUIStore: <T,>(selector?: (state: MockUIState) => T) => {
    const state: MockUIState = {
      sidebarCollapsed: mockSidebarCollapsed,
      toggleSidebar: mockToggleSidebar,
      sidebarMobileOpen: mockSidebarMobileOpen,
      setSidebarMobileOpen: mockSetSidebarMobileOpen,
    };
    return selector ? selector(state) : state;
  },
}));

vi.mock('@/components/ui/avatar', () => ({
  Avatar: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="avatar" className={className}>{children}</div>
  ),
  AvatarImage: ({ src, alt }: { src?: string; alt?: string }) => (
    src ? <img src={src} alt={alt} data-testid="avatar-image" /> : null
  ),
  AvatarFallback: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <span data-testid="avatar-fallback" className={className}>{children}</span>
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    className,
    variant,
    size,
    ...rest
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
    variant?: string;
    size?: string;
    [key: string]: unknown;
  }) => (
    <button onClick={onClick} className={className} data-variant={variant} data-size={size} {...rest}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="scroll-area" className={className}>{children}</div>
  ),
}));

vi.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children, open }: { children: React.ReactNode; open?: boolean }) => (
    open ? <div data-testid="mobile-sheet">{children}</div> : null
  ),
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSidebarCollapsed = false;
    mockSidebarMobileOpen = false;
    mockUser = {
      id: '1',
      name: 'Dr. Carlos Eduardo',
      email: 'carlos@starmed.com',
      role: 'ADMIN',
      specialty: 'Cardiologia',
      tenantId: 't1',
    };
  });

  it('renders the StarMed brand', () => {
    render(<Sidebar />);
    expect(screen.getByText('Star')).toBeInTheDocument();
    expect(screen.getByText('Med')).toBeInTheDocument();
    expect(screen.getByText('Intelligence Hospital')).toBeInTheDocument();
  });

  it('renders main navigation items', () => {
    render(<Sidebar />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Agenda')).toBeInTheDocument();
    expect(screen.getByText('Pacientes')).toBeInTheDocument();
    expect(screen.getByText('Atendimentos')).toBeInTheDocument();
    expect(screen.getByText('Farmácia')).toBeInTheDocument();
    expect(screen.getByText('Exames')).toBeInTheDocument();
  });

  it('renders administration link for ADMIN users', () => {
    render(<Sidebar />);
    expect(screen.getByText('Administração')).toBeInTheDocument();
  });

  it('hides administration link for non-ADMIN users', () => {
    mockUser = {
      id: '2',
      name: 'Dr. Ana',
      email: 'ana@starmed.com',
      role: 'DOCTOR',
      tenantId: 't1',
    };
    render(<Sidebar />);
    expect(screen.queryByText('Administração')).not.toBeInTheDocument();
  });

  it('renders user name and specialty', () => {
    render(<Sidebar />);
    expect(screen.getByText('Dr. Carlos Eduardo')).toBeInTheDocument();
    expect(screen.getByText('Cardiologia')).toBeInTheDocument();
  });

  it('renders user initials in avatar fallback', () => {
    render(<Sidebar />);
    expect(screen.getByText('DC')).toBeInTheDocument();
  });

  it('calls logout and navigates to /login when logout button is clicked', async () => {
    const user = userEvent.setup();
    render(<Sidebar />);

    await user.click(screen.getByRole('button', { name: 'Sair' }));

    expect(mockLogout).toHaveBeenCalledOnce();
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('renders correct navigation link hrefs', () => {
    render(<Sidebar />);
    expect(screen.getByTestId('navlink-/dashboard')).toHaveAttribute('href', '/dashboard');
    expect(screen.getByTestId('navlink-/pacientes')).toHaveAttribute('href', '/pacientes');
    expect(screen.getByTestId('navlink-/atendimentos')).toHaveAttribute('href', '/atendimentos');
  });

  it('exposes an accessible logout control', () => {
    render(<Sidebar />);
    expect(screen.getByRole('button', { name: 'Sair' })).toBeInTheDocument();
  });

  it('shows role when specialty is not available', () => {
    mockUser = {
      id: '2',
      name: 'Maria Enfermeira',
      email: 'maria@starmed.com',
      role: 'NURSE',
      tenantId: 't1',
    };
    render(<Sidebar />);
    expect(screen.getByText('NURSE')).toBeInTheDocument();
  });
});
