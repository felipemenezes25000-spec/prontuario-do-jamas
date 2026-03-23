import { memo } from 'react';
import { Loader2, TrendingUp } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useExamTrending } from '@/services/exams.service';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
  ResponsiveContainer,
} from 'recharts';

// ── Types ───────────────────────────────────────────────────

interface TrendingPoint {
  date: string;
  value: number;
  unit: string;
  referenceMin: number | null;
  referenceMax: number | null;
  isAbnormal: boolean;
}

interface ChartDataPoint {
  date: string;
  dateLabel: string;
  value: number;
  isAbnormal: boolean;
}

// ── Component ───────────────────────────────────────────────

interface LabTrendChartProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  analyte: string;
}

export const LabTrendChart = memo(function LabTrendChart({
  open,
  onOpenChange,
  patientId,
  analyte,
}: LabTrendChartProps) {
  const { data: trendData = [], isLoading } = useExamTrending(
    patientId,
    analyte,
    open,
  );

  const points = trendData as TrendingPoint[];

  const chartData: ChartDataPoint[] = points.map((p) => ({
    date: p.date,
    dateLabel: new Date(p.date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    }),
    value: p.value,
    isAbnormal: p.isAbnormal,
  }));

  // Get reference range from first available point
  const refMin = points.find((p) => p.referenceMin !== null)?.referenceMin ?? null;
  const refMax = points.find((p) => p.referenceMax !== null)?.referenceMax ?? null;
  const unit = points[0]?.unit ?? '';

  // Calculate Y-axis domain
  const allValues = chartData.map((d) => d.value);
  const minVal = Math.min(...allValues, refMin ?? Infinity);
  const maxVal = Math.max(...allValues, refMax ?? -Infinity);
  const padding = (maxVal - minVal) * 0.15 || 1;
  const yMin = Math.floor(minVal - padding);
  const yMax = Math.ceil(maxVal + padding);

  const abnormalCount = chartData.filter((d) => d.isAbnormal).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-border bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-400" />
            Tendencia: {analyte}
            {unit && (
              <Badge variant="outline" className="text-[10px] font-mono ml-1">
                {unit}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Carregando tendencia...</span>
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex flex-col items-center py-12">
            <TrendingUp className="h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">
              Nenhum dado historico encontrado para este analito.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Summary badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="text-[10px]">
                {chartData.length} resultado(s)
              </Badge>
              {abnormalCount > 0 && (
                <Badge variant="secondary" className="text-[10px] bg-red-500/20 text-red-400">
                  {abnormalCount} fora da referencia
                </Badge>
              )}
              {refMin !== null && refMax !== null && (
                <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground">
                  Ref: {refMin} - {refMax}
                </Badge>
              )}
            </div>

            {/* Chart */}
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis
                    dataKey="dateLabel"
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    domain={[yMin, yMax]}
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                    width={45}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
                    formatter={(value: number, _name: string, props: { payload?: ChartDataPoint }) => [
                      <span
                        key="val"
                        className={cn(
                          'font-medium',
                          props.payload?.isAbnormal ? 'text-red-400' : 'text-emerald-400',
                        )}
                      >
                        {value} {unit}
                        {props.payload?.isAbnormal ? ' (fora da ref.)' : ''}
                      </span>,
                      analyte,
                    ]}
                  />

                  {/* Reference area (normal range) */}
                  {refMin !== null && refMax !== null && (
                    <ReferenceArea
                      y1={refMin}
                      y2={refMax}
                      fill="hsl(var(--muted-foreground))"
                      fillOpacity={0.06}
                      strokeOpacity={0}
                    />
                  )}

                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={(props: Record<string, unknown>) => {
                      const { cx, cy, index } = props as { cx: number; cy: number; index: number };
                      const point = chartData[index];
                      if (!point) return <circle key={index} cx={cx} cy={cy} r={0} />;
                      return (
                        <circle
                          key={index}
                          cx={cx}
                          cy={cy}
                          r={4}
                          fill={point.isAbnormal ? '#ef4444' : '#10b981'}
                          stroke={point.isAbnormal ? '#ef4444' : '#10b981'}
                          strokeWidth={2}
                        />
                      );
                    }}
                    activeDot={{
                      r: 6,
                      strokeWidth: 2,
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Data table */}
            <div className="rounded-lg border border-border overflow-hidden max-h-32 overflow-y-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-accent/30">
                    <th className="px-3 py-1.5 text-left text-[10px] font-medium text-muted-foreground">
                      Data
                    </th>
                    <th className="px-3 py-1.5 text-left text-[10px] font-medium text-muted-foreground">
                      Valor
                    </th>
                    <th className="px-3 py-1.5 text-left text-[10px] font-medium text-muted-foreground">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {[...chartData].reverse().map((point, i) => (
                    <tr key={i} className={point.isAbnormal ? 'bg-red-500/5' : ''}>
                      <td className="px-3 py-1.5 text-[11px]">{point.dateLabel}</td>
                      <td
                        className={cn(
                          'px-3 py-1.5 text-[11px] font-medium',
                          point.isAbnormal ? 'text-red-400' : '',
                        )}
                      >
                        {point.value} {unit}
                      </td>
                      <td className="px-3 py-1.5">
                        {point.isAbnormal ? (
                          <Badge variant="secondary" className="text-[9px] bg-red-500/20 text-red-400">
                            Alterado
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[9px] bg-green-500/20 text-green-400">
                            Normal
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
});
