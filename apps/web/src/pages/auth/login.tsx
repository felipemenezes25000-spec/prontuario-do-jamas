import { useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, Lock, Eye, EyeOff, Stethoscope } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useAuthStore } from '@/stores/auth.store';
import { loginApi, isMfaChallenge, detectSSOApi, meApi } from '@/services/auth.service';
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

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [ssoDetection, setSSODetection] = useState<SSODetection | null>(null);
  const [ssoDetecting, setSSODetecting] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, setMfaPending } = useAuthStore();

  // Show SSO error from callback redirect
  const ssoError = searchParams.get('sso_error');
  if (ssoError) {
    // Show once via toast on mount effect handled by react-router
    toast.error(ssoError);
  }

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
      // Silently ignore SSO detection failures
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

  const handleSSOLogin = (provider: string) => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    window.location.href = `${apiUrl}/api/v1/auth/sso/${provider}`;
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-teal-50 via-background to-cyan-50 dark:from-[#09090b] dark:via-[#09090b] dark:to-[#09090b]">
      {/* Animated gradient background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-teal-500/10 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-cyan-500/8 blur-[120px]" />
        <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal-500/5 blur-[100px]" />
      </div>

      {/* Floating medical particles */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-teal-500/20"
            style={{
              width: `${2 + Math.random() * 3}px`,
              height: `${2 + Math.random() * 3}px`,
              left: `${Math.random() * 100}%`,
              bottom: `-5%`,
              animation: `float-up ${12 + Math.random() * 18}s linear infinite`,
              animationDelay: `${Math.random() * 15}s`,
            }}
          />
        ))}
      </div>

      {/* ECG Heartbeat SVG line */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 opacity-20">
        <svg viewBox="0 0 2400 100" className="w-[200%]" preserveAspectRatio="none" style={{ animation: 'ecg-draw 4s linear infinite' }}>
          <polyline
            fill="none"
            stroke="url(#ecg-gradient)"
            strokeWidth="2"
            strokeDasharray="2400"
            strokeDashoffset="2400"
            strokeLinecap="round"
            style={{ animation: 'ecg-draw 4s linear infinite' }}
            points="0,50 200,50 220,50 240,20 260,80 280,30 300,70 320,50 500,50 520,50 540,15 560,85 580,25 600,75 620,50 800,50 820,50 840,20 860,80 880,30 900,70 920,50 1100,50 1120,50 1140,15 1160,85 1180,25 1200,75 1220,50 1400,50 1420,50 1440,20 1460,80 1480,30 1500,70 1520,50 1700,50 1720,50 1740,15 1760,85 1780,25 1800,75 1820,50 2000,50 2020,50 2040,20 2060,80 2080,30 2100,70 2120,50 2400,50"
          />
          <defs>
            <linearGradient id="ecg-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0D9488" stopOpacity="0.1" />
              <stop offset="30%" stopColor="#0D9488" stopOpacity="1" />
              <stop offset="70%" stopColor="#06b6d4" stopOpacity="1" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.1" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div className="animate-fade-in-up relative z-10 w-full max-w-md px-4">
        <Card className="glass shadow-2xl shadow-teal-500/10">
          <CardContent className="p-8">
            {/* Logo */}
            <div className="mb-8 flex flex-col items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-600 shadow-lg shadow-teal-500/20">
                <Stethoscope className="h-7 w-7 text-white" />
              </div>
              <div className="text-center">
                <h1 className="text-4xl font-bold tracking-tight text-gradient-teal">
                  VoxPEP
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Fale. O prontuário escuta.
                </p>
              </div>
            </div>

            {/* SSO Buttons */}
            <div className="space-y-3 mb-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleSSOLogin('google')}
                className="w-full h-11 bg-secondary/50 border-border hover:bg-secondary hover:border-primary/30 text-foreground transition-all"
              >
                <GoogleIcon className="h-5 w-5 mr-3" />
                Entrar com Google
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => handleSSOLogin('microsoft')}
                className="w-full h-11 bg-secondary/50 border-border hover:bg-secondary hover:border-primary/30 text-foreground transition-all"
              >
                <MicrosoftIcon className="h-5 w-5 mr-3" />
                Entrar com Microsoft
              </Button>
            </div>

            {/* SSO Detection Banner */}
            {ssoDetection?.ssoEnabled && (
              <div className="mb-4 rounded-lg border border-primary/30 bg-primary/10 p-3 text-center">
                <p className="text-xs text-primary">
                  {ssoDetection.tenantName
                    ? `${ssoDetection.tenantName} usa login institucional via ${ssoDetection.provider === 'google' ? 'Google' : 'Microsoft'}.`
                    : `Login institucional disponível via ${ssoDetection.provider === 'google' ? 'Google' : 'Microsoft'}.`}
                </p>
                <button
                  type="button"
                  onClick={() => handleSSOLogin(ssoDetection.provider ?? 'google')}
                  className="mt-1 text-xs font-medium text-primary hover:text-primary/80 underline transition-colors"
                >
                  Entrar com SSO
                </button>
              </div>
            )}

            {/* Divider */}
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-card/80 px-3 text-muted-foreground">ou</span>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-muted-foreground">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    className={cn(
                      'pl-10 bg-secondary/50 border-border focus:border-primary/50 focus:ring-primary/20',
                      errors.email && 'border-red-500/50',
                    )}
                    {...register('email')}
                    onBlur={(e) => {
                      register('email').onBlur(e);
                      handleEmailBlur(e);
                    }}
                  />
                  {ssoDetecting && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    </div>
                  )}
                </div>
                {errors.email && (
                  <p className="text-xs text-red-400">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-muted-foreground">
                  Senha
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className={cn(
                      'pl-10 pr-10 bg-secondary/50 border-border focus:border-primary/50 focus:ring-primary/20',
                      errors.password && 'border-red-500/50',
                    )}
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-red-400">{errors.password.message}</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-teal-600 text-white hover:bg-teal-700 h-11 text-base font-semibold shadow-lg shadow-teal-500/20 transition-all hover:shadow-teal-500/30 animate-btn-pulse"
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
            </form>

            <div className="mt-6 text-center">
              <button className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Esqueceu a senha?
              </button>
            </div>

            {/* Demo mode bypass */}
            <div className="mt-6 rounded-lg border border-border bg-secondary/50 p-3 text-center">
              <p className="text-xs text-muted-foreground/60 mb-2">
                Sem backend? Entre com dados simulados:
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={handleDemoLogin}
                className="h-9 text-xs bg-secondary/50 border-border hover:bg-primary/10 hover:border-primary/30 text-primary transition-all"
              >
                <Stethoscope className="h-3.5 w-3.5 mr-2" />
                Entrar em modo Demo
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
