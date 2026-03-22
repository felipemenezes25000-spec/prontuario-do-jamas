import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Shield, Globe, Users, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { getSSOConfigApi, configureSSOApi } from '@/services/auth.service';

type SSOProvider = 'google' | 'microsoft' | 'saml' | 'oidc';

interface SSOFormState {
  ssoEnabled: boolean;
  ssoProvider: SSOProvider | '';
  ssoDomain: string;
  ssoAutoProvision: boolean;
  clientId: string;
  clientSecret: string;
  tenantId: string;
  metadataUrl: string;
}

const PROVIDER_OPTIONS: { value: SSOProvider; label: string }[] = [
  { value: 'google', label: 'Google Workspace' },
  { value: 'microsoft', label: 'Microsoft Azure AD' },
  { value: 'saml', label: 'SAML 2.0' },
  { value: 'oidc', label: 'OpenID Connect (OIDC)' },
];

export function SSOConfig() {
  const [form, setForm] = useState<SSOFormState>({
    ssoEnabled: false,
    ssoProvider: '',
    ssoDomain: '',
    ssoAutoProvision: false,
    clientId: '',
    clientSecret: '',
    tenantId: '',
    metadataUrl: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const loadConfig = useCallback(async () => {
    try {
      const config = await getSSOConfigApi();
      const ssoConfig = (config.ssoConfig ?? {}) as Record<string, string>;
      setForm({
        ssoEnabled: config.ssoEnabled,
        ssoProvider: (config.ssoProvider as SSOProvider) ?? '',
        ssoDomain: config.ssoDomain ?? '',
        ssoAutoProvision: config.ssoAutoProvision,
        clientId: ssoConfig.clientId ?? '',
        clientSecret: ssoConfig.clientSecret ?? '',
        tenantId: ssoConfig.tenantId ?? '',
        metadataUrl: ssoConfig.metadataUrl ?? '',
      });
    } catch {
      toast.error('Erro ao carregar configuração SSO');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  const handleSave = async () => {
    if (form.ssoEnabled && !form.ssoProvider) {
      toast.error('Selecione um provedor SSO');
      return;
    }

    setIsSaving(true);
    try {
      const ssoConfig: Record<string, unknown> = {};
      if (form.clientId) ssoConfig.clientId = form.clientId;
      if (form.clientSecret) ssoConfig.clientSecret = form.clientSecret;
      if (form.tenantId) ssoConfig.tenantId = form.tenantId;
      if (form.metadataUrl) ssoConfig.metadataUrl = form.metadataUrl;

      await configureSSOApi({
        ssoEnabled: form.ssoEnabled,
        ssoProvider: form.ssoProvider || undefined,
        ssoConfig: Object.keys(ssoConfig).length > 0 ? ssoConfig : undefined,
        ssoDomain: form.ssoDomain || undefined,
        ssoAutoProvision: form.ssoAutoProvision,
      });

      toast.success('Configuração SSO salva com sucesso');
    } catch {
      toast.error('Erro ao salvar configuração SSO');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!form.ssoProvider) {
      toast.error('Selecione um provedor antes de testar');
      return;
    }

    setIsTesting(true);
    try {
      // Open SSO login in a popup to test
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const testUrl = `${apiUrl}/api/v1/auth/sso/${form.ssoProvider}`;
      const popup = window.open(testUrl, 'sso-test', 'width=600,height=700');

      if (!popup) {
        toast.error('Popup bloqueado. Permita popups para testar a conexão.');
        return;
      }

      toast.info('Janela de teste aberta. Complete o login no provedor SSO.');
    } catch {
      toast.error('Erro ao testar conexão SSO');
    } finally {
      setIsTesting(false);
    }
  };

  const updateForm = <K extends keyof SSOFormState>(
    key: K,
    value: SSOFormState[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-teal-600 dark:text-teal-500" />
          <span className="ml-2 text-muted-foreground">Carregando configuração SSO...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-500/10">
            <Shield className="h-5 w-5 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Login Institucional (SSO)
            </h3>
            <p className="text-sm text-muted-foreground">
              Configure autenticação via provedor externo para sua organização
            </p>
          </div>
        </div>

        {/* Enable/Disable SSO */}
        <div className="flex items-center justify-between rounded-lg border border-border bg-accent/30 p-4">
          <div className="flex items-center gap-3">
            {form.ssoEnabled ? (
              <CheckCircle className="h-5 w-5 text-teal-600 dark:text-teal-400" />
            ) : (
              <XCircle className="h-5 w-5 text-muted-foreground" />
            )}
            <div>
              <p className="text-sm font-medium text-foreground">SSO Ativo</p>
              <p className="text-xs text-muted-foreground">
                Permitir login via provedor de identidade externo
              </p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={form.ssoEnabled}
            onClick={() => updateForm('ssoEnabled', !form.ssoEnabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              form.ssoEnabled ? 'bg-teal-500' : 'bg-muted'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                form.ssoEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {form.ssoEnabled && (
          <>
            {/* Provider Selection */}
            <div className="space-y-2">
              <Label className="text-muted-foreground">Provedor SSO</Label>
              <div className="grid grid-cols-2 gap-2">
                {PROVIDER_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updateForm('ssoProvider', option.value)}
                    className={`rounded-lg border p-3 text-left text-sm transition-all ${
                      form.ssoProvider === option.value
                        ? 'border-teal-500/50 bg-teal-500/10 text-teal-600 dark:text-teal-400'
                        : 'border-border bg-accent/30 text-muted-foreground hover:border-border'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Domain Mapping */}
            <div className="space-y-2">
              <Label htmlFor="ssoDomain" className="text-muted-foreground">
                <Globe className="inline h-4 w-4 mr-1" />
                Domínio de email
              </Label>
              <Input
                id="ssoDomain"
                placeholder="hospital.com.br"
                value={form.ssoDomain}
                onChange={(e) => updateForm('ssoDomain', e.target.value)}
                className="bg-secondary/50 border-border focus:border-teal-500/50"
              />
              <p className="text-xs text-muted-foreground">
                Emails com este domínio serão direcionados ao login SSO automaticamente
              </p>
            </div>

            {/* Provider-specific fields */}
            {(form.ssoProvider === 'google' || form.ssoProvider === 'microsoft' || form.ssoProvider === 'oidc') && (
              <div className="space-y-4 rounded-lg border border-border bg-accent/20 p-4">
                <h4 className="text-sm font-medium text-foreground">
                  Credenciais do provedor
                </h4>

                <div className="space-y-2">
                  <Label htmlFor="clientId" className="text-muted-foreground">
                    Client ID
                  </Label>
                  <Input
                    id="clientId"
                    placeholder="Seu client ID do provedor OAuth"
                    value={form.clientId}
                    onChange={(e) => updateForm('clientId', e.target.value)}
                    className="bg-secondary/50 border-border focus:border-teal-500/50"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="clientSecret" className="text-muted-foreground">
                    Client Secret
                  </Label>
                  <Input
                    id="clientSecret"
                    type="password"
                    placeholder="Seu client secret"
                    value={form.clientSecret}
                    onChange={(e) => updateForm('clientSecret', e.target.value)}
                    className="bg-secondary/50 border-border focus:border-teal-500/50"
                  />
                </div>

                {form.ssoProvider === 'microsoft' && (
                  <div className="space-y-2">
                    <Label htmlFor="tenantId" className="text-muted-foreground">
                      Tenant ID (Azure AD)
                    </Label>
                    <Input
                      id="tenantId"
                      placeholder="common ou ID do tenant Azure"
                      value={form.tenantId}
                      onChange={(e) => updateForm('tenantId', e.target.value)}
                      className="bg-secondary/50 border-border focus:border-teal-500/50"
                    />
                  </div>
                )}

                {form.ssoProvider === 'oidc' && (
                  <div className="space-y-2">
                    <Label htmlFor="metadataUrl" className="text-muted-foreground">
                      URL de metadados (discovery)
                    </Label>
                    <Input
                      id="metadataUrl"
                      placeholder="https://provider.com/.well-known/openid-configuration"
                      value={form.metadataUrl}
                      onChange={(e) => updateForm('metadataUrl', e.target.value)}
                      className="bg-secondary/50 border-border focus:border-teal-500/50"
                    />
                  </div>
                )}
              </div>
            )}

            {form.ssoProvider === 'saml' && (
              <div className="space-y-4 rounded-lg border border-border bg-accent/20 p-4">
                <h4 className="text-sm font-medium text-foreground">
                  Configuração SAML
                </h4>
                <div className="space-y-2">
                  <Label htmlFor="metadataUrl" className="text-muted-foreground">
                    URL de metadados SAML
                  </Label>
                  <Input
                    id="metadataUrl"
                    placeholder="https://idp.hospital.com.br/metadata"
                    value={form.metadataUrl}
                    onChange={(e) => updateForm('metadataUrl', e.target.value)}
                    className="bg-secondary/50 border-border focus:border-teal-500/50"
                  />
                </div>
              </div>
            )}

            {/* Auto-provision */}
            <div className="flex items-center justify-between rounded-lg border border-border bg-accent/30 p-4">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Provisionamento automático
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Criar usuários automaticamente no primeiro login SSO
                  </p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={form.ssoAutoProvision}
                onClick={() =>
                  updateForm('ssoAutoProvision', !form.ssoAutoProvision)
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  form.ssoAutoProvision ? 'bg-teal-500' : 'bg-muted'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    form.ssoAutoProvision ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-teal-600 text-white hover:bg-teal-500 shadow-lg shadow-teal-500/20"
          >
            {isSaving ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Salvando...
              </div>
            ) : (
              'Salvar configuração'
            )}
          </Button>

          {form.ssoEnabled && form.ssoProvider && (
            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={isTesting}
              className="border-border text-foreground hover:bg-secondary"
            >
              {isTesting ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Testando...
                </div>
              ) : (
                'Testar conexão'
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
