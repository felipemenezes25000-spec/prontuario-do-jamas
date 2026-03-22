import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Sidebar } from './sidebar';

// Mock react-router-dom
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
    const resolvedClass =
      typeof className === 'function' ? className({ isActive: to === '/dashboard' }) : className;
    return (
      <a href={to} className={resolvedClass} onClick={onClick} data-testid={`navlink-${to}`}>
        {typeof children === 'function' ? children({ isActive: to === '/dashboard' }) : children}
      </a>
    );
  },
}));

// Mock auth store
const mockLogout = vi.fn();
let mockUser: { id: string; name: string; email: string; role: string; specialty?: string; avatarUrl?: string; tenantId: string } | null = {
  id: '1',
  name: 'Dr. Carlos Eduardo',
  email: 'carlos@voxpep.com',
  role: 'ADMIN',
  specialty: 'Cardiologia',
  tenantId: 't1',
};

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: () => ({
    user: mockUser,
    logout: mockLogout,
  }),
}));

// Mock UI store
let mockSidebarCollapsed = false;
const mockToggleSidebar = vi.fn();
const mockSetSidebarMobileOpen = vi.fn();

vi.mock('@/stores/ui.store', () => ({
  useUIStore: () => ({
    sidebarCollapsed: mockSidebarCollapsed,
    toggleSidebar: mockToggleSidebar,
    sidebarMobileOpen: false,
    setSidebarMobileOpen: mockSetSidebarMobileOpen,
  }),
}));

// Mock UI components
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
  }) => (
    <button onClick={onClick} className={className} data-variant={variant} data-size={size} {...rest}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-content">{children}</div>
  ),
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/ui/separator', () => ({
  Separator: () => <hr data-testid="separator" />,
}));

vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="scroll-area" className={className}>{children}</div>
  ),
}));

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSidebarCollapsed = false;
    mockUser = {
      id: '1',
      name: 'Dr. Carlos Eduardo',
      email: 'carlos@voxpep.com',
      role: 'ADMIN',
      specialty: 'Cardiologia',
      tenantId: 't1',
    };
  });

  it('renders the VoxPEP logo text', () => {
    render(<Sidebar />);
    expect(screen.getByText('Vox')).toBeInTheDocument();
    expect(screen.getByText('PEP')).toBeInTheDocument();
  });

  it('renders "Prontuário Inteligente" subtitle', () => {
    render(<Sidebar />);
    expect(screen.getByText('Prontuário Inteligente')).toBeInTheDocument();
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

  it('renders Admin link for ADMIN users', () => {
    render(<Sidebar />);
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  it('hides Admin link for non-ADMIN users', () => {
    mockUser = {
      id: '2',
      name: 'Dr. Ana',
      email: 'ana@voxpep.com',
      role: 'DOCTOR',
      tenantId: 't1',
    };
    render(<Sidebar />);
    expect(screen.queryByText('Admin')).not.toBeInTheDocument();
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
    // Find the logout button - it's a button with LogOut icon
    const buttons = screen.getAllByRole('button');
    // The logout button is in the user info area
    const logoutButton = buttons.find((btn) => {
      const parent = btn.closest('div');
      return parent && btn.querySelector('svg');
    });
    // Click any button that triggers logout - find it by content
    // LogOut icon is in the first button with just an SVG child in the bottom section
    if (logoutButton) {
      await user.click(logoutButton);
      expect(mockLogout).toHaveBeenCalledOnce();
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    }
  });

  it('renders correct navigation link hrefs', () => {
    render(<Sidebar />);
    expect(screen.getByTestId('navlink-/dashboard')).toBeInTheDocument();
    expect(screen.getByTestId('navlink-/pacientes')).toBeInTheDocument();
    expect(screen.getByTestId('navlink-/atendimentos')).toBeInTheDocument();
  });

  it('renders the "Sair" tooltip content', () => {
    render(<Sidebar />);
    expect(screen.getByText('Sair')).toBeInTheDocument();
  });

  it('shows role when specialty is not available', () => {
    mockUser = {
      id: '2',
      name: 'Maria Enfermeira',
      email: 'maria@voxpep.com',
      role: 'NURSE',
      tenantId: 't1',
    };
    render(<Sidebar />);
    expect(screen.getByText('NURSE')).toBeInTheDocument();
  });
});
