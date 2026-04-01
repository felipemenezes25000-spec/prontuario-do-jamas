import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Mic,
  CheckCircle2,
  Pill,
  Activity,
  BedDouble,
  XCircle,
  CalendarClock,
  AlertTriangle,
  Shield,
  Droplets,
  Camera,
  RotateCcw,
  Users,
  Heart,
  Smile,
  Frown,
  ClipboardCheck,
  Eye,
  Plus,
  Target,
  Thermometer,
  Wind,
  Gauge,
  Sun,
  Moon,
  Sunrise,
  FileText,
  ArrowRightLeft,
  Stethoscope,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Zap,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn, getInitials, calculateAge } from '@/lib/utils';
import { useBeds } from '@/services/admissions.service';
import {
  useMedicationChecks,
  useAdministerMedication,
  useSkipMedication,
} from '@/services/nursing.service';
import { PageLoading } from '@/components/common/page-loading';
import { PageError } from '@/components/common/page-error';
import type { MedicationCheck } from '@/types';

// ============================================================================
// Helpers
// ============================================================================

function useCurrentTime() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function getShiftInfo(date: Date): { label: string; icon: typeof Sun; color: string } {
  const h = date.getHours();
  if (h >= 7 && h < 13) return { label: 'Manha', icon: Sun, color: 'text-amber-400' };
  if (h >= 13 && h < 19) return { label: 'Tarde', icon: Sunrise, color: 'text-orange-400' };
  return { label: 'Noite', icon: Moon, color: 'text-indigo-400' };
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// ============================================================================
// Mock vital signs trend data (24h)
// ============================================================================

function generateVitalsTrend(): Array<{
  time: string;
  pas: number;
  pad: number;
  fc: number;
  fr: number;
  temp: number;
  spo2: number;
  dor: number;
}> {
  const points = [];
  for (let i = 0; i < 12; i++) {
    const h = new Date(Date.now() - (11 - i) * 2 * 3600000);
    points.push({
      time: h.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      pas: 110 + Math.floor(Math.random() * 30),
      pad: 65 + Math.floor(Math.random() * 20),
      fc: 65 + Math.floor(Math.random() * 25),
      fr: 14 + Math.floor(Math.random() * 8),
      temp: 36.2 + Math.random() * 1.5,
      spo2: 94 + Math.floor(Math.random() * 6),
      dor: Math.floor(Math.random() * 5),
    });
  }
  return points;
}

// ============================================================================
// NEWS Score Calculator
// ============================================================================

function calculateNEWS(vitals: {
  fr: number;
  spo2: number;
  pas: number;
  fc: number;
  temp: number;
  consciousnessAlert: boolean;
}): { score: number; level: string; color: string; bgColor: string } {
  let score = 0;

  // Respiratory Rate
  if (vitals.fr <= 8) score += 3;
  else if (vitals.fr <= 11) score += 1;
  else if (vitals.fr <= 20) score += 0;
  else if (vitals.fr <= 24) score += 2;
  else score += 3;

  // SpO2
  if (vitals.spo2 <= 91) score += 3;
  else if (vitals.spo2 <= 93) score += 2;
  else if (vitals.spo2 <= 95) score += 1;
  else score += 0;

  // Systolic BP
  if (vitals.pas <= 90) score += 3;
  else if (vitals.pas <= 100) score += 2;
  else if (vitals.pas <= 110) score += 1;
  else if (vitals.pas <= 219) score += 0;
  else score += 3;

  // Heart Rate
  if (vitals.fc <= 40) score += 3;
  else if (vitals.fc <= 50) score += 1;
  else if (vitals.fc <= 90) score += 0;
  else if (vitals.fc <= 110) score += 1;
  else if (vitals.fc <= 130) score += 2;
  else score += 3;

  // Temperature
  if (vitals.temp <= 35.0) score += 3;
  else if (vitals.temp <= 36.0) score += 1;
  else if (vitals.temp <= 38.0) score += 0;
  else if (vitals.temp <= 39.0) score += 1;
  else score += 2;

  // Consciousness
  if (!vitals.consciousnessAlert) score += 3;

  if (score >= 7) return { score, level: 'CRITICO', color: 'text-red-400', bgColor: 'bg-red-500/20 border-red-500/50' };
  if (score >= 5) return { score, level: 'ALTO', color: 'text-orange-400', bgColor: 'bg-orange-500/20 border-orange-500/50' };
  if (score >= 1) return { score, level: 'BAIXO', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20 border-yellow-500/50' };
  return { score, level: 'NORMAL', color: 'text-emerald-400', bgColor: 'bg-emerald-500/20 border-emerald-500/50' };
}

// ============================================================================
// Vital Gauge Component
// ============================================================================

interface VitalGaugeProps {
  label: string;
  value: number | string;
  unit: string;
  icon: React.ReactNode;
  min: number;
  max: number;
  normalMin: number;
  normalMax: number;
  current: number;
  color: string;
  trend?: 'up' | 'down' | 'stable';
}

function VitalGauge({ label, value, unit, icon, min, max, normalMin, normalMax, current, color, trend }: VitalGaugeProps) {
  const percent = Math.max(0, Math.min(100, ((current - min) / (max - min)) * 100));
  const normalMinPercent = ((normalMin - min) / (max - min)) * 100;
  const normalMaxPercent = ((normalMax - min) / (max - min)) * 100;
  const isNormal = current >= normalMin && current <= normalMax;

  return (
    <div className={cn(
      'group relative rounded-xl border p-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg',
      isNormal
        ? 'border-zinc-700/50 bg-zinc-900/80 hover:border-emerald-500/30 hover:shadow-emerald-500/5'
        : 'border-red-500/30 bg-red-500/5 hover:border-red-500/50 hover:shadow-red-500/10'
    )}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={cn('rounded-lg p-1.5', isNormal ? 'bg-zinc-800' : 'bg-red-500/20')}>
            {icon}
          </div>
          <span className="text-xs font-medium text-zinc-400">{label}</span>
        </div>
        {trend && (
          <div className={cn('flex items-center gap-0.5 text-[10px]', trend === 'up' ? 'text-red-400' : trend === 'down' ? 'text-blue-400' : 'text-zinc-500')}>
            {trend === 'up' ? <TrendingUp className="h-3 w-3" /> : trend === 'down' ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
          </div>
        )}
      </div>
      <div className="flex items-baseline gap-1">
        <span className={cn('text-3xl font-black tabular-nums tracking-tight', color)}>{value}</span>
        <span className="text-xs text-zinc-500">{unit}</span>
      </div>
      {/* Gauge bar */}
      <div className="mt-3 relative h-2 rounded-full bg-zinc-800 overflow-hidden">
        {/* Normal range indicator */}
        <div
          className="absolute h-full bg-emerald-500/20 rounded-full"
          style={{ left: `${normalMinPercent}%`, width: `${normalMaxPercent - normalMinPercent}%` }}
        />
        {/* Current value indicator */}
        <div
          className={cn('absolute h-full rounded-full transition-all duration-500', isNormal ? 'bg-emerald-500' : 'bg-red-500')}
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[9px] text-zinc-600">{min}</span>
        <span className="text-[9px] text-zinc-500">{normalMin}-{normalMax}</span>
        <span className="text-[9px] text-zinc-600">{max}</span>
      </div>
    </div>
  );
}

// ============================================================================
// Vital Signs Tab
// ============================================================================

function VitalSignsTab() {
  const [selectedPatient, setSelectedPatient] = useState('maria-silva');
  const [vitals, setVitals] = useState({
    pas: '120', pad: '80', fc: '72', fr: '16', temp: '36.5', spo2: '98', dor: '2',
  });
  const [consciousnessAlert, setConsciousnessAlert] = useState(true);
  const trendData = useMemo(() => generateVitalsTrend(), []);

  const newsResult = useMemo(() => calculateNEWS({
    fr: parseInt(vitals.fr) || 0,
    spo2: parseInt(vitals.spo2) || 0,
    pas: parseInt(vitals.pas) || 0,
    fc: parseInt(vitals.fc) || 0,
    temp: parseFloat(vitals.temp) || 0,
    consciousnessAlert,
  }), [vitals, consciousnessAlert]);

  const handleVitalChange = useCallback((key: string, value: string) => {
    setVitals(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleRecordVitals = useCallback(() => {
    const pas = parseInt(vitals.pas);
    const pad = parseInt(vitals.pad);
    const fc = parseInt(vitals.fc);
    const fr = parseInt(vitals.fr);
    const temp = parseFloat(vitals.temp);
    const spo2 = parseInt(vitals.spo2);

    if (!pas || !pad || !fc || !fr || !temp || !spo2) {
      toast.error('Preencha todos os campos obrigatorios');
      return;
    }
    if (pas < 40 || pas > 300) { toast.error('PA Sistolica fora do intervalo valido (40-300)'); return; }
    if (pad < 20 || pad > 200) { toast.error('PA Diastolica fora do intervalo valido (20-200)'); return; }
    if (fc < 20 || fc > 300) { toast.error('FC fora do intervalo valido (20-300)'); return; }
    if (fr < 4 || fr > 60) { toast.error('FR fora do intervalo valido (4-60)'); return; }
    if (temp < 32 || temp > 42) { toast.error('Temperatura fora do intervalo valido (32-42)'); return; }
    if (spo2 < 50 || spo2 > 100) { toast.error('SpO2 fora do intervalo valido (50-100)'); return; }

    toast.success(`Sinais vitais registrados — NEWS: ${newsResult.score} (${newsResult.level})`);
  }, [vitals, newsResult]);

  return (
    <div className="space-y-4">
      {/* Patient selector */}
      <Card className="bg-zinc-900/80 border-zinc-800/50 backdrop-blur-sm">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-3">
            <Label className="text-xs text-zinc-400 shrink-0">Paciente:</Label>
            <Select value={selectedPatient} onValueChange={setSelectedPatient}>
              <SelectTrigger className="bg-zinc-800/80 border-zinc-700 max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="maria-silva">Maria Silva — Leito 201-A</SelectItem>
                <SelectItem value="joao-santos">Joao Santos — Leito 202-B</SelectItem>
                <SelectItem value="ana-costa">Ana Costa — Leito 203-A</SelectItem>
                <SelectItem value="pedro-oliveira">Pedro Oliveira — Leito 204-B</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Visual Gauges */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <VitalGauge
          label="PA Sistolica"
          value={vitals.pas}
          unit="mmHg"
          icon={<Activity className="h-4 w-4 text-red-400" />}
          min={60}
          max={220}
          normalMin={90}
          normalMax={140}
          current={parseInt(vitals.pas) || 0}
          color={parseInt(vitals.pas) >= 90 && parseInt(vitals.pas) <= 140 ? 'text-emerald-400' : 'text-red-400'}
          trend="stable"
        />
        <VitalGauge
          label="Freq. Cardiaca"
          value={vitals.fc}
          unit="bpm"
          icon={<Heart className="h-4 w-4 text-pink-400" />}
          min={30}
          max={200}
          normalMin={60}
          normalMax={100}
          current={parseInt(vitals.fc) || 0}
          color={parseInt(vitals.fc) >= 60 && parseInt(vitals.fc) <= 100 ? 'text-emerald-400' : 'text-red-400'}
          trend="stable"
        />
        <VitalGauge
          label="Freq. Respiratoria"
          value={vitals.fr}
          unit="irpm"
          icon={<Wind className="h-4 w-4 text-cyan-400" />}
          min={4}
          max={40}
          normalMin={12}
          normalMax={20}
          current={parseInt(vitals.fr) || 0}
          color={parseInt(vitals.fr) >= 12 && parseInt(vitals.fr) <= 20 ? 'text-emerald-400' : 'text-yellow-400'}
          trend="up"
        />
        <VitalGauge
          label="Temperatura"
          value={vitals.temp}
          unit="C"
          icon={<Thermometer className="h-4 w-4 text-orange-400" />}
          min={34}
          max={42}
          normalMin={36}
          normalMax={37.5}
          current={parseFloat(vitals.temp) || 0}
          color={parseFloat(vitals.temp) >= 36 && parseFloat(vitals.temp) <= 37.5 ? 'text-emerald-400' : 'text-orange-400'}
          trend="stable"
        />
        <VitalGauge
          label="SpO2"
          value={vitals.spo2}
          unit="%"
          icon={<Gauge className="h-4 w-4 text-blue-400" />}
          min={70}
          max={100}
          normalMin={95}
          normalMax={100}
          current={parseInt(vitals.spo2) || 0}
          color={parseInt(vitals.spo2) >= 95 ? 'text-emerald-400' : parseInt(vitals.spo2) >= 90 ? 'text-yellow-400' : 'text-red-400'}
          trend="stable"
        />
        <VitalGauge
          label="Dor (EVA)"
          value={vitals.dor}
          unit="/10"
          icon={<Zap className="h-4 w-4 text-yellow-400" />}
          min={0}
          max={10}
          normalMin={0}
          normalMax={3}
          current={parseInt(vitals.dor) || 0}
          color={parseInt(vitals.dor) <= 3 ? 'text-emerald-400' : parseInt(vitals.dor) <= 6 ? 'text-yellow-400' : 'text-red-400'}
          trend="down"
        />
      </div>

      {/* Input Form */}
      <Card className="bg-zinc-900/80 border-zinc-800/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-emerald-400" />
            Registro de Sinais Vitais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] text-zinc-400">PA Sistolica *</Label>
              <Input
                type="number"
                placeholder="120"
                value={vitals.pas}
                onChange={e => handleVitalChange('pas', e.target.value)}
                className={cn('bg-zinc-800/80 border-zinc-700 h-9 text-sm tabular-nums',
                  vitals.pas && (parseInt(vitals.pas) < 90 || parseInt(vitals.pas) > 140) && 'border-red-500/50 focus-visible:ring-red-500'
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] text-zinc-400">PA Diastolica *</Label>
              <Input
                type="number"
                placeholder="80"
                value={vitals.pad}
                onChange={e => handleVitalChange('pad', e.target.value)}
                className={cn('bg-zinc-800/80 border-zinc-700 h-9 text-sm tabular-nums',
                  vitals.pad && (parseInt(vitals.pad) < 60 || parseInt(vitals.pad) > 90) && 'border-yellow-500/50 focus-visible:ring-yellow-500'
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] text-zinc-400">FC (bpm) *</Label>
              <Input
                type="number"
                placeholder="72"
                value={vitals.fc}
                onChange={e => handleVitalChange('fc', e.target.value)}
                className={cn('bg-zinc-800/80 border-zinc-700 h-9 text-sm tabular-nums',
                  vitals.fc && (parseInt(vitals.fc) < 60 || parseInt(vitals.fc) > 100) && 'border-yellow-500/50 focus-visible:ring-yellow-500'
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] text-zinc-400">FR (irpm) *</Label>
              <Input
                type="number"
                placeholder="16"
                value={vitals.fr}
                onChange={e => handleVitalChange('fr', e.target.value)}
                className={cn('bg-zinc-800/80 border-zinc-700 h-9 text-sm tabular-nums',
                  vitals.fr && (parseInt(vitals.fr) < 12 || parseInt(vitals.fr) > 20) && 'border-yellow-500/50 focus-visible:ring-yellow-500'
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] text-zinc-400">Temp (C) *</Label>
              <Input
                type="number"
                step="0.1"
                placeholder="36.5"
                value={vitals.temp}
                onChange={e => handleVitalChange('temp', e.target.value)}
                className={cn('bg-zinc-800/80 border-zinc-700 h-9 text-sm tabular-nums',
                  vitals.temp && (parseFloat(vitals.temp) < 36 || parseFloat(vitals.temp) > 37.5) && 'border-orange-500/50 focus-visible:ring-orange-500'
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] text-zinc-400">SpO2 (%) *</Label>
              <Input
                type="number"
                placeholder="98"
                value={vitals.spo2}
                onChange={e => handleVitalChange('spo2', e.target.value)}
                className={cn('bg-zinc-800/80 border-zinc-700 h-9 text-sm tabular-nums',
                  vitals.spo2 && parseInt(vitals.spo2) < 95 && 'border-red-500/50 focus-visible:ring-red-500'
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] text-zinc-400">Dor (0-10)</Label>
              <Input
                type="number"
                min={0}
                max={10}
                placeholder="0"
                value={vitals.dor}
                onChange={e => handleVitalChange('dor', e.target.value)}
                className={cn('bg-zinc-800/80 border-zinc-700 h-9 text-sm tabular-nums',
                  vitals.dor && parseInt(vitals.dor) > 6 && 'border-red-500/50 focus-visible:ring-red-500'
                )}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 mt-4">
            <button
              type="button"
              onClick={() => setConsciousnessAlert(!consciousnessAlert)}
              className={cn(
                'rounded-lg border px-3 py-1.5 text-xs transition-all',
                consciousnessAlert
                  ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                  : 'border-red-500/50 bg-red-500/10 text-red-400'
              )}
            >
              {consciousnessAlert ? 'Alerta (Consciente)' : 'Alterado (Confuso/Sonolento)'}
            </button>
            <div className="flex-1" />
            <Button
              variant="outline"
              className="border-teal-500/30 text-teal-400 hover:bg-teal-500/10 gap-2"
            >
              <Mic className="h-4 w-4" /> Ditar
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-500 gap-2"
              onClick={handleRecordVitals}
            >
              <CheckCircle2 className="h-4 w-4" /> Registrar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* NEWS Score */}
      <Card className={cn('border transition-all duration-300', newsResult.bgColor)}>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-xs text-zinc-400 uppercase tracking-wider">NEWS Score</p>
                <p className={cn('text-5xl font-black tabular-nums', newsResult.color)}>
                  {newsResult.score}
                </p>
              </div>
              <div className="h-12 w-px bg-zinc-700" />
              <div>
                <Badge className={cn('text-sm font-bold px-3 py-1', newsResult.bgColor, newsResult.color)}>
                  {newsResult.level}
                </Badge>
                <p className="text-xs text-zinc-400 mt-1.5">
                  {newsResult.level === 'CRITICO' && 'Acionar equipe de resposta rapida'}
                  {newsResult.level === 'ALTO' && 'Notificar medico plantonista imediatamente'}
                  {newsResult.level === 'BAIXO' && 'Monitorizar a cada 4-6 horas'}
                  {newsResult.level === 'NORMAL' && 'Monitorizar rotina a cada 12 horas'}
                </p>
              </div>
            </div>
            <div className="hidden md:flex gap-2">
              {[
                { label: 'FR', val: vitals.fr },
                { label: 'SpO2', val: vitals.spo2 },
                { label: 'PAS', val: vitals.pas },
                { label: 'FC', val: vitals.fc },
                { label: 'T', val: vitals.temp },
              ].map(item => (
                <div key={item.label} className="text-center px-2">
                  <p className="text-[10px] text-zinc-500">{item.label}</p>
                  <p className="text-sm font-bold text-zinc-300 tabular-nums">{item.val}</p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trend Charts */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="bg-zinc-900/80 border-zinc-800/50">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-zinc-400 flex items-center gap-2">
              <Activity className="h-3.5 w-3.5 text-red-400" />
              Pressao Arterial e FC — 24h
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#71717a' }} />
                <YAxis tick={{ fontSize: 10, fill: '#71717a' }} domain={[40, 200]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px', fontSize: '12px' }}
                  labelStyle={{ color: '#a1a1aa' }}
                />
                <ReferenceLine y={140} stroke="#ef444455" strokeDasharray="3 3" />
                <ReferenceLine y={90} stroke="#ef444455" strokeDasharray="3 3" />
                <Line type="monotone" dataKey="pas" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} name="PAS" />
                <Line type="monotone" dataKey="pad" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} name="PAD" />
                <Line type="monotone" dataKey="fc" stroke="#ec4899" strokeWidth={2} dot={{ r: 3 }} name="FC" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/80 border-zinc-800/50">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-zinc-400 flex items-center gap-2">
              <Gauge className="h-3.5 w-3.5 text-blue-400" />
              SpO2 e Temperatura — 24h
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#71717a' }} />
                <YAxis yAxisId="spo2" tick={{ fontSize: 10, fill: '#71717a' }} domain={[88, 100]} />
                <YAxis yAxisId="temp" orientation="right" tick={{ fontSize: 10, fill: '#71717a' }} domain={[35, 40]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px', fontSize: '12px' }}
                  labelStyle={{ color: '#a1a1aa' }}
                />
                <ReferenceLine yAxisId="spo2" y={95} stroke="#3b82f655" strokeDasharray="3 3" />
                <Area yAxisId="spo2" type="monotone" dataKey="spo2" stroke="#3b82f6" fill="#3b82f620" strokeWidth={2} name="SpO2" />
                <Line type="monotone" dataKey="temp" yAxisId="temp" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} name="Temp" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============================================================================
// Medication Check Tab (enhanced from original)
// ============================================================================

const MOCK_RIGHT_5 = [
  'Paciente certo',
  'Medicamento certo',
  'Dose certa',
  'Via certa',
  'Horario certo',
];

function MedicationCheckTab() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCheck, setSelectedCheck] = useState<MedicationCheck | null>(null);
  const [dialogMode, setDialogMode] = useState<'administer' | 'skip'>('administer');
  const [lot, setLot] = useState('');
  const [observations, setObservations] = useState('');
  const [skipReason, setSkipReason] = useState('');
  const [right5, setRight5] = useState<boolean[]>([false, false, false, false, false]);

  const { data: allMedicationChecks = [] } = useMedicationChecks({ status: 'SCHEDULED' });
  const administerMutation = useAdministerMedication();
  const skipMutation = useSkipMedication();

  const pendingChecks = useMemo(() =>
    allMedicationChecks
      .filter((m) => m.status === 'SCHEDULED')
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()),
    [allMedicationChecks],
  );

  const handleOpenAdminister = useCallback((check: MedicationCheck) => {
    setSelectedCheck(check);
    setLot('');
    setObservations('');
    setSkipReason('');
    setRight5([false, false, false, false, false]);
    setDialogMode('administer');
    setDialogOpen(true);
  }, []);

  const handleAdminister = useCallback(async () => {
    if (!selectedCheck) return;
    if (!right5.every(Boolean)) {
      toast.error('Confirme todos os 5 certos antes de administrar');
      return;
    }
    const isControlled = selectedCheck.prescriptionItem?.isControlled;
    if (isControlled && !lot.trim()) {
      toast.error('Lote obrigatorio para medicamentos controlados');
      return;
    }
    try {
      await administerMutation.mutateAsync({
        prescriptionItemId: selectedCheck.prescriptionItemId,
        encounterId: '',
        scheduledAt: selectedCheck.scheduledAt,
        lot: lot.trim() || undefined,
        observations: observations.trim() || undefined,
      });
      toast.success('Medicamento administrado com sucesso');
      setDialogOpen(false);
    } catch {
      toast.error('Erro ao registrar administracao');
    }
  }, [selectedCheck, lot, observations, administerMutation, right5]);

  const handleSkip = useCallback(async () => {
    if (!selectedCheck) return;
    if (!skipReason.trim()) {
      toast.error('Informe o motivo');
      return;
    }
    try {
      await skipMutation.mutateAsync({
        prescriptionItemId: selectedCheck.prescriptionItemId,
        encounterId: '',
        scheduledAt: selectedCheck.scheduledAt,
        observations: skipReason.trim(),
      });
      toast.success('Medicamento marcado como nao administrado');
      setDialogOpen(false);
    } catch {
      toast.error('Erro ao registrar');
    }
  }, [selectedCheck, skipReason, skipMutation]);

  const getTimeStatus = useCallback((scheduledAt: string) => {
    const diff = new Date(scheduledAt).getTime() - Date.now();
    const minutes = diff / 60000;
    if (minutes < -30) return { status: 'overdue' as const, label: 'Atrasado', minutes: Math.abs(Math.round(minutes)) };
    if (minutes < 0) return { status: 'late' as const, label: 'Atrasado', minutes: Math.abs(Math.round(minutes)) };
    if (minutes < 30) return { status: 'soon' as const, label: 'Em breve', minutes: Math.round(minutes) };
    return { status: 'scheduled' as const, label: 'Agendado', minutes: Math.round(minutes) };
  }, []);

  return (
    <>
      <div className="space-y-2">
        {pendingChecks.length === 0 ? (
          <Card className="border-zinc-800/50 bg-zinc-900/80">
            <CardContent className="flex flex-col items-center py-14">
              <div className="rounded-full bg-emerald-500/10 p-4 mb-3">
                <CheckCircle2 className="h-10 w-10 text-emerald-400" />
              </div>
              <p className="text-sm text-zinc-300 font-medium">Tudo em dia!</p>
              <p className="text-xs text-zinc-500 mt-1">Nenhuma checagem pendente no momento.</p>
            </CardContent>
          </Card>
        ) : (
          pendingChecks.map((check) => {
            const isDone = check.status === 'ADMINISTERED';
            const isSkipped = check.status === 'REFUSED' || check.status === 'HELD';
            const timeInfo = getTimeStatus(check.scheduledAt);

            return (
              <Card
                key={check.id}
                className={cn(
                  'border transition-all duration-300 hover:shadow-md group',
                  isDone
                    ? 'border-green-500/30 bg-green-500/5'
                    : isSkipped
                    ? 'border-orange-500/30 bg-orange-500/5'
                    : timeInfo.status === 'overdue'
                    ? 'border-red-500/50 bg-red-500/10 shadow-red-500/5 animate-pulse'
                    : timeInfo.status === 'late'
                    ? 'border-amber-500/40 bg-amber-500/5'
                    : timeInfo.status === 'soon'
                    ? 'border-emerald-500/30 bg-emerald-500/5'
                    : 'border-zinc-800/50 bg-zinc-900/80',
                )}
              >
                <CardContent className="flex items-center gap-4 py-3 px-4">
                  {/* Time */}
                  <div className="text-center min-w-[56px]">
                    <p className="text-base font-bold tabular-nums text-white">
                      {new Date(check.scheduledAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className={cn('text-[10px] font-medium',
                      isDone ? 'text-green-400' :
                      isSkipped ? 'text-orange-400' :
                      timeInfo.status === 'overdue' ? 'text-red-400' :
                      timeInfo.status === 'late' ? 'text-amber-400' :
                      timeInfo.status === 'soon' ? 'text-emerald-400' :
                      'text-zinc-500'
                    )}>
                      {isDone ? 'Feito' : isSkipped ? 'Pulado' : timeInfo.label}
                    </p>
                  </div>

                  {/* Divider */}
                  <div className={cn('h-10 w-0.5 rounded-full',
                    timeInfo.status === 'overdue' ? 'bg-red-500' :
                    timeInfo.status === 'late' ? 'bg-amber-500' :
                    timeInfo.status === 'soon' ? 'bg-emerald-500' :
                    'bg-zinc-700'
                  )} />

                  {/* Medication info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-white">
                        {check.prescriptionItem?.medicationName ?? 'Medicamento'}
                      </p>
                      {check.prescriptionItem?.isHighAlert && (
                        <Badge className="bg-red-500/20 text-[9px] text-red-400 border border-red-500/30 animate-pulse">
                          ALTO ALERTA
                        </Badge>
                      )}
                      {check.prescriptionItem?.isControlled && (
                        <Badge className="bg-purple-500/20 text-[9px] text-purple-400 border border-purple-500/30">
                          CONTROLADO
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {check.prescriptionItem?.dose} — {check.prescriptionItem?.route} — {check.prescriptionItem?.frequency}
                    </p>
                  </div>

                  {/* Action */}
                  {isDone ? (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/20 shrink-0">
                      <CheckCircle2 className="h-5 w-5 text-green-400" />
                    </div>
                  ) : isSkipped ? (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500/20 shrink-0">
                      <XCircle className="h-5 w-5 text-orange-400" />
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      className={cn(
                        'text-xs h-9 px-4 gap-1.5 shrink-0 transition-all',
                        timeInfo.status === 'overdue'
                          ? 'bg-red-600 hover:bg-red-500 shadow-red-500/20 shadow-lg'
                          : 'bg-emerald-600 hover:bg-emerald-500'
                      )}
                      onClick={() => handleOpenAdminister(check)}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Checar
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Voice Entry */}
      <Card className="border-zinc-800/50 bg-zinc-900/80 mt-4">
        <CardContent className="flex flex-col items-center py-8">
          <button className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-600 shadow-lg shadow-teal-500/25 hover:bg-teal-500 hover:scale-105 transition-all active:scale-95">
            <Mic className="h-6 w-6 text-white" />
          </button>
          <p className="mt-3 text-sm text-zinc-300 font-medium">Dite os sinais vitais do paciente</p>
          <p className="mt-1 text-xs text-zinc-500">Ex: "Pressao 120 por 80, frequencia cardiaca 72, saturacao 98"</p>
        </CardContent>
      </Card>

      {/* Administration Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pill className="h-5 w-5 text-emerald-400" />
              {selectedCheck?.prescriptionItem?.medicationName ?? 'Medicamento'}
            </DialogTitle>
            <DialogDescription>
              {selectedCheck ? `${selectedCheck.prescriptionItem?.dose} — ${selectedCheck.prescriptionItem?.route} — Horario: ${new Date(selectedCheck.scheduledAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : ''}
            </DialogDescription>
          </DialogHeader>

          {dialogMode === 'administer' ? (
            <div className="space-y-4">
              {/* Right 5 Checklist */}
              <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-3">
                <p className="text-xs font-semibold text-zinc-300 mb-2 flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-emerald-400" />
                  Verificacao dos 5 Certos
                </p>
                <div className="grid grid-cols-1 gap-1.5">
                  {MOCK_RIGHT_5.map((item, i) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setRight5(prev => { const next = [...prev]; next[i] = !next[i]; return next; })}
                      className={cn(
                        'flex items-center gap-2 rounded-md border px-3 py-2 text-xs transition-all',
                        right5[i]
                          ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                          : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600'
                      )}
                    >
                      <CheckCircle2 className={cn('h-4 w-4 transition-colors', right5[i] ? 'text-emerald-400' : 'text-zinc-600')} />
                      {item}
                    </button>
                  ))}
                </div>
                {right5.every(Boolean) && (
                  <div className="mt-2 flex items-center gap-1.5 text-emerald-400 text-[11px]">
                    <Sparkles className="h-3.5 w-3.5" /> Todos os 5 certos confirmados
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="check-lot">Lote {selectedCheck?.prescriptionItem?.isControlled && <span className="text-red-400">*</span>}</Label>
                <Input id="check-lot" placeholder="Numero do lote" value={lot} onChange={(e) => setLot(e.target.value)} className="mt-1 bg-zinc-950 border-zinc-700" />
              </div>
              <div>
                <Label htmlFor="check-obs">Observacoes</Label>
                <Textarea id="check-obs" placeholder="Sem intercorrencias" value={observations} onChange={(e) => setObservations(e.target.value)} className="mt-1 bg-zinc-950 border-zinc-700" rows={2} />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="check-skip-reason">Motivo <span className="text-red-400">*</span></Label>
                <Textarea id="check-skip-reason" placeholder="Ex: Paciente recusou, vomitou, etc." value={skipReason} onChange={(e) => setSkipReason(e.target.value)} className="mt-1 bg-zinc-950 border-zinc-700" rows={3} />
              </div>
            </div>
          )}

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            {dialogMode === 'administer' ? (
              <>
                <Button variant="outline" className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10" onClick={() => setDialogMode('skip')}>
                  <XCircle className="mr-2 h-4 w-4" /> Nao Administrar
                </Button>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-500"
                  onClick={handleAdminister}
                  disabled={administerMutation.isPending || !right5.every(Boolean)}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" /> {administerMutation.isPending ? 'Registrando...' : 'Administrar'}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setDialogMode('administer')}>Voltar</Button>
                <Button className="bg-orange-600 hover:bg-orange-500" onClick={handleSkip} disabled={skipMutation.isPending}>
                  <XCircle className="mr-2 h-4 w-4" /> {skipMutation.isPending ? 'Registrando...' : 'Confirmar'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ============================================================================
// Morse Fall Scale Calculator
// ============================================================================

const MORSE_ITEMS = [
  {
    key: 'fallHistory',
    label: 'Historia de queda (nos ultimos 3 meses)',
    options: [{ v: 0, l: 'Nao' }, { v: 25, l: 'Sim' }],
  },
  {
    key: 'secondaryDiagnosis',
    label: 'Diagnostico secundario',
    options: [{ v: 0, l: 'Nao' }, { v: 15, l: 'Sim' }],
  },
  {
    key: 'ambulatoryAid',
    label: 'Auxilio para deambulacao',
    options: [
      { v: 0, l: 'Nenhum / Acamado / Cadeira de rodas' },
      { v: 15, l: 'Muletas / Bengala / Andador' },
      { v: 30, l: 'Apoio nos moveis' },
    ],
  },
  {
    key: 'ivAccess',
    label: 'Terapia IV / Heparina Lock',
    options: [{ v: 0, l: 'Nao' }, { v: 20, l: 'Sim' }],
  },
  {
    key: 'gait',
    label: 'Marcha',
    options: [
      { v: 0, l: 'Normal / Acamado / Cadeira' },
      { v: 10, l: 'Fraca' },
      { v: 20, l: 'Comprometida' },
    ],
  },
  {
    key: 'mentalStatus',
    label: 'Estado mental',
    options: [
      { v: 0, l: 'Orientado / Capaz' },
      { v: 15, l: 'Superestima capacidades' },
    ],
  },
];

function MorseFallScale() {
  const [scores, setScores] = useState<Record<string, number>>({
    fallHistory: 0, secondaryDiagnosis: 0, ambulatoryAid: 0, ivAccess: 0, gait: 0, mentalStatus: 0,
  });

  const total = useMemo(() => Object.values(scores).reduce((a, b) => a + b, 0), [scores]);
  const risk = total >= 45 ? 'ALTO' : total >= 25 ? 'MODERADO' : 'BAIXO';
  const riskColor = total >= 45 ? 'text-red-400' : total >= 25 ? 'text-yellow-400' : 'text-emerald-400';
  const riskBg = total >= 45 ? 'bg-red-500/20 border-red-500/50' : total >= 25 ? 'bg-yellow-500/20 border-yellow-500/50' : 'bg-emerald-500/20 border-emerald-500/50';
  const riskIcon = total >= 45 ? '🔴' : total >= 25 ? '🟡' : '🟢';

  return (
    <div className="space-y-4">
      {/* Patient selector */}
      <Card className="bg-zinc-900/80 border-zinc-800/50">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-3">
            <Label className="text-xs text-zinc-400 shrink-0">Paciente:</Label>
            <Select defaultValue="maria-silva">
              <SelectTrigger className="bg-zinc-800/80 border-zinc-700 max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="maria-silva">Maria Silva — Leito 201-A</SelectItem>
                <SelectItem value="joao-santos">Joao Santos — Leito 202-B</SelectItem>
                <SelectItem value="ana-costa">Ana Costa — Leito 203-A</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-zinc-900/80 border-zinc-800/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-400" />
            Escala de Morse — Risco de Queda
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {MORSE_ITEMS.map(({ key, label, options }) => (
            <div key={key} className="space-y-1.5">
              <Label className="text-xs text-zinc-400">{label}</Label>
              <div className="flex flex-wrap gap-1.5">
                {options.map((opt) => (
                  <button
                    key={opt.v + opt.l}
                    type="button"
                    onClick={() => setScores((p) => ({ ...p, [key]: opt.v }))}
                    className={cn(
                      'rounded-lg border px-3 py-2 text-xs transition-all duration-200',
                      scores[key] === opt.v
                        ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-500/20 scale-[1.02]'
                        : 'border-zinc-700 bg-zinc-800/80 text-zinc-400 hover:border-zinc-500 hover:bg-zinc-700/80',
                    )}
                  >
                    {opt.l} ({opt.v})
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className={cn('rounded-xl border p-5 mt-4 transition-all duration-300', riskBg)}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-400 uppercase tracking-wider">Score Total</p>
                <p className={cn('text-5xl font-black tabular-nums', riskColor)}>{total}</p>
              </div>
              <div className="text-right">
                <Badge className={cn('text-sm px-3 py-1 font-bold', riskBg, riskColor)}>
                  {riskIcon} {risk}
                </Badge>
                <p className="text-xs text-zinc-400 mt-2 max-w-[200px]">
                  {risk === 'ALTO' ? 'Implementar protocolo de prevencao de quedas' : risk === 'MODERADO' ? 'Orientacoes e sinalizacao no leito' : 'Cuidados padrao'}
                </p>
              </div>
            </div>
            <div className="mt-4">
              <div className="relative h-3 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all duration-500',
                    total >= 45 ? 'bg-red-500' : total >= 25 ? 'bg-yellow-500' : 'bg-emerald-500'
                  )}
                  style={{ width: `${Math.min((total / 125) * 100, 100)}%` }}
                />
              </div>
              <div className="flex justify-between mt-1.5">
                <span className="text-[10px] text-zinc-500">0 (Baixo)</span>
                <span className="text-[10px] text-yellow-500">25</span>
                <span className="text-[10px] text-red-500">45</span>
                <span className="text-[10px] text-zinc-500">125</span>
              </div>
            </div>
          </div>

          <Button className="w-full bg-emerald-600 hover:bg-emerald-500 h-10 gap-2" onClick={() => toast.success(`Morse registrado: ${total} pontos (${risk})`)}>
            <ClipboardCheck className="h-4 w-4" />
            Registrar Avaliacao
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// Fluid Balance Tab (Balanco Hidrico)
// ============================================================================

const MOCK_FLUID_ENTRIES = [
  { id: 'f1', time: '06:00', type: 'entrada' as const, category: 'Soro Fisiologico 0.9%', volume: 500, via: 'EV' },
  { id: 'f2', time: '08:00', type: 'entrada' as const, category: 'Dieta via oral', volume: 200, via: 'VO' },
  { id: 'f3', time: '08:00', type: 'saida' as const, category: 'Diurese (SVD)', volume: 350, via: 'SVD' },
  { id: 'f4', time: '10:00', type: 'entrada' as const, category: 'Medicacao EV', volume: 100, via: 'EV' },
  { id: 'f5', time: '10:00', type: 'saida' as const, category: 'Dreno JP', volume: 50, via: 'Dreno' },
  { id: 'f6', time: '12:00', type: 'entrada' as const, category: 'Dieta via oral', volume: 300, via: 'VO' },
  { id: 'f7', time: '12:00', type: 'saida' as const, category: 'Diurese (SVD)', volume: 250, via: 'SVD' },
  { id: 'f8', time: '14:00', type: 'saida' as const, category: 'Vomito', volume: 100, via: '-' },
];

function FluidBalanceTab() {
  const totalEntrada = MOCK_FLUID_ENTRIES.filter(e => e.type === 'entrada').reduce((sum, e) => sum + e.volume, 0);
  const totalSaida = MOCK_FLUID_ENTRIES.filter(e => e.type === 'saida').reduce((sum, e) => sum + e.volume, 0);
  const balance = totalEntrada - totalSaida;

  const chartData = useMemo(() => {
    const times = ['06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'];
    let accEntrada = 0;
    let accSaida = 0;
    return times.map(time => {
      const entradas = MOCK_FLUID_ENTRIES.filter(e => e.time <= time && e.type === 'entrada');
      const saidas = MOCK_FLUID_ENTRIES.filter(e => e.time <= time && e.type === 'saida');
      accEntrada = entradas.reduce((s, e) => s + e.volume, 0);
      accSaida = saidas.reduce((s, e) => s + e.volume, 0);
      return { time, entrada: accEntrada, saida: accSaida, balanco: accEntrada - accSaida };
    });
  }, []);

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-zinc-900/80 border-zinc-800/50">
          <CardContent className="pt-4 pb-3 text-center">
            <div className="inline-flex items-center gap-1.5 bg-blue-500/10 rounded-full px-2.5 py-0.5 mb-2">
              <Plus className="h-3 w-3 text-blue-400" />
              <span className="text-[10px] text-blue-400 font-medium">ENTRADA</span>
            </div>
            <p className="text-3xl font-black text-blue-400 tabular-nums">{totalEntrada}</p>
            <p className="text-[10px] text-zinc-500">mL nas ultimas 24h</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/80 border-zinc-800/50">
          <CardContent className="pt-4 pb-3 text-center">
            <div className="inline-flex items-center gap-1.5 bg-orange-500/10 rounded-full px-2.5 py-0.5 mb-2">
              <Minus className="h-3 w-3 text-orange-400" />
              <span className="text-[10px] text-orange-400 font-medium">SAIDA</span>
            </div>
            <p className="text-3xl font-black text-orange-400 tabular-nums">{totalSaida}</p>
            <p className="text-[10px] text-zinc-500">mL nas ultimas 24h</p>
          </CardContent>
        </Card>
        <Card className={cn('border-zinc-800/50', balance > 0 ? 'bg-blue-500/5' : 'bg-orange-500/5')}>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="inline-flex items-center gap-1.5 bg-zinc-800 rounded-full px-2.5 py-0.5 mb-2">
              <ArrowRightLeft className="h-3 w-3 text-zinc-400" />
              <span className="text-[10px] text-zinc-400 font-medium">BALANCO</span>
            </div>
            <p className={cn('text-3xl font-black tabular-nums', balance > 0 ? 'text-blue-400' : 'text-orange-400')}>
              {balance > 0 ? '+' : ''}{balance}
            </p>
            <p className="text-[10px] text-zinc-500">mL (acumulado)</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card className="bg-zinc-900/80 border-zinc-800/50">
        <CardHeader className="pb-1">
          <CardTitle className="text-xs text-zinc-400 flex items-center gap-2">
            <Droplets className="h-3.5 w-3.5 text-blue-400" />
            Balanco Hidrico Acumulado — 24h
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-3">
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#71717a' }} />
              <YAxis tick={{ fontSize: 10, fill: '#71717a' }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px', fontSize: '12px' }}
              />
              <Area type="monotone" dataKey="entrada" stroke="#3b82f6" fill="#3b82f620" strokeWidth={2} name="Entrada" />
              <Area type="monotone" dataKey="saida" stroke="#f97316" fill="#f9731620" strokeWidth={2} name="Saida" />
              <Line type="monotone" dataKey="balanco" stroke="#10b981" strokeWidth={2} strokeDasharray="5 5" name="Balanco" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Entry List */}
      <Card className="bg-zinc-900/80 border-zinc-800/50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4 text-zinc-400" />
              Registros
            </CardTitle>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 h-7 text-xs gap-1">
              <Plus className="h-3 w-3" /> Novo Registro
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5">
            {MOCK_FLUID_ENTRIES.map(entry => (
              <div key={entry.id} className={cn(
                'flex items-center gap-3 rounded-lg border px-3 py-2 transition-all hover:bg-zinc-800/50',
                entry.type === 'entrada' ? 'border-blue-500/20 bg-blue-500/5' : 'border-orange-500/20 bg-orange-500/5'
              )}>
                <div className="min-w-[44px] text-center">
                  <p className="text-sm font-bold tabular-nums text-white">{entry.time}</p>
                </div>
                <Badge className={cn('text-[10px] border min-w-[60px] justify-center',
                  entry.type === 'entrada'
                    ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                    : 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                )}>
                  {entry.type === 'entrada' ? 'Entrada' : 'Saida'}
                </Badge>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-zinc-300">{entry.category}</p>
                  <p className="text-[10px] text-zinc-500">{entry.via}</p>
                </div>
                <p className={cn('text-sm font-bold tabular-nums',
                  entry.type === 'entrada' ? 'text-blue-400' : 'text-orange-400'
                )}>
                  {entry.type === 'entrada' ? '+' : '-'}{entry.volume} mL
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// SAE/NIC Tab (Nursing Process)
// ============================================================================

const MOCK_SAE_DIAGNOSES = [
  {
    id: 'sae1',
    nandaCode: '00046',
    diagnosis: 'Integridade da pele prejudicada',
    relatedTo: 'Imobilidade no leito e pressao prolongada',
    evidencedBy: 'Lesao em regiao sacral estagio II',
    nicInterventions: ['Cuidados com lesao por pressao', 'Mudanca de decubito a cada 2h', 'Avaliacao da pele diaria'],
    nocOutcome: 'Cicatrizacao de ferida em 14 dias',
    status: 'active' as const,
    priority: 'alta' as const,
  },
  {
    id: 'sae2',
    nandaCode: '00155',
    diagnosis: 'Risco de queda',
    relatedTo: 'Idade avancada, uso de sedativos, deambulacao prejudicada',
    evidencedBy: 'Morse Score: 55 (Alto Risco)',
    nicInterventions: ['Ambiente seguro', 'Grade lateral elevada', 'Acompanhamento na deambulacao'],
    nocOutcome: 'Ausencia de quedas durante internacao',
    status: 'active' as const,
    priority: 'alta' as const,
  },
  {
    id: 'sae3',
    nandaCode: '00132',
    diagnosis: 'Dor aguda',
    relatedTo: 'Procedimento cirurgico (colecistectomia)',
    evidencedBy: 'Relato verbal, EVA 6, faccies de dor',
    nicInterventions: ['Administracao de analgesico conforme prescricao', 'Avaliacao da dor a cada 4h', 'Medidas de conforto'],
    nocOutcome: 'Reducao da dor para EVA <= 3',
    status: 'active' as const,
    priority: 'media' as const,
  },
];

function SAENICTab() {
  return (
    <div className="space-y-4">
      <Card className="bg-zinc-900/80 border-zinc-800/50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-emerald-400" />
              Sistematizacao da Assistencia de Enfermagem (SAE)
            </CardTitle>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 h-7 text-xs gap-1">
              <Plus className="h-3 w-3" /> Novo Diagnostico
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {MOCK_SAE_DIAGNOSES.map(dx => (
            <div key={dx.id} className={cn(
              'rounded-xl border p-4 transition-all duration-200 hover:shadow-md',
              dx.priority === 'alta' ? 'border-red-500/30 bg-red-500/5 hover:border-red-500/50' :
              dx.priority === 'media' ? 'border-yellow-500/30 bg-yellow-500/5 hover:border-yellow-500/50' :
              'border-zinc-700/50 bg-zinc-800/50 hover:border-zinc-600'
            )}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Badge className={cn('text-[10px] border font-mono',
                    dx.priority === 'alta' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                    dx.priority === 'media' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                    'bg-zinc-700 text-zinc-400 border-zinc-600'
                  )}>
                    NANDA {dx.nandaCode}
                  </Badge>
                  <Badge className={cn('text-[10px] border',
                    dx.priority === 'alta' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                    dx.priority === 'media' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                    'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  )}>
                    {dx.priority === 'alta' ? 'Prioridade Alta' : dx.priority === 'media' ? 'Prioridade Media' : 'Prioridade Baixa'}
                  </Badge>
                </div>
                <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px]">
                  Ativo
                </Badge>
              </div>

              <h4 className="text-sm font-semibold text-white mb-1">{dx.diagnosis}</h4>

              <div className="grid gap-2 text-xs mt-3">
                <div>
                  <span className="text-zinc-500 font-medium">Relacionado a: </span>
                  <span className="text-zinc-300">{dx.relatedTo}</span>
                </div>
                <div>
                  <span className="text-zinc-500 font-medium">Evidenciado por: </span>
                  <span className="text-zinc-300">{dx.evidencedBy}</span>
                </div>
              </div>

              <div className="mt-3 rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-3">
                <p className="text-[10px] font-semibold text-teal-400 uppercase tracking-wider mb-1.5">Intervencoes NIC</p>
                <ul className="space-y-1">
                  {dx.nicInterventions.map((int, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs text-zinc-300">
                      <ChevronRight className="h-3 w-3 text-teal-500 shrink-0" />
                      {int}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-2 flex items-center gap-2 text-xs">
                <span className="text-zinc-500 font-medium">Resultado NOC:</span>
                <span className="text-zinc-300">{dx.nocOutcome}</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// Shift Handoff Tab (Passagem Plantao)
// ============================================================================

const MOCK_HANDOFF_PATIENTS = [
  {
    id: 'h1', name: 'Maria Silva', bed: '201-A', age: 68,
    mainDx: 'Pneumonia comunitaria + ICC descompensada',
    events: 'Pico febril 38.5C as 14h, administrado Dipirona 1g EV. FC elevada 110bpm as 16h, notificado plantonista.',
    pendencies: 'Hemograma de controle as 22h. Rx torax amanha cedo. Manter decubito elevado 30 graus.',
    vitalsNow: 'PA 130/85, FC 88, FR 20, T 37.2, SpO2 95% com CN 2L',
    alerts: ['Risco de queda ALTO (Morse 55)', 'Alergia a Penicilina'],
  },
  {
    id: 'h2', name: 'Joao Santos', bed: '202-B', age: 45,
    mainDx: 'PO D3 Colecistectomia videolaparoscopica',
    events: 'Boa evolucao. Aceitou dieta branda. Dreno JP com debito de 20mL seroso.',
    pendencies: 'Retirar dreno JP amanha se debito < 50mL/24h. Alta prevista para amanha.',
    vitalsNow: 'PA 120/80, FC 72, FR 16, T 36.5, SpO2 98% em AA',
    alerts: [],
  },
  {
    id: 'h3', name: 'Ana Costa', bed: '203-A', age: 82,
    mainDx: 'AVC isquemico em territorio de ACM E — D5',
    events: 'Disfagia mantida, alimentacao por SNG. Fisioterapia motora e fonoaudiologia realizadas.',
    pendencies: 'Avaliacao da degluticao amanha. Profilaxia TVP mantida. Mudanca decubito rigorosa.',
    vitalsNow: 'PA 140/90, FC 76, FR 18, T 36.8, SpO2 96% em AA',
    alerts: ['LPP Risco MUITO ALTO (Braden 9)', 'Risco de queda ALTO (Morse 60)'],
  },
];

function ShiftHandoffTab() {
  return (
    <div className="space-y-4">
      <Card className="bg-zinc-900/80 border-zinc-800/50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4 text-indigo-400" />
              Passagem de Plantao
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="h-7 text-xs border-zinc-700 gap-1">
                <Mic className="h-3 w-3" /> Gravar Audio
              </Button>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 h-7 text-xs gap-1">
                <FileText className="h-3 w-3" /> Gerar SBAR
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {MOCK_HANDOFF_PATIENTS.map(patient => (
            <div key={patient.id} className="rounded-xl border border-zinc-700/50 bg-zinc-800/30 p-4 space-y-3 transition-all hover:border-zinc-600">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-zinc-700 text-xs">{getInitials(patient.name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-semibold text-white">{patient.name}</p>
                    <p className="text-[10px] text-zinc-400">Leito {patient.bed} | {patient.age} anos</p>
                  </div>
                </div>
                <p className="text-xs text-zinc-400 bg-zinc-800 px-2 py-1 rounded">{patient.vitalsNow}</p>
              </div>

              <div className="text-xs space-y-2">
                <div>
                  <span className="text-zinc-500 font-semibold">Diagnostico: </span>
                  <span className="text-zinc-200">{patient.mainDx}</span>
                </div>
                <div>
                  <span className="text-zinc-500 font-semibold">Intercorrencias: </span>
                  <span className="text-zinc-300">{patient.events}</span>
                </div>
                <div>
                  <span className="text-zinc-500 font-semibold">Pendencias: </span>
                  <span className="text-amber-300">{patient.pendencies}</span>
                </div>
              </div>

              {patient.alerts.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {patient.alerts.map((alert, i) => (
                    <Badge key={i} className="bg-red-500/15 text-red-400 border border-red-500/30 text-[10px] gap-1">
                      <AlertTriangle className="h-2.5 w-2.5" />
                      {alert}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// Bed Map
// ============================================================================

const MOCK_BED_MAP = [
  { id: 'b1', number: '201-A', status: 'occupied' as const, patient: 'Maria Silva', isolation: false },
  { id: 'b2', number: '201-B', status: 'available' as const, patient: null, isolation: false },
  { id: 'b3', number: '202-A', status: 'occupied' as const, patient: 'Joao Santos', isolation: false },
  { id: 'b4', number: '202-B', status: 'occupied' as const, patient: 'Ana Costa', isolation: true },
  { id: 'b5', number: '203-A', status: 'cleaning' as const, patient: null, isolation: false },
  { id: 'b6', number: '203-B', status: 'blocked' as const, patient: null, isolation: false },
  { id: 'b7', number: '204-A', status: 'occupied' as const, patient: 'Pedro Oliveira', isolation: false },
  { id: 'b8', number: '204-B', status: 'available' as const, patient: null, isolation: false },
  { id: 'b9', number: '205-A', status: 'occupied' as const, patient: 'Lucia Ferreira', isolation: false },
  { id: 'b10', number: '205-B', status: 'occupied' as const, patient: 'Carlos Mendes', isolation: true },
  { id: 'b11', number: '206-A', status: 'available' as const, patient: null, isolation: false },
  { id: 'b12', number: '206-B', status: 'cleaning' as const, patient: null, isolation: false },
];

function BedMap() {
  const statusConfig = {
    occupied: { label: 'Ocupado', color: 'border-blue-500/50 bg-blue-500/10', dot: 'bg-blue-500' },
    available: { label: 'Livre', color: 'border-emerald-500/50 bg-emerald-500/10', dot: 'bg-emerald-500' },
    cleaning: { label: 'Limpeza', color: 'border-amber-500/50 bg-amber-500/10', dot: 'bg-amber-500' },
    blocked: { label: 'Bloqueado', color: 'border-red-500/50 bg-red-500/10', dot: 'bg-red-500' },
  };

  return (
    <Card className="bg-zinc-900/80 border-zinc-800/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <BedDouble className="h-4 w-4 text-blue-400" />
            Mapa de Leitos
          </CardTitle>
          <div className="flex items-center gap-3">
            {Object.entries(statusConfig).map(([key, cfg]) => (
              <div key={key} className="flex items-center gap-1.5">
                <div className={cn('h-2 w-2 rounded-full', cfg.dot)} />
                <span className="text-[10px] text-zinc-500">{cfg.label}</span>
              </div>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {MOCK_BED_MAP.map(bed => {
            const config = statusConfig[bed.status];
            return (
              <button
                key={bed.id}
                className={cn(
                  'rounded-xl border p-3 text-left transition-all duration-200 hover:scale-[1.03] hover:shadow-md',
                  config.color
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white">{bed.number}</span>
                  <div className={cn('h-2 w-2 rounded-full', config.dot)} />
                </div>
                {bed.patient ? (
                  <p className="text-[10px] text-zinc-300 truncate">{bed.patient}</p>
                ) : (
                  <p className="text-[10px] text-zinc-500">{config.label}</p>
                )}
                {bed.isolation && (
                  <Badge className="mt-1 bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-[8px] px-1 py-0">
                    ISOLAMENTO
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Braden Scale
// ============================================================================

const BRADEN_ITEMS = [
  {
    key: 'sensory', label: 'Percepcao Sensorial',
    options: [{ v: 1, l: 'Totalmente limitado' }, { v: 2, l: 'Muito limitado' }, { v: 3, l: 'Levemente limitado' }, { v: 4, l: 'Nenhuma limitacao' }],
  },
  {
    key: 'moisture', label: 'Umidade',
    options: [{ v: 1, l: 'Constantemente umida' }, { v: 2, l: 'Muito umida' }, { v: 3, l: 'Ocasionalmente umida' }, { v: 4, l: 'Raramente umida' }],
  },
  {
    key: 'activity', label: 'Atividade',
    options: [{ v: 1, l: 'Acamado' }, { v: 2, l: 'Confinado a cadeira' }, { v: 3, l: 'Anda ocasionalmente' }, { v: 4, l: 'Anda frequentemente' }],
  },
  {
    key: 'mobility', label: 'Mobilidade',
    options: [{ v: 1, l: 'Totalmente imobilizado' }, { v: 2, l: 'Muito limitado' }, { v: 3, l: 'Levemente limitado' }, { v: 4, l: 'Sem limitacao' }],
  },
  {
    key: 'nutrition', label: 'Nutricao',
    options: [{ v: 1, l: 'Muito pobre' }, { v: 2, l: 'Provavelmente inadequada' }, { v: 3, l: 'Adequada' }, { v: 4, l: 'Excelente' }],
  },
  {
    key: 'friction', label: 'Friccao e Cisalhamento',
    options: [{ v: 1, l: 'Problema' }, { v: 2, l: 'Problema potencial' }, { v: 3, l: 'Sem problema aparente' }],
  },
];

function BradenScale() {
  const [scores, setScores] = useState<Record<string, number>>({
    sensory: 4, moisture: 4, activity: 4, mobility: 4, nutrition: 4, friction: 3,
  });

  const total = useMemo(() => Object.values(scores).reduce((a, b) => a + b, 0), [scores]);
  const risk = total <= 9 ? 'MUITO ALTO' : total <= 12 ? 'ALTO' : total <= 14 ? 'MODERADO' : total <= 18 ? 'BAIXO' : 'SEM RISCO';
  const riskColor = total <= 9 ? 'text-red-400' : total <= 12 ? 'text-orange-400' : total <= 14 ? 'text-yellow-400' : 'text-emerald-400';

  return (
    <Card className="bg-zinc-900/80 border-zinc-800/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Shield className="h-4 w-4 text-blue-400" />
          Escala de Braden — Risco de Lesao por Pressao
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {BRADEN_ITEMS.map(({ key, label, options }) => (
          <div key={key} className="space-y-1.5">
            <Label className="text-xs text-zinc-400">{label}</Label>
            <div className="flex flex-wrap gap-1.5">
              {options.map((opt) => (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => setScores((p) => ({ ...p, [key]: opt.v }))}
                  className={cn(
                    'rounded-lg border px-2.5 py-2 text-xs transition-all duration-200 flex-1 min-w-[120px]',
                    scores[key] === opt.v
                      ? opt.v <= 2 ? 'bg-red-600 border-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                      : 'border-zinc-700 bg-zinc-800/80 text-zinc-400 hover:border-zinc-500',
                  )}
                >
                  {opt.l} ({opt.v})
                </button>
              ))}
            </div>
          </div>
        ))}

        <div className={cn('rounded-xl border p-5 mt-4 transition-all', total <= 12 ? 'bg-red-500/10 border-red-500/50' : total <= 14 ? 'bg-yellow-500/10 border-yellow-500/50' : 'bg-emerald-500/10 border-emerald-500/50')}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-400 uppercase tracking-wider">Score Total (menor = maior risco)</p>
              <p className={cn('text-5xl font-black tabular-nums', riskColor)}>{total}</p>
            </div>
            <div className="text-right">
              <Badge className={cn('text-sm border font-bold px-3 py-1', total <= 12 ? 'bg-red-500/20 text-red-400 border-red-500/50' : total <= 14 ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50')}>
                {risk}
              </Badge>
              <p className="text-xs text-zinc-400 mt-1">Escala: 6-23 pontos</p>
            </div>
          </div>
        </div>
        <Button className="w-full bg-emerald-600 hover:bg-emerald-500 h-10 gap-2" onClick={() => toast.success(`Braden registrado: ${total} pontos (${risk})`)}>
          <ClipboardCheck className="h-4 w-4" />
          Registrar Avaliacao
        </Button>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Pain Assessment
// ============================================================================

function PainAssessment() {
  const [evaScore, setEvaScore] = useState(0);
  const [scaleType, setScaleType] = useState<'EVA' | 'FLACC' | 'BPS'>('EVA');
  const [flacc, setFlacc] = useState({ face: 0, legs: 0, activity: 0, cry: 0, consolability: 0 });
  const [bps, setBps] = useState({ facialExpression: 1, upperLimbs: 1, compliance: 1 });

  const flaccTotal = useMemo(() => Object.values(flacc).reduce((a, b) => a + b, 0), [flacc]);
  const bpsTotal = useMemo(() => Object.values(bps).reduce((a, b) => a + b, 0), [bps]);

  const evaColor = evaScore <= 3 ? 'text-emerald-400' : evaScore <= 6 ? 'text-yellow-400' : 'text-red-400';
  const evaLabel = evaScore === 0 ? 'Sem dor' : evaScore <= 3 ? 'Dor leve' : evaScore <= 6 ? 'Dor moderada' : 'Dor intensa';

  const FLACC_ITEMS = [
    { key: 'face', label: 'Face', opts: [{ v: 0, l: 'Sem expressao / Sorriso' }, { v: 1, l: 'Careta ocasional' }, { v: 2, l: 'Tremor frequente do queixo' }] },
    { key: 'legs', label: 'Pernas', opts: [{ v: 0, l: 'Posicao normal / Relaxadas' }, { v: 1, l: 'Inquietas / Tensas' }, { v: 2, l: 'Chutando / Esticadas' }] },
    { key: 'activity', label: 'Atividade', opts: [{ v: 0, l: 'Quieto / Posicao normal' }, { v: 1, l: 'Contorcendo-se' }, { v: 2, l: 'Arqueado / Rigido' }] },
    { key: 'cry', label: 'Choro', opts: [{ v: 0, l: 'Sem choro' }, { v: 1, l: 'Gemidos / Choramingo' }, { v: 2, l: 'Choro constante / Grito' }] },
    { key: 'consolability', label: 'Consolabilidade', opts: [{ v: 0, l: 'Contente / Relaxado' }, { v: 1, l: 'Distraivel' }, { v: 2, l: 'Dificil de consolar' }] },
  ];

  return (
    <Card className="bg-zinc-900/80 border-zinc-800/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Heart className="h-4 w-4 text-red-400" />
          Avaliacao da Dor
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          {(['EVA', 'FLACC', 'BPS'] as const).map((s) => (
            <Button
              key={s}
              size="sm"
              variant={scaleType === s ? 'default' : 'outline'}
              className={cn(
                'transition-all',
                scaleType === s ? 'bg-emerald-600 shadow-lg shadow-emerald-500/20' : 'border-zinc-700'
              )}
              onClick={() => setScaleType(s)}
            >
              {s === 'EVA' ? 'EVA (Adulto)' : s === 'FLACC' ? 'FLACC (Pediatrico)' : 'BPS (UTI Intubado)'}
            </Button>
          ))}
        </div>

        {scaleType === 'EVA' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Smile className="h-6 w-6 text-emerald-400" />
              <div className="flex-1">
                <input
                  type="range"
                  min={0}
                  max={10}
                  value={evaScore}
                  onChange={(e) => setEvaScore(Number(e.target.value))}
                  className="w-full accent-emerald-500"
                />
                <div className="flex justify-between mt-1">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <span key={n} className={cn('text-[10px] tabular-nums', n === evaScore ? evaColor + ' font-bold' : 'text-zinc-500')}>{n}</span>
                  ))}
                </div>
              </div>
              <Frown className="h-6 w-6 text-red-400" />
            </div>
            <div className={cn('rounded-xl border p-4 text-center transition-all', evaScore <= 3 ? 'bg-emerald-500/10 border-emerald-500/50' : evaScore <= 6 ? 'bg-yellow-500/10 border-yellow-500/50' : 'bg-red-500/10 border-red-500/50')}>
              <p className={cn('text-4xl font-black tabular-nums', evaColor)}>{evaScore}</p>
              <p className="text-xs text-zinc-400 mt-1">{evaLabel}</p>
            </div>
          </div>
        )}

        {scaleType === 'FLACC' && (
          <div className="space-y-3">
            {FLACC_ITEMS.map(({ key, label, opts }) => (
              <div key={key} className="space-y-1">
                <Label className="text-xs text-zinc-400">{label}</Label>
                <div className="flex flex-wrap gap-1">
                  {opts.map((opt) => (
                    <button
                      key={opt.v}
                      type="button"
                      onClick={() => setFlacc((p) => ({ ...p, [key]: opt.v }))}
                      className={cn(
                        'rounded-lg border px-2.5 py-1.5 text-[11px] transition-all flex-1 min-w-[100px]',
                        flacc[key as keyof typeof flacc] === opt.v
                          ? 'bg-emerald-600 border-emerald-500 text-white'
                          : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600',
                      )}
                    >
                      {opt.l} ({opt.v})
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div className={cn('rounded-xl border p-4 text-center', flaccTotal <= 3 ? 'bg-emerald-500/10 border-emerald-500/50' : flaccTotal <= 6 ? 'bg-yellow-500/10 border-yellow-500/50' : 'bg-red-500/10 border-red-500/50')}>
              <p className={cn('text-4xl font-black tabular-nums', flaccTotal <= 3 ? 'text-emerald-400' : flaccTotal <= 6 ? 'text-yellow-400' : 'text-red-400')}>{flaccTotal}</p>
              <p className="text-xs text-zinc-400 mt-1">{flaccTotal <= 3 ? 'Dor leve ou ausente' : flaccTotal <= 6 ? 'Dor moderada' : 'Dor intensa'}</p>
            </div>
          </div>
        )}

        {scaleType === 'BPS' && (
          <div className="space-y-3">
            {[
              { key: 'facialExpression', label: 'Expressao facial', opts: [{ v: 1, l: 'Relaxada' }, { v: 2, l: 'Parcialmente tensa' }, { v: 3, l: 'Totalmente tensa' }, { v: 4, l: 'Careta' }] },
              { key: 'upperLimbs', label: 'Membros superiores', opts: [{ v: 1, l: 'Sem movimento' }, { v: 2, l: 'Parcialmente flexionados' }, { v: 3, l: 'Totalmente flexionados' }, { v: 4, l: 'Permanentemente retraidos' }] },
              { key: 'compliance', label: 'Adaptacao ao ventilador', opts: [{ v: 1, l: 'Tolerando' }, { v: 2, l: 'Tossindo' }, { v: 3, l: 'Lutando contra' }, { v: 4, l: 'Incapaz de controlar' }] },
            ].map(({ key, label, opts }) => (
              <div key={key} className="space-y-1">
                <Label className="text-xs text-zinc-400">{label}</Label>
                <div className="flex flex-wrap gap-1">
                  {opts.map((opt) => (
                    <button
                      key={opt.v}
                      type="button"
                      onClick={() => setBps((p) => ({ ...p, [key]: opt.v }))}
                      className={cn(
                        'rounded-lg border px-2.5 py-1.5 text-[11px] transition-all flex-1 min-w-[100px]',
                        bps[key as keyof typeof bps] === opt.v
                          ? 'bg-emerald-600 border-emerald-500 text-white'
                          : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600',
                      )}
                    >
                      {opt.l} ({opt.v})
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div className={cn('rounded-xl border p-4 text-center', bpsTotal <= 5 ? 'bg-emerald-500/10 border-emerald-500/50' : bpsTotal <= 8 ? 'bg-yellow-500/10 border-yellow-500/50' : 'bg-red-500/10 border-red-500/50')}>
              <p className={cn('text-4xl font-black tabular-nums', bpsTotal <= 5 ? 'text-emerald-400' : bpsTotal <= 8 ? 'text-yellow-400' : 'text-red-400')}>{bpsTotal}</p>
              <p className="text-xs text-zinc-400 mt-1">BPS: {bpsTotal <= 5 ? 'Sem dor / dor leve' : bpsTotal <= 8 ? 'Dor moderada' : 'Dor intensa'} (3-12)</p>
            </div>
          </div>
        )}

        <Button className="w-full bg-emerald-600 hover:bg-emerald-500 h-10 gap-2" onClick={() => toast.success('Avaliacao de dor registrada')}>
          <ClipboardCheck className="h-4 w-4" />
          Registrar Dor
        </Button>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Wound Assessment
// ============================================================================

const MOCK_WOUNDS = [
  { id: 'w1', location: 'Sacral', stage: 'Estagio II', size: '4x3 cm', depth: '0.5 cm', exudate: 'Moderado seroso', edges: 'Definidas', bed: 'Granulacao 70%', lastPhoto: '2026-03-25', dressing: 'Hidrogel + Espuma', nextChange: '2026-03-28', color: 'text-yellow-400' },
  { id: 'w2', location: 'Calcanhar D', stage: 'Estagio I', size: '2x2 cm', depth: 'Superficial', exudate: 'Nenhum', edges: 'Definidas', bed: 'Hiperemia nao branqueavel', lastPhoto: '2026-03-26', dressing: 'Filme transparente', nextChange: '2026-03-29', color: 'text-emerald-400' },
  { id: 'w3', location: 'Trocanter E', stage: 'Estagio III', size: '6x5 cm', depth: '2 cm', exudate: 'Abundante purulento', edges: 'Maceradas', bed: 'Esfacelo 40%', lastPhoto: '2026-03-24', dressing: 'Alginato + Espuma', nextChange: '2026-03-27', color: 'text-red-400' },
];

function WoundAssessment() {
  return (
    <Card className="bg-zinc-900/80 border-zinc-800/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Eye className="h-4 w-4 text-purple-400" />
            Avaliacao de Feridas
          </CardTitle>
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 h-7 text-xs gap-1">
            <Plus className="h-3 w-3" /> Nova Ferida
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {MOCK_WOUNDS.map((wound) => (
          <div key={wound.id} className="rounded-xl border border-zinc-700/50 bg-zinc-800/30 p-4 transition-all hover:border-zinc-600 hover:shadow-md">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-white">{wound.location}</p>
                  <Badge className={cn('text-[10px] border', wound.stage.includes('III') ? 'bg-red-500/20 text-red-400 border-red-500/50' : wound.stage.includes('II') ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50')}>
                    {wound.stage}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 mt-2 text-xs">
                  <span className="text-zinc-400">Tamanho: <span className="text-zinc-200">{wound.size}</span></span>
                  <span className="text-zinc-400">Profundidade: <span className="text-zinc-200">{wound.depth}</span></span>
                  <span className="text-zinc-400">Exsudato: <span className="text-zinc-200">{wound.exudate}</span></span>
                  <span className="text-zinc-400">Bordas: <span className="text-zinc-200">{wound.edges}</span></span>
                  <span className="text-zinc-400">Leito: <span className="text-zinc-200">{wound.bed}</span></span>
                  <span className="text-zinc-400">Cobertura: <span className="text-zinc-200">{wound.dressing}</span></span>
                </div>
                <p className="text-[10px] text-zinc-500 mt-1.5">Proxima troca: {wound.nextChange}</p>
              </div>
              <button className="flex h-16 w-16 items-center justify-center rounded-xl border border-dashed border-zinc-600 bg-zinc-900/80 hover:border-zinc-400 hover:bg-zinc-800 transition-all">
                <div className="text-center">
                  <Camera className="h-5 w-5 text-zinc-500 mx-auto" />
                  <p className="text-[9px] text-zinc-500 mt-0.5">Foto</p>
                </div>
              </button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Elimination Tracking
// ============================================================================

const MOCK_ELIMINATIONS = [
  { id: 'e1', time: '06:00', type: 'Diurese', volume: '350 mL', characteristics: 'Amarelo claro', catheter: 'SVD', patient: 'Maria Silva' },
  { id: 'e2', time: '08:30', type: 'Evacuacao', volume: '-', characteristics: 'Pastosa, Bristol 4', catheter: 'N/A', patient: 'Maria Silva' },
  { id: 'e3', time: '10:00', type: 'Diurese', volume: '200 mL', characteristics: 'Amarelo escuro', catheter: 'SVD', patient: 'Joao Santos' },
  { id: 'e4', time: '12:00', type: 'Vomito', volume: '100 mL', characteristics: 'Alimentar', catheter: 'N/A', patient: 'Ana Costa' },
  { id: 'e5', time: '14:00', type: 'Drenagem', volume: '50 mL', characteristics: 'Serohematico', catheter: 'Dreno JP', patient: 'Joao Santos' },
];

function EliminationTracking() {
  return (
    <Card className="bg-zinc-900/80 border-zinc-800/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Droplets className="h-4 w-4 text-blue-400" />
            Controle de Eliminacoes
          </CardTitle>
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 h-7 text-xs gap-1">
            <Plus className="h-3 w-3" /> Registrar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/30 p-3 text-center">
            <p className="text-xs text-zinc-400">Balanco Hidrico</p>
            <p className="text-2xl font-bold text-blue-400 tabular-nums">+450 mL</p>
            <p className="text-[10px] text-zinc-500">Entrada: 1200 | Saida: 750</p>
          </div>
          <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/30 p-3 text-center">
            <p className="text-xs text-zinc-400">Diurese 24h</p>
            <p className="text-2xl font-bold text-emerald-400 tabular-nums">1.2 mL/kg/h</p>
            <p className="text-[10px] text-zinc-500">Total: 1450 mL</p>
          </div>
          <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/30 p-3 text-center">
            <p className="text-xs text-zinc-400">Ultima Evacuacao</p>
            <p className="text-2xl font-bold text-yellow-400 tabular-nums">18h</p>
            <p className="text-[10px] text-zinc-500">Bristol 4</p>
          </div>
        </div>
        <div className="space-y-1.5">
          {MOCK_ELIMINATIONS.map((e) => (
            <div key={e.id} className="flex items-center gap-3 rounded-lg border border-zinc-700/30 bg-zinc-800/30 p-2.5 transition-all hover:bg-zinc-800/60">
              <div className="text-center min-w-[50px]">
                <p className="text-sm font-bold text-white tabular-nums">{e.time}</p>
              </div>
              <div className="h-6 w-px bg-zinc-700" />
              <Badge className={cn('text-[10px] border min-w-[70px] justify-center',
                e.type === 'Diurese' ? 'bg-blue-500/20 text-blue-400 border-blue-500/50' :
                e.type === 'Evacuacao' ? 'bg-amber-500/20 text-amber-400 border-amber-500/50' :
                e.type === 'Vomito' ? 'bg-red-500/20 text-red-400 border-red-500/50' :
                'bg-purple-500/20 text-purple-400 border-purple-500/50'
              )}>{e.type}</Badge>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-zinc-300">{e.characteristics}</p>
                <p className="text-[10px] text-zinc-500">{e.patient} {e.volume !== '-' && `| ${e.volume}`} {e.catheter !== 'N/A' && `| ${e.catheter}`}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Repositioning Schedule
// ============================================================================

const MOCK_REPOSITION_PATIENTS = [
  { id: 'rp1', name: 'Maria Silva', bed: '201-A', lastPosition: 'DLE', lastTime: new Date(Date.now() - 100 * 60000).toISOString(), interval: 120, braden: 12 },
  { id: 'rp2', name: 'Joao Santos', bed: '202-B', lastPosition: 'DD', lastTime: new Date(Date.now() - 90 * 60000).toISOString(), interval: 120, braden: 14 },
  { id: 'rp3', name: 'Ana Costa', bed: '203-A', lastPosition: 'DLD', lastTime: new Date(Date.now() - 140 * 60000).toISOString(), interval: 120, braden: 9 },
  { id: 'rp4', name: 'Pedro Oliveira', bed: '204-B', lastPosition: 'Fowler 30', lastTime: new Date(Date.now() - 30 * 60000).toISOString(), interval: 120, braden: 16 },
];

const POSITIONS = ['DD', 'DLE', 'DLD', 'Fowler 30', 'Fowler 45', 'Semi-Fowler'];

function RepositioningSchedule() {
  const [patients, setPatients] = useState(MOCK_REPOSITION_PATIENTS);
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  const handleReposition = (id: string, newPosition: string) => {
    setPatients((prev) => prev.map((p) => p.id === id ? { ...p, lastPosition: newPosition, lastTime: new Date().toISOString() } : p));
    toast.success('Mudanca de decubito registrada');
  };

  return (
    <Card className="bg-zinc-900/80 border-zinc-800/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <RotateCcw className="h-4 w-4 text-cyan-400" />
          Mudanca de Decubito — Reposicionamento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {patients.map((patient) => {
          const elapsed = Math.floor((Date.now() - new Date(patient.lastTime).getTime()) / 60000);
          const remaining = patient.interval - elapsed;
          const isOverdue = remaining <= 0;
          const percent = Math.min((elapsed / patient.interval) * 100, 100);

          return (
            <div key={patient.id} className={cn('rounded-xl border p-4 transition-all duration-300', isOverdue ? 'border-red-500/50 bg-red-500/10 animate-pulse' : remaining < 30 ? 'border-yellow-500/50 bg-yellow-500/5' : 'border-zinc-700/50 bg-zinc-800/30')}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-semibold text-white">{patient.name}</p>
                  <p className="text-[10px] text-zinc-400">Leito {patient.bed} | Braden: {patient.braden} | Posicao atual: {patient.lastPosition}</p>
                </div>
                <div className="text-right">
                  <p className={cn('text-xl font-black tabular-nums', isOverdue ? 'text-red-400' : remaining < 30 ? 'text-yellow-400' : 'text-emerald-400')}>
                    {isOverdue ? `+${Math.abs(remaining)}min` : `${remaining}min`}
                  </p>
                  <p className="text-[10px] text-zinc-500">{isOverdue ? 'ATRASADO' : 'restante'}</p>
                </div>
              </div>
              <Progress value={percent} className="h-1.5 mb-2" />
              <div className="flex gap-1 flex-wrap">
                {POSITIONS.filter((p) => p !== patient.lastPosition).map((pos) => (
                  <Button key={pos} size="sm" variant="outline" className="h-6 text-[10px] border-zinc-600 px-2 hover:bg-zinc-700" onClick={() => handleReposition(patient.id, pos)}>
                    {pos}
                  </Button>
                ))}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Fugulin Classification
// ============================================================================

const FUGULIN_ITEMS = [
  { key: 'mentalState', label: 'Estado Mental', opts: [{ v: 1, l: 'Orientado' }, { v: 2, l: 'Periodos de desorientacao' }, { v: 3, l: 'Desorientacao continua' }, { v: 4, l: 'Inconsciente' }] },
  { key: 'oxygenation', label: 'Oxigenacao', opts: [{ v: 1, l: 'Ar ambiente' }, { v: 2, l: 'O2 por cateter/mascara' }, { v: 3, l: 'Mascara c/ reservatorio' }, { v: 4, l: 'VM / TOT' }] },
  { key: 'vitals', label: 'Sinais Vitais', opts: [{ v: 1, l: 'Estaveis' }, { v: 2, l: 'Controle 6/6h' }, { v: 3, l: 'Controle 4/4h' }, { v: 4, l: 'Controle 2/2h ou menos' }] },
  { key: 'mobility', label: 'Motilidade', opts: [{ v: 1, l: 'Deambula' }, { v: 2, l: 'Auxilio parcial' }, { v: 3, l: 'Cadeira de rodas' }, { v: 4, l: 'Acamado' }] },
  { key: 'ambulation', label: 'Deambulacao', opts: [{ v: 1, l: 'Independente' }, { v: 2, l: 'Auxilio parcial' }, { v: 3, l: 'Auxilio total' }, { v: 4, l: 'Incapaz' }] },
  { key: 'feeding', label: 'Alimentacao', opts: [{ v: 1, l: 'Auto-suficiente' }, { v: 2, l: 'Auxilio parcial' }, { v: 3, l: 'Auxilio total / SNG' }, { v: 4, l: 'NPT / Jejum' }] },
  { key: 'bodycare', label: 'Cuidado corporal', opts: [{ v: 1, l: 'Auto-suficiente' }, { v: 2, l: 'Auxilio parcial' }, { v: 3, l: 'Auxilio total' }, { v: 4, l: 'Banho no leito' }] },
  { key: 'elimination', label: 'Eliminacao', opts: [{ v: 1, l: 'Independente' }, { v: 2, l: 'Uso de comadre/urinol' }, { v: 3, l: 'SVD / Colostomia' }, { v: 4, l: 'Incontrol. / Irrigacao' }] },
  { key: 'therapy', label: 'Terapeutica', opts: [{ v: 1, l: 'VO simples' }, { v: 2, l: 'EV intermitente' }, { v: 3, l: 'EV continua / PCA' }, { v: 4, l: 'Vasoativos / DVA' }] },
];

function FugulinClassification() {
  const [scores, setScores] = useState<Record<string, number>>(
    Object.fromEntries(FUGULIN_ITEMS.map((i) => [i.key, 1])),
  );

  const total = useMemo(() => Object.values(scores).reduce((a, b) => a + b, 0), [scores]);

  const classification = total >= 31 ? 'Intensiva' : total >= 27 ? 'Semi-intensiva' : total >= 22 ? 'Alta Dependencia' : total >= 17 ? 'Intermediaria' : 'Minima';
  const classColor = total >= 31 ? 'text-red-400' : total >= 27 ? 'text-orange-400' : total >= 22 ? 'text-yellow-400' : total >= 17 ? 'text-blue-400' : 'text-emerald-400';
  const hoursPerPatient = total >= 31 ? '17.9h' : total >= 27 ? '12.5h' : total >= 22 ? '9.4h' : total >= 17 ? '5.6h' : '3.8h';

  return (
    <Card className="bg-zinc-900/80 border-zinc-800/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Users className="h-4 w-4 text-emerald-400" />
          Classificacao de Pacientes — Fugulin
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {FUGULIN_ITEMS.map(({ key, label, opts }) => (
          <div key={key} className="space-y-1.5">
            <Label className="text-xs text-zinc-400">{label}</Label>
            <div className="flex flex-wrap gap-1">
              {opts.map((opt) => (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => setScores((p) => ({ ...p, [key]: opt.v }))}
                  className={cn(
                    'rounded-lg border px-2.5 py-1.5 text-[11px] transition-all flex-1 min-w-[90px]',
                    scores[key] === opt.v
                      ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                      : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600',
                  )}
                >
                  {opt.l} ({opt.v})
                </button>
              ))}
            </div>
          </div>
        ))}

        <div className={cn('rounded-xl border p-5 mt-4 transition-all', total >= 31 ? 'bg-red-500/10 border-red-500/50' : total >= 22 ? 'bg-yellow-500/10 border-yellow-500/50' : 'bg-emerald-500/10 border-emerald-500/50')}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-400 uppercase tracking-wider">Score Total</p>
              <p className={cn('text-5xl font-black tabular-nums', classColor)}>{total}</p>
            </div>
            <div className="text-right">
              <Badge className={cn('text-sm border font-bold px-3 py-1', classColor)}>{classification}</Badge>
              <p className="text-xs text-zinc-400 mt-1">Horas de enfermagem: {hoursPerPatient}</p>
            </div>
          </div>
        </div>
        <Button className="w-full bg-emerald-600 hover:bg-emerald-500 h-10 gap-2" onClick={() => toast.success(`Fugulin registrado: ${total} — ${classification}`)}>
          <ClipboardCheck className="h-4 w-4" />
          Registrar Classificacao
        </Button>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Device / Bundle Tracking
// ============================================================================

const MOCK_DEVICES = [
  { id: 'd1', patient: 'Maria Silva', bed: '201-A', device: 'CVC Subclavia D', insertDate: '2026-03-20', days: 7, bundleCompliance: 85, bundleItems: { curativo: true, necessidade: true, higieneMaos: true, barreiraPrecaucao: true, sitioInsercao: false } },
  { id: 'd2', patient: 'Joao Santos', bed: '202-B', device: 'SVD', insertDate: '2026-03-22', days: 5, bundleCompliance: 100, bundleItems: { necessidade: true, fixacao: true, bolsaAbaixoVesica: true, higiene: true, sistemaFechado: true } },
  { id: 'd3', patient: 'Ana Costa', bed: '203-A', device: 'TOT 7.5', insertDate: '2026-03-24', days: 3, bundleCompliance: 80, bundleItems: { cabeceira30: true, pausaSedacao: true, higieneBucal: true, profilaxiaTVP: false, profilaxiaUlcera: true } },
];

function DeviceBundleTracking() {
  return (
    <Card className="bg-zinc-900/80 border-zinc-800/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Target className="h-4 w-4 text-orange-400" />
          Dispositivos e Bundles de Prevencao
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {MOCK_DEVICES.map((device) => (
          <div key={device.id} className={cn('rounded-xl border p-4 transition-all hover:shadow-md', device.days >= 7 ? 'border-red-500/50 bg-red-500/5' : device.days >= 5 ? 'border-yellow-500/50 bg-yellow-500/5' : 'border-zinc-700/50 bg-zinc-800/30')}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm font-semibold text-white">{device.device}</p>
                <p className="text-[10px] text-zinc-400">{device.patient} | Leito {device.bed} | Inserido: {device.insertDate}</p>
              </div>
              <div className="text-right">
                <p className={cn('text-xl font-black tabular-nums', device.days >= 7 ? 'text-red-400' : device.days >= 5 ? 'text-yellow-400' : 'text-emerald-400')}>
                  D{device.days}
                </p>
                <p className="text-[10px] text-zinc-500">dias</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <p className="text-[10px] text-zinc-400">Bundle:</p>
              <Progress value={device.bundleCompliance} className="h-1.5 flex-1" />
              <span className={cn('text-xs font-bold tabular-nums', device.bundleCompliance === 100 ? 'text-emerald-400' : 'text-yellow-400')}>{device.bundleCompliance}%</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {Object.entries(device.bundleItems).map(([key, done]) => (
                <Badge key={key} className={cn('text-[9px] border gap-0.5', done ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' : 'bg-red-500/20 text-red-400 border-red-500/50')}>
                  {done ? <CheckCircle2 className="h-2.5 w-2.5" /> : <XCircle className="h-2.5 w-2.5" />}
                  {key}
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Main Page
// ============================================================================

export default function NursingPage() {
  const navigate = useNavigate();
  const now = useCurrentTime();
  const shift = getShiftInfo(now);
  const ShiftIcon = shift.icon;
  const [ward, setWard] = useState('all');
  const [tab, setTab] = useState('vitals');

  const { data: allBeds = [], isLoading: bedsLoading, isError: bedsError, refetch: refetchBeds } = useBeds();

  const assignedPatients = useMemo(() =>
    allBeds
      .filter((b) => b.status === 'OCCUPIED' && b.currentPatient)
      .map((bed) => ({ bed, patient: bed.currentPatient! })),
    [allBeds],
  );

  if (bedsLoading) return <PageLoading cards={3} showTable />;
  if (bedsError) return <PageError onRetry={() => { refetchBeds(); }} />;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-600 to-emerald-700 flex items-center justify-center shadow-lg shadow-teal-500/20">
              <Stethoscope className="w-6 h-6 text-white" />
            </div>
            <div className={cn('absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-zinc-950 animate-pulse', shift.label === 'Manha' ? 'bg-amber-400' : shift.label === 'Tarde' ? 'bg-orange-400' : 'bg-indigo-400')} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Enfermagem</h1>
            <div className="flex items-center gap-3 mt-0.5">
              <div className={cn('flex items-center gap-1 text-xs', shift.color)}>
                <ShiftIcon className="h-3.5 w-3.5" />
                <span className="font-medium">Plantao {shift.label}</span>
              </div>
              <span className="text-zinc-600">|</span>
              <span className="text-xs text-zinc-400 tabular-nums font-mono">{formatTime(now)}</span>
              <span className="text-zinc-600">|</span>
              <div className="flex items-center gap-1 text-xs text-zinc-400">
                <Users className="h-3 w-3" />
                <span>{assignedPatients.length} pacientes</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" className="border-teal-500/30 text-teal-400 hover:bg-teal-500/10 gap-2" onClick={() => navigate('/enfermagem/aprazamento')}>
            <CalendarClock className="h-4 w-4" /> Grade de Aprazamento
          </Button>
          <Select value={ward} onValueChange={setWard}>
            <SelectTrigger className="w-40 bg-zinc-900 border-zinc-700">
              <SelectValue placeholder="Ala" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Alas</SelectItem>
              <SelectItem value="ward-uti">UTI</SelectItem>
              <SelectItem value="ward-enf">Enfermaria</SelectItem>
              <SelectItem value="ward-obs">Observacao</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-zinc-900/80 border-zinc-800/50 hover:border-blue-500/30 transition-all">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-blue-500/10 p-1.5">
                <BedDouble className="h-4 w-4 text-blue-400" />
              </div>
              <p className="text-xs text-zinc-400">Pacientes</p>
            </div>
            <p className="text-3xl font-black text-white mt-1 tabular-nums">{assignedPatients.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/80 border-zinc-800/50 hover:border-yellow-500/30 transition-all">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-yellow-500/10 p-1.5">
                <AlertTriangle className="h-4 w-4 text-yellow-400" />
              </div>
              <p className="text-xs text-zinc-400">Quedas Risco Alto</p>
            </div>
            <p className="text-3xl font-black text-yellow-400 mt-1 tabular-nums">3</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/80 border-zinc-800/50 hover:border-red-500/30 transition-all">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-red-500/10 p-1.5">
                <Shield className="h-4 w-4 text-red-400" />
              </div>
              <p className="text-xs text-zinc-400">LPP Risco Alto</p>
            </div>
            <p className="text-3xl font-black text-red-400 mt-1 tabular-nums">2</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/80 border-zinc-800/50 hover:border-orange-500/30 transition-all">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-orange-500/10 p-1.5">
                <RotateCcw className="h-4 w-4 text-orange-400" />
              </div>
              <p className="text-xs text-zinc-400">Decubito Atrasado</p>
            </div>
            <p className="text-3xl font-black text-orange-400 mt-1 tabular-nums">1</p>
          </CardContent>
        </Card>
      </div>

      {/* Bed Map */}
      <BedMap />

      {/* Patient Cards */}
      <div>
        <h2 className="mb-3 text-sm font-medium text-zinc-400 flex items-center gap-2">
          <Users className="h-3.5 w-3.5" /> Pacientes Atribuidos
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {assignedPatients.map(({ bed, patient }) => (
            <Card key={bed.id} className="border-zinc-800/50 bg-zinc-900/80 transition-all duration-200 hover:bg-zinc-800/80 hover:border-zinc-700 hover:shadow-md hover:scale-[1.01] cursor-pointer">
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarFallback className="bg-gradient-to-br from-teal-600 to-emerald-700 text-white text-xs font-bold">
                      {getInitials(patient.name ?? patient.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">{patient.name ?? patient.fullName}</p>
                    <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
                      <BedDouble className="h-3 w-3" />
                      <span>{bed.bedNumber}</span>
                      <span className="text-zinc-600">|</span>
                      <span>{calculateAge(patient.birthDate)} anos</span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-zinc-600 mt-1" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-zinc-800/80 border border-zinc-700/50 flex-wrap h-auto p-1 gap-0.5">
          <TabsTrigger value="vitals" className="gap-1.5 text-xs data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-600 data-[state=active]:to-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all">
            <Activity className="h-3.5 w-3.5" /> Sinais Vitais
          </TabsTrigger>
          <TabsTrigger value="medications" className="gap-1.5 text-xs data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-600 data-[state=active]:to-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all">
            <Pill className="h-3.5 w-3.5" /> Checagem Medicamentos
          </TabsTrigger>
          <TabsTrigger value="morse" className="gap-1.5 text-xs data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-600 data-[state=active]:to-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all">
            <AlertTriangle className="h-3.5 w-3.5" /> Escala Morse
          </TabsTrigger>
          <TabsTrigger value="fluid" className="gap-1.5 text-xs data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-600 data-[state=active]:to-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all">
            <Droplets className="h-3.5 w-3.5" /> Balanco Hidrico
          </TabsTrigger>
          <TabsTrigger value="sae" className="gap-1.5 text-xs data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-600 data-[state=active]:to-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all">
            <ClipboardCheck className="h-3.5 w-3.5" /> SAE/NIC
          </TabsTrigger>
          <TabsTrigger value="handoff" className="gap-1.5 text-xs data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-600 data-[state=active]:to-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all">
            <ArrowRightLeft className="h-3.5 w-3.5" /> Passagem Plantao
          </TabsTrigger>
          <TabsTrigger value="braden" className="gap-1.5 text-xs data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-600 data-[state=active]:to-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all">
            <Shield className="h-3.5 w-3.5" /> Braden (LPP)
          </TabsTrigger>
          <TabsTrigger value="pain" className="gap-1.5 text-xs data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-600 data-[state=active]:to-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all">
            <Heart className="h-3.5 w-3.5" /> Dor
          </TabsTrigger>
          <TabsTrigger value="wounds" className="gap-1.5 text-xs data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-600 data-[state=active]:to-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all">
            <Eye className="h-3.5 w-3.5" /> Feridas
          </TabsTrigger>
          <TabsTrigger value="elimination" className="gap-1.5 text-xs data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-600 data-[state=active]:to-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all">
            <Droplets className="h-3.5 w-3.5" /> Eliminacoes
          </TabsTrigger>
          <TabsTrigger value="repositioning" className="gap-1.5 text-xs data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-600 data-[state=active]:to-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all">
            <RotateCcw className="h-3.5 w-3.5" /> Decubito
          </TabsTrigger>
          <TabsTrigger value="devices" className="gap-1.5 text-xs data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-600 data-[state=active]:to-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all">
            <Target className="h-3.5 w-3.5" /> Dispositivos
          </TabsTrigger>
          <TabsTrigger value="fugulin" className="gap-1.5 text-xs data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-600 data-[state=active]:to-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all">
            <Users className="h-3.5 w-3.5" /> Fugulin
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vitals" className="mt-4"><VitalSignsTab /></TabsContent>
        <TabsContent value="medications" className="mt-4"><MedicationCheckTab /></TabsContent>
        <TabsContent value="morse" className="mt-4"><MorseFallScale /></TabsContent>
        <TabsContent value="fluid" className="mt-4"><FluidBalanceTab /></TabsContent>
        <TabsContent value="sae" className="mt-4"><SAENICTab /></TabsContent>
        <TabsContent value="handoff" className="mt-4"><ShiftHandoffTab /></TabsContent>
        <TabsContent value="braden" className="mt-4"><BradenScale /></TabsContent>
        <TabsContent value="pain" className="mt-4"><PainAssessment /></TabsContent>
        <TabsContent value="wounds" className="mt-4"><WoundAssessment /></TabsContent>
        <TabsContent value="elimination" className="mt-4"><EliminationTracking /></TabsContent>
        <TabsContent value="repositioning" className="mt-4"><RepositioningSchedule /></TabsContent>
        <TabsContent value="devices" className="mt-4"><DeviceBundleTracking /></TabsContent>
        <TabsContent value="fugulin" className="mt-4"><FugulinClassification /></TabsContent>
      </Tabs>

      {/* Floating Quick Actions */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-50">
        <button
          className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-teal-600 to-emerald-600 text-white shadow-xl shadow-teal-500/30 hover:scale-110 hover:shadow-teal-500/40 transition-all active:scale-95"
          onClick={() => toast.info('Gravacao por voz iniciada')}
          title="Registro por voz"
        >
          <Mic className="h-5 w-5" />
        </button>
        <button
          className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300 shadow-lg hover:bg-zinc-700 hover:scale-110 transition-all"
          onClick={() => toast.info('Novo registro de sinais vitais')}
          title="Sinais Vitais"
        >
          <Activity className="h-4 w-4" />
        </button>
        <button
          className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300 shadow-lg hover:bg-zinc-700 hover:scale-110 transition-all"
          onClick={() => toast.info('Checagem de medicamento')}
          title="Checar Medicamento"
        >
          <Pill className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
