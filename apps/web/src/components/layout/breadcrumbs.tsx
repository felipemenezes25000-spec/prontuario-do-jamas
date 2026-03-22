import { Fragment } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

/**
 * Map of route segments to their Portuguese display labels.
 * Dynamic segments (e.g. `:id`) are handled separately.
 */
const ROUTE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  pacientes: 'Pacientes',
  atendimentos: 'Atendimentos',
  triagem: 'Triagem',
  internacoes: 'Internacoes',
  enfermagem: 'Enfermagem',
  agenda: 'Agenda',
  'centro-cirurgico': 'Centro Cirurgico',
  exames: 'Exames',
  farmacia: 'Farmacia',
  faturamento: 'Faturamento',
  relatorios: 'Relatorios',
  configuracoes: 'Configuracoes',
  admin: 'Administracao',
  novo: 'Novo',
};

function isUuid(segment: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment);
}

function isNumericId(segment: string): boolean {
  return /^\d+$/.test(segment);
}

function getLabel(segment: string): string {
  if (ROUTE_LABELS[segment]) return ROUTE_LABELS[segment];
  if (isUuid(segment)) return `#${segment.slice(0, 8)}`;
  if (isNumericId(segment)) return `#${segment}`;
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

export function Breadcrumbs() {
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);

  // Don't render breadcrumbs on the dashboard root
  if (segments.length <= 1 && segments[0] === 'dashboard') {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1 text-sm text-muted-foreground">
      <Link
        to="/dashboard"
        className="flex items-center gap-1 transition-colors hover:text-foreground"
      >
        <Home className="h-3.5 w-3.5" />
        <span className="sr-only">Inicio</span>
      </Link>

      {segments.map((segment, index) => {
        const path = `/${segments.slice(0, index + 1).join('/')}`;
        const isLast = index === segments.length - 1;
        const label = getLabel(segment);

        return (
          <Fragment key={path}>
            <ChevronRight className="h-3.5 w-3.5 shrink-0" />
            {isLast ? (
              <span className="truncate font-medium text-foreground">
                {label}
              </span>
            ) : (
              <Link
                to={path}
                className="truncate transition-colors hover:text-foreground"
              >
                {label}
              </Link>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
