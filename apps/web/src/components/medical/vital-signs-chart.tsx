'use client';

import * as React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceArea,
} from 'recharts';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';

interface VitalSignsChartProps {
  data: Array<{
    recordedAt: string;
    systolicBP?: number;
    diastolicBP?: number;
    heartRate?: number;
    oxygenSaturation?: number;
    temperature?: number;
  }>;
  selectedMetric?: string;
  className?: string;
}

type MetricKey = 'bp' | 'heartRate' | 'oxygenSaturation' | 'temperature';

interface MetricConfig {
  key: MetricKey;
  label: string;
  dataKeys: string[];
  colors: string[];
  unit: string;
  refMin: number;
  refMax: number;
  domain: [number, number];
}

const metricConfigs: MetricConfig[] = [
  {
    key: 'bp',
    label: 'PA',
    dataKeys: ['systolicBP', 'diastolicBP'],
    colors: ['#0D9488', '#3b82f6'],
    unit: 'mmHg',
    refMin: 90,
    refMax: 140,
    domain: [40, 200],
  },
  {
    key: 'heartRate',
    label: 'FC',
    dataKeys: ['heartRate'],
    colors: ['#0D9488'],
    unit: 'bpm',
    refMin: 60,
    refMax: 100,
    domain: [30, 150],
  },
  {
    key: 'oxygenSaturation',
    label: 'SpO2',
    dataKeys: ['oxygenSaturation'],
    colors: ['#3b82f6'],
    unit: '%',
    refMin: 92,
    refMax: 100,
    domain: [80, 100],
  },
  {
    key: 'temperature',
    label: 'Temp',
    dataKeys: ['temperature'],
    colors: ['#f59e0b'],
    unit: '\u00B0C',
    refMin: 35,
    refMax: 38,
    domain: [33, 42],
  },
];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

export function VitalSignsChart({
  data,
  selectedMetric,
  className,
}: VitalSignsChartProps) {
  const [activeMetric, setActiveMetric] = React.useState<MetricKey>(
    (selectedMetric as MetricKey) || 'bp',
  );

  // Safe assertion: activeMetric is always one of MetricKey values, and metricConfigs always has entries
  const config = (metricConfigs.find((m) => m.key === activeMetric) ?? metricConfigs[0]) as MetricConfig;

  const chartData = data.map((d) => ({
    ...d,
    time: formatDate(d.recordedAt),
  }));

  return (
    <Card className={cn('p-4', className)}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground">
          Tendência — Sinais Vitais
        </h3>
        <Tabs
          value={activeMetric}
          onValueChange={(v) => setActiveMetric(v as MetricKey)}
        >
          <TabsList className="h-8">
            {metricConfigs.map((m) => (
              <TabsTrigger key={m.key} value={m.key} className="px-2.5 text-xs">
                {m.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              domain={config.domain}
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
              width={35}
            />
            <RechartsTooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
                color: 'hsl(var(--foreground))',
              }}
              formatter={(value: number, name: string) => [
                `${value} ${config.unit}`,
                name === 'systolicBP'
                  ? 'PAS'
                  : name === 'diastolicBP'
                    ? 'PAD'
                    : config.label,
              ]}
            />
            {/* Reference range band */}
            <ReferenceArea
              y1={config.refMin}
              y2={config.refMax}
              fill="hsl(var(--muted))"
              fillOpacity={0.15}
              stroke="none"
            />
            {config.dataKeys.map((dk, i) => (
              <Line
                key={dk}
                type="monotone"
                dataKey={dk}
                stroke={config.colors[i]}
                strokeWidth={2}
                dot={{ r: 3, fill: config.colors[i] }}
                activeDot={{ r: 5, stroke: config.colors[i], strokeWidth: 2 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 flex items-center justify-center gap-4">
        {config.dataKeys.map((dk, i) => (
          <div key={dk} className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: config.colors[i] }}
            />
            <span className="text-[10px] text-muted-foreground">
              {dk === 'systolicBP'
                ? 'Sistólica'
                : dk === 'diastolicBP'
                  ? 'Diastólica'
                  : config.label}
            </span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-4 rounded-sm bg-muted/40" />
          <span className="text-[10px] text-muted-foreground">
            Faixa normal
          </span>
        </div>
      </div>
    </Card>
  );
}
