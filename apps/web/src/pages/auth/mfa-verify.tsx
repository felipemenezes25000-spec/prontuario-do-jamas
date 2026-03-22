import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Stethoscope, ArrowLeft, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useAuthStore } from '@/stores/auth.store';
import { mfaValidateApi, mfaBackupApi } from '@/services/auth.service';
import { cn } from '@/lib/utils';

export default function MfaVerifyPage() {
  const [code, setCode] = useState('');
  const [backupCode, setBackupCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showBackup, setShowBackup] = useState(false);
  const [shakeError, setShakeError] = useState(false);
  const codeInputRef = useRef<HTMLInputElement>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { mfaToken, mfaPending, login, clearMfaPending } = useAuthStore();

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
      // Only digits
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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background">
      {/* Background effects */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-teal-500/10 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-cyan-500/8 blur-[120px]" />
        <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal-500/5 blur-[100px]" />
      </div>

      <div className="animate-fade-in-up relative z-10 w-full max-w-md px-4">
        <Card className="glass shadow-2xl shadow-teal-500/10">
          <CardContent className="p-8">
            {/* Header */}
            <div className="mb-8 flex flex-col items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-500 shadow-lg shadow-teal-500/20">
                <Stethoscope className="h-7 w-7 text-foreground" />
              </div>
              <div className="text-center">
                <h1 className="text-2xl font-bold tracking-tight text-white">
                  Verificação em duas etapas
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  {showBackup
                    ? 'Digite um dos seus códigos de backup'
                    : 'Digite o código do seu aplicativo autenticador'}
                </p>
              </div>
            </div>

            {!showBackup ? (
              /* TOTP Code Input */
              <div
                className={cn(
                  'space-y-5 transition-transform',
                  shakeError && 'animate-[shake_0.5s_ease-in-out]',
                )}
              >
                <div className="space-y-2">
                  <Label htmlFor="mfa-code" className="text-muted-foreground">
                    Código de verificação
                  </Label>
                  <div className="relative">
                    <ShieldCheck className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
                      className="pl-10 text-center text-2xl tracking-[0.5em] font-mono bg-secondary/50 border-border focus:border-teal-500/50 focus:ring-teal-500/20"
                    />
                  </div>
                </div>

                {isLoading && (
                  <div className="flex justify-center">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
                  </div>
                )}

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => setShowBackup(true)}
                    className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-teal-600 dark:text-teal-400 transition-colors"
                  >
                    <KeyRound className="h-3.5 w-3.5" />
                    Usar código de backup
                  </button>
                </div>
              </div>
            ) : (
              /* Backup Code Input */
              <form
                onSubmit={handleBackupSubmit}
                className={cn(
                  'space-y-5 transition-transform',
                  shakeError && 'animate-[shake_0.5s_ease-in-out]',
                )}
              >
                <div className="space-y-2">
                  <Label htmlFor="backup-code" className="text-muted-foreground">
                    Código de backup
                  </Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      ref={backupInputRef}
                      id="backup-code"
                      type="text"
                      placeholder="A1B2C3D4"
                      maxLength={8}
                      value={backupCode}
                      onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
                      disabled={isLoading}
                      className="pl-10 text-center text-xl tracking-[0.3em] font-mono uppercase bg-secondary/50 border-border focus:border-teal-500/50 focus:ring-teal-500/20"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Cada código de backup só pode ser usado uma vez.
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading || backupCode.length !== 8}
                  className="w-full bg-teal-600 text-white hover:bg-teal-500 h-11 text-base font-semibold shadow-lg shadow-teal-500/20"
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
                    className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-teal-600 dark:text-teal-400 transition-colors"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Usar código do autenticador
                  </button>
                </div>
              </form>
            )}

            {/* Back to login */}
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={handleBack}
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-teal-600 dark:text-teal-400 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Voltar ao login
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Shake animation keyframes */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
      `}</style>
    </div>
  );
}
