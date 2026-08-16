import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from './login';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
}));

const mockLogin = vi.fn();
const mockSetMfaPending = vi.fn();
interface MockAuthState {
  login: typeof mockLogin;
  setMfaPending: typeof mockSetMfaPending;
}

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: <T,>(selector?: (state: MockAuthState) => T) => {
    const state: MockAuthState = {
      login: mockLogin,
      setMfaPending: mockSetMfaPending,
    };
    return selector ? selector(state) : state;
  },
}));

const mockLoginApi = vi.fn();
const mockMeApi = vi.fn();
vi.mock('@/services/auth.service', () => ({
  loginApi: (...args: unknown[]) => mockLoginApi(...args),
  isMfaChallenge: () => false,
  detectSSOApi: vi.fn().mockResolvedValue({ ssoEnabled: false }),
  meApi: (...args: unknown[]) => mockMeApi(...args),
}));

vi.mock('@/services/webauthn.service', () => ({
  webauthnLoginOptionsApi: vi.fn(),
  webauthnLoginVerifyApi: vi.fn(),
}));

vi.mock('@/hooks/use-page-title', () => ({
  usePageTitle: vi.fn(),
}));

const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
const mockToastInfo = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
    info: (...args: unknown[]) => mockToastInfo(...args),
  },
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    type,
    disabled,
    className,
    onClick,
    ...rest
  }: {
    children: React.ReactNode;
    type?: 'button' | 'submit' | 'reset';
    disabled?: boolean;
    className?: string;
    onClick?: React.MouseEventHandler<HTMLButtonElement>;
    [key: string]: unknown;
  }) => (
    <button type={type} disabled={disabled} className={className} onClick={onClick} {...rest}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/input', () => ({
  Input: React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { className?: string }>(
    ({ className, ...props }, ref) => <input ref={ref} className={className} {...props} />,
  ),
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, ...rest }: { children: React.ReactNode; htmlFor?: string; className?: string }) => (
    <label {...rest}>{children}</label>
  ),
}));

const submitButton = () => screen.getByRole('button', { name: 'Entrar no StarMed' });

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the StarMed branding', () => {
    render(<LoginPage />);
    expect(screen.getAllByText('Star').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Med').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Intelligence Hospital').length).toBeGreaterThan(0);
    expect(screen.getByText('Bem-vindo de volta')).toBeInTheDocument();
  });

  it('renders email and password inputs', () => {
    render(<LoginPage />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Senha')).toBeInTheDocument();
  });

  it('renders the StarMed submit button', () => {
    render(<LoginPage />);
    expect(submitButton()).toBeInTheDocument();
  });

  it('shows email validation error when submitted empty', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);
    await user.click(submitButton());
    await waitFor(() => {
      expect(screen.getByText('Email é obrigatório')).toBeInTheDocument();
    });
  });

  it('shows password validation error when submitted empty', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);
    await user.click(submitButton());
    await waitFor(() => {
      expect(screen.getByText('Senha é obrigatória')).toBeInTheDocument();
    });
  });

  it('shows invalid email error for malformed email', async () => {
    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'notanemail' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'password123' } });
    fireEvent.submit(submitButton().closest('form')!);

    await waitFor(() => {
      expect(screen.getByText('Email inválido')).toBeInTheDocument();
    });
  });

  it('shows minimum password length error', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);
    await user.type(screen.getByLabelText('Email'), 'test@test.com');
    await user.type(screen.getByLabelText('Senha'), '123');
    await user.click(submitButton());
    await waitFor(() => {
      expect(screen.getByText('Mínimo 6 caracteres')).toBeInTheDocument();
    });
  });

  it('calls loginApi on successful form submission', async () => {
    const mockResult = {
      user: {
        id: '1',
        name: 'Dr. Carlos',
        email: 'carlos@starmed.com',
        role: 'ADMIN' as const,
        tenantId: 't1',
      },
      accessToken: 'token',
      refreshToken: 'refresh',
    };
    mockLoginApi.mockResolvedValue(mockResult);

    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'carlos@starmed.com' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'admin123' } });
    fireEvent.submit(submitButton().closest('form')!);

    await waitFor(() => {
      expect(mockLoginApi).toHaveBeenCalledWith('carlos@starmed.com', 'admin123');
      expect(mockLogin).toHaveBeenCalledWith(mockResult.user, 'token', 'refresh');
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('shows loading state during form submission', async () => {
    const user = userEvent.setup();
    mockLoginApi.mockImplementation(() => new Promise(() => undefined));

    render(<LoginPage />);
    await user.type(screen.getByLabelText('Email'), 'a@b.com');
    await user.type(screen.getByLabelText('Senha'), 'abcdef');
    await user.click(submitButton());

    await waitFor(() => expect(mockLoginApi).toHaveBeenCalled());
    expect(screen.getByText('Entrando...')).toBeInTheDocument();
  });

  it('shows error toast on failed login', async () => {
    const user = userEvent.setup();
    mockLoginApi.mockRejectedValue(new Error('Invalid'));

    render(<LoginPage />);
    await user.type(screen.getByLabelText('Email'), 'wrong@email.com');
    await user.type(screen.getByLabelText('Senha'), 'wrongpass');
    await user.click(submitButton());

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Email ou senha inválidos');
    });
  });

  it('toggles password visibility', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);
    const passwordInput = screen.getByLabelText('Senha');
    expect(passwordInput).toHaveAttribute('type', 'password');

    await user.click(screen.getByRole('button', { name: 'Mostrar senha' }));
    expect(passwordInput).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Ocultar senha' })).toBeInTheDocument();
  });

  it('renders the forgot-password action', () => {
    render(<LoginPage />);
    expect(screen.getByText('Esqueci minha senha')).toBeInTheDocument();
  });

  it('renders demo mode button', () => {
    render(<LoginPage />);
    expect(screen.getByRole('button', { name: 'Acessar ambiente demonstrativo' })).toBeInTheDocument();
  });
});
