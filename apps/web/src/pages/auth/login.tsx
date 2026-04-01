import { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { startAuthentication } from '@simplewebauthn/browser';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Stethoscope,
  Fingerprint,
  Mic,
  Brain,
  FileText,
  Activity,
  Shield,
  Heart,
  Pill,
  Syringe,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuthStore } from '@/stores/auth.store';
import { loginApi, isMfaChallenge, detectSSOApi, meApi } from '@/services/auth.service';
import { webauthnLoginOptionsApi, webauthnLoginVerifyApi } from '@/services/webauthn.service';
import { cn } from '@/lib/utils';

/* ─── Schema ─── */
const loginSchema = z.object({
  email: z.string().min(1, 'Email é obrigatório').email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória').min(6, 'Mínimo 6 caracteres'),
});

type LoginForm = z.infer<typeof loginSchema>;

interface SSODetection {
  ssoEnabled: boolean;
  provider: string | null;
  tenantName: string | null;
}

/* ─── SSO Icons ─── */
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function MicrosoftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <rect x="1" y="1" width="10" height="10" fill="#F25022"/>
      <rect x="13" y="1" width="10" height="10" fill="#7FBA00"/>
      <rect x="1" y="13" width="10" height="10" fill="#00A4EF"/>
      <rect x="13" y="13" width="10" height="10" fill="#FFB900"/>
    </svg>
  );
}

/* ─── Floating Icon Component ─── */
function FloatingIcon({
  icon: Icon,
  delay,
  duration,
  x,
  y,
  size,
}: {
  icon: typeof Heart;
  delay: number;
  duration: number;
  x: number;
  y: number;
  size: number;
}) {
  return (
    <div
      className="absolute text-emerald-500/[0.07] dark:text-emerald-400/[0.07]"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        animation: `login-float ${duration}s ease-in-out infinite`,
        animationDelay: `${delay}s`,
      }}
    >
      <Icon size={size} strokeWidth={1.5} />
    </div>
  );
}

/* ─── Feature Highlight ─── */
function FeatureHighlight({
  icon: Icon,
  title,
  description,
  delay,
}: {
  icon: typeof Brain;
  title: string;
  description: string;
  delay: number;
}) {
  return (
    <div
      className="flex items-start gap-3 opacity-0"
      style={{
        animation: `login-slide-in 0.6s ease-out forwards`,
        animationDelay: `${delay}s`,
      }}
    >
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 ring-1 ring-emerald-500/20">
        <Icon className="h-4 w-4 text-emerald-400" />
      </div>
      <div>
        <p className="text-sm font-medium text-white">{title}</p>
        <p className="text-xs text-zinc-400 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

/* ─── Pulse Dot ─── */
function PulseDot({ x, y, delay, color }: { x: number; y: number; delay: number; color: string }) {
  return (
    <div
      className="absolute rounded-full"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        width: 4,
        height: 4,
        backgroundColor: color,
        animation: `login-pulse-dot 3s ease-in-out infinite`,
        animationDelay: `${delay}s`,
      }}
    />
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   LOGIN PAGE
   ═══════════════════════════════════════════════════════════════════════════ */

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [ssoDetection, setSSODetection] = useState<SSODetection | null>(null);
  const [ssoDetecting, setSSODetecting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, setMfaPending } = useAuthStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Show SSO error from callback redirect
  const ssoError = searchParams.get('sso_error');
  useEffect(() => {
    if (ssoError) {
      toast.error(ssoError);
    }
  }, [ssoError]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const handleEmailBlur = useCallback(async (e: React.FocusEvent<HTMLInputElement>) => {
    const email = e.target.value;
    if (!email || !email.includes('@')) return;

    setSSODetecting(true);
    try {
      const result = await detectSSOApi(email);
      if (result.ssoEnabled) {
        setSSODetection(result);
      } else {
        setSSODetection(null);
      }
    } catch {
      setSSODetection(null);
    } finally {
      setSSODetecting(false);
    }
  }, []);

  const onSubmit = async (formData: LoginForm) => {
    setIsLoading(true);
    try {
      const result = await loginApi(formData.email, formData.password);

      if (isMfaChallenge(result)) {
        setMfaPending(result.mfaToken);
        navigate('/mfa-verify');
        return;
      }

      login(result.user, result.accessToken, result.refreshToken);
      toast.success('Bem-vindo ao VoxPEP!');
      navigate('/dashboard');
    } catch {
      toast.error('Email ou senha inválidos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setIsLoading(true);
    try {
      const demoUser = await meApi();
      login(demoUser, 'demo-access-token', 'demo-refresh-token');
      toast.success('Modo demo ativado — dados simulados');
      navigate('/dashboard');
    } catch {
      toast.error('Erro ao carregar dados do modo demo');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBiometricLogin = useCallback(async () => {
    const emailValue = prompt('Digite seu email para login biométrico:');
    if (!emailValue) return;

    setIsLoading(true);
    try {
      const options = await webauthnLoginOptionsApi(emailValue);
      const authResp = await startAuthentication({ optionsJSON: options as never });
      const result = await webauthnLoginVerifyApi(
        emailValue,
        authResp as unknown as Record<string, unknown>,
      );
      login(result.user, result.accessToken, result.refreshToken);
      toast.success('Bem-vindo ao VoxPEP!');
      navigate('/dashboard');
    } catch (error) {
      if (error instanceof Error && error.name === 'NotAllowedError') {
        toast.error('Autenticação cancelada');
      } else {
        toast.error('Falha na autenticação biométrica. Verifique seu email ou use senha.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [login, navigate]);

  const handleSSOLogin = (provider: string) => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    window.location.href = `${apiUrl}/api/v1/auth/sso/${provider}`;
  };

  /* Memoize floating icons to avoid re-render jitter */
  const floatingIcons = useMemo(
    () => [
      { icon: Heart, delay: 0, duration: 20, x: 8, y: 15, size: 28 },
      { icon: Activity, delay: 3, duration: 24, x: 75, y: 10, size: 32 },
      { icon: Pill, delay: 6, duration: 22, x: 85, y: 60, size: 24 },
      { icon: Shield, delay: 2, duration: 26, x: 15, y: 70, size: 26 },
      { icon: Syringe, delay: 8, duration: 18, x: 60, y: 80, size: 22 },
      { icon: Stethoscope, delay: 4, duration: 21, x: 40, y: 25, size: 30 },
      { icon: FileText, delay: 7, duration: 23, x: 25, y: 50, size: 24 },
      { icon: Brain, delay: 1, duration: 19, x: 70, y: 40, size: 28 },
    ],
    [],
  );

  const pulseDots = useMemo(
    () => [
      { x: 20, y: 30, delay: 0, color: 'rgba(16,185,129,0.3)' },
      { x: 80, y: 20, delay: 1, color: 'rgba(16,185,129,0.2)' },
      { x: 50, y: 70, delay: 2, color: 'rgba(52,211,153,0.25)' },
      { x: 10, y: 85, delay: 0.5, color: 'rgba(16,185,129,0.15)' },
      { x: 90, y: 50, delay: 1.5, color: 'rgba(52,211,153,0.2)' },
      { x: 35, y: 90, delay: 3, color: 'rgba(16,185,129,0.2)' },
    ],
    [],
  );

  return (
    <div className="flex min-h-screen">
      {/* ═══════════════════════════════════════════════════════════════════
          LEFT PANEL — Branding & Illustration
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="relative hidden w-[55%] overflow-hidden lg:flex lg:flex-col lg:justify-between bg-zinc-950">
        {/* Gradient mesh background */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-zinc-950 to-emerald-950/20" />
          <div className="absolute -left-32 -top-32 h-[500px] w-[500px] rounded-full bg-emerald-600/8 blur-[150px]" />
          <div className="absolute -bottom-48 -right-48 h-[600px] w-[600px] rounded-full bg-emerald-500/5 blur-[180px]" />
          <div className="absolute left-1/2 top-1/3 h-[300px] w-[300px] -translate-x-1/2 rounded-full bg-teal-500/5 blur-[120px]" />
        </div>

        {/* Grid pattern overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />

        {/* Floating medical icons */}
        <div className="pointer-events-none absolute inset-0">
          {floatingIcons.map((props, i) => (
            <FloatingIcon key={i} {...props} />
          ))}
        </div>

        {/* Pulse dots */}
        <div className="pointer-events-none absolute inset-0">
          {pulseDots.map((props, i) => (
            <PulseDot key={i} {...props} />
          ))}
        </div>

        {/* ECG line across middle */}
        <div className="pointer-events-none absolute left-0 right-0 top-1/2 -translate-y-1/2 opacity-10">
          <svg viewBox="0 0 1200 60" className="w-full" preserveAspectRatio="none">
            <polyline
              fill="none"
              stroke="url(#left-ecg)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeDasharray="1200"
              strokeDashoffset="1200"
              style={{ animation: 'ecg-draw 4s linear infinite' }}
              points="0,30 100,30 120,30 135,10 150,50 165,15 180,45 195,30 400,30 420,30 435,8 450,52 465,12 480,48 495,30 700,30 720,30 735,10 750,50 765,15 780,45 795,30 1000,30 1020,30 1035,8 1050,52 1065,12 1080,48 1095,30 1200,30"
            />
            <defs>
              <linearGradient id="left-ecg" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0" />
                <stop offset="20%" stopColor="#10b981" stopOpacity="1" />
                <stop offset="80%" stopColor="#10b981" stopOpacity="1" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Main content */}
        <div className="relative z-10 flex flex-1 flex-col justify-center px-12 xl:px-20">
          {/* Logo */}
          <div
            className={cn(
              'mb-10 opacity-0',
              mounted && 'animate-[login-slide-in_0.8s_ease-out_0.2s_forwards]',
            )}
          >
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/25">
                <Stethoscope className="h-6 w-6 text-white" />
              </div>
              <span className="text-lg font-semibold tracking-wide text-zinc-400">
                Prontuário Eletrônico
              </span>
            </div>

            <h1 className="text-5xl font-bold tracking-tight xl:text-6xl">
              <span className="bg-gradient-to-r from-white via-white to-zinc-400 bg-clip-text text-transparent">
                Vox
              </span>
              <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                PEP
              </span>
            </h1>

            <p className="mt-4 text-xl font-light tracking-wide text-zinc-400 xl:text-2xl">
              Fale.{' '}
              <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent font-normal">
                O prontuário escuta.
              </span>
            </p>
          </div>

          {/* Feature highlights */}
          <div className="space-y-5">
            <FeatureHighlight
              icon={Mic}
              title="Reconhecimento de Voz"
              description="Dite suas notas clínicas. A IA transcreve e estrutura automaticamente."
              delay={0.6}
            />
            <FeatureHighlight
              icon={Brain}
              title="IA Clínica Avançada"
              description="Sugestões inteligentes de diagnóstico, prescrições e alertas em tempo real."
              delay={0.9}
            />
            <FeatureHighlight
              icon={FileText}
              title="Prontuário Inteligente"
              description="Documentação SOAP automatizada com integração completa ao fluxo clínico."
              delay={1.2}
            />
          </div>
        </div>

        {/* Bottom bar */}
        <div className="relative z-10 border-t border-white/5 px-12 py-5 xl:px-20">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>LGPD Compliant</span>
            <span className="flex items-center gap-1.5">
              <Shield className="h-3 w-3" />
              Dados criptografados em repouso e em trânsito
            </span>
            <span>ANVISA / CFM</span>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          RIGHT PANEL — Login Form
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="relative flex flex-1 flex-col items-center justify-center bg-white dark:bg-zinc-950 lg:bg-zinc-50 lg:dark:bg-zinc-900/50">
        {/* Subtle background glow for right panel */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-emerald-500/5 blur-[100px]" />
          <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-teal-500/3 blur-[100px]" />
        </div>

        {/* Mobile header — visible only on small screens */}
        <div className="relative z-10 w-full px-6 pb-4 pt-8 lg:hidden">
          <div className="flex items-center justify-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20">
              <Stethoscope className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                <span className="text-foreground">Vox</span>
                <span className="bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
                  PEP
                </span>
              </h1>
            </div>
          </div>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Fale. O prontuário escuta.
          </p>
        </div>

        {/* Form container */}
        <div
          className={cn(
            'relative z-10 w-full max-w-[420px] px-6 sm:px-8 opacity-0',
            mounted && 'animate-[login-slide-in_0.6s_ease-out_0.1s_forwards]',
          )}
        >
          {/* Greeting */}
          <div className="mb-8 hidden lg:block">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              Bem-vindo de volta
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Entre com suas credenciais para acessar o prontuário.
            </p>
          </div>

          {/* SSO Buttons */}
          <div className="space-y-2.5 mb-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleSSOLogin('google')}
              className="w-full h-11 bg-white dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-600 text-foreground transition-all duration-200"
            >
              <GoogleIcon className="h-5 w-5 mr-3" />
              Entrar com Google
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => handleSSOLogin('microsoft')}
              className="w-full h-11 bg-white dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-600 text-foreground transition-all duration-200"
            >
              <MicrosoftIcon className="h-5 w-5 mr-3" />
              Entrar com Microsoft
            </Button>

            {/* WebAuthn Biometric Login */}
            {typeof window !== 'undefined' && window.PublicKeyCredential && (
              <Button
                type="button"
                variant="outline"
                onClick={handleBiometricLogin}
                disabled={isLoading}
                className="w-full h-11 bg-white dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-600 text-foreground transition-all duration-200"
              >
                <Fingerprint className="h-5 w-5 mr-3 text-emerald-600 dark:text-emerald-400" />
                Entrar com Biometria
              </Button>
            )}
          </div>

          {/* SSO Detection Banner */}
          {ssoDetection?.ssoEnabled && (
            <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-center">
              <p className="text-xs text-emerald-700 dark:text-emerald-400">
                {ssoDetection.tenantName
                  ? `${ssoDetection.tenantName} usa login institucional via ${ssoDetection.provider === 'google' ? 'Google' : 'Microsoft'}.`
                  : `Login institucional disponível via ${ssoDetection.provider === 'google' ? 'Google' : 'Microsoft'}.`}
              </p>
              <button
                type="button"
                onClick={() => handleSSOLogin(ssoDetection.provider ?? 'google')}
                className="mt-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 underline transition-colors"
              >
                Entrar com SSO
              </button>
            </div>
          )}

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-200 dark:border-zinc-700" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white dark:bg-zinc-950 lg:bg-zinc-50 lg:dark:bg-zinc-900/50 px-3 text-muted-foreground">
                ou continue com email
              </span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Email */}
            <div
              className={cn(
                'space-y-2 opacity-0',
                mounted && 'animate-[login-slide-in_0.5s_ease-out_0.2s_forwards]',
              )}
            >
              <Label htmlFor="email" className="text-sm font-medium text-foreground">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@hospital.com.br"
                  className={cn(
                    'pl-10 h-11 bg-white dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 focus:border-emerald-500/50 focus:ring-emerald-500/20 transition-colors',
                    errors.email && 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20',
                  )}
                  {...register('email')}
                  onBlur={(e) => {
                    register('email').onBlur(e);
                    handleEmailBlur(e);
                  }}
                />
                {ssoDetecting && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                  </div>
                )}
              </div>
              {errors.email && (
                <p className="text-xs text-red-500 dark:text-red-400">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div
              className={cn(
                'space-y-2 opacity-0',
                mounted && 'animate-[login-slide-in_0.5s_ease-out_0.3s_forwards]',
              )}
            >
              <Label htmlFor="password" className="text-sm font-medium text-foreground">
                Senha
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className={cn(
                    'pl-10 pr-10 h-11 bg-white dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 focus:border-emerald-500/50 focus:ring-emerald-500/20 transition-colors',
                    errors.password && 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20',
                  )}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-500 dark:text-red-400">{errors.password.message}</p>
              )}
            </div>

            {/* Remember me + Forgot password */}
            <div
              className={cn(
                'flex items-center justify-between opacity-0',
                mounted && 'animate-[login-slide-in_0.5s_ease-out_0.4s_forwards]',
              )}
            >
              <div className="flex items-center gap-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked === true)}
                  className="border-zinc-300 dark:border-zinc-600 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                />
                <Label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer">
                  Lembrar de mim
                </Label>
              </div>
              <button
                type="button"
                className="text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium transition-colors"
              >
                Esqueci minha senha
              </button>
            </div>

            {/* Submit */}
            <div
              className={cn(
                'pt-1 opacity-0',
                mounted && 'animate-[login-slide-in_0.5s_ease-out_0.5s_forwards]',
              )}
            >
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 text-base font-semibold shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all duration-300 disabled:opacity-60"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Entrando...
                  </div>
                ) : (
                  'Entrar'
                )}
              </Button>
            </div>
          </form>

          {/* Demo mode */}
          <div
            className={cn(
              'mt-8 rounded-xl border border-zinc-200 dark:border-zinc-700/50 bg-zinc-50/50 dark:bg-zinc-800/30 p-4 text-center opacity-0',
              mounted && 'animate-[login-slide-in_0.5s_ease-out_0.6s_forwards]',
            )}
          >
            <p className="text-xs text-muted-foreground/70 mb-2.5">
              Sem backend configurado? Explore com dados simulados:
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={handleDemoLogin}
              disabled={isLoading}
              className="h-9 text-xs bg-white dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 hover:border-emerald-300 dark:hover:border-emerald-700 text-emerald-700 dark:text-emerald-400 transition-all duration-200"
            >
              <Stethoscope className="h-3.5 w-3.5 mr-2" />
              Entrar em modo Demo
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 mt-auto w-full border-t border-zinc-200/50 dark:border-zinc-800 px-6 py-4 text-center lg:text-left lg:px-12">
          <p className="text-xs text-muted-foreground/50">
            VoxPEP &copy; {new Date().getFullYear()} — Prontuário Eletrônico Inteligente
          </p>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          CSS Animations
          ═══════════════════════════════════════════════════════════════════ */}
      <style>{`
        @keyframes login-float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          25% { transform: translateY(-12px) rotate(3deg); }
          50% { transform: translateY(-6px) rotate(-2deg); }
          75% { transform: translateY(-15px) rotate(1deg); }
        }

        @keyframes login-slide-in {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes login-pulse-dot {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(2); }
        }
      `}</style>
    </div>
  );
}
