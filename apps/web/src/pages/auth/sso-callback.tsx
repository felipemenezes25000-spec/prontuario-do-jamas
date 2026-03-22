import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Stethoscope } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useAuthStore } from '@/stores/auth.store';
import { ssoTokenExchangeApi } from '@/services/auth.service';

export default function SSOCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get('token');
    const provider = searchParams.get('provider');

    if (!token || !provider) {
      setError('Parâmetros de autenticação SSO ausentes.');
      return;
    }

    let cancelled = false;

    async function exchangeToken() {
      try {
        const result = await ssoTokenExchangeApi(provider!, token!);
        if (cancelled) return;

        login(result.user, result.accessToken, result.refreshToken);
        toast.success('Bem-vindo ao VoxPEP!');
        navigate('/dashboard', { replace: true });
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : 'Falha na autenticação SSO';
        setError(message);
        toast.error(message);
      }
    }

    void exchangeToken();

    return () => {
      cancelled = true;
    };
  }, [searchParams, navigate, login]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Card className="glass w-full max-w-md shadow-2xl shadow-red-500/10">
          <CardContent className="p-8 text-center">
            <div className="mb-6 flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/20">
                <Stethoscope className="h-7 w-7 text-red-400" />
              </div>
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Erro na autenticação
            </h2>
            <p className="text-sm text-muted-foreground mb-6">{error}</p>
            <button
              onClick={() => navigate('/login', { replace: true })}
              className="text-sm font-medium text-teal-600 dark:text-teal-400 hover:text-teal-500 dark:text-teal-300 underline transition-colors"
            >
              Voltar para o login
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="glass w-full max-w-md shadow-2xl shadow-teal-500/10">
        <CardContent className="p-8 text-center">
          <div className="mb-6 flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-500 shadow-lg shadow-teal-500/20">
              <Stethoscope className="h-7 w-7 text-foreground" />
            </div>
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Autenticando...
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            Processando login institucional. Aguarde um momento.
          </p>
          <div className="flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-3 border-teal-500 border-t-transparent" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
