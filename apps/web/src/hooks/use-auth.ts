import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth.store';
import { loginApi, isMfaChallenge } from '@/services/auth.service';

export function useAuth() {
  const { user, isAuthenticated, login: storeLogin, logout: storeLogout, setMfaPending } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const login = useCallback(
    async (email: string, password: string) => {
      setIsLoading(true);
      try {
        const result = await loginApi(email, password);

        if (isMfaChallenge(result)) {
          setMfaPending(result.mfaToken);
          navigate('/mfa-verify');
          return;
        }

        storeLogin(result.user, result.accessToken, result.refreshToken);
        toast.success('Login realizado com sucesso!');
        navigate('/dashboard');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao fazer login';
        toast.error(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [storeLogin, setMfaPending, navigate],
  );

  const logout = useCallback(() => {
    storeLogout();
    navigate('/login');
    toast.info('Sessão encerrada');
  }, [storeLogout, navigate]);

  return { user, isAuthenticated, isLoading, login, logout };
}
