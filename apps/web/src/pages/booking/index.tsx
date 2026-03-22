import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  getSpecialties,
  getDoctors,
  getAvailableSlots,
  createAppointment,
  type DoctorInfo,
  type SlotInfo,
} from '@/services/booking.service';

type Step = 'specialty' | 'doctor' | 'datetime' | 'patient' | 'confirm' | 'done';

// Friendly names for specialty enums
const SPECIALTY_LABELS: Record<string, string> = {
  GENERAL_PRACTICE: 'Clínica Geral',
  INTERNAL_MEDICINE: 'Medicina Interna',
  CARDIOLOGY: 'Cardiologia',
  DERMATOLOGY: 'Dermatologia',
  ENDOCRINOLOGY: 'Endocrinologia',
  GASTROENTEROLOGY: 'Gastroenterologia',
  GERIATRICS: 'Geriatria',
  GYNECOLOGY: 'Ginecologia',
  HEMATOLOGY: 'Hematologia',
  INFECTIOUS_DISEASE: 'Infectologia',
  NEPHROLOGY: 'Nefrologia',
  NEUROLOGY: 'Neurologia',
  OBSTETRICS: 'Obstetrícia',
  ONCOLOGY: 'Oncologia',
  OPHTHALMOLOGY: 'Oftalmologia',
  ORTHOPEDICS: 'Ortopedia',
  OTOLARYNGOLOGY: 'Otorrinolaringologia',
  PEDIATRICS: 'Pediatria',
  PNEUMOLOGY: 'Pneumologia',
  PSYCHIATRY: 'Psiquiatria',
  RADIOLOGY: 'Radiologia',
  RHEUMATOLOGY: 'Reumatologia',
  UROLOGY: 'Urologia',
  ANESTHESIOLOGY: 'Anestesiologia',
  EMERGENCY_MEDICINE: 'Medicina de Emergência',
  FAMILY_MEDICINE: 'Medicina de Família',
  INTENSIVE_CARE: 'Terapia Intensiva',
  PATHOLOGY: 'Patologia',
  PHYSICAL_MEDICINE: 'Medicina Física',
  PLASTIC_SURGERY: 'Cirurgia Plástica',
  SPORTS_MEDICINE: 'Medicina Esportiva',
  THORACIC_SURGERY: 'Cirurgia Torácica',
  VASCULAR_SURGERY: 'Cirurgia Vascular',
  NEUROSURGERY: 'Neurocirurgia',
  ALLERGY_IMMUNOLOGY: 'Alergia e Imunologia',
};

function getSpecialtyLabel(specialty: string): string {
  return SPECIALTY_LABELS[specialty] ?? specialty;
}

function formatCpf(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export default function BookingPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const slug = tenantSlug ?? '';

  const [step, setStep] = useState<Step>('specialty');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [doctors, setDoctors] = useState<DoctorInfo[]>([]);
  const [slots, setSlots] = useState<SlotInfo[]>([]);

  // Selections
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorInfo | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');

  // Patient info
  const [patientName, setPatientName] = useState('');
  const [patientCpf, setPatientCpf] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [insuranceProvider, setInsuranceProvider] = useState('');

  // Result
  const [bookingId, setBookingId] = useState('');

  // Load specialties on mount
  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    getSpecialties(slug)
      .then(setSpecialties)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Erro ao carregar especialidades'))
      .finally(() => setLoading(false));
  }, [slug]);

  const handleSelectSpecialty = useCallback(
    (specialty: string) => {
      setSelectedSpecialty(specialty);
      setLoading(true);
      setError(null);
      getDoctors(slug, specialty)
        .then((d) => {
          setDoctors(d);
          setStep('doctor');
        })
        .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Erro ao carregar médicos'))
        .finally(() => setLoading(false));
    },
    [slug],
  );

  const handleSelectDoctor = useCallback((doctor: DoctorInfo) => {
    setSelectedDoctor(doctor);
    setStep('datetime');
  }, []);

  const handleDateChange = useCallback(
    (date: string) => {
      setSelectedDate(date);
      setSelectedTime('');
      if (!selectedDoctor) return;
      setLoading(true);
      setError(null);
      getAvailableSlots(slug, selectedDoctor.id, date)
        .then(setSlots)
        .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Erro ao carregar horários'))
        .finally(() => setLoading(false));
    },
    [slug, selectedDoctor],
  );

  const handleConfirm = useCallback(async () => {
    if (!selectedDoctor) return;
    setLoading(true);
    setError(null);
    try {
      const result = await createAppointment(slug, {
        doctorId: selectedDoctor.id,
        date: selectedDate,
        time: selectedTime,
        patientName,
        patientCpf,
        patientPhone,
        insuranceProvider: insuranceProvider || undefined,
      });
      setBookingId(result.id);
      setStep('done');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao agendar consulta');
    } finally {
      setLoading(false);
    }
  }, [slug, selectedDoctor, selectedDate, selectedTime, patientName, patientCpf, patientPhone, insuranceProvider]);

  const canProceedToConfirm =
    patientName.trim().length > 0 &&
    patientCpf.replace(/\D/g, '').length === 11 &&
    patientPhone.replace(/\D/g, '').length >= 10;

  // Minimum date: today
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-sm">
            V
          </div>
          <div>
            <h1 className="text-lg font-semibold">Agendamento Online</h1>
            <p className="text-xs text-zinc-400">VoxPEP</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {(['specialty', 'doctor', 'datetime', 'patient', 'confirm'] as const).map((s, i) => {
            const labels = ['Especialidade', 'Médico', 'Data/Hora', 'Dados', 'Confirmar'];
            const stepOrder = ['specialty', 'doctor', 'datetime', 'patient', 'confirm'];
            const currentIdx = stepOrder.indexOf(step);
            const isActive = i <= currentIdx;
            return (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div
                  className={`h-2 flex-1 rounded-full transition-colors ${
                    isActive ? 'bg-emerald-500' : 'bg-zinc-800'
                  }`}
                />
                <span
                  className={`text-xs hidden sm:inline ${
                    isActive ? 'text-emerald-400' : 'text-zinc-600'
                  }`}
                >
                  {labels[i]}
                </span>
              </div>
            );
          })}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Step 1: Specialty */}
        {step === 'specialty' && !loading && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Escolha a especialidade</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {specialties.map((s) => (
                <Card
                  key={s}
                  className="cursor-pointer hover:border-emerald-500 transition-colors bg-zinc-900 border-zinc-800"
                  onClick={() => handleSelectSpecialty(s)}
                >
                  <CardContent className="p-4 text-center">
                    <p className="text-sm font-medium">{getSpecialtyLabel(s)}</p>
                  </CardContent>
                </Card>
              ))}
              {specialties.length === 0 && (
                <p className="col-span-full text-zinc-500 text-center py-8">
                  Nenhuma especialidade disponível.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Doctor */}
        {step === 'doctor' && !loading && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep('specialty')}
              >
                &larr; Voltar
              </Button>
              <h2 className="text-xl font-semibold">Escolha o médico</h2>
            </div>
            <div className="grid gap-3">
              {doctors.map((d) => (
                <Card
                  key={d.id}
                  className="cursor-pointer hover:border-emerald-500 transition-colors bg-zinc-900 border-zinc-800"
                  onClick={() => handleSelectDoctor(d)}
                >
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-emerald-900/50 flex items-center justify-center text-emerald-400 font-semibold">
                      {d.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium">{d.name}</p>
                      <p className="text-sm text-zinc-400">
                        {getSpecialtyLabel(d.specialty)} &middot; CRM {d.crm}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {doctors.length === 0 && (
                <p className="text-zinc-500 text-center py-8">
                  Nenhum médico disponível para esta especialidade.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Date/Time */}
        {step === 'datetime' && !loading && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep('doctor')}
              >
                &larr; Voltar
              </Button>
              <h2 className="text-xl font-semibold">Escolha data e horário</h2>
            </div>

            <div className="mb-6">
              <Label htmlFor="booking-date" className="text-sm text-zinc-400 mb-2 block">
                Data da consulta
              </Label>
              <Input
                id="booking-date"
                type="date"
                min={today}
                value={selectedDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="max-w-xs bg-zinc-900 border-zinc-700"
              />
            </div>

            {selectedDate && slots.length > 0 && (
              <div>
                <p className="text-sm text-zinc-400 mb-3">Horários disponíveis:</p>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {slots.map((s) => (
                    <Button
                      key={s.time}
                      variant={selectedTime === s.time ? 'default' : 'outline'}
                      size="sm"
                      disabled={!s.available}
                      className={
                        selectedTime === s.time
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : s.available
                            ? 'border-zinc-700 hover:border-emerald-500'
                            : 'opacity-40'
                      }
                      onClick={() => setSelectedTime(s.time)}
                    >
                      {s.time}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {selectedTime && (
              <div className="mt-6">
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => setStep('patient')}
                >
                  Continuar
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Patient info */}
        {step === 'patient' && !loading && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep('datetime')}
              >
                &larr; Voltar
              </Button>
              <h2 className="text-xl font-semibold">Seus dados</h2>
            </div>

            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-6 space-y-4">
                <div>
                  <Label htmlFor="patient-name">Nome completo *</Label>
                  <Input
                    id="patient-name"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="Ex: Maria da Silva"
                    className="bg-zinc-800 border-zinc-700 mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="patient-cpf">CPF *</Label>
                  <Input
                    id="patient-cpf"
                    value={patientCpf}
                    onChange={(e) => setPatientCpf(formatCpf(e.target.value))}
                    placeholder="000.000.000-00"
                    className="bg-zinc-800 border-zinc-700 mt-1"
                    maxLength={14}
                  />
                </div>
                <div>
                  <Label htmlFor="patient-phone">Telefone (WhatsApp) *</Label>
                  <Input
                    id="patient-phone"
                    value={patientPhone}
                    onChange={(e) => setPatientPhone(formatPhone(e.target.value))}
                    placeholder="(00) 00000-0000"
                    className="bg-zinc-800 border-zinc-700 mt-1"
                    maxLength={15}
                  />
                </div>
                <div>
                  <Label htmlFor="patient-insurance">Convênio (opcional)</Label>
                  <Input
                    id="patient-insurance"
                    value={insuranceProvider}
                    onChange={(e) => setInsuranceProvider(e.target.value)}
                    placeholder="Ex: Unimed, SulAmérica..."
                    className="bg-zinc-800 border-zinc-700 mt-1"
                  />
                </div>

                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 w-full mt-2"
                  disabled={!canProceedToConfirm}
                  onClick={() => setStep('confirm')}
                >
                  Revisar agendamento
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 5: Confirm */}
        {step === 'confirm' && !loading && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep('patient')}
              >
                &larr; Voltar
              </Button>
              <h2 className="text-xl font-semibold">Confirmar agendamento</h2>
            </div>

            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-lg">Resumo do agendamento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Especialidade</span>
                  <span>{getSpecialtyLabel(selectedSpecialty)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Médico(a)</span>
                  <span>{selectedDoctor?.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Data</span>
                  <span>
                    {selectedDate
                      ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR')
                      : ''}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Horário</span>
                  <span>{selectedTime}</span>
                </div>
                <hr className="border-zinc-800" />
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Paciente</span>
                  <span>{patientName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">CPF</span>
                  <span>{patientCpf}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Telefone</span>
                  <span>{patientPhone}</span>
                </div>
                {insuranceProvider && (
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">Convênio</span>
                    <span>{insuranceProvider}</span>
                  </div>
                )}

                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 w-full mt-4"
                  onClick={handleConfirm}
                >
                  Confirmar agendamento
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 6: Done */}
        {step === 'done' && (
          <div className="text-center py-12">
            <div className="mx-auto h-16 w-16 rounded-full bg-emerald-600/20 flex items-center justify-center mb-4">
              <svg className="h-8 w-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold mb-2">Agendamento confirmado!</h2>
            <p className="text-zinc-400 mb-1">
              Sua consulta foi agendada com sucesso.
            </p>
            <p className="text-xs text-zinc-500 mb-6">
              Protocolo: {bookingId}
            </p>
            <p className="text-sm text-zinc-400">
              Você receberá uma confirmação por WhatsApp em breve.
            </p>
          </div>
        )}
      </main>

      <footer className="border-t border-zinc-800 py-4 mt-12">
        <p className="text-center text-xs text-zinc-600">
          Powered by VoxPEP &mdash; Prontuário Eletrônico Inteligente
        </p>
      </footer>
    </div>
  );
}
