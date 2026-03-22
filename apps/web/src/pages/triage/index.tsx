import { useState } from 'react';
import {
  Mic,
  Square,
  Search,
  Clock,
  CheckCircle2,
  User,
  AlertTriangle,
  ShieldAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn, getInitials } from '@/lib/utils';
import { triageLevelColors } from '@/lib/constants';
import { useTriageQueue } from '@/services/triage.service';
import { useEvaluateTriggers, type MatchedProtocol } from '@/services/protocols.service';
import { PageLoading } from '@/components/common/page-loading';
import { PageError } from '@/components/common/page-error';
import type { TriageLevel } from '@/types';

export default function TriagePage() {
  const { data: queueData, isLoading, isError, refetch } = useTriageQueue();
  const [selectedPatient, setSelectedPatient] = useState('');
  const [complaint, setComplaint] = useState('');
  const [onsetTime, setOnsetTime] = useState('');
  const [painScale, setPainScale] = useState('');
  const [classification, setClassification] = useState<TriageLevel | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [matchedProtocols, setMatchedProtocols] = useState<MatchedProtocol[]>([]);
  const evaluateTriggers = useEvaluateTriggers();

  const waitingQueue = queueData?.data ?? [];

  const handleClassify = async () => {
    const pain = parseInt(painScale) || 0;
    let level: TriageLevel;
    if (pain >= 8) level = 'RED';
    else if (pain >= 6) level = 'ORANGE';
    else if (pain >= 4) level = 'YELLOW';
    else if (pain >= 2) level = 'GREEN';
    else level = 'BLUE';

    setClassification(level);

    // Evaluate clinical protocols against triage data
    try {
      const triageData: Record<string, unknown> = {
        triageLevel: level,
        painLevel: pain,
        chiefComplaint: complaint,
        onsetTime,
      };
      const result = await evaluateTriggers.mutateAsync(triageData);
      setMatchedProtocols(result.matchedProtocols ?? []);
    } catch {
      // Protocol evaluation is non-blocking; silently ignore errors
      setMatchedProtocols([]);
    }
  };

  const CATEGORY_COLORS: Record<string, string> = {
    SEPSIS: 'border-red-500/40 bg-red-500/10 text-red-400',
    ACS: 'border-orange-500/40 bg-orange-500/10 text-orange-400',
    STROKE: 'border-purple-500/40 bg-purple-500/10 text-purple-400',
    FALL: 'border-amber-500/40 bg-amber-500/10 text-amber-400',
    DVT: 'border-blue-500/40 bg-blue-500/10 text-blue-400',
    PAIN: 'border-yellow-500/40 bg-yellow-500/10 text-yellow-400',
    PEDIATRIC: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-400',
    OBSTETRIC: 'border-pink-500/40 bg-pink-500/10 text-pink-400',
  };

  if (isLoading) return <PageLoading cards={0} showTable={false} />;
  if (isError) return <PageError onRetry={() => refetch()} />;

  return (
    <div className="space-y-4 animate-fade-in">
      <h1 className="text-2xl font-bold tracking-tight">Triagem</h1>

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Left: Triage Form */}
        <div className="space-y-4 lg:col-span-3">
          {/* Patient Search */}
          <Card className="border-border bg-card">
            <CardContent className="pt-5">
              <Label className="text-xs text-muted-foreground">Paciente</Label>
              <div className="relative mt-1.5">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar paciente por nome ou prontuário..."
                  value={selectedPatient}
                  onChange={(e) => setSelectedPatient(e.target.value)}
                  className="pl-10 bg-secondary/30 border-border"
                />
              </div>
            </CardContent>
          </Card>

          {/* Voice Input */}
          <Card className="border-border bg-card">
            <CardContent className="flex flex-col items-center py-8">
              <button
                onClick={() => setIsRecording(!isRecording)}
                className={cn(
                  'flex h-16 w-16 items-center justify-center rounded-full transition-all',
                  isRecording
                    ? 'bg-red-500 shadow-lg shadow-red-500/30 animate-voice-pulse-red'
                    : 'bg-teal-600 shadow-lg shadow-teal-500/20 hover:bg-teal-500 animate-voice-pulse',
                )}
              >
                {isRecording ? (
                  <Square className="h-6 w-6 text-white" />
                ) : (
                  <Mic className="h-6 w-6 text-white" />
                )}
              </button>
              <p className="mt-3 text-sm text-muted-foreground">
                {isRecording ? 'Gravando...' : 'Descreva os sintomas do paciente'}
              </p>
              {isRecording && (
                <div className="mt-3 flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="sound-wave-bar w-1 rounded-full bg-red-400" style={{ height: '4px' }} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Form Fields */}
          <Card className="border-border bg-card">
            <CardContent className="space-y-4 pt-5">
              <div>
                <Label className="text-xs text-muted-foreground">Queixa Principal</Label>
                <Textarea
                  placeholder="Descreva a queixa principal..."
                  value={complaint}
                  onChange={(e) => setComplaint(e.target.value)}
                  className="mt-1.5 border-border bg-secondary/30"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Tempo de Início</Label>
                  <Input
                    placeholder="Ex: 3 horas"
                    value={onsetTime}
                    onChange={(e) => setOnsetTime(e.target.value)}
                    className="mt-1.5 bg-secondary/30 border-border"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Escala de Dor (0-10)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="10"
                    placeholder="0"
                    value={painScale}
                    onChange={(e) => setPainScale(e.target.value)}
                    className="mt-1.5 bg-secondary/30 border-border"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Classification Result */}
          {classification && triageLevelColors[classification] && (
            <Card className={cn(
              'border overflow-hidden',
              classification === 'RED'
                ? 'border-red-500/40 glow-red'
                : classification === 'ORANGE'
                  ? 'border-orange-500/40 glow-amber'
                  : 'border-border',
            )}>
              <CardContent className={cn(
                'relative flex flex-col items-center py-8',
                classification === 'RED' && 'bg-gradient-to-b from-red-500/10 to-transparent',
              )}>
                {/* Screen-edge red glow for RED classification */}
                {classification === 'RED' && (
                  <div className="pointer-events-none absolute inset-0 rounded-lg ring-2 ring-inset ring-red-500/20 animate-pulse" />
                )}
                <div className={cn(
                  'animate-reveal-bounce flex h-24 w-24 items-center justify-center rounded-full shadow-lg',
                  triageLevelColors[classification]!.bg,
                )}>
                  <span className="text-2xl font-bold text-white">
                    {triageLevelColors[classification]!.label.charAt(0)}
                  </span>
                </div>
                <h3 className={cn('mt-3 text-xl font-bold animate-fade-in-up', triageLevelColors[classification]!.text)}>
                  {triageLevelColors[classification]!.label}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground animate-fade-in-up stagger-2">Classificação de Manchester</p>
              </CardContent>
            </Card>
          )}

          {/* Matched Protocol Alerts */}
          {matchedProtocols.length > 0 && (
            <div className="space-y-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-amber-400">
                <ShieldAlert className="h-4 w-4" />
                Protocolos Ativados ({matchedProtocols.length})
              </h3>
              {matchedProtocols.map((mp) => (
                <Card
                  key={mp.protocol.id}
                  className={cn(
                    'border overflow-hidden',
                    CATEGORY_COLORS[mp.protocol.category] ?? 'border-border bg-secondary/30',
                  )}
                >
                  <CardContent className="py-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          {mp.protocol.name}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {mp.protocol.description}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        P{mp.protocol.priority}
                      </Badge>
                    </div>

                    {(mp.matchedCriteria ?? []).length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {(mp.matchedCriteria ?? []).map((c, i) => (
                          <Badge key={i} variant="secondary" className="text-[10px]">
                            {c.field} {c.operator} {String(c.value)}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {(mp.recommendedActions ?? []).length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {(mp.recommendedActions ?? []).map((action, i) => (
                          <Button
                            key={i}
                            variant="outline"
                            size="sm"
                            className="text-xs h-7 border-current"
                          >
                            {action.type === 'ALERT' && 'Alertar Equipe'}
                            {action.type === 'ORDER' && 'Solicitar Exame'}
                            {action.type === 'NOTIFICATION' && 'Notificar'}
                            {action.type === 'MEDICATION' && 'Prescrever'}
                            {!['ALERT', 'ORDER', 'NOTIFICATION', 'MEDICATION'].includes(action.type) && action.type}
                          </Button>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <Button onClick={handleClassify} className="w-full bg-teal-600 hover:bg-teal-500 h-11 font-semibold">
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Classificar
          </Button>
        </div>

        {/* Right: Waiting Queue */}
        <div className="lg:col-span-2">
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4 text-amber-400" />
                Fila de Espera ({waitingQueue.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {waitingQueue.length === 0 ? (
                <div className="flex flex-col items-center py-8">
                  <User className="h-8 w-8 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">Fila vazia</p>
                </div>
              ) : (
                waitingQueue.map((item) => {
                  const triage = item.level ? triageLevelColors[item.level] : null;
                  return (
                    <div
                      key={item.encounterId}
                      className={cn(
                        'flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-secondary/50',
                        item.level === 'RED' && 'animate-breathe border-red-500/30',
                      )}
                    >
                      {triage && (
                        <div className={cn('h-10 w-1.5 rounded-full', triage.bg)} />
                      )}
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-secondary text-xs">
                          {getInitials(item.patientName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{item.patientName}</p>
                        <p className="truncate text-xs text-muted-foreground">{item.chiefComplaint}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {triage && (
                          <Badge className={cn('text-[10px] text-white', triage.bg)}>
                            {triage.label}
                          </Badge>
                        )}
                        <span className={cn(
                          'text-[10px]',
                          item.waitTimeMinutes > 30 ? 'text-red-400' : item.waitTimeMinutes > 15 ? 'text-amber-400' : 'text-muted-foreground',
                        )}>
                          {item.waitTimeMinutes}min
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
