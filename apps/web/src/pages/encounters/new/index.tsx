import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCreateEncounter } from '@/services/encounters.service';
import { usePatients } from '@/services/patients.service';
import { useUsers } from '@/services/users.service';
import { encounterTypeLabels } from '@/lib/constants';
import type { EncounterType, Priority } from '@/types';
import { toast } from 'sonner';

const priorityOptions: { value: Priority; label: string; color: string }[] = [
  { value: 'LOW', label: 'Baixa', color: 'text-blue-400' },
  { value: 'NORMAL', label: 'Normal', color: 'text-green-400' },
  { value: 'HIGH', label: 'Alta', color: 'text-yellow-400' },
  { value: 'URGENT', label: 'Urgente', color: 'text-orange-400' },
  { value: 'EMERGENCY', label: 'Emergência', color: 'text-red-400' },
];

export default function EncounterNewPage() {
  const navigate = useNavigate();
  const createEncounter = useCreateEncounter();

  const [patientSearch, setPatientSearch] = useState('');
  const [patientId, setPatientId] = useState('');
  const [type, setType] = useState<EncounterType | ''>('');
  const [priority, setPriority] = useState<Priority>('NORMAL');
  const [scheduledAt, setScheduledAt] = useState('');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [location, setLocation] = useState('');
  const [room, setRoom] = useState('');
  const [primaryDoctorId, setPrimaryDoctorId] = useState('');

  const { data: patientsData, isLoading: loadingPatients } = usePatients({
    search: patientSearch || undefined,
    limit: 50,
  });
  const patients = patientsData?.data ?? [];

  const { data: doctors, isLoading: loadingDoctors } = useUsers({ role: 'DOCTOR' });

  const encounterTypes = Object.entries(encounterTypeLabels) as [EncounterType, string][];

  const handleSubmit = async () => {
    if (!patientId) {
      toast.error('Selecione um paciente');
      return;
    }
    if (!type) {
      toast.error('Selecione o tipo de atendimento');
      return;
    }

    try {
      const result = await createEncounter.mutateAsync({
        patientId,
        type,
        priority,
        scheduledAt: scheduledAt || undefined,
        chiefComplaint: chiefComplaint || undefined,
        location: location || undefined,
        room: room || undefined,
        primaryDoctorId: primaryDoctorId || undefined,
      });
      toast.success('Atendimento criado com sucesso');
      navigate(`/atendimentos/${result.id}`);
    } catch {
      toast.error('Erro ao criar atendimento');
    }
  };

  const selectedPatient = patients.find((p) => p.id === patientId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/atendimentos')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Novo Atendimento</h1>
          <p className="text-sm text-muted-foreground">Preencha os dados para iniciar um atendimento</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Paciente */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Paciente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Buscar paciente *</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Nome, CPF ou prontuário..."
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Paciente selecionado *</Label>
              <Select value={patientId} onValueChange={setPatientId}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingPatients ? 'Carregando...' : 'Selecione o paciente'} />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} {p.cpf ? `— ${p.cpf}` : ''}
                    </SelectItem>
                  ))}
                  {patients.length === 0 && !loadingPatients && (
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                      Nenhum paciente encontrado
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>

            {selectedPatient && (
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm space-y-1">
                <p><strong>{selectedPatient.name}</strong></p>
                {selectedPatient.cpf && <p className="text-muted-foreground">CPF: {selectedPatient.cpf}</p>}
                {selectedPatient.birthDate && (
                  <p className="text-muted-foreground">
                    Nascimento: {new Date(selectedPatient.birthDate).toLocaleDateString('pt-BR')}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tipo e Prioridade */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tipo de Atendimento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo *</Label>
              <Select value={type} onValueChange={(v) => setType(v as EncounterType)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {encounterTypes.map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <span className={opt.color}>{opt.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Médico responsável</Label>
              <Select value={primaryDoctorId} onValueChange={setPrimaryDoctorId}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingDoctors ? 'Carregando...' : 'Selecione (opcional)'} />
                </SelectTrigger>
                <SelectContent>
                  {(doctors ?? []).map((doc) => (
                    <SelectItem key={doc.id} value={doc.id}>
                      Dr(a). {doc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Detalhes */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Detalhes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label>Data/Hora agendamento</Label>
                <Input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Local</Label>
                <Input
                  placeholder="Ex: Ala B, Ambulatório 3"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Sala</Label>
                <Input
                  placeholder="Ex: Sala 12"
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                />
              </div>

              <div className="space-y-2 sm:col-span-2 lg:col-span-3">
                <Label>Queixa principal</Label>
                <Textarea
                  placeholder="Descreva brevemente o motivo do atendimento..."
                  value={chiefComplaint}
                  onChange={(e) => setChiefComplaint(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => navigate('/atendimentos')}>
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={createEncounter.isPending || !patientId || !type}
          className="bg-teal-600 hover:bg-teal-700"
        >
          <Save className="mr-2 h-4 w-4" />
          {createEncounter.isPending ? 'Criando...' : 'Criar Atendimento'}
        </Button>
      </div>
    </div>
  );
}
