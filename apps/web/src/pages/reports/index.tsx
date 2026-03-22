import {
  BarChart3,
  BedDouble,
  Users,
  TrendingUp,
  DollarSign,
  Stethoscope,
  ArrowRight,
  Construction,
  FileX,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { useReportSummary } from '@/services/reports.service';
import { PageLoading } from '@/components/common/page-loading';
import { PageError } from '@/components/common/page-error';

const reportCards = [
  { id: 'hospital-movement', title: 'Movimento Hospitalar', description: 'Internações, altas, óbitos e transferências', icon: BedDouble, color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
  { id: 'daily-census', title: 'Censo Diário', description: 'Ocupação de leitos e taxa de permanência', icon: Users, color: 'text-teal-600 dark:text-teal-400', bgColor: 'bg-teal-500/10' },
  { id: 'productivity', title: 'Produtividade Médica', description: 'Atendimentos por profissional e tempo médio', icon: Stethoscope, color: 'text-purple-400', bgColor: 'bg-purple-500/10' },
  { id: 'quality', title: 'Indicadores de Qualidade', description: 'Infecção hospitalar, quedas, LPP, reinternações', icon: TrendingUp, color: 'text-amber-400', bgColor: 'bg-amber-500/10' },
  { id: 'financial', title: 'Relatório Financeiro', description: 'Faturamento, glosas, receita por convênio', icon: DollarSign, color: 'text-green-400', bgColor: 'bg-green-500/10' },
  { id: 'encounters', title: 'Estatísticas de Atendimento', description: 'Volume, classificação, tempo de espera', icon: BarChart3, color: 'text-red-400', bgColor: 'bg-red-500/10' },
];

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState<string | null>(null);

  const { data: reportData, isLoading, isError, refetch } = useReportSummary(selectedReport);
  const chartData = reportData?.chartData ?? [];

  return (
    <div className="space-y-4 animate-fade-in">
      <h1 className="text-2xl font-bold tracking-tight">Relatórios</h1>

      {/* Report Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reportCards.map((report) => (
          <Card
            key={report.id}
            onClick={() => setSelectedReport(report.id)}
            className="cursor-pointer border-border bg-card transition-all hover:bg-card/80 hover:border-border"
          >
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-lg', report.bgColor)}>
                  <report.icon className={cn('h-6 w-6', report.color)} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-medium">{report.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{report.description}</p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Selected Report Preview */}
      {selectedReport && (
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Construction className="h-4 w-4 text-amber-400" />
              <CardTitle className="text-base">
                {reportCards.find((r) => r.id === selectedReport)?.title}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <PageLoading cards={0} showTable={false} />
            ) : isError ? (
              <PageError onRetry={() => refetch()} />
            ) : chartData.length === 0 ? (
              <div className="flex flex-col items-center py-12">
                <FileX className="h-10 w-10 text-muted-foreground" />
                <p className="mt-3 text-sm text-muted-foreground">
                  Relatório em desenvolvimento. Dados ainda não disponíveis.
                </p>
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} />
                    <XAxis dataKey="month" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '8px', color: 'var(--color-foreground)' }} />
                    <Bar dataKey="atendimentos" fill="#0D9488" radius={[4, 4, 0, 0]} name="Atendimentos" />
                    <Bar dataKey="internacoes" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Internações" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
