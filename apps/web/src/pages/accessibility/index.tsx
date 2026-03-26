import {
  Accessibility,
  Eye,
  Type,
  Zap,
  Keyboard,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAccessibility } from '@/components/accessibility/AccessibilityProvider';
import { useAnnounce } from '@/hooks/useAnnounce';

const KEYBOARD_SHORTCUTS = [
  { keys: 'Tab', description: 'Navegar para o próximo elemento interativo' },
  { keys: 'Shift + Tab', description: 'Navegar para o elemento anterior' },
  { keys: 'Enter / Espaço', description: 'Ativar botão ou link' },
  { keys: 'Escape', description: 'Fechar diálogo ou menu' },
  { keys: 'Setas ↑ ↓', description: 'Navegar em listas e menus' },
  { keys: 'Home / End', description: 'Ir para primeiro/último item' },
  { keys: 'Ctrl + F', description: 'Buscar na página' },
  { keys: 'Alt + 1', description: 'Ir para conteúdo principal (skip nav)' },
] as const;

export default function AccessibilityPage() {
  const {
    highContrast,
    reducedMotion,
    fontSize,
    toggleHighContrast,
    toggleReducedMotion,
    setFontSize,
  } = useAccessibility();
  const { announce } = useAnnounce();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
          <Accessibility className="h-5 w-5 text-emerald-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Acessibilidade</h1>
          <p className="text-sm text-gray-400">
            Configure preferências de acessibilidade conforme WCAG 2.1 AA
          </p>
        </div>
      </div>

      {/* Visual preferences */}
      <Card className="border-gray-800 bg-gray-900/50">
        <CardContent className="space-y-6 p-6">
          <div className="flex items-center gap-2 text-emerald-500">
            <Eye className="h-4 w-4" />
            <h2 className="text-lg font-semibold">Preferências visuais</h2>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="high-contrast" className="text-white">
                Alto contraste
              </Label>
              <p className="text-sm text-gray-400">
                Aumenta o contraste dos elementos da interface
              </p>
            </div>
            <Switch
              id="high-contrast"
              checked={highContrast}
              onCheckedChange={() => {
                toggleHighContrast();
                announce(
                  highContrast ? 'Alto contraste desativado' : 'Alto contraste ativado',
                  'polite',
                );
              }}
              aria-label="Alternar alto contraste"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="reduced-motion" className="text-white">
                Reduzir animações
              </Label>
              <p className="text-sm text-gray-400">
                Minimiza ou remove animações e transições
              </p>
            </div>
            <Switch
              id="reduced-motion"
              checked={reducedMotion}
              onCheckedChange={() => {
                toggleReducedMotion();
                announce(
                  reducedMotion ? 'Animações restauradas' : 'Animações reduzidas',
                  'polite',
                );
              }}
              aria-label="Alternar redução de animações"
            />
          </div>
        </CardContent>
      </Card>

      {/* Font size */}
      <Card className="border-gray-800 bg-gray-900/50">
        <CardContent className="space-y-6 p-6">
          <div className="flex items-center gap-2 text-emerald-500">
            <Type className="h-4 w-4" />
            <h2 className="text-lg font-semibold">Tamanho da fonte</h2>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="font-size" className="text-white">
                Escala de texto
              </Label>
              <p className="text-sm text-gray-400">
                Ajusta o tamanho base de todos os textos
              </p>
            </div>
            <Select
              value={fontSize}
              onValueChange={(value: 'normal' | 'large' | 'extra-large') => {
                setFontSize(value);
                const labels: Record<string, string> = {
                  normal: 'Normal',
                  large: 'Grande',
                  'extra-large': 'Extra grande',
                };
                announce(`Tamanho da fonte alterado para ${labels[value]}`, 'polite');
              }}
            >
              <SelectTrigger id="font-size" className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal (16px)</SelectItem>
                <SelectItem value="large">Grande (18px)</SelectItem>
                <SelectItem value="extra-large">Extra grande (20px)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
            <p className="text-white">
              Texto de exemplo para visualizar o tamanho atual da fonte.
            </p>
            <p className="mt-1 text-sm text-gray-400">
              Texto secundário para comparação de legibilidade.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Motion preferences */}
      <Card className="border-gray-800 bg-gray-900/50">
        <CardContent className="space-y-6 p-6">
          <div className="flex items-center gap-2 text-emerald-500">
            <Zap className="h-4 w-4" />
            <h2 className="text-lg font-semibold">Desempenho e movimento</h2>
          </div>
          <p className="text-sm text-gray-400">
            Quando a opção &quot;Reduzir animações&quot; está ativada, todas as transições CSS
            e animações são minimizadas. Isso é especialmente útil para pessoas com
            sensibilidade a movimento ou vestibular.
          </p>
        </CardContent>
      </Card>

      {/* Keyboard shortcuts */}
      <Card className="border-gray-800 bg-gray-900/50">
        <CardContent className="space-y-6 p-6">
          <div className="flex items-center gap-2 text-emerald-500">
            <Keyboard className="h-4 w-4" />
            <h2 className="text-lg font-semibold">Atalhos de teclado</h2>
          </div>
          <p className="text-sm text-gray-400">
            Referência rápida dos atalhos de navegação disponíveis.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" role="table">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="py-2 pr-4 text-left font-medium text-gray-300" scope="col">
                    Teclas
                  </th>
                  <th className="py-2 text-left font-medium text-gray-300" scope="col">
                    Ação
                  </th>
                </tr>
              </thead>
              <tbody>
                {KEYBOARD_SHORTCUTS.map((shortcut) => (
                  <tr key={shortcut.keys} className="border-b border-gray-800">
                    <td className="py-2 pr-4">
                      <kbd className="rounded bg-gray-800 px-2 py-0.5 font-mono text-xs text-emerald-400">
                        {shortcut.keys}
                      </kbd>
                    </td>
                    <td className="py-2 text-gray-300">{shortcut.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
