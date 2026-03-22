import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Mic } from 'lucide-react';
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
import { useCreatePatient } from '@/services/patients.service';
import { toast } from 'sonner';

const BLOOD_TYPES = ['A_POSITIVE', 'A_NEGATIVE', 'B_POSITIVE', 'B_NEGATIVE', 'AB_POSITIVE', 'AB_NEGATIVE', 'O_POSITIVE', 'O_NEGATIVE'] as const;
const GENDERS = [
  { value: 'MALE', label: 'Masculino' },
  { value: 'FEMALE', label: 'Feminino' },
  { value: 'OTHER', label: 'Outro' },
] as const;

const BLOOD_TYPE_LABELS: Record<string, string> = {
  A_POSITIVE: 'A+', A_NEGATIVE: 'A-',
  B_POSITIVE: 'B+', B_NEGATIVE: 'B-',
  AB_POSITIVE: 'AB+', AB_NEGATIVE: 'AB-',
  O_POSITIVE: 'O+', O_NEGATIVE: 'O-',
};

interface PatientForm {
  name: string;
  cpf: string;
  dateOfBirth: string;
  gender: string;
  bloodType: string;
  email: string;
  phone: string;
  mobile: string;
  motherName: string;
  insuranceProvider: string;
  insurancePlan: string;
  insuranceNumber: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelation: string;
  observations: string;
}

const initialForm: PatientForm = {
  name: '', cpf: '', dateOfBirth: '', gender: '', bloodType: '',
  email: '', phone: '', mobile: '', motherName: '',
  insuranceProvider: '', insurancePlan: '', insuranceNumber: '',
  address: '', city: '', state: '', zipCode: '',
  emergencyContactName: '', emergencyContactPhone: '', emergencyContactRelation: '',
  observations: '',
};

function formatCpfInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function formatPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export default function PatientNewPage() {
  const navigate = useNavigate();
  const createPatient = useCreatePatient();
  const [form, setForm] = useState<PatientForm>(initialForm);
  const [errors, setErrors] = useState<Partial<Record<keyof PatientForm, string>>>({});

  const updateField = (field: keyof PatientForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof PatientForm, string>> = {};
    if (!form.name.trim()) newErrors.name = 'Nome é obrigatório';
    if (!form.cpf.trim()) newErrors.cpf = 'CPF é obrigatório';
    else if (form.cpf.replace(/\D/g, '').length !== 11) newErrors.cpf = 'CPF inválido';
    if (!form.dateOfBirth) newErrors.dateOfBirth = 'Data de nascimento é obrigatória';
    if (!form.gender) newErrors.gender = 'Sexo é obrigatório';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      cpf: form.cpf.replace(/\D/g, ''),
      dateOfBirth: form.dateOfBirth,
      gender: form.gender,
    };

    if (form.bloodType) payload.bloodType = form.bloodType;
    if (form.email) payload.email = form.email;
    if (form.phone) payload.phone = form.phone.replace(/\D/g, '');
    if (form.mobile) payload.mobile = form.mobile.replace(/\D/g, '');
    if (form.motherName) payload.motherName = form.motherName;
    if (form.insuranceProvider) payload.insuranceProvider = form.insuranceProvider;
    if (form.insurancePlan) payload.insurancePlan = form.insurancePlan;
    if (form.insuranceNumber) payload.insuranceNumber = form.insuranceNumber;
    if (form.emergencyContactName) payload.emergencyContactName = form.emergencyContactName;
    if (form.emergencyContactPhone) payload.emergencyContactPhone = form.emergencyContactPhone.replace(/\D/g, '');
    if (form.emergencyContactRelation) payload.emergencyContactRelation = form.emergencyContactRelation;
    if (form.observations) payload.observations = form.observations;

    if (form.address || form.city || form.state || form.zipCode) {
      payload.address = {
        street: form.address,
        city: form.city,
        state: form.state,
        zipCode: form.zipCode.replace(/\D/g, ''),
      };
    }

    try {
      const result = await createPatient.mutateAsync(payload as never);
      toast.success('Paciente cadastrado com sucesso!');
      navigate(`/pacientes/${result.id}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? 'Erro ao cadastrar paciente');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/pacientes')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Novo Paciente</h1>
      </div>

      {/* Dados Pessoais */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Dados Pessoais</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="sm:col-span-2 lg:col-span-3">
            <Label htmlFor="name">Nome Completo *</Label>
            <div className="relative mt-1">
              <Input
                id="name"
                value={form.name}
                onChange={e => updateField('name', e.target.value)}
                placeholder="Nome completo do paciente"
                className={errors.name ? 'border-red-500' : ''}
              />
              <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7">
                <Mic className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </div>
            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
          </div>

          <div>
            <Label htmlFor="cpf">CPF *</Label>
            <Input
              id="cpf"
              value={form.cpf}
              onChange={e => updateField('cpf', formatCpfInput(e.target.value))}
              placeholder="000.000.000-00"
              className={errors.cpf ? 'border-red-500' : ''}
            />
            {errors.cpf && <p className="mt-1 text-xs text-red-500">{errors.cpf}</p>}
          </div>

          <div>
            <Label htmlFor="dateOfBirth">Data de Nascimento *</Label>
            <Input
              id="dateOfBirth"
              type="date"
              value={form.dateOfBirth}
              onChange={e => updateField('dateOfBirth', e.target.value)}
              className={errors.dateOfBirth ? 'border-red-500' : ''}
            />
            {errors.dateOfBirth && <p className="mt-1 text-xs text-red-500">{errors.dateOfBirth}</p>}
          </div>

          <div>
            <Label>Sexo *</Label>
            <Select value={form.gender} onValueChange={v => updateField('gender', v)}>
              <SelectTrigger className={errors.gender ? 'border-red-500' : ''}>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {GENDERS.map(g => (
                  <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.gender && <p className="mt-1 text-xs text-red-500">{errors.gender}</p>}
          </div>

          <div>
            <Label>Tipo Sanguíneo</Label>
            <Select value={form.bloodType} onValueChange={v => updateField('bloodType', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {BLOOD_TYPES.map(bt => (
                  <SelectItem key={bt} value={bt}>{BLOOD_TYPE_LABELS[bt]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="motherName">Nome da Mãe</Label>
            <Input
              id="motherName"
              value={form.motherName}
              onChange={e => updateField('motherName', e.target.value)}
              placeholder="Nome completo da mãe"
            />
          </div>
        </CardContent>
      </Card>

      {/* Contato */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Contato</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={e => updateField('email', e.target.value)}
              placeholder="email@exemplo.com"
            />
          </div>
          <div>
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              value={form.phone}
              onChange={e => updateField('phone', formatPhoneInput(e.target.value))}
              placeholder="(00) 0000-0000"
            />
          </div>
          <div>
            <Label htmlFor="mobile">Celular</Label>
            <Input
              id="mobile"
              value={form.mobile}
              onChange={e => updateField('mobile', formatPhoneInput(e.target.value))}
              placeholder="(00) 00000-0000"
            />
          </div>
        </CardContent>
      </Card>

      {/* Endereço */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Endereço</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-4">
            <Label htmlFor="address">Logradouro</Label>
            <Input
              id="address"
              value={form.address}
              onChange={e => updateField('address', e.target.value)}
              placeholder="Rua, número, complemento"
            />
          </div>
          <div>
            <Label htmlFor="city">Cidade</Label>
            <Input id="city" value={form.city} onChange={e => updateField('city', e.target.value)} />
          </div>
          <div>
            <Label htmlFor="state">Estado</Label>
            <Input id="state" value={form.state} onChange={e => updateField('state', e.target.value)} placeholder="SP" />
          </div>
          <div>
            <Label htmlFor="zipCode">CEP</Label>
            <Input id="zipCode" value={form.zipCode} onChange={e => updateField('zipCode', e.target.value)} placeholder="00000-000" />
          </div>
        </CardContent>
      </Card>

      {/* Convênio */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Convênio</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="insuranceProvider">Operadora</Label>
            <Input
              id="insuranceProvider"
              value={form.insuranceProvider}
              onChange={e => updateField('insuranceProvider', e.target.value)}
              placeholder="Unimed, SulAmérica, etc."
            />
          </div>
          <div>
            <Label htmlFor="insurancePlan">Plano</Label>
            <Input
              id="insurancePlan"
              value={form.insurancePlan}
              onChange={e => updateField('insurancePlan', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="insuranceNumber">Número da Carteirinha</Label>
            <Input
              id="insuranceNumber"
              value={form.insuranceNumber}
              onChange={e => updateField('insuranceNumber', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Contato de Emergência */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Contato de Emergência</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="emergencyContactName">Nome</Label>
            <Input
              id="emergencyContactName"
              value={form.emergencyContactName}
              onChange={e => updateField('emergencyContactName', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="emergencyContactPhone">Telefone</Label>
            <Input
              id="emergencyContactPhone"
              value={form.emergencyContactPhone}
              onChange={e => updateField('emergencyContactPhone', formatPhoneInput(e.target.value))}
              placeholder="(00) 00000-0000"
            />
          </div>
          <div>
            <Label htmlFor="emergencyContactRelation">Parentesco</Label>
            <Input
              id="emergencyContactRelation"
              value={form.emergencyContactRelation}
              onChange={e => updateField('emergencyContactRelation', e.target.value)}
              placeholder="Cônjuge, Filho(a), etc."
            />
          </div>
        </CardContent>
      </Card>

      {/* Observações */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Observações</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={form.observations}
            onChange={e => updateField('observations', e.target.value)}
            placeholder="Observações gerais sobre o paciente..."
            rows={4}
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3 pb-6">
        <Button variant="outline" onClick={() => navigate('/pacientes')}>
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={createPatient.isPending}
          className="bg-teal-600 hover:bg-teal-500"
        >
          <Save className="mr-2 h-4 w-4" />
          {createPatient.isPending ? 'Salvando...' : 'Cadastrar Paciente'}
        </Button>
      </div>
    </div>
  );
}
