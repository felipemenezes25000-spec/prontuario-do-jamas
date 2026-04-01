import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Stethoscope,
  ArrowLeft,
  KeyRound,
  Shield,
  Lock,
  Mic,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/stores/auth.store';
import { mfaValidateApi, mfaBackupApi } from '@/services/auth.service';
import { cn } from '@/lib/utils';

export default function MfaVerifyPage() {
  const [code, setCode] = useState('');
  const [backupCode, setBackupCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showBackup, setShowBackup] = useState(false);
  const [shakeError, setShakeError] = useState(false);
  const [mounted, setMounted] = useState(false);
  const codeInputRef = useRef<HTMLInputElement>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { mfaToken, mfaPending, login, clearMfaPending } = useAuthStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect if no MFA pending
  useEffect(() => {
    if (!mfaPending || !mfaToken) {
      navigate('/login', { replace: true });
    }
  }, [mfaPending, mfaToken, navigate]);

  // Auto-focus
  useEffect(() => {
    if (showBackup) {
      backupInputRef.current?.focus();
    } else {
      codeInputRef.current?.focus();
    }
  }, [showBackup]);

  const triggerShake = useCallback(() => {
    setShakeError(true);
    setTimeout(() => setShakeError(false), 500);
  }, []);

  const handleCodeChange = useCallback(
    async (value: string) => {
      const cleaned = value.replace(/\D/g, '').slice(0, 6);
      setCode(cleaned);

      // Auto-submit on 6 digits
      if (cleaned.length === 6 && mfaToken) {
        setIsLoading(true);
        try {
          const result = await mfaValidateApi(mfaToken, cleaned);
          login(result.user, result.accessToken, result.refreshToken);
          toast.success('Bem-vindo ao VoxPEP!');
          navigate('/dashboard');
        } catch {
          toast.error('Código inválido. Tente novamente.');
          setCode('');
          triggerShake();
          codeInputRef.current?.focus();
        } finally {
          setIsLoading(false);
        }
      }
    },
    [mfaToken, login, navigate, triggerShake],
  );

  const handleBackupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaToken || !backupCode.trim()) return;

    setIsLoading(true);
    try {
      const result = await mfaBackupApi(mfaToken, backupCode.trim().toUpperCase());
      login(result.user, result.accessToken, result.refreshToken);
      toast.success('Bem-vindo ao VoxPEP!');
      navigate('/dashboard');
    } catch {
      toast.error('Código de backup inválido.');
      triggerShake();
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    clearMfaPending();
    navigate('/login');
  };

  if (!mfaPending || !mfaToken) {
    return null;
  }

  return (
    <div className="flex min-h-screen">
      {/* ═══════════════════════════════════════════════════════════════════
          LEFT PANEL — Branding (matches login page)
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

        {/* ECG line */}
        <div className="pointer-events-none absolute left-0 right-0 top-1/2 -translate-y-1/2 opacity-10">
          <svg viewBox="0 0 1200 60" className="w-full" preserveAspectRatio="none">
            <polyline
              fill="none"
              stroke="url(#mfa-ecg)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeDasharray="1200"
              strokeDashoffset="1200"
              style={{ animation: 'ecg-draw 4s linear infinite' }}
              points="0,30 100,30 120,30 135,10 150,50 165,15 180,45 195,30 400,30 420,30 435,8 450,52 465,12 480,48 495,30 700,30 720,30 735,10 750,50 765,15 780,45 795,30 1000,30 1020,30 1035,8 1050,52 1065,12 1080,48 1095,30 1200,30"
            />
            <defs>
              <linearGradient id="mfa-ecg" x1="0%" y1="0%" x2="100%" y2="0%">
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
          <div
            className={cn(
              'mb-10 opacity-0',
              mounted && 'animate-[mfa-slide-in_0.8s_ease-out_0.2s_forwards]',
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

          {/* Security-focused highlights for MFA */}
          <div className="space-y-5">
            <div
              className="flex items-start gap-3 opacity-0"
              style={{ animation: `mfa-slide-in 0.6s ease-out 0.6s forwards` }}
            >
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 ring-1 ring-emerald-500/20">
                <Shield className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Segurança em Camadas</p>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Autenticação multifator protege dados clínicos sensíveis.
                </p>
              </div>
            </div>
            <div
              className="flex items-start gap-3 opacity-0"
              style={{ animation: `mfa-slide-in 0.6s ease-out 0.9s forwards` }}
            >
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 ring-1 ring-emerald-500/20">
                <Lock className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">LGPD Compliant</p>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Conformidade com a Lei Geral de Proteção de Dados em todas as operações.
                </p>
              </div>
            </div>
            <div
              className="flex items-start gap-3 opacity-0"
              style={{ animation: `mfa-slide-in 0.6s ease-out 1.2s forwards` }}
            >
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 ring-1 ring-emerald-500/20">
                <Mic className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Acesso Seguro por Voz</p>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Após verificação, dite notas clínicas com reconhecimento de voz.
                </p>
              </div>
            </div>
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
          RIGHT PANEL — MFA Form
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="relative flex flex-1 flex-col items-center justify-center bg-white dark:bg-zinc-950 lg:bg-zinc-50 lg:dark:bg-zinc-900/50">
        {/* Background glow */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-emerald-500/5 blur-[100px]" />
          <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-teal-500/3 blur-[100px]" />
        </div>

        {/* Mobile header */}
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
        </div>

        {/* MFA Form container */}
        <div
          className={cn(
            'relative z-10 w-full max-w-[420px] px-6 sm:px-8 opacity-0',
            mounted && 'animate-[mfa-slide-in_0.6s_ease-out_0.1s_forwards]',
          )}
        >
          {/* Header icon + title */}
          <div className="mb-8 text-center">
            <div
              className={cn(
                'mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 ring-1 ring-emerald-500/20 opacity-0',
                mounted && 'animate-[mfa-slide-in_0.5s_ease-out_0.2s_forwards]',
              )}
            >
              <ShieldCheck className="h-8 w-8 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              Verificação em duas etapas
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {showBackup
                ? 'Digite um dos seus códigos de backup'
                : 'Digite o código do seu aplicativo autenticador'}
            </p>
          </div>

          {!showBackup ? (
            /* ─── TOTP Code Input ─── */
            <div
              className={cn(
                'space-y-5 transition-transform',
                shakeError && 'animate-[shake_0.5s_ease-in-out]',
              )}
            >
              <div
                className={cn(
                  'space-y-2 opacity-0',
                  mounted && 'animate-[mfa-slide-in_0.5s_ease-out_0.3s_forwards]',
                )}
              >
                <Label htmlFor="mfa-code" className="text-sm font-medium text-foreground">
                  Código de verificação
                </Label>
                <div className="relative">
                  <ShieldCheck className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
                  <Input
                    ref={codeInputRef}
                    id="mfa-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="000000"
                    maxLength={6}
                    value={code}
                    onChange={(e) => handleCodeChange(e.target.value)}
                    disabled={isLoading}
                    className="pl-10 h-12 text-center text-2xl tracking-[0.5em] font-mono bg-white dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 focus:border-emerald-500/50 focus:ring-emerald-500/20 transition-colors"
                  />
                </div>
              </div>

              {/* Progress indicator */}
              <div
                className={cn(
                  'flex justify-center gap-1.5 opacity-0',
                  mounted && 'animate-[mfa-slide-in_0.5s_ease-out_0.4s_forwards]',
                )}
              >
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      'h-1.5 w-6 rounded-full transition-all duration-200',
                      i < code.length
                        ? 'bg-emerald-500'
                        : 'bg-zinc-200 dark:bg-zinc-700',
                    )}
                  />
                ))}
              </div>

              {isLoading && (
                <div className="flex justify-center">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                </div>
              )}

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setShowBackup(true)}
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  Usar código de backup
                </button>
              </div>
            </div>
          ) : (
            /* ─── Backup Code Input ─── */
            <form
              onSubmit={handleBackupSubmit}
              className={cn(
                'space-y-5 transition-transform',
                shakeError && 'animate-[shake_0.5s_ease-in-out]',
              )}
            >
              <div className="space-y-2">
                <Label htmlFor="backup-code" className="text-sm font-medium text-foreground">
                  Código de backup
                </Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
                  <Input
                    ref={backupInputRef}
                    id="backup-code"
                    type="text"
                    placeholder="A1B2C3D4"
                    maxLength={8}
                    value={backupCode}
                    onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
                    disabled={isLoading}
                    className="pl-10 h-12 text-center text-xl tracking-[0.3em] font-mono uppercase bg-white dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 focus:border-emerald-500/50 focus:ring-emerald-500/20 transition-colors"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Cada código de backup só pode ser usado uma vez.
                </p>
              </div>

              <Button
                type="submit"
                disabled={isLoading || backupCode.length !== 8}
                className="w-full h-11 bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 text-base font-semibold shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all duration-300 disabled:opacity-60"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Verificando...
                  </div>
                ) : (
                  'Verificar'
                )}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setShowBackup(false);
                    setBackupCode('');
                  }}
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Usar código do autenticador
                </button>
              </div>
            </form>
          )}

          {/* Back to login */}
          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Voltar ao login
            </button>
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
        @keyframes mfa-slide-in {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
      `}</style>
    </div>
  );
}
