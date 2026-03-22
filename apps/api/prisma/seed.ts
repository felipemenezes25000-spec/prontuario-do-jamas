/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * VoxPEP — Comprehensive Development Seed Data
 *
 * Run: npx prisma db seed
 *
 * Creates realistic Brazilian hospital data for development:
 * - 1 Tenant (Hospital Sao Lucas)
 * - 8 Users (doctors, nurses, pharmacist, admin, receptionist)
 * - 10 Patients with rich clinical histories
 * - 15+ Encounters
 * - Prescriptions, Vitals, Clinical Notes
 * - Beds, Appointments, Alerts, Document Templates
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

// ─── Pre-generated UUIDs for referential integrity ──────────────────────────

const IDS = {
  // Tenant
  tenant: uuidv4(),

  // Users
  drCarlos: uuidv4(),
  drAna: uuidv4(),
  drRoberto: uuidv4(),
  enfPatricia: uuidv4(),
  enfJoao: uuidv4(),
  farmMarina: uuidv4(),
  admRicardo: uuidv4(),
  recepFernanda: uuidv4(),

  // Patients
  maria: uuidv4(),
  jose: uuidv4(),
  anaBeatriz: uuidv4(),
  pedro: uuidv4(),
  lucia: uuidv4(),
  gabriel: uuidv4(),
  francisco: uuidv4(),
  camila: uuidv4(),
  rafael: uuidv4(),
  isabella: uuidv4(),

  // Encounters
  enc_maria_cardio: uuidv4(),
  enc_maria_emergency: uuidv4(),
  enc_jose_geral: uuidv4(),
  enc_pedro_uti: uuidv4(),
  enc_ana_prenatal: uuidv4(),
  enc_gabriel_asma: uuidv4(),
  enc_lucia_onco: uuidv4(),
  enc_francisco_neuro: uuidv4(),
  enc_camila_psiq: uuidv4(),
  enc_rafael_infecto: uuidv4(),
  enc_isabella_neo: uuidv4(),
  enc_maria_retorno: uuidv4(),
  enc_jose_exame: uuidv4(),
  enc_pedro_cirurgia: uuidv4(),
  enc_gabriel_retorno: uuidv4(),

  // Prescriptions
  rx_maria_cronica: uuidv4(),
  rx_pedro_uti: uuidv4(),
  rx_gabriel_asma: uuidv4(),
  rx_camila_psiq: uuidv4(),
  rx_rafael_tarv: uuidv4(),

  // Document Templates
  tpl_receita_simples: uuidv4(),
  tpl_receita_especial: uuidv4(),
  tpl_atestado: uuidv4(),
  tpl_consentimento: uuidv4(),
  tpl_resumo_alta: uuidv4(),
} as const;

// ─── Helper: generate fake but valid-format CPF ─────────────────────────────

function fakeCpf(): string {
  const rand = () => Math.floor(Math.random() * 10);
  const digits = Array.from({ length: 9 }, rand);

  // First check digit
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += digits[i] * (10 - i);
  let d1 = 11 - (sum % 11);
  if (d1 >= 10) d1 = 0;
  digits.push(d1);

  // Second check digit
  sum = 0;
  for (let i = 0; i < 10; i++) sum += digits[i] * (11 - i);
  let d2 = 11 - (sum % 11);
  if (d2 >= 10) d2 = 0;
  digits.push(d2);

  const s = digits.join('');
  return `${s.slice(0, 3)}.${s.slice(3, 6)}.${s.slice(6, 9)}-${s.slice(9, 11)}`;
}

// ─── Helper: relative dates ─────────────────────────────────────────────────

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function hoursAgo(n: number): Date {
  const d = new Date();
  d.setHours(d.getHours() - n);
  return d;
}

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

function dateOfBirth(yearsAgo: number, monthOffset = 0): Date {
  const d = new Date();
  d.setFullYear(d.getFullYear() - yearsAgo);
  d.setMonth(d.getMonth() + monthOffset);
  return d;
}

// MRN counter
let mrnCounter = 1;
function nextMrn(): string {
  return `PRN-${new Date().getFullYear()}-${String(mrnCounter++).padStart(5, '0')}`;
}

// ─── Main Seed ──────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('🏥 VoxPEP — Seeding development database...\n');

  const passwordHash = await bcrypt.hash('VoxPep@2024!', 12);

  // ─── 1. Tenant ──────────────────────────────────────────────────────────

  console.log('  → Creating tenant...');
  await prisma.tenant.create({
    data: {
      id: IDS.tenant,
      name: 'Hospital São Lucas',
      slug: 'hospital-sao-lucas',
      cnpj: '12.345.678/0001-90',
      type: 'HOSPITAL',
      address: 'Rua Dr. Arnaldo, 455, Bloco A',
      city: 'São Paulo',
      state: 'SP',
      cep: '01246-903',
      phone: '(11) 3456-7890',
      email: 'contato@hospitalsaolucas.com.br',
      sbisLevel: 'NGS2',
      maxBeds: 100,
      maxUsers: 100,
      plan: 'PRO',
      isActive: true,
      settings: {
        prescriptionDefaults: {
          defaultRoute: 'ORAL',
          requireDoubleCheck: true,
          requirePharmacistValidation: true,
          allowVerbalOrders: true,
          verbalOrderExpirationHours: 24,
        },
        voiceSettings: {
          defaultLanguage: 'pt-BR',
          defaultContext: 'ANAMNESIS',
          enableAiSuggestions: true,
          enableRealTimeTranscription: true,
          silenceTimeoutSeconds: 3,
          maxRecordingMinutes: 15,
        },
        alertSettings: {
          enableDrugInteractionCheck: true,
          enableDoseCheck: true,
          enableDuplicateTherapyCheck: true,
          enableAllergyCheck: true,
          enableCriticalResultAlerts: true,
          enableSepsisScreening: true,
          enableDeteriorationScore: true,
        },
        shiftConfig: {
          morningStart: '07:00',
          morningEnd: '13:00',
          afternoonStart: '13:00',
          afternoonEnd: '19:00',
          nightStart: '19:00',
          nightEnd: '07:00',
        },
        defaultTriageProtocol: 'MANCHESTER',
        defaultShift: 'MORNING',
        timezone: 'America/Sao_Paulo',
        dateFormat: 'DD/MM/YYYY',
        requireDigitalSignature: true,
        sessionTimeoutMinutes: 30,
        maxLoginAttempts: 5,
        passwordExpirationDays: 90,
        enableTelemedicine: true,
        enableWhatsAppNotifications: false,
      },
    },
  });

  // ─── 2. Users ───────────────────────────────────────────────────────────

  console.log('  → Creating users...');

  const users = [
    {
      id: IDS.drCarlos,
      email: 'carlos.mendes@hospitalsaolucas.com.br',
      name: 'Dr. Carlos Eduardo Mendes',
      cpf: fakeCpf(),
      role: 'DOCTOR' as const,
      phone: '(11) 99876-5432',
    },
    {
      id: IDS.drAna,
      email: 'ana.souza@hospitalsaolucas.com.br',
      name: 'Dra. Ana Maria Souza',
      cpf: fakeCpf(),
      role: 'DOCTOR' as const,
      phone: '(11) 99765-4321',
    },
    {
      id: IDS.drRoberto,
      email: 'roberto.lima@hospitalsaolucas.com.br',
      name: 'Dr. Roberto Lima',
      cpf: fakeCpf(),
      role: 'DOCTOR' as const,
      phone: '(11) 99654-3210',
    },
    {
      id: IDS.enfPatricia,
      email: 'patricia.santos@hospitalsaolucas.com.br',
      name: 'Enf. Patrícia Santos',
      cpf: fakeCpf(),
      role: 'NURSE' as const,
      phone: '(11) 99543-2109',
    },
    {
      id: IDS.enfJoao,
      email: 'joao.silva@hospitalsaolucas.com.br',
      name: 'Enf. João Silva',
      cpf: fakeCpf(),
      role: 'NURSE_TECH' as const,
      phone: '(11) 99432-1098',
    },
    {
      id: IDS.farmMarina,
      email: 'marina.costa@hospitalsaolucas.com.br',
      name: 'Farm. Marina Costa',
      cpf: fakeCpf(),
      role: 'PHARMACIST' as const,
      phone: '(11) 99321-0987',
    },
    {
      id: IDS.admRicardo,
      email: 'ricardo.oliveira@hospitalsaolucas.com.br',
      name: 'Adm. Ricardo Oliveira',
      cpf: fakeCpf(),
      role: 'ADMIN' as const,
      phone: '(11) 99210-9876',
    },
    {
      id: IDS.recepFernanda,
      email: 'fernanda.alves@hospitalsaolucas.com.br',
      name: 'Recep. Fernanda Alves',
      cpf: fakeCpf(),
      role: 'RECEPTIONIST' as const,
      phone: '(11) 99109-8765',
    },
  ];

  for (const u of users) {
    await prisma.user.create({
      data: {
        id: u.id,
        tenantId: IDS.tenant,
        email: u.email,
        name: u.name,
        cpf: u.cpf,
        passwordHash,
        role: u.role,
        phone: u.phone,
        isActive: true,
      },
    });
  }

  // Doctor profiles
  await prisma.doctorProfile.create({
    data: {
      id: uuidv4(),
      userId: IDS.drCarlos,
      crm: '12345',
      crmState: 'SP',
      specialty: 'CARDIOLOGY',
      subSpecialties: ['Cardiologia Intervencionista'],
      consultationDuration: 30,
      teleconsultationEnabled: false,
      favoritesMedications: { list: ['losartana', 'atenolol', 'AAS', 'sinvastatina', 'clopidogrel'] },
      favoritesExams: { list: ['ECG', 'ecocardiograma', 'teste ergométrico', 'holter 24h'] },
      favoritesDiagnoses: { list: ['I10', 'I25.1', 'I48', 'I50.0'] },
      prescriptionHeader: 'Dr. Carlos Eduardo Mendes\nCRM 12345-SP\nCardiologia',
    },
  });

  await prisma.doctorProfile.create({
    data: {
      id: uuidv4(),
      userId: IDS.drAna,
      crm: '67890',
      crmState: 'SP',
      specialty: 'FAMILY_MEDICINE',
      subSpecialties: ['Medicina de Família e Comunidade'],
      consultationDuration: 20,
      teleconsultationEnabled: true,
      favoritesMedications: { list: ['amoxicilina', 'ibuprofeno', 'omeprazol', 'dipirona', 'loratadina'] },
      favoritesExams: { list: ['hemograma', 'glicemia jejum', 'perfil lipídico', 'TSH'] },
      favoritesDiagnoses: { list: ['J06.9', 'K21.0', 'M54.5', 'J45.0'] },
      prescriptionHeader: 'Dra. Ana Maria Souza\nCRM 67890-SP\nMedicina de Família',
    },
  });

  await prisma.doctorProfile.create({
    data: {
      id: uuidv4(),
      userId: IDS.drRoberto,
      crm: '11111',
      crmState: 'SP',
      specialty: 'GENERAL_PRACTICE',
      subSpecialties: ['Cirurgia Geral'],
      consultationDuration: 30,
      teleconsultationEnabled: false,
      prescriptionHeader: 'Dr. Roberto Lima\nCRM 11111-SP\nCirurgia Geral',
    },
  });

  // Nurse profile
  await prisma.nurseProfile.create({
    data: {
      id: uuidv4(),
      userId: IDS.enfPatricia,
      coren: '22222',
      corenState: 'SP',
      canPrescribeNursing: true,
      certifications: [
        { name: 'ACLS', issuedAt: '2023-06-15', expiresAt: '2025-06-15' },
        { name: 'PALS', issuedAt: '2023-08-20', expiresAt: '2025-08-20' },
        { name: 'Enfermagem em UTI', issuedAt: '2022-01-10', expiresAt: null },
      ],
      specialization: 'UTI Adulto',
    },
  });

  // ─── 3. Patients ────────────────────────────────────────────────────────

  console.log('  → Creating patients...');

  interface PatientData {
    id: string;
    fullName: string;
    cpf: string;
    birthDate: Date;
    gender: 'M' | 'F';
    bloodType?: string;
    maritalStatus?: string;
    phone: string;
    email: string | null;
    address?: string;
    addressNumber?: string;
    addressComplement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    cep?: string;
    insuranceProvider?: string;
    insurancePlan?: string;
    insuranceNumber?: string;
    insuranceExpiry?: Date;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    emergencyContactRelation?: string;
    tags: string[];
    riskScore?: number;
    motherName?: string;
    occupation?: string;
    education?: string;
  }

  const patients: PatientData[] = [
    // 1. Maria da Silva Santos — 62F, DM2 + HAS, high risk
    {
      id: IDS.maria,
      fullName: 'Maria da Silva Santos',
      cpf: fakeCpf(),
      birthDate: dateOfBirth(62),
      gender: 'F',
      bloodType: 'O_POS',
      maritalStatus: 'WIDOWED',
      phone: '(11) 98765-4321',
      email: 'maria.santos@email.com',
      address: 'Rua Augusta',
      addressNumber: '1200',
      addressComplement: 'Apto 45',
      neighborhood: 'Consolação',
      city: 'São Paulo',
      state: 'SP',
      cep: '01304-001',
      insuranceProvider: 'Bradesco Saúde',
      insurancePlan: 'Empresarial Top',
      insuranceNumber: 'BS-2024-987654',
      insuranceExpiry: new Date('2025-12-31'),
      emergencyContactName: 'João Santos Filho',
      emergencyContactPhone: '(11) 97654-3210',
      emergencyContactRelation: 'Filho',
      tags: ['crônico', 'polimedicado'],
      riskScore: 78,
      motherName: 'Antônia da Silva',
      occupation: 'Aposentada (ex-professora)',
      education: 'Superior completo',
    },

    // 2. Jose Carlos Pereira — 45M, healthy
    {
      id: IDS.jose,
      fullName: 'José Carlos Pereira',
      cpf: fakeCpf(),
      birthDate: dateOfBirth(45),
      gender: 'M',
      bloodType: 'A_POS',
      maritalStatus: 'MARRIED',
      phone: '(11) 98654-3210',
      email: 'jose.pereira@email.com',
      address: 'Av. Paulista',
      addressNumber: '900',
      addressComplement: 'Cj 1201',
      neighborhood: 'Bela Vista',
      city: 'São Paulo',
      state: 'SP',
      cep: '01310-100',
      insuranceProvider: 'Amil',
      insurancePlan: 'S750',
      insuranceNumber: 'AM-2024-123456',
      insuranceExpiry: new Date('2025-06-30'),
      emergencyContactName: 'Carla Pereira',
      emergencyContactPhone: '(11) 97543-2109',
      emergencyContactRelation: 'Esposa',
      tags: [],
      riskScore: 15,
      occupation: 'Engenheiro de Software',
      education: 'Superior completo',
    },

    // 3. Ana Beatriz Oliveira — 28F, pregnant 32 weeks
    {
      id: IDS.anaBeatriz,
      fullName: 'Ana Beatriz Oliveira',
      cpf: fakeCpf(),
      birthDate: dateOfBirth(28),
      gender: 'F',
      bloodType: 'B_POS',
      maritalStatus: 'STABLE_UNION',
      phone: '(11) 98543-2109',
      email: 'ana.oliveira@email.com',
      address: 'Rua Oscar Freire',
      addressNumber: '300',
      neighborhood: 'Jardins',
      city: 'São Paulo',
      state: 'SP',
      cep: '01426-000',
      insuranceProvider: 'SulAmérica',
      insurancePlan: 'Prestige',
      insuranceNumber: 'SA-2024-654321',
      insuranceExpiry: new Date('2025-09-30'),
      emergencyContactName: 'Lucas Oliveira',
      emergencyContactPhone: '(11) 97432-1098',
      emergencyContactRelation: 'Companheiro',
      tags: ['gestante'],
      riskScore: 45,
      occupation: 'Advogada',
      education: 'Pós-graduação',
    },

    // 4. Pedro Henrique Martins — 78M, ICC+DPOC+FA, very high risk
    {
      id: IDS.pedro,
      fullName: 'Pedro Henrique Martins',
      cpf: fakeCpf(),
      birthDate: dateOfBirth(78),
      gender: 'M',
      bloodType: 'AB_NEG',
      maritalStatus: 'MARRIED',
      phone: '(11) 98432-1098',
      email: null,
      address: 'Rua Haddock Lobo',
      addressNumber: '595',
      addressComplement: 'Apto 12A',
      neighborhood: 'Cerqueira César',
      city: 'São Paulo',
      state: 'SP',
      cep: '01414-001',
      insuranceProvider: 'Bradesco Saúde',
      insurancePlan: 'Top Nacional Plus',
      insuranceNumber: 'BS-2024-111222',
      insuranceExpiry: new Date('2025-12-31'),
      emergencyContactName: 'Helena Martins',
      emergencyContactPhone: '(11) 97321-0987',
      emergencyContactRelation: 'Esposa',
      tags: ['polimedicado', 'anticoagulado', 'UTI'],
      riskScore: 92,
      occupation: 'Aposentado (ex-bancário)',
      education: 'Superior completo',
    },

    // 5. Lucia Fernandes Costa — 55F, breast cancer in chemotherapy
    {
      id: IDS.lucia,
      fullName: 'Lucia Fernandes Costa',
      cpf: fakeCpf(),
      birthDate: dateOfBirth(55),
      gender: 'F',
      bloodType: 'A_NEG',
      maritalStatus: 'DIVORCED',
      phone: '(11) 98321-0987',
      email: 'lucia.costa@email.com',
      address: 'Rua Bela Cintra',
      addressNumber: '750',
      addressComplement: 'Apto 82',
      neighborhood: 'Consolação',
      city: 'São Paulo',
      state: 'SP',
      cep: '01415-002',
      insuranceProvider: 'Unimed',
      insurancePlan: 'Alfa Nacional',
      insuranceNumber: 'UN-2024-333444',
      insuranceExpiry: new Date('2025-08-31'),
      emergencyContactName: 'Mariana Costa',
      emergencyContactPhone: '(11) 97210-9876',
      emergencyContactRelation: 'Filha',
      tags: ['oncológico', 'quimioterapia'],
      riskScore: 72,
      occupation: 'Professora universitária',
      education: 'Doutorado',
    },

    // 6. Gabriel Souza Lima — 8M, asthmatic, pediatric
    {
      id: IDS.gabriel,
      fullName: 'Gabriel Souza Lima',
      cpf: fakeCpf(),
      birthDate: dateOfBirth(8),
      gender: 'M',
      bloodType: 'O_POS',
      maritalStatus: 'SINGLE',
      phone: '(11) 98210-9876',
      email: null,
      address: 'Rua Pamplona',
      addressNumber: '200',
      addressComplement: 'Apto 33',
      neighborhood: 'Jardim Paulista',
      city: 'São Paulo',
      state: 'SP',
      cep: '01405-000',
      insuranceProvider: 'Amil',
      insurancePlan: 'S450',
      insuranceNumber: 'AM-2024-555666',
      insuranceExpiry: new Date('2025-12-31'),
      emergencyContactName: 'Fernanda Souza Lima',
      emergencyContactPhone: '(11) 97109-8765',
      emergencyContactRelation: 'Mãe',
      tags: ['pediátrico', 'asmático'],
      riskScore: 40,
      occupation: 'Estudante (3o ano)',
      education: 'Fundamental incompleto',
    },

    // 7. Francisco Almeida — 70M, Alzheimer + HAS + DRC
    {
      id: IDS.francisco,
      fullName: 'Francisco Almeida',
      cpf: fakeCpf(),
      birthDate: dateOfBirth(70),
      gender: 'M',
      bloodType: 'B_NEG',
      maritalStatus: 'MARRIED',
      phone: '(11) 98109-8765',
      email: null,
      address: 'Rua Pedroso Alvarenga',
      addressNumber: '100',
      addressComplement: 'Casa',
      neighborhood: 'Itaim Bibi',
      city: 'São Paulo',
      state: 'SP',
      cep: '04531-000',
      insuranceProvider: 'Bradesco Saúde',
      insurancePlan: 'Nacional Flex',
      insuranceNumber: 'BS-2024-777888',
      insuranceExpiry: new Date('2025-12-31'),
      emergencyContactName: 'Teresa Almeida',
      emergencyContactPhone: '(11) 96998-7654',
      emergencyContactRelation: 'Esposa',
      tags: ['paliativo', 'demência', 'diretiva antecipada'],
      riskScore: 75,
      advanceDirectives: 'Paciente deseja cuidados de conforto apenas. Não deseja IOT, RCP ou medidas invasivas.',
      occupation: 'Aposentado (ex-engenheiro civil)',
      education: 'Superior completo',
    } as PatientData & { advanceDirectives?: string },

    // 8. Camila Rodrigues — 35F, depression + anxiety
    {
      id: IDS.camila,
      fullName: 'Camila Rodrigues',
      cpf: fakeCpf(),
      birthDate: dateOfBirth(35),
      gender: 'F',
      bloodType: 'A_POS',
      maritalStatus: 'SINGLE',
      phone: '(11) 97998-7654',
      email: 'camila.rodrigues@email.com',
      address: 'Rua Joaquim Floriano',
      addressNumber: '466',
      addressComplement: 'Apto 155',
      neighborhood: 'Itaim Bibi',
      city: 'São Paulo',
      state: 'SP',
      cep: '04534-002',
      insuranceProvider: 'Amil',
      insurancePlan: 'S750',
      insuranceNumber: 'AM-2024-888999',
      insuranceExpiry: new Date('2025-11-30'),
      emergencyContactName: 'Roberto Rodrigues',
      emergencyContactPhone: '(11) 96887-6543',
      emergencyContactRelation: 'Pai',
      tags: ['saúde mental'],
      riskScore: 35,
      occupation: 'Designer gráfica',
      education: 'Superior completo',
    },

    // 9. Rafael Santos — 42M, HIV+, on ART
    {
      id: IDS.rafael,
      fullName: 'Rafael Santos',
      cpf: fakeCpf(),
      birthDate: dateOfBirth(42),
      gender: 'M',
      bloodType: 'O_NEG',
      maritalStatus: 'MARRIED',
      phone: '(11) 97887-6543',
      email: 'rafael.santos@email.com',
      address: 'Rua Funchal',
      addressNumber: '411',
      addressComplement: 'Apto 206',
      neighborhood: 'Vila Olímpia',
      city: 'São Paulo',
      state: 'SP',
      cep: '04551-060',
      insuranceProvider: 'Unimed',
      insurancePlan: 'Alfa',
      insuranceNumber: 'UN-2024-222333',
      insuranceExpiry: new Date('2025-07-31'),
      emergencyContactName: 'Daniel Santos',
      emergencyContactPhone: '(11) 96776-5432',
      emergencyContactRelation: 'Esposo',
      tags: ['TARV', 'acompanhamento regular'],
      riskScore: 30,
      occupation: 'Publicitário',
      education: 'Pós-graduação',
    },

    // 10. Isabella Nascimento — 1F, premature neonate, SUS
    {
      id: IDS.isabella,
      fullName: 'Isabella Nascimento',
      cpf: fakeCpf(),
      birthDate: dateOfBirth(1, -2),
      gender: 'F',
      bloodType: 'O_POS',
      maritalStatus: 'SINGLE',
      phone: '(11) 97776-5432',
      email: null,
      address: 'Rua dos Pinheiros',
      addressNumber: '800',
      addressComplement: 'Casa 3',
      neighborhood: 'Pinheiros',
      city: 'São Paulo',
      state: 'SP',
      cep: '05422-001',
      emergencyContactName: 'Juliana Nascimento',
      emergencyContactPhone: '(11) 97776-5432',
      emergencyContactRelation: 'Mãe',
      tags: ['prematuro', 'neonatal', 'SUS'],
      riskScore: 65,
      motherName: 'Juliana Nascimento',
    },
  ];

  for (const p of patients) {
    const advDir = (p as PatientData & { advanceDirectives?: string }).advanceDirectives;
    await prisma.patient.create({
      data: {
        id: p.id,
        tenantId: IDS.tenant,
        mrn: nextMrn(),
        fullName: p.fullName,
        cpf: p.cpf,
        birthDate: p.birthDate,
        gender: p.gender,
        bloodType: (p.bloodType as import('@prisma/client').BloodType) ?? undefined,
        maritalStatus: (p.maritalStatus as import('@prisma/client').MaritalStatus) ?? undefined,
        phone: p.phone,
        email: p.email,
        address: p.address,
        addressNumber: p.addressNumber,
        addressComplement: p.addressComplement,
        neighborhood: p.neighborhood,
        city: p.city,
        state: p.state,
        cep: p.cep,
        insuranceProvider: p.insuranceProvider,
        insurancePlan: p.insurancePlan,
        insuranceNumber: p.insuranceNumber,
        insuranceExpiry: p.insuranceExpiry,
        emergencyContactName: p.emergencyContactName,
        emergencyContactPhone: p.emergencyContactPhone,
        emergencyContactRelation: p.emergencyContactRelation,
        tags: p.tags,
        riskScore: p.riskScore,
        motherName: p.motherName,
        occupation: p.occupation,
        education: p.education,
        advanceDirectives: advDir,
        isActive: true,
        consentLGPD: true,
        consentLGPDAt: daysAgo(365),
      },
    });
  }

  // ─── 3b. Social Histories (separate model) ──────────────────────────────

  console.log('  → Creating social histories...');

  const socialHistories = [
    { patientId: IDS.maria, smoking: 'NEVER' as const, alcohol: 'SOCIAL' as const, drugs: 'NEVER' as const, exercise: 'LIGHT' as const },
    { patientId: IDS.jose, smoking: 'FORMER' as const, smokingDetails: 'Parou há 5 anos, fumou 10 anos (10 maços/ano)', alcohol: 'SOCIAL' as const, drugs: 'NEVER' as const, exercise: 'SEDENTARY' as const },
    { patientId: IDS.anaBeatriz, smoking: 'NEVER' as const, alcohol: 'NEVER' as const, drugs: 'NEVER' as const, exercise: 'LIGHT' as const },
    { patientId: IDS.pedro, smoking: 'FORMER' as const, smokingDetails: 'Parou há 20 anos, fumou 30 anos (20 maços/ano)', alcohol: 'NEVER' as const, drugs: 'NEVER' as const, exercise: 'SEDENTARY' as const },
    { patientId: IDS.lucia, smoking: 'NEVER' as const, alcohol: 'NEVER' as const, drugs: 'NEVER' as const, exercise: 'LIGHT' as const },
    { patientId: IDS.gabriel, smoking: 'NEVER' as const, alcohol: 'NEVER' as const, drugs: 'NEVER' as const, exercise: 'MODERATE' as const },
    { patientId: IDS.francisco, smoking: 'FORMER' as const, smokingDetails: 'Parou há 15 anos', alcohol: 'NEVER' as const, drugs: 'NEVER' as const, exercise: 'SEDENTARY' as const },
    { patientId: IDS.camila, smoking: 'NEVER' as const, alcohol: 'SOCIAL' as const, drugs: 'NEVER' as const, exercise: 'MODERATE' as const },
    { patientId: IDS.rafael, smoking: 'NEVER' as const, alcohol: 'SOCIAL' as const, drugs: 'NEVER' as const, exercise: 'ACTIVE' as const },
    { patientId: IDS.isabella, smoking: 'NEVER' as const, alcohol: 'NEVER' as const, drugs: 'NEVER' as const, exercise: 'SEDENTARY' as const },
  ];

  for (const sh of socialHistories) {
    await prisma.socialHistory.create({
      data: {
        id: uuidv4(),
        ...sh,
      },
    });
  }

  // ─── 3c. Family Histories (separate model) ──────────────────────────────

  console.log('  → Creating family histories...');

  const familyHistories = [
    { patientId: IDS.maria, condition: 'Diabetes Mellitus Tipo 2', cidCode: 'E11.9', relationship: 'FATHER' as const, isDeceased: true, causeOfDeath: 'IAM' },
    { patientId: IDS.maria, condition: 'Hipertensão Arterial Sistêmica', cidCode: 'I10', relationship: 'MOTHER' as const, isDeceased: true, causeOfDeath: 'AVC' },
    { patientId: IDS.maria, condition: 'Dislipidemia', cidCode: 'E78.5', relationship: 'BROTHER' as const, isDeceased: false },
    { patientId: IDS.anaBeatriz, condition: 'Diabetes gestacional', cidCode: 'O24.4', relationship: 'MOTHER' as const, isDeceased: false },
    { patientId: IDS.pedro, condition: 'ICC', cidCode: 'I50.0', relationship: 'FATHER' as const, isDeceased: true, causeOfDeath: 'ICC descompensada' },
    { patientId: IDS.pedro, condition: 'DPOC', cidCode: 'J44.1', relationship: 'MOTHER' as const, isDeceased: true, causeOfDeath: 'Insuficiência respiratória' },
    { patientId: IDS.lucia, condition: 'Câncer de mama', cidCode: 'C50.9', relationship: 'MOTHER' as const, isDeceased: true, causeOfDeath: 'Câncer de mama metastático' },
    { patientId: IDS.lucia, condition: 'Câncer de ovário', cidCode: 'C56', relationship: 'AUNT' as const, isDeceased: true },
    { patientId: IDS.gabriel, condition: 'Asma', cidCode: 'J45.0', relationship: 'FATHER' as const, isDeceased: false },
    { patientId: IDS.gabriel, condition: 'Rinite alérgica', cidCode: 'J30.4', relationship: 'MOTHER' as const, isDeceased: false },
    { patientId: IDS.francisco, condition: 'Doença de Alzheimer', cidCode: 'G30.9', relationship: 'MOTHER' as const, isDeceased: true },
    { patientId: IDS.camila, condition: 'Depressão', cidCode: 'F32.1', relationship: 'MOTHER' as const, isDeceased: false },
  ];

  for (const fh of familyHistories) {
    await prisma.familyHistory.create({
      data: {
        id: uuidv4(),
        ...fh,
      },
    });
  }

  // ─── 3d. Surgical Histories (separate model) ────────────────────────────

  console.log('  → Creating surgical histories...');

  const surgicalHistories = [
    { patientId: IDS.maria, procedure: 'Colecistectomia videolaparoscópica', date: new Date('2019-03-15'), hospital: 'Hospital São Lucas', notes: 'Sem intercorrências' },
    { patientId: IDS.pedro, procedure: 'Revascularização miocárdica (3 pontes)', date: new Date('2015-11-20'), hospital: 'InCor', notes: 'Mamária + safena' },
    { patientId: IDS.pedro, procedure: 'Implante de marcapasso DDDR', date: new Date('2020-07-10'), hospital: 'Hospital São Lucas', notes: 'BAVT' },
    { patientId: IDS.pedro, procedure: 'Herniorrafia inguinal direita', date: new Date('2010-03-05'), hospital: 'Hospital São Lucas', notes: 'Sem intercorrências' },
    { patientId: IDS.lucia, procedure: 'Mastectomia radical modificada E', date: new Date('2024-01-20'), hospital: 'Hospital A.C. Camargo', notes: 'T2N1M0, RE+/RP+/HER2-' },
    { patientId: IDS.lucia, procedure: 'Colocação de cateter port-a-cath', date: new Date('2024-02-10'), hospital: 'Hospital São Lucas', notes: 'Subclávia D' },
    { patientId: IDS.francisco, procedure: 'Prostatectomia transuretral', date: new Date('2018-05-10'), hospital: 'Hospital São Lucas', notes: 'HPB' },
  ];

  for (const sh of surgicalHistories) {
    await prisma.surgicalHistory.create({
      data: {
        id: uuidv4(),
        ...sh,
      },
    });
  }

  // ─── 3e. Vaccinations (separate model) ──────────────────────────────────

  console.log('  → Creating vaccinations...');

  const vaccinations = [
    { patientId: IDS.maria, vaccine: 'COVID-19 (Pfizer)', dose: '4a dose', applicationDate: new Date('2023-10-15'), appliedById: IDS.enfPatricia },
    { patientId: IDS.maria, vaccine: 'Influenza', dose: 'Anual', applicationDate: new Date('2024-04-20'), appliedById: IDS.enfPatricia },
    { patientId: IDS.maria, vaccine: 'Pneumocócica 23', dose: 'Dose única', applicationDate: new Date('2022-08-10'), appliedById: IDS.enfPatricia },
    { patientId: IDS.jose, vaccine: 'COVID-19 (Pfizer)', dose: '3a dose', applicationDate: new Date('2023-03-10'), appliedById: IDS.enfJoao },
    { patientId: IDS.anaBeatriz, vaccine: 'dTpa', dose: 'Gestacional', applicationDate: new Date('2024-08-15'), appliedById: IDS.enfPatricia },
    { patientId: IDS.pedro, vaccine: 'COVID-19 (Pfizer)', dose: '5a dose', applicationDate: new Date('2024-03-20'), appliedById: IDS.enfPatricia },
    { patientId: IDS.pedro, vaccine: 'Influenza', dose: 'Anual', applicationDate: new Date('2024-04-15'), appliedById: IDS.enfPatricia },
    { patientId: IDS.gabriel, vaccine: 'Tríplice viral', dose: '2a dose', applicationDate: new Date('2018-03-15'), appliedById: IDS.enfJoao },
    { patientId: IDS.gabriel, vaccine: 'Influenza', dose: 'Anual', applicationDate: new Date('2024-04-10'), appliedById: IDS.enfJoao },
    { patientId: IDS.rafael, vaccine: 'COVID-19 (Pfizer)', dose: '4a dose', applicationDate: new Date('2023-11-10'), appliedById: IDS.enfPatricia },
    { patientId: IDS.rafael, vaccine: 'Hepatite B', dose: '3a dose', applicationDate: new Date('2019-09-10'), appliedById: IDS.enfJoao },
  ];

  for (const v of vaccinations) {
    await prisma.vaccination.create({
      data: {
        id: uuidv4(),
        ...v,
      },
    });
  }

  // ─── 4. Allergies ───────────────────────────────────────────────────────

  console.log('  → Creating allergies...');

  const allergies = [
    // Maria
    {
      patientId: IDS.maria,
      substance: 'Dipirona', type: 'MEDICATION' as const, severity: 'LIFE_THREATENING' as const,
      reaction: 'Edema de glote, hipotensão, urticária generalizada',
      status: 'ACTIVE' as const, source: 'CLINICAL_TEST' as const,
      onsetDate: new Date('2018-05-20'), confirmedById: IDS.drCarlos,
    },
    {
      patientId: IDS.maria,
      substance: 'Penicilina', type: 'MEDICATION' as const, severity: 'SEVERE' as const,
      reaction: 'Rash cutâneo extenso, prurido intenso, febre',
      status: 'ACTIVE' as const, source: 'PATIENT_REPORT' as const,
      onsetDate: new Date('2005-08-10'), confirmedById: IDS.drAna,
    },
    // Ana Beatriz
    {
      patientId: IDS.anaBeatriz,
      substance: 'Látex', type: 'LATEX' as const, severity: 'MODERATE' as const,
      reaction: 'Urticária de contato, rinite',
      status: 'ACTIVE' as const, source: 'PATIENT_REPORT' as const,
      onsetDate: new Date('2020-02-15'), confirmedById: IDS.drAna,
    },
    // Pedro — multiple allergies
    {
      patientId: IDS.pedro,
      substance: 'Contraste iodado', type: 'CONTRAST' as const, severity: 'SEVERE' as const,
      reaction: 'Broncoespasmo, edema facial',
      status: 'ACTIVE' as const, source: 'CLINICAL_TEST' as const,
      onsetDate: new Date('2016-09-05'), confirmedById: IDS.drCarlos,
    },
    {
      patientId: IDS.pedro,
      substance: 'AAS', type: 'MEDICATION' as const, severity: 'MODERATE' as const,
      reaction: 'Broncoespasmo, rinorréia',
      status: 'ACTIVE' as const, source: 'CLINICAL_TEST' as const,
      onsetDate: new Date('2012-04-10'), confirmedById: IDS.drCarlos,
    },
    {
      patientId: IDS.pedro,
      substance: 'Camarão', type: 'FOOD' as const, severity: 'MODERATE' as const,
      reaction: 'Urticária, edema labial, náusea',
      status: 'ACTIVE' as const, source: 'PATIENT_REPORT' as const,
      onsetDate: new Date('2000-12-25'), confirmedById: IDS.drAna,
    },
    // Gabriel
    {
      patientId: IDS.gabriel,
      substance: 'AAS (Ácido Acetilsalicílico)', type: 'MEDICATION' as const, severity: 'MODERATE' as const,
      reaction: 'Urticária, sibilância',
      status: 'ACTIVE' as const, source: 'PATIENT_REPORT' as const,
      onsetDate: new Date('2022-06-10'), confirmedById: IDS.drAna,
    },
  ];

  for (const a of allergies) {
    await prisma.allergy.create({
      data: {
        id: uuidv4(),
        ...a,
      },
    });
  }

  // ─── 5. Chronic Conditions ──────────────────────────────────────────────

  console.log('  → Creating chronic conditions...');

  const conditions = [
    // Maria
    { patientId: IDS.maria, cidCode: 'E11.9', cidDescription: 'Diabetes Mellitus Tipo 2', status: 'ACTIVE' as const, diagnosedAt: new Date('2015-03-10'), diagnosedById: IDS.drAna, notes: 'HbA1c última: 7.2%. Em uso de metformina.' },
    { patientId: IDS.maria, cidCode: 'I10', cidDescription: 'Hipertensão Arterial Sistêmica', status: 'ACTIVE' as const, diagnosedAt: new Date('2012-08-20'), diagnosedById: IDS.drCarlos, notes: 'Controlada com losartana 50mg. PA alvo < 130x80.' },
    // Ana Beatriz
    { patientId: IDS.anaBeatriz, cidCode: 'O24.4', cidDescription: 'Diabetes gestacional', status: 'ACTIVE' as const, diagnosedAt: new Date('2024-07-15'), diagnosedById: IDS.drAna, notes: 'Diagnosticada com 24 semanas. Em dieta + monitorização glicêmica.' },
    // Pedro
    { patientId: IDS.pedro, cidCode: 'I50.0', cidDescription: 'Insuficiência Cardíaca Congestiva', status: 'ACTIVE' as const, diagnosedAt: new Date('2016-02-15'), diagnosedById: IDS.drCarlos, notes: 'FEVE 35%. NYHA III. Etiologia isquêmica.' },
    { patientId: IDS.pedro, cidCode: 'J44.1', cidDescription: 'Doença Pulmonar Obstrutiva Crônica', status: 'ACTIVE' as const, diagnosedAt: new Date('2014-06-10'), diagnosedById: IDS.drAna, notes: 'GOLD C. VEF1 45% previsto.' },
    { patientId: IDS.pedro, cidCode: 'I48.2', cidDescription: 'Fibrilação Atrial Permanente', status: 'ACTIVE' as const, diagnosedAt: new Date('2019-01-20'), diagnosedById: IDS.drCarlos, notes: 'CHA2DS2-VASc 5. Em uso de anticoagulante.' },
    { patientId: IDS.pedro, cidCode: 'N18.3', cidDescription: 'Doença Renal Crônica', status: 'ACTIVE' as const, diagnosedAt: new Date('2020-09-10'), diagnosedById: IDS.drAna, notes: 'Estágio 3a. TFG 52 mL/min.' },
    // Lucia
    { patientId: IDS.lucia, cidCode: 'C50.9', cidDescription: 'Neoplasia maligna da mama', status: 'ACTIVE' as const, diagnosedAt: new Date('2023-11-10'), diagnosedById: IDS.drRoberto, notes: 'Carcinoma ductal invasivo, T2N1M0, estágio IIB. RE+/RP+/HER2-.' },
    // Gabriel
    { patientId: IDS.gabriel, cidCode: 'J45.0', cidDescription: 'Asma', status: 'ACTIVE' as const, diagnosedAt: new Date('2020-04-15'), diagnosedById: IDS.drAna, notes: 'Asma persistente moderada.' },
    // Francisco
    { patientId: IDS.francisco, cidCode: 'G30.9', cidDescription: 'Doença de Alzheimer', status: 'ACTIVE' as const, diagnosedAt: new Date('2022-03-10'), diagnosedById: IDS.drAna, notes: 'Estágio moderado. CDR 2.' },
    { patientId: IDS.francisco, cidCode: 'I10', cidDescription: 'Hipertensão Arterial Sistêmica', status: 'ACTIVE' as const, diagnosedAt: new Date('2010-05-20'), diagnosedById: IDS.drCarlos, notes: 'Controlada.' },
    { patientId: IDS.francisco, cidCode: 'N18.3', cidDescription: 'Doença Renal Crônica', status: 'ACTIVE' as const, diagnosedAt: new Date('2021-11-05'), diagnosedById: IDS.drAna, notes: 'Estágio 3b. TFG 38 mL/min.' },
    // Camila
    { patientId: IDS.camila, cidCode: 'F33.1', cidDescription: 'Transtorno depressivo maior, episódio recorrente', status: 'ACTIVE' as const, diagnosedAt: new Date('2021-06-15'), diagnosedById: IDS.drAna, notes: 'PHQ-9 último: 12 (moderado).' },
    { patientId: IDS.camila, cidCode: 'F41.1', cidDescription: 'Transtorno de ansiedade generalizada', status: 'ACTIVE' as const, diagnosedAt: new Date('2021-06-15'), diagnosedById: IDS.drAna, notes: 'GAD-7 último: 8 (leve).' },
    // Rafael
    { patientId: IDS.rafael, cidCode: 'B24', cidDescription: 'HIV', status: 'ACTIVE' as const, diagnosedAt: new Date('2018-09-20'), diagnosedById: IDS.drAna, notes: 'CD4 680. Carga viral indetectável há 4 anos. TARV: TDF/3TC/DTG.' },
  ];

  for (const c of conditions) {
    await prisma.chronicCondition.create({
      data: {
        id: uuidv4(),
        ...c,
      },
    });
  }

  // ─── 6. Encounters ──────────────────────────────────────────────────────

  console.log('  → Creating encounters...');

  const encounters = [
    // Maria — consulta cardiologia (COMPLETED)
    {
      id: IDS.enc_maria_cardio, tenantId: IDS.tenant, patientId: IDS.maria,
      primaryDoctorId: IDS.drCarlos, type: 'CONSULTATION' as const, status: 'COMPLETED' as const,
      priority: 'NORMAL' as const, chiefComplaint: 'Retorno cardiologia — controle de HAS e DM2',
      startedAt: daysAgo(30), completedAt: daysAgo(30),
    },
    // Maria — emergência (IN_PROGRESS)
    {
      id: IDS.enc_maria_emergency, tenantId: IDS.tenant, patientId: IDS.maria,
      primaryDoctorId: IDS.drCarlos, type: 'EMERGENCY' as const, status: 'IN_PROGRESS' as const,
      priority: 'URGENT' as const, chiefComplaint: 'Dor torácica há 2 horas, tipo opressiva, irradiando para MSE',
      startedAt: hoursAgo(3),
      triageLevel: 'ORANGE' as const,
      triageNurseId: IDS.enfPatricia,
      triagedAt: hoursAgo(3),
      vitalsAtTriage: {
        systolicBP: 168, diastolicBP: 102, heartRate: 98, respiratoryRate: 22,
        temperature: 36.8, spo2: 95, pain: 8,
      },
    },
    // Maria — retorno (COMPLETED)
    {
      id: IDS.enc_maria_retorno, tenantId: IDS.tenant, patientId: IDS.maria,
      primaryDoctorId: IDS.drAna, type: 'RETURN_VISIT' as const, status: 'COMPLETED' as const,
      priority: 'NORMAL' as const, chiefComplaint: 'Retorno clínico geral — acompanhamento DM2',
      startedAt: daysAgo(60), completedAt: daysAgo(60),
    },

    // Jose — consulta geral (COMPLETED)
    {
      id: IDS.enc_jose_geral, tenantId: IDS.tenant, patientId: IDS.jose,
      primaryDoctorId: IDS.drAna, type: 'CONSULTATION' as const, status: 'COMPLETED' as const,
      priority: 'NORMAL' as const, chiefComplaint: 'Check-up anual. Sem queixas.',
      startedAt: daysAgo(15), completedAt: daysAgo(15),
    },
    // Jose — exames (COMPLETED)
    {
      id: IDS.enc_jose_exame, tenantId: IDS.tenant, patientId: IDS.jose,
      primaryDoctorId: IDS.drAna, type: 'CONSULTATION' as const, status: 'COMPLETED' as const,
      priority: 'NORMAL' as const, chiefComplaint: 'Retorno com resultados de exames',
      startedAt: daysAgo(7), completedAt: daysAgo(7),
    },

    // Pedro — internação UTI (IN_PROGRESS)
    {
      id: IDS.enc_pedro_uti, tenantId: IDS.tenant, patientId: IDS.pedro,
      primaryDoctorId: IDS.drCarlos, type: 'HOSPITALIZATION' as const, status: 'IN_PROGRESS' as const,
      priority: 'EMERGENCY' as const, chiefComplaint: 'ICC descompensada — dispnéia em repouso, edema MMII, ganho ponderal 5kg/2sem',
      startedAt: daysAgo(3),
      triageLevel: 'ORANGE' as const,
      triageNurseId: IDS.enfPatricia,
      triagedAt: daysAgo(3),
      vitalsAtTriage: {
        systolicBP: 100, diastolicBP: 60, heartRate: 110, respiratoryRate: 28,
        temperature: 36.5, spo2: 88, pain: 4,
      },
    },
    // Pedro — cirurgia anterior (COMPLETED)
    {
      id: IDS.enc_pedro_cirurgia, tenantId: IDS.tenant, patientId: IDS.pedro,
      primaryDoctorId: IDS.drRoberto, type: 'HOSPITALIZATION' as const, status: 'COMPLETED' as const,
      priority: 'NORMAL' as const, chiefComplaint: 'Herniorrafia inguinal eletiva',
      startedAt: daysAgo(180), completedAt: daysAgo(175),
    },

    // Ana — pré-natal (COMPLETED)
    {
      id: IDS.enc_ana_prenatal, tenantId: IDS.tenant, patientId: IDS.anaBeatriz,
      primaryDoctorId: IDS.drAna, type: 'CONSULTATION' as const, status: 'COMPLETED' as const,
      priority: 'NORMAL' as const, chiefComplaint: 'Pré-natal — 32 semanas. Acompanhamento diabetes gestacional.',
      startedAt: daysAgo(5), completedAt: daysAgo(5),
    },

    // Gabriel — crise asmática (EMERGENCY, IN_PROGRESS)
    {
      id: IDS.enc_gabriel_asma, tenantId: IDS.tenant, patientId: IDS.gabriel,
      primaryDoctorId: IDS.drAna, type: 'EMERGENCY' as const, status: 'IN_PROGRESS' as const,
      priority: 'URGENT' as const, chiefComplaint: 'Crise asmática — sibilância, dispnéia, tosse seca há 6h',
      startedAt: hoursAgo(2),
      triageLevel: 'YELLOW' as const,
      triageNurseId: IDS.enfPatricia,
      triagedAt: hoursAgo(2),
      vitalsAtTriage: {
        systolicBP: 100, diastolicBP: 65, heartRate: 120, respiratoryRate: 28,
        temperature: 36.8, spo2: 93, pain: 3,
      },
    },
    // Gabriel — retorno (COMPLETED)
    {
      id: IDS.enc_gabriel_retorno, tenantId: IDS.tenant, patientId: IDS.gabriel,
      primaryDoctorId: IDS.drAna, type: 'RETURN_VISIT' as const, status: 'COMPLETED' as const,
      priority: 'NORMAL' as const, chiefComplaint: 'Retorno pós-crise asmática. Reavaliação.',
      startedAt: daysAgo(45), completedAt: daysAgo(45),
    },

    // Lucia — oncologia (COMPLETED)
    {
      id: IDS.enc_lucia_onco, tenantId: IDS.tenant, patientId: IDS.lucia,
      primaryDoctorId: IDS.drRoberto, type: 'CONSULTATION' as const, status: 'COMPLETED' as const,
      priority: 'NORMAL' as const, chiefComplaint: 'Acompanhamento pós-QT ciclo 4/6 (AC). Avaliação de toxicidade.',
      startedAt: daysAgo(10), completedAt: daysAgo(10),
    },

    // Francisco — neurologia (COMPLETED)
    {
      id: IDS.enc_francisco_neuro, tenantId: IDS.tenant, patientId: IDS.francisco,
      primaryDoctorId: IDS.drAna, type: 'CONSULTATION' as const, status: 'COMPLETED' as const,
      priority: 'NORMAL' as const, chiefComplaint: 'Acompanhamento Alzheimer. Familiar refere piora cognitiva progressiva.',
      startedAt: daysAgo(20), completedAt: daysAgo(20),
    },

    // Camila — psiquiatria (COMPLETED)
    {
      id: IDS.enc_camila_psiq, tenantId: IDS.tenant, patientId: IDS.camila,
      primaryDoctorId: IDS.drAna, type: 'CONSULTATION' as const, status: 'COMPLETED' as const,
      priority: 'NORMAL' as const, chiefComplaint: 'Acompanhamento psiquiátrico. Refere melhora parcial dos sintomas.',
      startedAt: daysAgo(14), completedAt: daysAgo(14),
    },

    // Rafael — infectologia (COMPLETED)
    {
      id: IDS.enc_rafael_infecto, tenantId: IDS.tenant, patientId: IDS.rafael,
      primaryDoctorId: IDS.drAna, type: 'CONSULTATION' as const, status: 'COMPLETED' as const,
      priority: 'NORMAL' as const, chiefComplaint: 'Acompanhamento HIV. Resultados de CD4/CV.',
      startedAt: daysAgo(7), completedAt: daysAgo(7),
    },

    // Isabella — neonatal (COMPLETED)
    {
      id: IDS.enc_isabella_neo, tenantId: IDS.tenant, patientId: IDS.isabella,
      primaryDoctorId: IDS.drAna, type: 'CONSULTATION' as const, status: 'COMPLETED' as const,
      priority: 'NORMAL' as const, chiefComplaint: 'Consulta de puericultura — acompanhamento ex-prematuro.',
      startedAt: daysAgo(10), completedAt: daysAgo(10),
    },
  ];

  for (const e of encounters) {
    await prisma.encounter.create({ data: e });
  }

  // ─── 7. Vital Signs ────────────────────────────────────────────────────

  console.log('  → Creating vital signs...');

  const vitals = [
    // Maria — 3 records over 3 months showing BP trend
    {
      id: uuidv4(), patientId: IDS.maria, encounterId: IDS.enc_maria_retorno,
      recordedById: IDS.enfPatricia, recordedAt: daysAgo(60), source: 'MANUAL' as const,
      systolicBP: 145, diastolicBP: 92, heartRate: 78, respiratoryRate: 16,
      temperature: 36.4, temperatureMethod: 'AXILLARY' as const, oxygenSaturation: 97,
      oxygenSupplementation: 'ROOM_AIR' as const, painScale: 0, weight: 72.5, height: 162,
      glucoseLevel: 145, glucoseContext: 'FASTING' as const,
    },
    {
      id: uuidv4(), patientId: IDS.maria, encounterId: IDS.enc_maria_cardio,
      recordedById: IDS.enfPatricia, recordedAt: daysAgo(30), source: 'MANUAL' as const,
      systolicBP: 138, diastolicBP: 88, heartRate: 76, respiratoryRate: 16,
      temperature: 36.2, temperatureMethod: 'AXILLARY' as const, oxygenSaturation: 98,
      oxygenSupplementation: 'ROOM_AIR' as const, painScale: 0, weight: 71.8, height: 162,
      glucoseLevel: 132, glucoseContext: 'FASTING' as const,
    },
    {
      id: uuidv4(), patientId: IDS.maria, encounterId: IDS.enc_maria_emergency,
      recordedById: IDS.enfPatricia, recordedAt: hoursAgo(3), source: 'MANUAL' as const,
      systolicBP: 168, diastolicBP: 102, heartRate: 98, respiratoryRate: 22,
      temperature: 36.8, temperatureMethod: 'AXILLARY' as const, oxygenSaturation: 95,
      oxygenSupplementation: 'ROOM_AIR' as const, painScale: 8, weight: 72.0, height: 162,
      glucoseLevel: 198, glucoseContext: 'RANDOM' as const,
    },

    // Pedro — hourly ICU vitals (10 records)
    ...Array.from({ length: 10 }, (_, i) => ({
      id: uuidv4(), patientId: IDS.pedro, encounterId: IDS.enc_pedro_uti,
      recordedById: IDS.enfPatricia, recordedAt: hoursAgo(10 - i), source: 'MANUAL' as const,
      systolicBP: 100 + Math.floor(Math.random() * 30),
      diastolicBP: 55 + Math.floor(Math.random() * 20),
      heartRate: 85 + Math.floor(Math.random() * 25),
      respiratoryRate: 18 + Math.floor(Math.random() * 8),
      temperature: +(36.5 + Math.random() * 1.5).toFixed(1),
      temperatureMethod: 'AXILLARY' as const,
      oxygenSaturation: +(87 + Math.floor(Math.random() * 8)).toFixed(0),
      oxygenSupplementation: i < 5 ? 'SIMPLE_MASK' as const : 'NASAL_CANNULA' as const,
      painScale: Math.floor(Math.random() * 4),
      weight: 88.5,
      height: 175,
      glucoseLevel: i % 3 === 0 ? 110 + Math.floor(Math.random() * 50) : undefined,
      glucoseContext: i % 3 === 0 ? 'RANDOM' as const : undefined,
    })),

    // Gabriel — vitals at triage + after treatment
    {
      id: uuidv4(), patientId: IDS.gabriel, encounterId: IDS.enc_gabriel_asma,
      recordedById: IDS.enfPatricia, recordedAt: hoursAgo(2), source: 'MANUAL' as const,
      systolicBP: 100, diastolicBP: 65, heartRate: 120, respiratoryRate: 28,
      temperature: 36.8, temperatureMethod: 'AXILLARY' as const, oxygenSaturation: 93,
      oxygenSupplementation: 'ROOM_AIR' as const, painScale: 3, weight: 28.5, height: 128,
    },
    {
      id: uuidv4(), patientId: IDS.gabriel, encounterId: IDS.enc_gabriel_asma,
      recordedById: IDS.enfPatricia, recordedAt: hoursAgo(1), source: 'MANUAL' as const,
      systolicBP: 98, diastolicBP: 62, heartRate: 105, respiratoryRate: 22,
      temperature: 36.6, temperatureMethod: 'AXILLARY' as const, oxygenSaturation: 96,
      oxygenSupplementation: 'ROOM_AIR' as const, painScale: 1, weight: 28.5, height: 128,
    },

    // Jose — check-up
    {
      id: uuidv4(), patientId: IDS.jose, encounterId: IDS.enc_jose_geral,
      recordedById: IDS.enfJoao, recordedAt: daysAgo(15), source: 'MANUAL' as const,
      systolicBP: 122, diastolicBP: 78, heartRate: 72, respiratoryRate: 14,
      temperature: 36.3, temperatureMethod: 'AXILLARY' as const, oxygenSaturation: 99,
      oxygenSupplementation: 'ROOM_AIR' as const, painScale: 0, weight: 85.2, height: 178,
      glucoseLevel: 95, glucoseContext: 'FASTING' as const,
    },
  ];

  for (const v of vitals) {
    // Filter out undefined values
    const data: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(v)) {
      if (val !== undefined) data[key] = val;
    }
    await prisma.vitalSigns.create({ data: data as any });
  }

  // ─── 8. Prescriptions ──────────────────────────────────────────────────

  console.log('  → Creating prescriptions...');

  // Maria — chronic medications
  await prisma.prescription.create({
    data: {
      id: IDS.rx_maria_cronica, tenantId: IDS.tenant, patientId: IDS.maria,
      encounterId: IDS.enc_maria_cardio, doctorId: IDS.drCarlos,
      type: 'MEDICATION', status: 'ACTIVE',
      validFrom: daysAgo(30), validUntil: daysFromNow(60),
      items: {
        create: [
          {
            id: uuidv4(),
            medicationName: 'Losartana Potássica', dose: '50', doseUnit: 'mg',
            route: 'ORAL', frequency: '1x/dia (manhã)', duration: '90 dias', durationUnit: 'DAYS',
            specialInstructions: 'Tomar em jejum pela manhã',
            sortOrder: 1,
          },
          {
            id: uuidv4(),
            medicationName: 'Metformina', dose: '850', doseUnit: 'mg',
            route: 'ORAL', frequency: '2x/dia (café e jantar)', duration: '90 dias', durationUnit: 'DAYS',
            specialInstructions: 'Tomar durante ou após refeições para reduzir desconforto GI',
            sortOrder: 2,
          },
          {
            id: uuidv4(),
            medicationName: 'Ácido Acetilsalicílico', dose: '100', doseUnit: 'mg',
            route: 'ORAL', frequency: '1x/dia (almoço)', duration: '90 dias', durationUnit: 'DAYS',
            specialInstructions: 'Tomar após almoço',
            sortOrder: 3,
          },
          {
            id: uuidv4(),
            medicationName: 'Omeprazol', dose: '20', doseUnit: 'mg',
            route: 'ORAL', frequency: '1x/dia (jejum)', duration: '90 dias', durationUnit: 'DAYS',
            specialInstructions: 'Tomar 30 minutos antes do café da manhã',
            sortOrder: 4,
          },
        ],
      },
    },
  });

  // Pedro — ICU medications
  await prisma.prescription.create({
    data: {
      id: IDS.rx_pedro_uti, tenantId: IDS.tenant, patientId: IDS.pedro,
      encounterId: IDS.enc_pedro_uti, doctorId: IDS.drCarlos,
      type: 'MEDICATION', status: 'ACTIVE',
      validFrom: daysAgo(3),
      items: {
        create: [
          {
            id: uuidv4(),
            medicationName: 'Furosemida', dose: '40', doseUnit: 'mg',
            route: 'IV', frequency: '12/12h', duration: '7 dias', durationUnit: 'DAYS',
            specialInstructions: 'Infundir em 5 minutos. Controlar débito urinário.',
            sortOrder: 1,
          },
          {
            id: uuidv4(),
            medicationName: 'Enoxaparina', dose: '40', doseUnit: 'mg',
            route: 'SC', frequency: '1x/dia', duration: '7 dias', durationUnit: 'DAYS',
            specialInstructions: 'Aplicar na região abdominal. Profilaxia TVP.',
            isHighAlert: true,
            sortOrder: 2,
          },
          {
            id: uuidv4(),
            medicationName: 'Digoxina', dose: '0.25', doseUnit: 'mg',
            route: 'ORAL', frequency: '1x/dia', duration: '7 dias', durationUnit: 'DAYS',
            specialInstructions: 'Monitorar nível sérico. Atentar para sinais de intoxicação digitálica.',
            sortOrder: 3,
          },
          {
            id: uuidv4(),
            medicationName: 'Insulina NPH', dose: '20', doseUnit: 'UI',
            route: 'SC', frequency: '2x/dia (café e jantar)', duration: '7 dias', durationUnit: 'DAYS',
            specialInstructions: 'Ajustar conforme glicemia capilar. Monitorar hipoglicemia.',
            isHighAlert: true,
            sortOrder: 4,
          },
        ],
      },
    },
  });

  // Gabriel — asthma crisis
  await prisma.prescription.create({
    data: {
      id: IDS.rx_gabriel_asma, tenantId: IDS.tenant, patientId: IDS.gabriel,
      encounterId: IDS.enc_gabriel_asma, doctorId: IDS.drAna,
      type: 'MEDICATION', status: 'ACTIVE',
      validFrom: hoursAgo(2),
      items: {
        create: [
          {
            id: uuidv4(),
            medicationName: 'Salbutamol (nebulização)', dose: '2.5', doseUnit: 'mg',
            route: 'NEBULIZATION', frequency: 'A cada 20 min (3 doses), depois SOS',
            specialInstructions: 'Diluir em 3mL SF 0.9%. Nebulizar com O2 6L/min.',
            sortOrder: 1,
          },
          {
            id: uuidv4(),
            medicationName: 'Prednisolona (solução oral)', dose: '20', doseUnit: 'mg',
            route: 'ORAL', frequency: '1x/dia', duration: '5 dias', durationUnit: 'DAYS',
            specialInstructions: 'Tomar pela manhã após café da manhã. Dose: 1mg/kg/dia.',
            sortOrder: 2,
          },
        ],
      },
    },
  });

  // Camila — psychiatric medications
  await prisma.prescription.create({
    data: {
      id: IDS.rx_camila_psiq, tenantId: IDS.tenant, patientId: IDS.camila,
      encounterId: IDS.enc_camila_psiq, doctorId: IDS.drAna,
      type: 'SPECIAL_CONTROL', status: 'ACTIVE',
      validFrom: daysAgo(14), validUntil: daysFromNow(76),
      items: {
        create: [
          {
            id: uuidv4(),
            medicationName: 'Escitalopram', dose: '15', doseUnit: 'mg',
            route: 'ORAL', frequency: '1x/dia (manhã)', duration: '90 dias', durationUnit: 'DAYS',
            isControlled: true, controlledSchedule: 'C1',
            specialInstructions: 'Tomar pela manhã. Não suspender abruptamente.',
            sortOrder: 1,
          },
          {
            id: uuidv4(),
            medicationName: 'Clonazepam', dose: '0.5', doseUnit: 'mg',
            route: 'ORAL', frequency: '1x/dia (noite)', duration: '30 dias', durationUnit: 'DAYS',
            isControlled: true, controlledSchedule: 'B1',
            specialInstructions: 'Tomar antes de dormir. Uso por tempo limitado. Desmame programado.',
            sortOrder: 2,
          },
        ],
      },
    },
  });

  // Rafael — antiretroviral therapy
  await prisma.prescription.create({
    data: {
      id: IDS.rx_rafael_tarv, tenantId: IDS.tenant, patientId: IDS.rafael,
      encounterId: IDS.enc_rafael_infecto, doctorId: IDS.drAna,
      type: 'MEDICATION', status: 'ACTIVE',
      validFrom: daysAgo(7), validUntil: daysFromNow(83),
      items: {
        create: [
          {
            id: uuidv4(),
            medicationName: 'Tenofovir/Lamivudina (TDF/3TC)', dose: '300/300', doseUnit: 'mg',
            route: 'ORAL', frequency: '1x/dia', duration: '90 dias', durationUnit: 'DAYS',
            specialInstructions: 'Tomar em horário fixo, preferencialmente à noite.',
            sortOrder: 1,
          },
          {
            id: uuidv4(),
            medicationName: 'Dolutegravir (DTG)', dose: '50', doseUnit: 'mg',
            route: 'ORAL', frequency: '1x/dia', duration: '90 dias', durationUnit: 'DAYS',
            specialInstructions: 'Tomar junto com TDF/3TC. Evitar tomar com antiácidos.',
            sortOrder: 2,
          },
        ],
      },
    },
  });

  // ─── 9. Clinical Notes ─────────────────────────────────────────────────

  console.log('  → Creating clinical notes...');

  const notes = [
    // Maria — cardiology SOAP
    {
      id: uuidv4(), encounterId: IDS.enc_maria_cardio,
      authorId: IDS.drCarlos, authorRole: 'DOCTOR' as const,
      type: 'SOAP' as const, status: 'SIGNED' as const,
      subjective: 'Paciente retorna para acompanhamento cardiológico. Refere estar tomando as medicações regularmente. Nega dor precordial, dispnéia, palpitações ou edema. Refere episódios ocasionais de tontura postural. Nega síncope. Mantém dieta hipossódica. Atividade física leve (caminhada 3x/semana, 30 min).',
      objective: 'BEG, consciente, orientada, corada, hidratada, anictérica, acianótica.\nPA: 138x88 mmHg (sentada). FC: 76 bpm, regular. FR: 16 irpm.\nAR: MV presente bilateralmente, sem RA.\nACV: BRNF em 2T, sem sopros. Ictus não palpável.\nAbdome: Plano, flácido, indolor, sem visceromegalias.\nMMII: Sem edema, panturrilhas livres.\nGlicemia capilar: 132 mg/dL (jejum).\nPeso: 71.8 kg (perda de 0.7 kg em 30 dias).',
      assessment: 'HAS estágio I — controle parcial (PA acima da meta de 130x80). Ajustar anti-hipertensivo.\nDM2 — controle regular (glicemia jejum 132, HbA1c 7.2% há 2 meses). Manter esquema.\nDislipidemia — aguardar resultado de perfil lipídico.\nRisco cardiovascular alto (Framingham > 20%).',
      plan: '1. Aumentar Losartana para 100mg/dia VO\n2. Manter Metformina 850mg 2x/dia\n3. Manter AAS 100mg/dia\n4. Solicitar: ECG, ecocardiograma, perfil lipídico, HbA1c, função renal\n5. Orientar: intensificar atividade física, manter dieta DASH\n6. Retorno em 3 meses ou antes se sintomas\n7. Encaminhar para nutricionista',
      diagnosisCodes: ['I10', 'E11.9', 'E78.5'],
      signedAt: daysAgo(30),
      signedById: IDS.drCarlos,
    },

    // Jose — general check-up SOAP
    {
      id: uuidv4(), encounterId: IDS.enc_jose_geral,
      authorId: IDS.drAna, authorRole: 'DOCTOR' as const,
      type: 'SOAP' as const, status: 'SIGNED' as const,
      subjective: 'Paciente de 45 anos comparece para check-up anual. Sem queixas ativas. Ex-tabagista (parou há 5 anos, 10 maços/ano). Sedentário. Alimentação irregular.',
      objective: 'BEG, consciente, orientado, corado, hidratado.\nPA: 122x78 mmHg. FC: 72 bpm. FR: 14 irpm. Peso: 85.2 kg. Altura: 178 cm. IMC: 26.9 (sobrepeso).\nExame segmentar sem alterações.',
      assessment: 'Sobrepeso (IMC 26.9). Sedentarismo. Ex-tabagista.\nSem comorbidades identificadas até o momento.',
      plan: '1. Solicitar exames: hemograma, glicemia jejum, HbA1c, perfil lipídico, creatinina, TGO/TGP, TSH, PSA, urina I\n2. Orientar início de atividade física\n3. Retorno com exames em 30 dias',
      diagnosisCodes: ['Z00.0'],
      signedAt: daysAgo(15),
      signedById: IDS.drAna,
    },

    // Pedro — ICU progress note
    {
      id: uuidv4(), encounterId: IDS.enc_pedro_uti,
      authorId: IDS.drCarlos, authorRole: 'DOCTOR' as const,
      type: 'PROGRESS_NOTE' as const, status: 'SIGNED' as const,
      freeText: 'EVOLUÇÃO MÉDICA — UTI Adulto\nData: ' + daysAgo(2).toLocaleDateString('pt-BR') + '\n\nPaciente no 2o DIH por ICC descompensada. Melhora clínica progressiva. Débito urinário adequado com furosemida IV. Edema MMII +2/+4 (melhora). SpO2 92-94% com cateter nasal 2L/min. Estável hemodinamicamente. Mantém digoxina e enoxaparina profilática.\n\nPlano: Manter esquema atual. Reduzir furosemida para 40mg 1x/dia amanhã se balanço hídrico negativo mantido. Solicitar BNP controle e ecocardiograma.',
      diagnosisCodes: ['I50.0', 'J44.1', 'I48.2'],
      signedAt: daysAgo(2),
      signedById: IDS.drCarlos,
    },

    // Ana — prenatal SOAP
    {
      id: uuidv4(), encounterId: IDS.enc_ana_prenatal,
      authorId: IDS.drAna, authorRole: 'DOCTOR' as const,
      type: 'SOAP' as const, status: 'SIGNED' as const,
      subjective: 'Gestante 32 semanas, G1P0A0. Refere movimentação fetal presente e ativa. Nega perdas vaginais, contrações ou sangramento. Glicemias capilares em jejum entre 85-95 mg/dL com dieta.',
      objective: 'PA: 118x72 mmHg. Peso: 68.5 kg (ganho total: 9.5 kg). AU: 31 cm. BCF: 142 bpm. Apresentação cefálica. Edema +1/+4 maleolar bilateral.',
      assessment: 'Gestação de 32 semanas, evoluindo bem. Diabetes gestacional controlada com dieta. Crescimento fetal no percentil 50.',
      plan: '1. Manter dieta para diabetes gestacional\n2. Monitorização glicêmica: 4 medidas/dia\n3. USG com doppler em 34 semanas\n4. Retorno em 2 semanas',
      diagnosisCodes: ['O24.4', 'Z34.0'],
      signedAt: daysAgo(5),
      signedById: IDS.drAna,
    },
  ];

  for (const n of notes) {
    await prisma.clinicalNote.create({ data: n });
  }

  // ─── 10. Beds ─────────────────────────────────────────────────────────

  console.log('  → Creating beds...');

  // UTI Adulto — 10 beds
  const utiBeds = Array.from({ length: 10 }, (_, i) => {
    const num = i + 1;
    let status: string;
    let patientId: string | null = null;

    if (num === 3) {
      status = 'OCCUPIED';
      patientId = IDS.pedro;
    } else if ([1, 5, 7, 8, 9].includes(num)) {
      status = 'OCCUPIED';
      // These patients are not explicitly assigned in our data
    } else if (num === 10) {
      status = 'MAINTENANCE';
    } else {
      status = 'AVAILABLE';
    }

    return {
      id: uuidv4(),
      tenantId: IDS.tenant,
      ward: 'UTI Adulto',
      room: `UTI-A-${String(num).padStart(2, '0')}`,
      bedNumber: String(num),
      type: 'ICU' as const,
      status: status as any,
      floor: '3',
      currentPatientId: patientId,
    };
  });

  // Enfermaria 3o Andar — 20 beds
  const enfBeds = Array.from({ length: 20 }, (_, i) => {
    const num = i + 1;
    let status: string;

    if (num <= 12) {
      status = 'OCCUPIED';
    } else if (num === 13 || num === 14) {
      status = 'CLEANING';
    } else if (num === 15) {
      status = 'RESERVED';
    } else {
      status = 'AVAILABLE';
    }

    return {
      id: uuidv4(),
      tenantId: IDS.tenant,
      ward: 'Enfermaria 3o Andar',
      room: `ENF-3-${String(num).padStart(2, '0')}`,
      bedNumber: String(num),
      type: 'WARD' as const,
      status: status as any,
      floor: '3',
    };
  });

  for (const b of [...utiBeds, ...enfBeds]) {
    await prisma.bed.create({ data: b });
  }

  // ─── 11. Appointments (upcoming week) ──────────────────────────────────

  console.log('  → Creating appointments...');

  const appointments = [
    { patientId: IDS.maria, doctorId: IDS.drCarlos, type: 'RETURN' as const, date: daysFromNow(2), duration: 30, notes: 'Retorno cardiologia — reavaliação PA' },
    { patientId: IDS.jose, doctorId: IDS.drAna, type: 'RETURN' as const, date: daysFromNow(1), duration: 20, notes: 'Retorno com exames laboratoriais' },
    { patientId: IDS.anaBeatriz, doctorId: IDS.drAna, type: 'RETURN' as const, date: daysFromNow(3), duration: 30, notes: 'Pré-natal — 34 semanas' },
    { patientId: IDS.lucia, doctorId: IDS.drRoberto, type: 'RETURN' as const, date: daysFromNow(4), duration: 30, notes: 'Avaliação pré-QT ciclo 5' },
    { patientId: IDS.francisco, doctorId: IDS.drAna, type: 'FOLLOW_UP' as const, date: daysFromNow(5), duration: 30, notes: 'Acompanhamento Alzheimer' },
    { patientId: IDS.camila, doctorId: IDS.drAna, type: 'RETURN' as const, date: daysFromNow(2), duration: 30, notes: 'Retorno psiquiatria' },
    { patientId: IDS.rafael, doctorId: IDS.drAna, type: 'RETURN' as const, date: daysFromNow(6), duration: 20, notes: 'Acompanhamento HIV — resultados CV/CD4' },
    { patientId: IDS.isabella, doctorId: IDS.drAna, type: 'RETURN' as const, date: daysFromNow(3), duration: 30, notes: 'Puericultura — acompanhamento ex-prematuro' },
    { patientId: IDS.maria, doctorId: IDS.drAna, type: 'RETURN' as const, date: daysFromNow(7), duration: 20, notes: 'Retorno clínica geral — DM2' },
    { patientId: IDS.gabriel, doctorId: IDS.drAna, type: 'RETURN' as const, date: daysFromNow(5), duration: 20, notes: 'Retorno pós-crise asmática' },
  ];

  for (const a of appointments) {
    const startTime = new Date(a.date);
    startTime.setHours(8 + Math.floor(Math.random() * 8), Math.random() > 0.5 ? 30 : 0, 0, 0);

    await prisma.appointment.create({
      data: {
        id: uuidv4(),
        tenantId: IDS.tenant,
        patientId: a.patientId,
        doctorId: a.doctorId,
        type: a.type,
        status: 'SCHEDULED',
        scheduledAt: startTime,
        duration: a.duration,
        notes: a.notes,
      },
    });
  }

  // ─── 12. Clinical Alerts ───────────────────────────────────────────────

  console.log('  → Creating clinical alerts...');

  const alerts = [
    {
      tenantId: IDS.tenant, patientId: IDS.maria,
      encounterId: IDS.enc_maria_emergency,
      type: 'DRUG_INTERACTION' as const, severity: 'WARNING' as const, source: 'CLINICAL_RULE' as const,
      title: 'Potencial interação: Losartana + AINE',
      message: 'Paciente em uso de Losartana. Prescrição de anti-inflamatório não esteroidal pode reduzir efeito anti-hipertensivo e aumentar risco de lesão renal aguda. Considerar alternativa analgésica.',
      triggeredAt: hoursAgo(2),
      isActive: true,
    },
    {
      tenantId: IDS.tenant, patientId: IDS.maria,
      encounterId: IDS.enc_maria_emergency,
      type: 'ALLERGY' as const, severity: 'EMERGENCY' as const, source: 'SYSTEM' as const,
      title: 'ALERGIA GRAVE: Dipirona — Anafilaxia',
      message: 'Paciente Maria da Silva Santos possui registro de ANAFILAXIA por Dipirona. Reação prévia: edema de glote, hipotensão, urticária generalizada. CONTRAINDICAÇÃO ABSOLUTA.',
      triggeredAt: hoursAgo(3),
      isActive: true,
    },
    {
      tenantId: IDS.tenant, patientId: IDS.pedro,
      encounterId: IDS.enc_pedro_uti,
      type: 'LAB_CRITICAL' as const, severity: 'CRITICAL' as const, source: 'LAB_INTERFACE' as const,
      title: 'Potássio 6.2 mEq/L — Valor Crítico',
      message: 'Resultado laboratorial crítico: Potássio sérico 6.2 mEq/L (referência: 3.5-5.0). Risco de arritmia cardíaca. Verificar ECG e iniciar protocolo de hipercalemia.',
      triggeredAt: hoursAgo(1),
      isActive: true,
    },
    {
      tenantId: IDS.tenant, patientId: IDS.pedro,
      encounterId: IDS.enc_pedro_uti,
      type: 'VITAL_SIGN' as const, severity: 'CRITICAL' as const, source: 'SYSTEM' as const,
      title: 'SpO2 < 90% — Dessaturação',
      message: 'Paciente Pedro H. Martins (UTI-A-03): SpO2 registrada em 87%. Abaixo do limiar de segurança. Verificar oxigenoterapia e considerar aumento de suporte ventilatório.',
      triggeredAt: hoursAgo(1),
      isActive: true,
    },
    {
      tenantId: IDS.tenant, patientId: IDS.maria,
      type: 'PROTOCOL_DEVIATION' as const, severity: 'WARNING' as const, source: 'AI_ENGINE' as const,
      title: 'HbA1c atrasada — Paciente DM2',
      message: 'Paciente diabética Maria da Silva Santos não realizou dosagem de HbA1c nos últimos 4 meses. Protocolo recomenda dosagem a cada 3 meses para pacientes em ajuste terapêutico.',
      triggeredAt: hoursAgo(6),
      isActive: true,
    },
    {
      tenantId: IDS.tenant, patientId: IDS.gabriel,
      encounterId: IDS.enc_gabriel_asma,
      type: 'ALLERGY' as const, severity: 'WARNING' as const, source: 'CLINICAL_RULE' as const,
      title: 'Alergia a AAS — Verificar prescrição',
      message: 'Paciente Gabriel S. Lima possui alergia registrada a AAS (urticária + sibilância). Qualquer prescrição de salicilatos deve ser evitada.',
      triggeredAt: hoursAgo(2),
      isActive: true,
    },
    {
      tenantId: IDS.tenant, patientId: IDS.pedro,
      encounterId: IDS.enc_pedro_uti,
      type: 'DETERIORATION' as const, severity: 'WARNING' as const, source: 'AI_ENGINE' as const,
      title: 'NEWS2 Score Elevado — Risco de deterioração',
      message: 'Score NEWS2 calculado: 7 (risco moderado-alto). Parâmetros alterados: SpO2 em suplementação, FC > 90, FR > 20. Recomenda-se avaliação médica urgente.',
      triggeredAt: hoursAgo(1),
      isActive: true,
    },
  ];

  for (const al of alerts) {
    await prisma.clinicalAlert.create({
      data: {
        id: uuidv4(),
        ...al,
      },
    });
  }

  // ─── 13. Document Templates ────────────────────────────────────────────

  console.log('  → Creating document templates...');

  const templates = [
    {
      id: IDS.tpl_receita_simples,
      tenantId: IDS.tenant,
      name: 'Receita Simples',
      type: 'RECEITA' as const,
      category: 'prescription',
      content: `{{hospital_header}}\n\nRECEITA MÉDICA\n\nPaciente: {{patient_name}}\nData de nascimento: {{patient_birthdate}}\n\nData: {{date}}\n\nUso {{route}}:\n\n{{prescription_items}}\n\n{{doctor_signature}}\n{{doctor_crm}}`,
      isActive: true,
      createdById: IDS.admRicardo,
    },
    {
      id: IDS.tpl_receita_especial,
      tenantId: IDS.tenant,
      name: 'Receita Especial (Controlados)',
      type: 'RECEITA' as const,
      category: 'prescription',
      content: `{{hospital_header}}\n\nRECEITA DE CONTROLE ESPECIAL\n1a Via — Retida na Farmácia | 2a Via — Paciente\n\nPaciente: {{patient_name}}\nEndereço: {{patient_address}}\nRG/CPF: {{patient_document}}\n\nData: {{date}}\n\n{{prescription_items}}\n\n{{doctor_signature}}\n{{doctor_crm}}`,
      isActive: true,
      createdById: IDS.admRicardo,
    },
    {
      id: IDS.tpl_atestado,
      tenantId: IDS.tenant,
      name: 'Atestado Médico',
      type: 'ATESTADO' as const,
      category: 'certificate',
      content: `{{hospital_header}}\n\nATESTADO MÉDICO\n\nAtesto, para os devidos fins, que o(a) Sr(a). {{patient_name}}, portador(a) do CPF {{patient_cpf}}, esteve sob meus cuidados profissionais no dia {{date}}, necessitando de afastamento de suas atividades por {{days}} dia(s).\n\nCID: {{cid}} (informado com consentimento do paciente)\n\n{{city}}, {{full_date}}.\n\n{{doctor_signature}}\n{{doctor_crm}}`,
      isActive: true,
      createdById: IDS.admRicardo,
    },
    {
      id: IDS.tpl_consentimento,
      tenantId: IDS.tenant,
      name: 'Termo de Consentimento Cirúrgico',
      type: 'CONSENTIMENTO' as const,
      category: 'consent',
      content: `{{hospital_header}}\n\nTERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO — PROCEDIMENTO CIRÚRGICO\n\nEu, {{patient_name}}, CPF {{patient_cpf}}, declaro que fui devidamente informado(a) pelo(a) Dr(a). {{doctor_name}} sobre:\n\n1. O DIAGNÓSTICO: {{diagnosis}}\n2. O PROCEDIMENTO PROPOSTO: {{procedure}}\n3. Os RISCOS E BENEFÍCIOS\n4. ALTERNATIVAS ao tratamento\n\n{{city}}, {{full_date}}.\n\n_______________________________\nPaciente ou Responsável Legal\n\n{{doctor_signature}}\n{{doctor_crm}}`,
      isActive: true,
      createdById: IDS.admRicardo,
    },
    {
      id: IDS.tpl_resumo_alta,
      tenantId: IDS.tenant,
      name: 'Resumo de Alta',
      type: 'SUMARIO_ALTA' as const,
      category: 'discharge',
      content: `{{hospital_header}}\n\nRESUMO DE ALTA HOSPITALAR\n\nPaciente: {{patient_name}}\nData de internação: {{admission_date}}\nData de alta: {{discharge_date}}\n\nMOTIVO DA INTERNAÇÃO:\n{{admission_reason}}\n\nDIAGNÓSTICOS (CID-10):\n{{diagnoses}}\n\nPRESCRIÇÃO DE ALTA:\n{{discharge_prescription}}\n\nORIENTAÇÕES:\n{{instructions}}\n\nRETORNO:\n{{follow_up}}\n\n{{doctor_signature}}\n{{doctor_crm}}`,
      isActive: true,
      createdById: IDS.admRicardo,
    },
  ];

  for (const t of templates) {
    await prisma.documentTemplate.create({ data: t });
  }

  // ─── 17. LGPD Data Retention Policies ────────────────────────────────────

  console.log('  → Creating LGPD data retention policies...');

  const retentionPolicies = [
    {
      tenantId: IDS.tenant,
      dataCategory: 'HEALTH_RECORDS' as const,
      retentionYears: 20,
      legalBasis: 'CFM Resolucao 1.821/2007',
      description: 'Prontuarios medicos devem ser mantidos por no minimo 20 anos apos o ultimo registro',
    },
    {
      tenantId: IDS.tenant,
      dataCategory: 'VOICE_RECORDINGS' as const,
      retentionYears: 20,
      legalBasis: 'CFM Resolucao 1.821/2007 — retencao de audio clinico',
      description: 'Gravacoes de voz clinicas seguem a mesma retencao de prontuarios',
    },
    {
      tenantId: IDS.tenant,
      dataCategory: 'PRESCRIPTIONS' as const,
      retentionYears: 5,
      legalBasis: 'Portaria 344/98 — ANVISA',
      description: 'Receituarios e prescricoes controladas retidos por 5 anos',
    },
    {
      tenantId: IDS.tenant,
      dataCategory: 'LAB_RESULTS' as const,
      retentionYears: 20,
      legalBasis: 'CFM Resolucao 1.821/2007',
      description: 'Resultados laboratoriais sao parte integrante do prontuario',
    },
    {
      tenantId: IDS.tenant,
      dataCategory: 'BILLING' as const,
      retentionYears: 10,
      legalBasis: 'Codigo Tributario Nacional — obrigacao fiscal',
      description: 'Documentos fiscais e de faturamento retidos por 10 anos',
    },
    {
      tenantId: IDS.tenant,
      dataCategory: 'AUDIT_LOGS' as const,
      retentionYears: 5,
      legalBasis: 'LGPD Art. 37 — registro de atividades de tratamento',
      description: 'Logs de auditoria para rastreabilidade de acessos',
    },
    {
      tenantId: IDS.tenant,
      dataCategory: 'PERSONAL_IDENTIFICATION' as const,
      retentionYears: 20,
      legalBasis: 'CFM Resolucao 1.821/2007 + LGPD Art. 15-16',
      description: 'Dados de identificacao pessoal enquanto ativo + 20 anos',
    },
    {
      tenantId: IDS.tenant,
      dataCategory: 'IMAGING' as const,
      retentionYears: 20,
      legalBasis: 'CFM Resolucao 1.821/2007',
      description: 'Exames de imagem sao parte integrante do prontuario',
    },
  ];

  for (const policy of retentionPolicies) {
    await prisma.dataRetentionPolicy.create({ data: policy });
  }

  // ─── 18. LGPD Sample Consent Records ───────────────────────────────────

  console.log('  → Creating LGPD sample consent records...');

  const consentRecords = [
    {
      patientId: IDS.maria,
      tenantId: IDS.tenant,
      type: 'LGPD_GENERAL' as const,
      purpose: 'Consentimento geral para coleta e tratamento de dados pessoais',
      granted: true,
      grantedAt: daysAgo(90),
      legalBasis: 'CONSENT' as const,
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    },
    {
      patientId: IDS.maria,
      tenantId: IDS.tenant,
      type: 'VOICE_RECORDING' as const,
      purpose: 'Consentimento para gravacao de voz durante consultas',
      granted: true,
      grantedAt: daysAgo(90),
      legalBasis: 'CONSENT' as const,
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    },
    {
      patientId: IDS.maria,
      tenantId: IDS.tenant,
      type: 'AI_PROCESSING' as const,
      purpose: 'Consentimento para processamento por inteligencia artificial',
      granted: true,
      grantedAt: daysAgo(90),
      legalBasis: 'CONSENT' as const,
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    },
    {
      patientId: IDS.jose,
      tenantId: IDS.tenant,
      type: 'LGPD_GENERAL' as const,
      purpose: 'Consentimento geral para coleta e tratamento de dados pessoais',
      granted: true,
      grantedAt: daysAgo(60),
      legalBasis: 'CONSENT' as const,
      ipAddress: '192.168.1.101',
      userAgent: 'Mozilla/5.0 (Linux; Android 13)',
    },
    {
      patientId: IDS.jose,
      tenantId: IDS.tenant,
      type: 'VOICE_RECORDING' as const,
      purpose: 'Consentimento para gravacao de voz durante consultas',
      granted: false,
      legalBasis: 'CONSENT' as const,
      ipAddress: '192.168.1.101',
      userAgent: 'Mozilla/5.0 (Linux; Android 13)',
    },
    {
      patientId: IDS.pedro,
      tenantId: IDS.tenant,
      type: 'LGPD_GENERAL' as const,
      purpose: 'Consentimento geral para coleta e tratamento de dados pessoais',
      granted: true,
      grantedAt: daysAgo(30),
      legalBasis: 'HEALTH_PROTECTION' as const,
      ipAddress: '192.168.1.102',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    },
  ];

  for (const consent of consentRecords) {
    await prisma.consentRecord.create({ data: consent });
  }

  // ─── Done ──────────────────────────────────────────────────────────────

  console.log('\n✅ Seed completed successfully!');
  console.log('   Created:');
  console.log('   - 1 Tenant (Hospital São Lucas)');
  console.log('   - 8 Users (3 doctors, 2 nurses, 1 pharmacist, 1 admin, 1 receptionist)');
  console.log('   - 10 Patients with rich clinical histories');
  console.log('   - 10 Social Histories');
  console.log('   - 12 Family Histories');
  console.log('   - 7 Surgical Histories');
  console.log('   - 11 Vaccinations');
  console.log('   - 7 Allergies');
  console.log('   - 15 Chronic Conditions');
  console.log('   - 15 Encounters');
  console.log('   - 16 Vital Sign records');
  console.log('   - 5 Prescriptions with 14 items');
  console.log('   - 4 Clinical Notes');
  console.log('   - 30 Beds (10 UTI + 20 Enfermaria)');
  console.log('   - 10 Appointments');
  console.log('   - 7 Clinical Alerts');
  console.log('   - 5 Document Templates');
  console.log('   - 8 LGPD Data Retention Policies');
  console.log('   - 6 LGPD Consent Records');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
