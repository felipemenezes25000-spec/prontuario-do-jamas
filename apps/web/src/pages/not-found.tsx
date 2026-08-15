import { ArrowLeft, Home, RouteOff } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function NotFoundPage() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-12 text-foreground">
      <section className="w-full max-w-xl rounded-3xl border border-border/70 bg-card p-8 text-center shadow-sm sm:p-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <RouteOff className="h-6 w-6" />
        </div>
        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-primary">Erro 404</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Esta área não foi encontrada</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
          O endereço pode ter mudado, estar incompleto ou ainda não fazer parte deste ambiente.
        </p>
        <code className="mt-5 inline-flex max-w-full rounded-lg bg-muted px-3 py-1.5 text-xs text-muted-foreground">
          <span className="truncate">{location.pathname}</span>
        </code>
        <div className="mt-7 flex flex-col justify-center gap-2 sm:flex-row">
          <Button variant="outline" className="gap-2 rounded-xl" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
          <Button className="gap-2 rounded-xl" onClick={() => navigate('/dashboard', { replace: true })}>
            <Home className="h-4 w-4" /> Ir para o dashboard
          </Button>
        </div>
      </section>
    </main>
  );
}
