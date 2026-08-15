import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { startAuthentication } from '@simplewebauthn/browser';
import {
  Activity,
  ArrowRight,
  Brain,
  Eye,
  EyeOff,
  Fingerprint,
  HeartPulse,
  Lock,
  Mail,
  Mic,
  ShieldCheck,
  Sparkles,
  Stethoscope,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/stores/auth.store';
import { loginApi, isMfaChallenge, detectSSOApi, meApi } from '@/services/auth.service';
import { webauthnLoginOptionsApi, webauthnLoginVerifyApi } from '@/services/webauthn.service';
import { usePageTitle } from '@/hooks/use-page-title';
import { cn } from '@/lib/utils';

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

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function MicrosoftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="10" height="10" fill="#F25022" />
      <rect x="13" y="1" width="10" height="10" fill="#7FBA00" />
      <rect x="1" y="13" width="10" height="10" fill="#00A4EF" />
      <rect x="13" y="13" width="10" height="10" fill="#FFB900" />
    </svg>
  );
}

function ProductFeature({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Mic;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4 backdrop-blur-sm">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/15">
        <Icon className="h-4 w-4 text-emerald-400" />
      </div>
      <div>
        <p className="text-sm font-medium text-white">{title}</p>
        <p className="mt-1 text-xs leading-relaxed text-zinc-400">{description}</p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  usePageTitle('Acesso');

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const login = useAuthStore((state) => state.login);
  const setMfaPending = useAuthStore((state) => state.setMfaPending);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [ssoDetection, setSSODetection] = useState<SSODetection | null>(null);
  const [ssoDetecting, setSSODetecting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const email = watch('email');
  const emailField = useMemo(() => register('email'), [register]);

  useEffect(() => {
    const ssoError = searchParams.get('sso_error');
    if (ssoError) toast.error(ssoError);
  }, [searchParams]);

  const handleSSOLogin = useCallback((provider: string) => {
    const configuredBase = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '');
    const baseUrl = configuredBase ?? '';
    window.location.assign(`${baseUrl}/api/v1/auth/sso/${provider}`);
  }, []);

  const handleEmailBlur = useCallback(async (event: React.FocusEvent<HTMLInputElement>) => {
    emailField.onBlur(event);
    const value = event.target.value.trim();
    if (!value.includes('@')) {
      setSSODetection(null);
      return;
    }

    setSSODetecting(true);
    try {
      const result = await detectSSOApi(value);
      setSSODetection(result.ssoEnabled ? result : null);
    } catch {
      setSSODetection(null);
    } finally {
      setSSODetecting(false);
    }
  }, [emailField]);

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
      toast.success('Bem-vindo ao StarMed');
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
      toast.success('Ambiente demonstrativo ativado');
      navigate('/dashboard');
    } catch {
      toast.error('Não foi possível iniciar o ambiente demonstrativo');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBiometricLogin = useCallback(async () => {
    const emailValue = email.trim();
    if (!emailValue || !emailValue.includes('@')) {
      toast.info('Informe seu email antes de usar a biometria');
      return;
    }

    setIsLoading(true);
    try {
      const options = await webauthnLoginOptionsApi(emailValue);
      const authentication = await startAuthentication({ optionsJSON: options as never });
      const result = await webauthnLoginVerifyApi(
        emailValue,
        authentication as unknown as Record<string, unknown>,
      );
      login(result.user, result.accessToken, result.refreshToken);
      toast.success('Autenticação biométrica concluída');
      navigate('/dashboard');
    } catch (error) {
      if (error instanceof Error && error.name === 'NotAllowedError') {
        toast.error('Autenticação cancelada');
      } else {
        toast.error('Falha na autenticação biométrica');
      }
    } finally {
      setIsLoading(false);
    }
  }, [email, login, navigate]);

  const supportsWebAuthn = typeof window !== 'undefined' && Boolean(window.PublicKeyCredential);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 lg:grid lg:grid-cols-[1.08fr_0.92fr]">
      <section className="relative hidden min-h-screen overflow-hidden border-r border-white/[0.06] lg:flex lg:flex-col">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.13),transparent_35%),radial-gradient(circle_at_75%_70%,rgba(13,148,136,0.08),transparent_30%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.025] [background-image:linear-gradient(rgba(255,255,255,.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.35)_1px,transparent_1px)] [background-size:54px_54px]" />

        <div className="relative z-10 flex items-center gap-3 px-10 py-8 xl:px-14">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20">
            <Activity className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-xl font-bold tracking-tight"><span className="text-white">Star</span><span className="text-emerald-400">Med</span></p>
            <p className="text-[9px] font-medium uppercase tracking-[0.2em] text-zinc-500">Intelligence Hospital</p>
          </div>
        </div>

        <div className="relative z-10 flex flex-1 flex-col justify-center px-10 pb-12 xl:px-14 2xl:px-20">
          <BadgeHero />
          <h1 className="mt-6 max-w-2xl text-4xl font-semibold leading-[1.08] tracking-[-0.035em] text-white xl:text-5xl 2xl:text-6xl">
            Menos ruído operacional.<br />
            <span className="bg-gradient-to-r from-emerald-300 via-emerald-400 to-teal-400 bg-clip-text text-transparent">Mais tempo para cuidar.</span>
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-7 text-zinc-400 xl:text-base">
            Um command center clínico para prontuário, assistência hospitalar e inteligência médica — construído para decisões rápidas sem perder contexto.
          </p>

          <div className="mt-10 grid max-w-2xl gap-3 xl:grid-cols-3">
            <ProductFeature icon={Mic} title="Voz clínica" description="Capture a consulta e estruture documentação com menos atrito." />
            <ProductFeature icon={Brain} title="IA assistiva" description="Contexto clínico e alertas no fluxo, sem substituir decisão médica." />
            <ProductFeature icon={HeartPulse} title="Operação ao vivo" description="Capacidade, risco e atendimento no mesmo painel operacional." />
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between border-t border-white/[0.06] px-10 py-5 text-[10px] text-zinc-500 xl:px-14">
          <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Segurança e privacidade por design</span>
          <span>StarMed Clinical Platform</span>
        </div>
      </section>

      <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-5 py-10 text-foreground sm:px-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-emerald-500/[0.07] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-teal-500/[0.05] blur-3xl" />

        <div className="relative w-full max-w-[430px]">
          <div className="mb-8 flex items-center justify-center gap-3 lg:hidden">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xl font-bold"><span>Star</span><span className="text-emerald-500">Med</span></p>
              <p className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Intelligence Hospital</p>
            </div>
          </div>

          <div className="mb-7">
            <p className="mb-2 flex items-center gap-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <Sparkles className="h-3.5 w-3.5" /> Acesso seguro
            </p>
            <h2 className="text-2xl font-semibold tracking-tight">Bem-vindo de volta</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Entre com sua conta para acessar o ambiente clínico.</p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <Button type="button" variant="outline" className="h-11 rounded-xl" disabled={isLoading} onClick={() => handleSSOLogin('google')}>
              <GoogleIcon className="mr-2 h-4 w-4" /> Google
            </Button>
            <Button type="button" variant="outline" className="h-11 rounded-xl" disabled={isLoading} onClick={() => handleSSOLogin('microsoft')}>
              <MicrosoftIcon className="mr-2 h-4 w-4" /> Microsoft
            </Button>
          </div>

          {supportsWebAuthn && (
            <Button type="button" variant="outline" className="mt-2 h-11 w-full rounded-xl" disabled={isLoading} onClick={() => void handleBiometricLogin()}>
              <Fingerprint className="mr-2 h-4 w-4 text-emerald-500" /> Entrar com biometria
            </Button>
          )}

          <div className="my-6 flex items-center gap-3 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> ou use suas credenciais <span className="h-px flex-1 bg-border" />
          </div>

          {ssoDetection?.ssoEnabled && (
            <div className="mb-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.05] p-4">
              <p className="text-xs leading-relaxed text-emerald-700 dark:text-emerald-300">
                {ssoDetection.tenantName ? `${ssoDetection.tenantName} usa autenticação institucional.` : 'Sua organização usa autenticação institucional.'}
              </p>
              <Button type="button" variant="ghost" size="sm" className="mt-1 h-8 gap-1 px-0 text-xs text-emerald-600 dark:text-emerald-400" onClick={() => handleSSOLogin(ssoDetection.provider ?? 'google')}>
                Continuar com SSO <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="username"
                  placeholder="nome@hospital.com.br"
                  className={cn('h-11 rounded-xl pl-10', errors.email && 'border-red-500 focus-visible:ring-red-500/30')}
                  {...emailField}
                  onBlur={handleEmailBlur}
                  aria-invalid={Boolean(errors.email)}
                />
                {ssoDetecting && <Activity className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-pulse text-emerald-500" />}
              </div>
              {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className={cn('h-11 rounded-xl px-10', errors.password && 'border-red-500 focus-visible:ring-red-500/30')}
                  {...register('password')}
                  aria-invalid={Boolean(errors.password)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
            </div>

            <Button type="submit" className="h-11 w-full gap-2 rounded-xl" loading={isLoading}>
              Entrar no StarMed {!isLoading && <ArrowRight className="h-4 w-4" />}
            </Button>
          </form>

          <Button type="button" variant="ghost" className="mt-3 h-10 w-full rounded-xl text-xs text-muted-foreground" disabled={isLoading} onClick={() => void handleDemoLogin()}>
            <Stethoscope className="mr-2 h-4 w-4" /> Acessar ambiente demonstrativo
          </Button>

          <p className="mt-8 text-center text-[10px] leading-relaxed text-muted-foreground">
            Ao entrar, você acessa um ambiente destinado a dados clínicos protegidos. Use apenas credenciais autorizadas.
          </p>
        </div>
      </section>
    </main>
  );
}

function BadgeHero() {
  return (
    <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-500/15 bg-emerald-500/[0.07] px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.13em] text-emerald-300">
      <Sparkles className="h-3 w-3" /> Clinical operating system
    </div>
  );
}
