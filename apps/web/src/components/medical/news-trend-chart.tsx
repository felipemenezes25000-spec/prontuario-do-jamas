'use client';

import * as React from 'react';
import { Activity, ChevronDown, ChevronUp } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ReferenceArea,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NEWSTrendPoint {
  id: string;
  recordedAt: string;
  newsScore: number | null;
  newsClassification?: string | null;
}

interface NEWSTrendChartProps {
  data: NEWSTrendPoint[];
  className?: string;
  defaultExpanded?: boolean;
}

interface ChartDataPoint {
  time: string;
  timeLabel: string;
  score: number;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

// Custom tooltip for the chart
function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ value: number; payload: ChartDataPoint }> }) {
  if (!active || !payload?.[0]) return null;

  const point = payload[0];
  const score = point.value;
  let classification = 'Baixo';
  let color = 'text-green-400';
  if (score >= 7) {
    classification = 'Alto — TRR';
    color = 'text-red-400';
  } else if (score >= 5) {
    classification = 'Médio';
    color = 'text-yellow-400';
  }

  return (
    <div className="rounded-lg border border-border bg-card p-2 shadow-lg">
      <p className="text-xs text-muted-foreground">{point.payload.timeLabel}</p>
      <p className={cn('text-sm font-bold', color)}>
        NEWS: {score} ({classification})
      </p>
    </div>
  );
}

export function NEWSTrendChart({ data, className, defaultExpanded = false }: NEWSTrendChartProps) {
  const [expanded, setExpanded] = React.useState(defaultExpanded);

  // Filter to last 24h and only those with a newsScore
  const now = Date.now();
  const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;

  const chartData: ChartDataPoint[] = React.useMemo(() => {
    return data
      .filter((d) => d.newsScore != null && new Date(d.recordedAt).getTime() >= twentyFourHoursAgo)
      .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime())
      .map((d) => ({
        time: d.recordedAt,
        timeLabel: `${formatDate(d.recordedAt)} ${formatTime(d.recordedAt)}`,
        score: d.newsScore as number,
      }));
  }, [data, twentyFourHoursAgo]);

  if (chartData.length === 0) {
    return null;
  }

  const latestScore = chartData[chartData.length - 1]?.score ?? 0;
  const latestColor = latestScore >= 7 ? 'text-red-500' : latestScore >= 5 ? 'text-yellow-500' : 'text-green-500';

  return (
    <Card className={cn('border-border bg-card', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-teal-500" />
            <CardTitle className="text-sm font-medium">Tendência NEWS (24h)</CardTitle>
            <span className={cn('text-sm font-bold', latestColor)}>
              {latestScore}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setExpanded((e) => !e)}
          >
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="pt-0">
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />

                {/* Background zones */}
                <ReferenceArea y1={0} y2={4} fill="#22c55e" fillOpacity={0.05} />
                <ReferenceArea y1={4} y2={6} fill="#eab308" fillOpacity={0.08} />
                <ReferenceArea y1={6} y2={20} fill="#ef4444" fillOpacity={0.08} />

                <XAxis
                  dataKey="timeLabel"
                  tick={{ fontSize: 10, fill: '#71717a' }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={[0, 'dataMax+2']}
                  tick={{ fontSize: 10, fill: '#71717a' }}
                  allowDecimals={false}
                />
                <RechartsTooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#10b981' }}
                  activeDot={{ r: 5, stroke: '#10b981', strokeWidth: 2, fill: '#ffffff' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex items-center justify-center gap-4 text-[10px] text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="h-2 w-4 rounded-sm bg-green-500/20" />
              <span>0-4 Baixo</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-2 w-4 rounded-sm bg-yellow-500/20" />
              <span>5-6 Médio</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-2 w-4 rounded-sm bg-red-500/20" />
              <span>≥7 Alto (TRR)</span>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
