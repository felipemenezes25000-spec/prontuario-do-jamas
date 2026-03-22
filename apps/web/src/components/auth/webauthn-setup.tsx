import { useState } from 'react';
import { startRegistration } from '@simplewebauthn/browser';
import { Fingerprint, Trash2, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  useWebAuthnCredentials,
  useWebAuthnRegisterOptions,
  useWebAuthnRegisterVerify,
  useRemoveWebAuthnCredential,
} from '@/services/webauthn.service';

export function WebAuthnSetup() {
  const [registering, setRegistering] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const { data: credentials = [], isLoading } = useWebAuthnCredentials();
  const registerOptions = useWebAuthnRegisterOptions();
  const registerVerify = useWebAuthnRegisterVerify();
  const removeCredential = useRemoveWebAuthnCredential();

  const isEnabled = credentials.length > 0;

  const handleRegister = async () => {
    setRegistering(true);
    try {
      // 1. Get registration options from server
      const options = await registerOptions.mutateAsync();

      // 2. Start the WebAuthn ceremony in the browser
      const attResp = await startRegistration({ optionsJSON: options as never });

      // 3. Send the credential to the server for verification
      await registerVerify.mutateAsync(attResp as unknown as Record<string, unknown>);

      toast.success('Dispositivo registrado com sucesso!');
    } catch (error) {
      if (error instanceof Error && error.name === 'NotAllowedError') {
        toast.error('Registro cancelado pelo usuário');
      } else {
        toast.error('Erro ao registrar dispositivo. Tente novamente.');
      }
    } finally {
      setRegistering(false);
    }
  };

  const handleRemove = async (credentialId: string) => {
    setRemovingId(credentialId);
    try {
      await removeCredential.mutateAsync(credentialId);
      toast.success('Dispositivo removido com sucesso!');
    } catch {
      toast.error('Erro ao remover dispositivo.');
    } finally {
      setRemovingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(dateStr));
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Fingerprint className="h-4 w-4 text-teal-600 dark:text-teal-400" />
          Autenticação Biométrica (WebAuthn)
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Use biometria (impressão digital, reconhecimento facial) ou chave de segurança para acessar sua conta de forma rápida e segura.
        </p>
      </div>

      <Separator className="bg-secondary" />

      {/* Status indicator */}
      <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 px-4 py-3">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'h-2.5 w-2.5 rounded-full',
              isEnabled
                ? 'bg-teal-500 shadow-sm shadow-teal-500/50'
                : 'bg-muted-foreground',
            )}
          />
          <span className="text-sm">
            {isEnabled ? 'Biometria Ativada' : 'Biometria Desativada'}
          </span>
        </div>
        <Badge
          variant={isEnabled ? 'default' : 'secondary'}
          className={cn(
            'text-xs',
            isEnabled && 'bg-teal-600/20 text-teal-600 dark:text-teal-400 border-teal-600/30',
          )}
        >
          {credentials.length} {credentials.length === 1 ? 'dispositivo' : 'dispositivos'}
        </Badge>
      </div>

      {/* Credentials list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : credentials.length > 0 ? (
        <div className="space-y-2">
          {credentials.map((cred) => (
            <div
              key={cred.credentialID}
              className="flex items-center justify-between rounded-lg border border-border bg-secondary/20 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <Fingerprint className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">
                    {cred.deviceName || 'Dispositivo'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Registrado em {formatDate(cred.registeredAt)}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (window.confirm('Tem certeza que deseja remover este dispositivo?')) {
                    handleRemove(cred.credentialID);
                  }
                }}
                disabled={removingId === cred.credentialID}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
              >
                {removingId === cred.credentialID ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      {/* Register button */}
      <Button
        onClick={handleRegister}
        disabled={registering}
        className="bg-teal-600 hover:bg-teal-500"
      >
        {registering ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Plus className="mr-2 h-4 w-4" />
        )}
        Registrar Dispositivo
      </Button>
    </div>
  );
}
