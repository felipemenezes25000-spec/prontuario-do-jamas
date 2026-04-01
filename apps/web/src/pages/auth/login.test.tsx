import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from './login';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
}));

// Mock auth store
const mockLogin = vi.fn();
vi.mock('@/stores/auth.store', () => ({
  useAuthStore: () => ({
    login: mockLogin,
    setMfaPending: vi.fn(),
  }),
}));

// Mock auth service
const mockLoginApi = vi.fn();
vi.mock('@/services/auth.service', () => ({
  loginApi: (...args: unknown[]) => mockLoginApi(...args),
  isMfaChallenge: () => false,
  detectSSOApi: vi.fn().mockResolvedValue({ ssoEnabled: false }),
}));

// Mock sonner
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

// Mock UI components
vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    type,
    disabled,
    className,
    ...rest
  }: {
    children: React.ReactNode;
    type?: string;
    disabled?: boolean;
    className?: string;
  }) => (
    <button type={type as 'button' | 'submit'} disabled={disabled} className={className} {...rest}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/input', () => ({
  Input: React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { className?: string }>(
    ({ className, ...props }, ref) => (
      <input ref={ref} className={className} {...props} />
    ),
  ),
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, ...rest }: { children: React.ReactNode; htmlFor?: string; className?: string }) => (
    <label {...rest}>{children}</label>
  ),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  CardContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
}));

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the VoxPEP branding', () => {
    render(<LoginPage />);
    // Logo text may be split across "Vox" + "PEP" for gradient styling
    expect(screen.getAllByText(/Vox/i).length).toBeGreaterThan(0);
    expect(screen.getByText('Fale. O prontuário escuta.')).toBeInTheDocument();
  });

  it('renders email and password inputs', () => {
    render(<LoginPage />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Senha')).toBeInTheDocument();
  });

  it('renders submit button with text "Entrar"', () => {
    render(<LoginPage />);
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument();
  });

  it('shows email validation error when submitted empty', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    await waitFor(() => {
      expect(screen.getByText('Email é obrigatório')).toBeInTheDocument();
    });
  });

  it('shows password validation error when submitted empty', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    await waitFor(() => {
      expect(screen.getByText('Senha é obrigatória')).toBeInTheDocument();
    });
  });

  it('shows invalid email error for malformed email', async () => {
    render(<LoginPage />);
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Senha');

    fireEvent.change(emailInput, { target: { value: 'notanemail' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Entrar' }).closest('form')!);

    await waitFor(() => {
      expect(screen.getByText('Email inválido')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('shows minimum password length error', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);
    await user.type(screen.getByLabelText('Email'), 'test@test.com');
    await user.type(screen.getByLabelText('Senha'), '123');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    await waitFor(() => {
      expect(screen.getByText('Mínimo 6 caracteres')).toBeInTheDocument();
    });
  });

  it('calls loginApi on successful form submission', async () => {
    const mockResult = {
      user: { id: '1', name: 'Dr. Carlos', email: 'carlos@voxpep.com', role: 'ADMIN' as const, tenantId: 't1' },
      accessToken: 'token',
      refreshToken: 'refresh',
    };
    mockLoginApi.mockImplementation(() => Promise.resolve(mockResult));

    render(<LoginPage />);
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Senha');

    fireEvent.change(emailInput, { target: { value: 'carlos@voxpep.com' } });
    fireEvent.change(passwordInput, { target: { value: 'admin123' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Entrar' }).closest('form')!);

    await waitFor(() => {
      expect(mockLoginApi).toHaveBeenCalledWith('carlos@voxpep.com', 'admin123');
    }, { timeout: 5000 });
  });

  it('shows loading state during form submission', async () => {
    const user = userEvent.setup();
    // Use a deferred promise to observe the loading state
    mockLoginApi.mockImplementation(
      () => new Promise(() => {/* never resolves */}),
    );

    render(<LoginPage />);
    await user.type(screen.getByLabelText('Email'), 'a@b.com');
    await user.type(screen.getByLabelText('Senha'), 'abcdef');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => {
      expect(mockLoginApi).toHaveBeenCalled();
    });

    // The button should show loading text while the API call is in flight
    expect(screen.getByText('Entrando...')).toBeInTheDocument();
  });

  it('shows error toast on failed login', async () => {
    const user = userEvent.setup();
    mockLoginApi.mockRejectedValue(new Error('Invalid'));

    render(<LoginPage />);
    await user.type(screen.getByLabelText('Email'), 'wrong@email.com');
    await user.type(screen.getByLabelText('Senha'), 'wrongpass');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Email ou senha inválidos');
    });
  });

  it('toggles password visibility', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);
    const passwordInput = screen.getByLabelText('Senha');
    expect(passwordInput).toHaveAttribute('type', 'password');

    // Find the toggle button (the eye button next to password)
    const toggleButtons = screen.getAllByRole('button');
    const toggleButton = toggleButtons.find(
      (btn) => !btn.textContent?.includes('Entrar') && !btn.textContent?.includes('Esqueceu'),
    );
    expect(toggleButton).toBeDefined();
    await user.click(toggleButton!);

    expect(passwordInput).toHaveAttribute('type', 'text');
  });

  it('renders "Esqueci minha senha" link', () => {
    render(<LoginPage />);
    expect(screen.getByText('Esqueci minha senha')).toBeInTheDocument();
  });

  it('renders demo mode button', () => {
    render(<LoginPage />);
    expect(
      screen.getByText(/Entrar em modo Demo/i),
    ).toBeInTheDocument();
  });
});
