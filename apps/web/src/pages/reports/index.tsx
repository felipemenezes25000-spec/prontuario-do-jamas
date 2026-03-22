import {
  BarChart3,
  BedDouble,
  Users,
  TrendingUp,
  DollarSign,
  Stethoscope,
  ArrowRight,
  Construction,
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

const reportCards = [
  { id: 'hospital-movement', title: 'Movimento Hospitalar', description: 'Internações, altas, óbitos e transferências', icon: BedDouble, color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
  { id: 'daily-census', title: 'Censo Diário', description: 'Ocupação de leitos e taxa de permanência', icon: Users, color: 'text-teal-600 dark:text-teal-400', bgColor: 'bg-teal-500/10' },
  { id: 'productivity', title: 'Produtividade Médica', description: 'Atendimentos por profissional e tempo médio', icon: Stethoscope, color: 'text-purple-400', bgColor: 'bg-purple-500/10' },
  { id: 'quality', title: 'Indicadores de Qualidade', description: 'Infecção hospitalar, quedas, LPP, reinternações', icon: TrendingUp, color: 'text-amber-400', bgColor: 'bg-amber-500/10' },
  { id: 'financial', title: 'Relatório Financeiro', description: 'Faturamento, glosas, receita por convênio', icon: DollarSign, color: 'text-green-400', bgColor: 'bg-green-500/10' },
  { id: 'encounters', title: 'Estatísticas de Atendimento', description: 'Volume, classificação, tempo de espera', icon: BarChart3, color: 'text-red-400', bgColor: 'bg-red-500/10' },
];

const mockChartData = [
  { month: 'Out', atendimentos: 420, internacoes: 85 },
  { month: 'Nov', atendimentos: 480, internacoes: 92 },
  { month: 'Dez', atendimentos: 390, internacoes: 78 },
  { month: 'Jan', atendimentos: 510, internacoes: 95 },
  { month: 'Fev', atendimentos: 475, internacoes: 88 },
  { month: 'Mar', atendimentos: 530, internacoes: 102 },
];

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState<string | null>(null);

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
            <p className="text-sm text-muted-foreground">
              Visualização em desenvolvimento. Dados de demonstração abaixo.
            </p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="month" stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px', color: '#fafafa' }} />
                  <Bar dataKey="atendimentos" fill="#0D9488" radius={[4, 4, 0, 0]} name="Atendimentos" />
                  <Bar dataKey="internacoes" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Internações" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
