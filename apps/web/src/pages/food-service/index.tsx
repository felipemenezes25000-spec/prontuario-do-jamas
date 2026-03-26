import { useState, useMemo } from 'react';
import {
  UtensilsCrossed,
  Plus,
  Search,
  ClipboardList,
  Users,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Percent,
  Apple,
  Coffee,
  Salad,
  Cookie,
  Moon,
  Sandwich,
  Truck,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

type DietType = 'REGULAR' | 'SOFT' | 'LIQUID' | 'LOW_SODIUM' | 'DIABETIC' | 'RENAL' |
  'GLUTEN_FREE' | 'LACTOSE_FREE' | 'ENTERAL' | 'PARENTERAL' | 'NPO';
type MealType = 'BREAKFAST' | 'MORNING_SNACK' | 'LUNCH' | 'AFTERNOON_SNACK' | 'DINNER' | 'NIGHT_SNACK';

interface PatientDiet {
  id: string;
  patientId: string;
  patientName: string;
  ward: string;
  bed: string;
  dietType: DietType;
  dietLabel: string;
  restrictions: string[];
  allergies: string[];
  notes: string;
  assignedAt: string;
}

interface MealDeliveryRecord {
  id: string;
  patientName: string;
  mealType: MealType;
  mealLabel: string;
  delivered: boolean;
  refused: boolean;
  refusalReason: string | null;
  portionConsumed: number | null;
  recordedAt: string;
}

// ============================================================================
// Constants
// ============================================================================

const DIET_LABELS: Record<DietType, string> = {
  REGULAR: 'Geral',
  SOFT: 'Pastosa',
  LIQUID: 'Liquida',
  LOW_SODIUM: 'Hipossodica',
  DIABETIC: 'Diabetica',
  RENAL: 'Renal',
  GLUTEN_FREE: 'Sem Gluten',
  LACTOSE_FREE: 'Sem Lactose',
  ENTERAL: 'Enteral',
  PARENTERAL: 'Parenteral',
  NPO: 'Jejum (NPO)',
};

const DIET_COLORS: Record<DietType, string> = {
  REGULAR: 'bg-zinc-600 text-white',
  SOFT: 'bg-blue-600 text-white',
  LIQUID: 'bg-cyan-600 text-white',
  LOW_SODIUM: 'bg-yellow-600 text-white',
  DIABETIC: 'bg-orange-600 text-white',
  RENAL: 'bg-purple-600 text-white',
  GLUTEN_FREE: 'bg-amber-600 text-white',
  LACTOSE_FREE: 'bg-lime-600 text-white',
  ENTERAL: 'bg-emerald-600 text-white',
  PARENTERAL: 'bg-teal-600 text-white',
  NPO: 'bg-red-600 text-white',
};

const MEAL_LABELS: Record<MealType, { label: string; icon: typeof Coffee }> = {
  BREAKFAST: { label: 'Cafe da Manha', icon: Coffee },
  MORNING_SNACK: { label: 'Lanche Manha', icon: Apple },
  LUNCH: { label: 'Almoco', icon: Salad },
  AFTERNOON_SNACK: { label: 'Lanche Tarde', icon: Cookie },
  DINNER: { label: 'Jantar', icon: Sandwich },
  NIGHT_SNACK: { label: 'Ceia', icon: Moon },
};

// ============================================================================
// Mock Data
// ============================================================================

const MOCK_DIETS: PatientDiet[] = [
  { id: 'd1', patientId: 'p1', patientName: 'Maria Silva', ward: 'Cardiologia', bed: '301-A',
    dietType: 'LOW_SODIUM', dietLabel: 'Hipossodica', restrictions: ['Sodio < 2g/dia'], allergies: ['Camarao'],
    notes: 'Preferencia por frutas no lanche', assignedAt: '2026-03-24T10:00:00Z' },
  { id: 'd2', patientId: 'p2', patientName: 'Joao Santos', ward: 'Cirurgia', bed: '205-B',
    dietType: 'LIQUID', dietLabel: 'Liquida', restrictions: ['PO 1o dia'], allergies: [],
    notes: 'Transicao para pastosa amanha', assignedAt: '2026-03-25T06:00:00Z' },
  { id: 'd3', patientId: 'p3', patientName: 'Ana Oliveira', ward: 'Cardiologia', bed: '303-A',
    dietType: 'DIABETIC', dietLabel: 'Diabetica', restrictions: ['Sem acucar', 'IG baixo'], allergies: ['Gluten'],
    notes: '', assignedAt: '2026-03-23T08:00:00Z' },
  { id: 'd4', patientId: 'p4', patientName: 'Pedro Costa', ward: 'UTI', bed: 'UTI-12',
    dietType: 'ENTERAL', dietLabel: 'Enteral', restrictions: ['SNE'], allergies: [],
    notes: 'Dieta enteral 1.5 kcal/mL - 1200mL/dia', assignedAt: '2026-03-20T14:00:00Z' },
  { id: 'd5', patientId: 'p5', patientName: 'Lucia Ferreira', ward: 'Clinica Medica', bed: '102-C',
    dietType: 'NPO', dietLabel: 'Jejum (NPO)', restrictions: ['Preparo para exame'], allergies: ['Lactose'],
    notes: 'Jejum ate 14h para endoscopia', assignedAt: '2026-03-25T00:00:00Z' },
];

const MOCK_DELIVERIES: MealDeliveryRecord[] = [
  { id: 'del1', patientName: 'Maria Silva', mealType: 'BREAKFAST', mealLabel: 'Cafe da Manha',
    delivered: true, refused: false, refusalReason: null, portionConsumed: 75, recordedAt: '2026-03-25T07:30:00Z' },
  { id: 'del2', patientName: 'Ana Oliveira', mealType: 'BREAKFAST', mealLabel: 'Cafe da Manha',
    delivered: true, refused: false, refusalReason: null, portionConsumed: 100, recordedAt: '2026-03-25T07:35:00Z' },
  { id: 'del3', patientName: 'Joao Santos', mealType: 'BREAKFAST', mealLabel: 'Cafe da Manha',
    delivered: true, refused: true, refusalReason: 'Nausea', portionConsumed: 0, recordedAt: '2026-03-25T07:40:00Z' },
  { id: 'del4', patientName: 'Maria Silva', mealType: 'LUNCH', mealLabel: 'Almoco',
    delivered: true, refused: false, refusalReason: null, portionConsumed: 50, recordedAt: '2026-03-25T12:00:00Z' },
];

// ============================================================================
// Component
// ============================================================================

export default function FoodServicePage() {
  const [activeTab, setActiveTab] = useState('diets');
  const [searchTerm, setSearchTerm] = useState('');
  const [wardFilter, setWardFilter] = useState<string>('all');
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showDeliveryDialog, setShowDeliveryDialog] = useState(false);

  // Assign diet form
  const [formPatientId, setFormPatientId] = useState('');
  const [formDietType, setFormDietType] = useState<DietType>('REGULAR');
  const [formRestrictions, setFormRestrictions] = useState('');
  const [formAllergies, setFormAllergies] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Delivery form
  const [deliveryPatientId, setDeliveryPatientId] = useState('');
  const [deliveryMealType, setDeliveryMealType] = useState<MealType>('BREAKFAST');
  const [deliveryRefused, setDeliveryRefused] = useState(false);
  const [deliveryRefusalReason, setDeliveryRefusalReason] = useState('');
  const [deliveryPortion, setDeliveryPortion] = useState('100');

  const wards = useMemo(() => {
    const set = new Set(MOCK_DIETS.map((d) => d.ward));
    return Array.from(set).sort();
  }, []);

  const filteredDiets = useMemo(() => {
    return MOCK_DIETS.filter((diet) => {
      const matchesSearch = diet.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        diet.bed.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesWard = wardFilter === 'all' || diet.ward === wardFilter;
      return matchesSearch && matchesWard;
    });
  }, [searchTerm, wardFilter]);

  const stats = useMemo(() => {
    const total = MOCK_DIETS.length;
    const npo = MOCK_DIETS.filter((d) => d.dietType === 'NPO').length;
    const served = MOCK_DELIVERIES.filter((d) => d.delivered && !d.refused).length;
    const refused = MOCK_DELIVERIES.filter((d) => d.refused).length;
    const totalDeliveries = MOCK_DELIVERIES.length;
    const acceptance = totalDeliveries > 0 ? Math.round(((totalDeliveries - refused) / totalDeliveries) * 100) : 0;
    return { total, npo, served, refused, acceptance };
  }, []);

  // Group diets by ward for kitchen view
  const wardGroups = useMemo(() => {
    const groups: Record<string, PatientDiet[]> = {};
    for (const diet of MOCK_DIETS) {
      if (!groups[diet.ward]) groups[diet.ward] = [];
      groups[diet.ward]!.push(diet);
    }
    return groups;
  }, []);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">
            <UtensilsCrossed className="mr-2 inline-block h-7 w-7 text-emerald-400" />
            SND - Servico de Nutricao e Dietetica
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Gestao de dietas, cardapios e controle de refeicoes
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            onClick={() => setShowDeliveryDialog(true)}
          >
            <Truck className="mr-2 h-4 w-4" />
            Registrar Entrega
          </Button>
          <Button
            onClick={() => setShowAssignDialog(true)}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Plus className="mr-2 h-4 w-4" />
            Prescrever Dieta
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-zinc-800 bg-zinc-900">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-emerald-500/10 p-3">
              <Users className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-400">Dietas Ativas</p>
              <p className="text-2xl font-bold text-zinc-100">{stats.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-green-500/10 p-3">
              <CheckCircle className="h-6 w-6 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-400">Refeicoes Servidas</p>
              <p className="text-2xl font-bold text-zinc-100">{stats.served}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-red-500/10 p-3">
              <XCircle className="h-6 w-6 text-red-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-400">Recusas Hoje</p>
              <p className="text-2xl font-bold text-red-400">{stats.refused}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-blue-500/10 p-3">
              <Percent className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-400">Aceitacao</p>
              <p className="text-2xl font-bold text-zinc-100">{stats.acceptance}%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="border-zinc-800 bg-zinc-900">
          <TabsTrigger value="diets">
            <ClipboardList className="mr-2 h-4 w-4" />
            Dietas Ativas
          </TabsTrigger>
          <TabsTrigger value="kitchen">
            <UtensilsCrossed className="mr-2 h-4 w-4" />
            Mapa da Cozinha
          </TabsTrigger>
          <TabsTrigger value="deliveries">
            <Truck className="mr-2 h-4 w-4" />
            Entregas do Dia
          </TabsTrigger>
        </TabsList>

        {/* Diets Tab */}
        <TabsContent value="diets" className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <Input
                placeholder="Buscar por paciente ou leito..."
                className="border-zinc-700 bg-zinc-900 pl-10 text-zinc-100"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={wardFilter} onValueChange={setWardFilter}>
              <SelectTrigger className="w-48 border-zinc-700 bg-zinc-900 text-zinc-100">
                <SelectValue placeholder="Setor" />
              </SelectTrigger>
              <SelectContent className="border-zinc-700 bg-zinc-900">
                <SelectItem value="all">Todos os Setores</SelectItem>
                {wards.map((ward) => (
                  <SelectItem key={ward} value={ward}>{ward}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Card className="border-zinc-800 bg-zinc-900">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800 hover:bg-zinc-800/50">
                  <TableHead className="text-zinc-400">Paciente</TableHead>
                  <TableHead className="text-zinc-400">Leito</TableHead>
                  <TableHead className="text-zinc-400">Setor</TableHead>
                  <TableHead className="text-zinc-400">Dieta</TableHead>
                  <TableHead className="text-zinc-400">Restricoes</TableHead>
                  <TableHead className="text-zinc-400">Alergias</TableHead>
                  <TableHead className="text-zinc-400">Observacoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDiets.map((diet) => (
                  <TableRow key={diet.id} className="border-zinc-800 hover:bg-zinc-800/50">
                    <TableCell className="font-medium text-zinc-100">{diet.patientName}</TableCell>
                    <TableCell className="font-mono text-sm text-zinc-300">{diet.bed}</TableCell>
                    <TableCell className="text-zinc-300">{diet.ward}</TableCell>
                    <TableCell>
                      <Badge className={cn('text-xs', DIET_COLORS[diet.dietType])}>
                        {diet.dietLabel}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-zinc-300">
                      {diet.restrictions.length > 0
                        ? diet.restrictions.join(', ')
                        : <span className="text-zinc-500">-</span>}
                    </TableCell>
                    <TableCell>
                      {diet.allergies.length > 0
                        ? diet.allergies.map((a) => (
                            <Badge key={a} variant="outline" className="mr-1 border-red-500/30 text-red-400 text-xs">
                              {a}
                            </Badge>
                          ))
                        : <span className="text-zinc-500">-</span>}
                    </TableCell>
                    <TableCell className="max-w-48 truncate text-sm text-zinc-400">
                      {diet.notes || '-'}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredDiets.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-zinc-500">
                      Nenhuma dieta encontrada
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Kitchen Map Tab */}
        <TabsContent value="kitchen" className="space-y-4">
          {Object.entries(wardGroups).map(([ward, diets]) => (
            <Card key={ward} className="border-zinc-800 bg-zinc-900">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-zinc-100">
                  <span>{ward}</span>
                  <Badge variant="outline" className="border-zinc-700 text-zinc-400">
                    {diets.length} pacientes
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {diets.map((diet) => (
                    <div
                      key={diet.id}
                      className="flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-800/50 p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="truncate font-medium text-zinc-100">{diet.patientName}</p>
                          <span className="ml-2 font-mono text-xs text-zinc-500">{diet.bed}</span>
                        </div>
                        <Badge className={cn('mt-1 text-xs', DIET_COLORS[diet.dietType])}>
                          {diet.dietLabel}
                        </Badge>
                        {diet.allergies.length > 0 && (
                          <div className="mt-1 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3 text-red-400" />
                            <span className="text-xs text-red-400">{diet.allergies.join(', ')}</span>
                          </div>
                        )}
                        {diet.restrictions.length > 0 && (
                          <p className="mt-1 truncate text-xs text-zinc-500">{diet.restrictions.join(', ')}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Deliveries Tab */}
        <TabsContent value="deliveries" className="space-y-4">
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader>
              <CardTitle className="text-zinc-100">Entregas de Hoje</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800 hover:bg-zinc-800/50">
                    <TableHead className="text-zinc-400">Paciente</TableHead>
                    <TableHead className="text-zinc-400">Refeicao</TableHead>
                    <TableHead className="text-zinc-400">Status</TableHead>
                    <TableHead className="text-zinc-400">Porcao Consumida</TableHead>
                    <TableHead className="text-zinc-400">Motivo Recusa</TableHead>
                    <TableHead className="text-zinc-400">Horario</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_DELIVERIES.map((del) => {
                    const mealInfo = MEAL_LABELS[del.mealType];
                    const MealIcon = mealInfo.icon;
                    return (
                      <TableRow key={del.id} className="border-zinc-800 hover:bg-zinc-800/50">
                        <TableCell className="font-medium text-zinc-100">{del.patientName}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-zinc-300">
                            <MealIcon className="h-4 w-4 text-zinc-500" />
                            {mealInfo.label}
                          </div>
                        </TableCell>
                        <TableCell>
                          {del.refused ? (
                            <Badge className="bg-red-600 text-white text-xs">Recusado</Badge>
                          ) : del.delivered ? (
                            <Badge className="bg-green-600 text-white text-xs">Entregue</Badge>
                          ) : (
                            <Badge className="bg-zinc-600 text-white text-xs">Pendente</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {del.portionConsumed !== null ? (
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-16 overflow-hidden rounded-full bg-zinc-800">
                                <div
                                  className={cn(
                                    'h-full rounded-full',
                                    del.portionConsumed >= 75 ? 'bg-green-500' :
                                    del.portionConsumed >= 50 ? 'bg-yellow-500' :
                                    del.portionConsumed >= 25 ? 'bg-orange-500' : 'bg-red-500',
                                  )}
                                  style={{ width: `${del.portionConsumed}%` }}
                                />
                              </div>
                              <span className="text-sm text-zinc-300">{del.portionConsumed}%</span>
                            </div>
                          ) : (
                            <span className="text-zinc-500">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-zinc-400">
                          {del.refusalReason ?? '-'}
                        </TableCell>
                        <TableCell className="text-zinc-400">
                          {new Date(del.recordedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Assign Diet Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="border-zinc-700 bg-zinc-900 text-zinc-100 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Prescrever Dieta</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-zinc-300">ID do Paciente</Label>
              <Input
                className="mt-1 border-zinc-700 bg-zinc-800 text-zinc-100"
                placeholder="UUID do paciente"
                value={formPatientId}
                onChange={(e) => setFormPatientId(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-zinc-300">Tipo de Dieta</Label>
              <Select value={formDietType} onValueChange={(v) => setFormDietType(v as DietType)}>
                <SelectTrigger className="mt-1 border-zinc-700 bg-zinc-800 text-zinc-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-zinc-700 bg-zinc-900">
                  {(Object.entries(DIET_LABELS) as Array<[DietType, string]>).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-zinc-300">Restricoes (separar por virgula)</Label>
              <Input
                className="mt-1 border-zinc-700 bg-zinc-800 text-zinc-100"
                placeholder="Ex: Sodio < 2g, Sem acucar"
                value={formRestrictions}
                onChange={(e) => setFormRestrictions(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-zinc-300">Alergias Alimentares (separar por virgula)</Label>
              <Input
                className="mt-1 border-zinc-700 bg-zinc-800 text-zinc-100"
                placeholder="Ex: Camarao, Amendoim"
                value={formAllergies}
                onChange={(e) => setFormAllergies(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-zinc-300">Observacoes</Label>
              <Textarea
                className="mt-1 border-zinc-700 bg-zinc-800 text-zinc-100"
                placeholder="Observacoes adicionais..."
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setShowAssignDialog(false)}>
                Cancelar
              </Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                Prescrever
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delivery Dialog */}
      <Dialog open={showDeliveryDialog} onOpenChange={setShowDeliveryDialog}>
        <DialogContent className="border-zinc-700 bg-zinc-900 text-zinc-100 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Registrar Entrega de Refeicao</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-zinc-300">ID do Paciente</Label>
              <Input
                className="mt-1 border-zinc-700 bg-zinc-800 text-zinc-100"
                placeholder="UUID do paciente"
                value={deliveryPatientId}
                onChange={(e) => setDeliveryPatientId(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-zinc-300">Refeicao</Label>
              <Select value={deliveryMealType} onValueChange={(v) => setDeliveryMealType(v as MealType)}>
                <SelectTrigger className="mt-1 border-zinc-700 bg-zinc-800 text-zinc-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-zinc-700 bg-zinc-900">
                  {(Object.entries(MEAL_LABELS) as Array<[MealType, { label: string }]>).map(([value, { label }]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-zinc-300">Paciente recusou?</Label>
              <Select
                value={deliveryRefused ? 'yes' : 'no'}
                onValueChange={(v) => setDeliveryRefused(v === 'yes')}
              >
                <SelectTrigger className="mt-1 border-zinc-700 bg-zinc-800 text-zinc-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-zinc-700 bg-zinc-900">
                  <SelectItem value="no">Nao</SelectItem>
                  <SelectItem value="yes">Sim</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {deliveryRefused && (
              <div>
                <Label className="text-zinc-300">Motivo da Recusa</Label>
                <Input
                  className="mt-1 border-zinc-700 bg-zinc-800 text-zinc-100"
                  placeholder="Ex: Nausea, Sem apetite"
                  value={deliveryRefusalReason}
                  onChange={(e) => setDeliveryRefusalReason(e.target.value)}
                />
              </div>
            )}
            {!deliveryRefused && (
              <div>
                <Label className="text-zinc-300">Porcao Consumida (%)</Label>
                <Select value={deliveryPortion} onValueChange={setDeliveryPortion}>
                  <SelectTrigger className="mt-1 border-zinc-700 bg-zinc-800 text-zinc-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-zinc-700 bg-zinc-900">
                    <SelectItem value="25">25%</SelectItem>
                    <SelectItem value="50">50%</SelectItem>
                    <SelectItem value="75">75%</SelectItem>
                    <SelectItem value="100">100%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setShowDeliveryDialog(false)}>
                Cancelar
              </Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                Registrar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
