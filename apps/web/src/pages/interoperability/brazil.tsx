import { useState } from 'react';
import {
  Send,
  Search,
  AlertCircle,
  Smartphone,
  Heart,
  Building2,
  UserCheck,
  Baby,
  Skull,
  Pill,
  MessageCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import {
  useSinanNotifications,
  useSubmitSinanNotification,
  useLookupCns,
} from '@/services/interop-brazil.service';

export default function InteropBrazilPage() {
  const [activeTab, setActiveTab] = useState('sinan');
  const [cpfSearch, setCpfSearch] = useState('');

  const { data: sinanData } = useSinanNotifications({ page: 1 });
  const submitSinan = useSubmitSinanNotification();
  const lookupCns = useLookupCns();

  async function handleSubmitSinan(notificationId: string) {
    try {
      await submitSinan.mutateAsync(notificationId);
      toast.success('Notificação enviada ao SINAN.');
    } catch {
      toast.error('Erro ao enviar notificação.');
    }
  }

  async function handleLookupCns() {
    if (!cpfSearch || cpfSearch.length < 11) {
      toast.error('Digite um CPF válido (11 dígitos).');
      return;
    }
    try {
      const result = await lookupCns.mutateAsync(cpfSearch);
      if (result.status === 'FOUND') {
        toast.success(`CNS encontrado: ${result.cns}`);
      } else {
        toast.error('CNS não encontrado para este CPF.');
      }
    } catch {
      toast.error('Erro ao consultar CADSUS.');
    }
  }

  const systems = [
    { name: 'SINAN', desc: 'Notificação Compulsória', icon: AlertCircle, color: 'text-red-500', count: sinanData?.total ?? 0 },
    { name: 'CADSUS', desc: 'Cadastro Nacional de Saúde', icon: UserCheck, color: 'text-blue-500', count: null },
    { name: 'CNES', desc: 'Estabelecimentos de Saúde', icon: Building2, color: 'text-purple-500', count: null },
    { name: 'e-SUS APS', desc: 'Atenção Primária', icon: Heart, color: 'text-emerald-500', count: null },
    { name: 'SIM', desc: 'Certidão de Óbito Digital', icon: Skull, color: 'text-zinc-500', count: null },
    { name: 'SINASC', desc: 'Nascidos Vivos', icon: Baby, color: 'text-pink-500', count: null },
    { name: 'NOTIVISA', desc: 'Farmacovigilância', icon: Pill, color: 'text-orange-500', count: null },
    { name: 'WhatsApp', desc: 'Mensagens e Lembretes', icon: MessageCircle, color: 'text-green-500', count: null },
  ];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Interoperabilidade Brasil</h1>
        <p className="text-zinc-400">Integração com sistemas nacionais de saúde (SINAN, CADSUS, CNES, e-SUS, SIM, SINASC, NOTIVISA)</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {systems.map((sys) => (
          <Card key={sys.name} className="border-zinc-800 bg-zinc-900">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <sys.icon className={`h-8 w-8 ${sys.color}`} />
                <div>
                  <p className="text-sm font-bold text-white">{sys.name}</p>
                  <p className="text-xs text-zinc-400">{sys.desc}</p>
                  {sys.count !== null && (
                    <p className="text-xs text-emerald-400 mt-1">{sys.count} registros</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-zinc-800">
          <TabsTrigger value="sinan">SINAN</TabsTrigger>
          <TabsTrigger value="cadsus">CADSUS / CNS</TabsTrigger>
          <TabsTrigger value="cnes">CNES</TabsTrigger>
          <TabsTrigger value="esus">e-SUS APS</TabsTrigger>
          <TabsTrigger value="sim-sinasc">SIM / SINASC</TabsTrigger>
          <TabsTrigger value="notivisa">NOTIVISA</TabsTrigger>
          <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
          <TabsTrigger value="health-apps">Health Apps</TabsTrigger>
        </TabsList>

        <TabsContent value="sinan" className="space-y-4">
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                Notificações Compulsórias — SINAN
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-zinc-400 text-sm mb-4">
                Doenças de notificação compulsória são automaticamente detectadas ao registrar diagnósticos com CIDs específicos (dengue, COVID-19, tuberculose, sarampo, etc.).
              </p>
              {(!sinanData?.data || sinanData.data.length === 0) ? (
                <p className="text-zinc-400 text-center py-8">Nenhuma notificação SINAN registrada.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800">
                      <TableHead className="text-zinc-400">Doença</TableHead>
                      <TableHead className="text-zinc-400">CID</TableHead>
                      <TableHead className="text-zinc-400">Paciente</TableHead>
                      <TableHead className="text-zinc-400">Status</TableHead>
                      <TableHead className="text-zinc-400">Data</TableHead>
                      <TableHead className="text-zinc-400">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sinanData.data.map((n) => (
                      <TableRow key={n.notificationId} className="border-zinc-800">
                        <TableCell className="text-white">{n.disease}</TableCell>
                        <TableCell className="text-zinc-300">{n.cidCode}</TableCell>
                        <TableCell className="text-zinc-300">{n.patientName ?? '—'}</TableCell>
                        <TableCell>
                          <Badge className={n.status === 'SUBMITTED' ? 'bg-emerald-600' : 'bg-yellow-600'}>
                            {n.status === 'SUBMITTED' ? 'Enviada' : 'Rascunho'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-zinc-300">
                          {new Date(n.notificationDate).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell>
                          {n.status !== 'SUBMITTED' && (
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700"
                              onClick={() => handleSubmitSinan(n.notificationId)}
                            >
                              <Send className="h-3 w-3 mr-1" />
                              Enviar
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cadsus" className="space-y-4">
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-blue-500" />
                CADSUS — Consulta CNS por CPF
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3 max-w-md">
                <div className="flex-1">
                  <Label className="text-zinc-300">CPF do Paciente</Label>
                  <Input
                    className="bg-zinc-800 border-zinc-700 text-white"
                    value={cpfSearch}
                    onChange={(e) => setCpfSearch(e.target.value.replace(/\D/g, ''))}
                    placeholder="000.000.000-00"
                    maxLength={11}
                  />
                </div>
                <div className="flex items-end">
                  <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleLookupCns}>
                    <Search className="h-4 w-4 mr-2" />
                    Consultar
                  </Button>
                </div>
              </div>
              {lookupCns.data && (
                <Card className="border-zinc-700 bg-zinc-800 max-w-md">
                  <CardContent className="pt-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Status:</span>
                        <Badge className={lookupCns.data.status === 'FOUND' ? 'bg-emerald-600' : 'bg-red-600'}>
                          {lookupCns.data.status === 'FOUND' ? 'Encontrado' : 'Não encontrado'}
                        </Badge>
                      </div>
                      {lookupCns.data.cns && (
                        <div className="flex justify-between">
                          <span className="text-zinc-400">CNS:</span>
                          <span className="text-white font-mono">{lookupCns.data.cns}</span>
                        </div>
                      )}
                      {lookupCns.data.fullName && (
                        <div className="flex justify-between">
                          <span className="text-zinc-400">Nome:</span>
                          <span className="text-white">{lookupCns.data.fullName}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cnes" className="space-y-4">
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Building2 className="h-5 w-5 text-purple-500" />
                CNES — Validação de Estabelecimentos e Profissionais
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-zinc-400 text-center py-8">
                Consulte estabelecimentos de saúde e valide profissionais pelo CNS/CNES.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="esus" className="space-y-4">
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Heart className="h-5 w-5 text-emerald-500" />
                e-SUS APS — Integração com Atenção Primária
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-zinc-400 text-center py-8">
                Exporte registros de atendimento no formato PEC/CDS para alimentar o SISAB.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sim-sinasc" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-zinc-800 bg-zinc-900">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Skull className="h-5 w-5 text-zinc-500" />
                  SIM — Declaração de Óbito Digital
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-zinc-400 text-sm">
                  Emita declarações de óbito digitais e envie automaticamente ao Sistema de Informação de Mortalidade.
                </p>
              </CardContent>
            </Card>
            <Card className="border-zinc-800 bg-zinc-900">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Baby className="h-5 w-5 text-pink-500" />
                  SINASC — Declaração de Nascido Vivo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-zinc-400 text-sm">
                  Emita DNVs digitais com dados do parto (peso, Apgar, IG, tipo de parto) e envie ao SINASC.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="notivisa" className="space-y-4">
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Pill className="h-5 w-5 text-orange-500" />
                NOTIVISA — Farmacovigilância
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-zinc-400 text-center py-8">
                Notifique reações adversas a medicamentos, eventos de tecnovigilância e queixas de qualidade.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="whatsapp" className="space-y-4">
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-green-500" />
                WhatsApp Business API
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-zinc-400 text-sm mb-4">
                Envie lembretes de consulta, resultados de exames, prescrições e chatbot de agendamento via WhatsApp.
              </p>
              <div className="grid gap-3 md:grid-cols-3">
                <Card className="border-zinc-700 bg-zinc-800">
                  <CardContent className="pt-4 text-center">
                    <p className="text-white font-medium">Lembrete de Consulta</p>
                    <p className="text-xs text-zinc-400 mt-1">24h antes do agendamento</p>
                  </CardContent>
                </Card>
                <Card className="border-zinc-700 bg-zinc-800">
                  <CardContent className="pt-4 text-center">
                    <p className="text-white font-medium">Resultado Disponível</p>
                    <p className="text-xs text-zinc-400 mt-1">Notifica quando exame fica pronto</p>
                  </CardContent>
                </Card>
                <Card className="border-zinc-700 bg-zinc-800">
                  <CardContent className="pt-4 text-center">
                    <p className="text-white font-medium">Chatbot Agendamento</p>
                    <p className="text-xs text-zinc-400 mt-1">Paciente agenda pelo WhatsApp</p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="health-apps" className="space-y-4">
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-blue-500" />
                Apple Health / Google Fit
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-zinc-400 text-center py-8">
                Sincronize dados clínicos com os aplicativos de saúde do paciente (passos, frequência cardíaca, sono, etc.).
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
