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
import { seedDrugs } from './seed-drugs';

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

  // Prescription Items (pre-generated for MedicationCheck FK references)
  rxItem_maria_losartana: uuidv4(),
  rxItem_maria_metformina: uuidv4(),
  rxItem_maria_aas: uuidv4(),
  rxItem_maria_omeprazol: uuidv4(),
  rxItem_pedro_furosemida: uuidv4(),
  rxItem_pedro_enoxaparina: uuidv4(),
  rxItem_pedro_digoxina: uuidv4(),
  rxItem_pedro_insulina: uuidv4(),
  rxItem_gabriel_salbutamol: uuidv4(),
  rxItem_gabriel_prednisolona: uuidv4(),
  rxItem_camila_escitalopram: uuidv4(),
  rxItem_camila_clonazepam: uuidv4(),
  rxItem_rafael_tdf3tc: uuidv4(),
  rxItem_rafael_dtg: uuidv4(),

  // Document Templates
  tpl_receita_simples: uuidv4(),
  tpl_receita_especial: uuidv4(),
  tpl_atestado: uuidv4(),
  tpl_consentimento: uuidv4(),
  tpl_resumo_alta: uuidv4(),

  // New expanded seed IDs
  // Surgical Procedures
  surg_pedro_colec: uuidv4(),
  surg_lucia_biopsia: uuidv4(),
  surg_jose_herni: uuidv4(),
  surg_maria_cateter: uuidv4(),
  surg_pedro_uti_proc: uuidv4(),

  // Billing Entries
  bill_maria_cardio: uuidv4(),
  bill_pedro_uti: uuidv4(),
  bill_jose_checkup: uuidv4(),
  bill_ana_prenatal: uuidv4(),
  bill_lucia_onco: uuidv4(),
  bill_gabriel_asma: uuidv4(),
  bill_camila_psiq: uuidv4(),
  bill_rafael_hiv: uuidv4(),

  // Chemotherapy Protocols
  proto_ac: uuidv4(),
  proto_folfox: uuidv4(),
  proto_chop: uuidv4(),

  // Chemotherapy Cycles
  cycle_lucia_ac1: uuidv4(),
  cycle_lucia_ac2: uuidv4(),
  cycle_lucia_ac3: uuidv4(),
  cycle_lucia_ac4: uuidv4(),
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

  // ─── 0. Cleanup (idempotent re-seed) ─────────────────────────────────────
  console.log('  → Cleaning existing data...');
  await prisma.$executeRawUnsafe(`
    DO $$ DECLARE r RECORD;
    BEGIN
      FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename != '_prisma_migrations')
      LOOP EXECUTE 'TRUNCATE TABLE "' || r.tablename || '" CASCADE'; END LOOP;
    END $$;
  `);

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
            id: IDS.rxItem_maria_losartana,
            medicationName: 'Losartana Potássica', dose: '50', doseUnit: 'mg',
            route: 'ORAL', frequency: '1x/dia (manhã)', duration: '90 dias', durationUnit: 'DAYS',
            specialInstructions: 'Tomar em jejum pela manhã',
            sortOrder: 1,
          },
          {
            id: IDS.rxItem_maria_metformina,
            medicationName: 'Metformina', dose: '850', doseUnit: 'mg',
            route: 'ORAL', frequency: '2x/dia (café e jantar)', duration: '90 dias', durationUnit: 'DAYS',
            specialInstructions: 'Tomar durante ou após refeições para reduzir desconforto GI',
            sortOrder: 2,
          },
          {
            id: IDS.rxItem_maria_aas,
            medicationName: 'Ácido Acetilsalicílico', dose: '100', doseUnit: 'mg',
            route: 'ORAL', frequency: '1x/dia (almoço)', duration: '90 dias', durationUnit: 'DAYS',
            specialInstructions: 'Tomar após almoço',
            sortOrder: 3,
          },
          {
            id: IDS.rxItem_maria_omeprazol,
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
            id: IDS.rxItem_pedro_furosemida,
            medicationName: 'Furosemida', dose: '40', doseUnit: 'mg',
            route: 'IV', frequency: '12/12h', duration: '7 dias', durationUnit: 'DAYS',
            specialInstructions: 'Infundir em 5 minutos. Controlar débito urinário.',
            sortOrder: 1,
          },
          {
            id: IDS.rxItem_pedro_enoxaparina,
            medicationName: 'Enoxaparina', dose: '40', doseUnit: 'mg',
            route: 'SC', frequency: '1x/dia', duration: '7 dias', durationUnit: 'DAYS',
            specialInstructions: 'Aplicar na região abdominal. Profilaxia TVP.',
            isHighAlert: true,
            sortOrder: 2,
          },
          {
            id: IDS.rxItem_pedro_digoxina,
            medicationName: 'Digoxina', dose: '0.25', doseUnit: 'mg',
            route: 'ORAL', frequency: '1x/dia', duration: '7 dias', durationUnit: 'DAYS',
            specialInstructions: 'Monitorar nível sérico. Atentar para sinais de intoxicação digitálica.',
            sortOrder: 3,
          },
          {
            id: IDS.rxItem_pedro_insulina,
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
            id: IDS.rxItem_gabriel_salbutamol,
            medicationName: 'Salbutamol (nebulização)', dose: '2.5', doseUnit: 'mg',
            route: 'NEBULIZATION', frequency: 'A cada 20 min (3 doses), depois SOS',
            specialInstructions: 'Diluir em 3mL SF 0.9%. Nebulizar com O2 6L/min.',
            sortOrder: 1,
          },
          {
            id: IDS.rxItem_gabriel_prednisolona,
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
            id: IDS.rxItem_camila_escitalopram,
            medicationName: 'Escitalopram', dose: '15', doseUnit: 'mg',
            route: 'ORAL', frequency: '1x/dia (manhã)', duration: '90 dias', durationUnit: 'DAYS',
            isControlled: true, controlledSchedule: 'C1',
            specialInstructions: 'Tomar pela manhã. Não suspender abruptamente.',
            sortOrder: 1,
          },
          {
            id: IDS.rxItem_camila_clonazepam,
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
            id: IDS.rxItem_rafael_tdf3tc,
            medicationName: 'Tenofovir/Lamivudina (TDF/3TC)', dose: '300/300', doseUnit: 'mg',
            route: 'ORAL', frequency: '1x/dia', duration: '90 dias', durationUnit: 'DAYS',
            specialInstructions: 'Tomar em horário fixo, preferencialmente à noite.',
            sortOrder: 1,
          },
          {
            id: IDS.rxItem_rafael_dtg,
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

  // ─── 14. Additional Vital Signs ────────────────────────────────────────

  console.log('  → Creating additional vital signs...');

  const additionalVitals = [
    // Ana Beatriz — prenatal vitals over 3 visits
    { patientId: IDS.anaBeatriz, encounterId: IDS.enc_ana_prenatal, recordedById: IDS.enfPatricia, recordedAt: daysAgo(5), source: 'MANUAL' as const, systolicBP: 118, diastolicBP: 72, heartRate: 88, respiratoryRate: 16, temperature: 36.5, temperatureMethod: 'AXILLARY' as const, oxygenSaturation: 99, oxygenSupplementation: 'ROOM_AIR' as const, painScale: 0, weight: 68.5, height: 165 },
    { patientId: IDS.anaBeatriz, encounterId: IDS.enc_ana_prenatal, recordedById: IDS.enfPatricia, recordedAt: daysAgo(20), source: 'MANUAL' as const, systolicBP: 115, diastolicBP: 70, heartRate: 85, respiratoryRate: 15, temperature: 36.4, temperatureMethod: 'AXILLARY' as const, oxygenSaturation: 99, oxygenSupplementation: 'ROOM_AIR' as const, painScale: 0, weight: 67.0, height: 165 },
    { patientId: IDS.anaBeatriz, encounterId: IDS.enc_ana_prenatal, recordedById: IDS.enfJoao, recordedAt: daysAgo(35), source: 'MANUAL' as const, systolicBP: 112, diastolicBP: 68, heartRate: 82, respiratoryRate: 14, temperature: 36.3, temperatureMethod: 'AXILLARY' as const, oxygenSaturation: 99, oxygenSupplementation: 'ROOM_AIR' as const, painScale: 0, weight: 65.5, height: 165, glucoseLevel: 92, glucoseContext: 'FASTING' as const },

    // Lucia — oncology vitals before/after chemo
    { patientId: IDS.lucia, encounterId: IDS.enc_lucia_onco, recordedById: IDS.enfPatricia, recordedAt: daysAgo(10), source: 'MANUAL' as const, systolicBP: 105, diastolicBP: 65, heartRate: 88, respiratoryRate: 18, temperature: 37.2, temperatureMethod: 'AXILLARY' as const, oxygenSaturation: 97, oxygenSupplementation: 'ROOM_AIR' as const, painScale: 3, weight: 58.0, height: 162 },
    { patientId: IDS.lucia, encounterId: IDS.enc_lucia_onco, recordedById: IDS.enfPatricia, recordedAt: daysAgo(25), source: 'MANUAL' as const, systolicBP: 108, diastolicBP: 68, heartRate: 92, respiratoryRate: 19, temperature: 37.5, temperatureMethod: 'AXILLARY' as const, oxygenSaturation: 96, oxygenSupplementation: 'ROOM_AIR' as const, painScale: 4, weight: 59.2, height: 162 },
    { patientId: IDS.lucia, encounterId: IDS.enc_lucia_onco, recordedById: IDS.enfJoao, recordedAt: daysAgo(40), source: 'MANUAL' as const, systolicBP: 110, diastolicBP: 70, heartRate: 80, respiratoryRate: 16, temperature: 36.8, temperatureMethod: 'AXILLARY' as const, oxygenSaturation: 98, oxygenSupplementation: 'ROOM_AIR' as const, painScale: 2, weight: 61.0, height: 162 },

    // Francisco — multiple visits
    { patientId: IDS.francisco, encounterId: IDS.enc_francisco_neuro, recordedById: IDS.enfJoao, recordedAt: daysAgo(20), source: 'MANUAL' as const, systolicBP: 148, diastolicBP: 90, heartRate: 72, respiratoryRate: 15, temperature: 36.6, temperatureMethod: 'AXILLARY' as const, oxygenSaturation: 96, oxygenSupplementation: 'ROOM_AIR' as const, painScale: 0, weight: 70.0, height: 170 },
    { patientId: IDS.francisco, encounterId: IDS.enc_francisco_neuro, recordedById: IDS.enfJoao, recordedAt: daysAgo(50), source: 'MANUAL' as const, systolicBP: 152, diastolicBP: 94, heartRate: 76, respiratoryRate: 16, temperature: 36.7, temperatureMethod: 'AXILLARY' as const, oxygenSaturation: 95, oxygenSupplementation: 'ROOM_AIR' as const, painScale: 0, weight: 71.5, height: 170 },
    { patientId: IDS.francisco, encounterId: IDS.enc_francisco_neuro, recordedById: IDS.enfPatricia, recordedAt: daysAgo(80), source: 'MANUAL' as const, systolicBP: 146, diastolicBP: 88, heartRate: 70, respiratoryRate: 14, temperature: 36.5, temperatureMethod: 'AXILLARY' as const, oxygenSaturation: 97, oxygenSupplementation: 'ROOM_AIR' as const, painScale: 0, weight: 72.0, height: 170 },

    // Camila — psych follow-ups
    { patientId: IDS.camila, encounterId: IDS.enc_camila_psiq, recordedById: IDS.enfJoao, recordedAt: daysAgo(14), source: 'MANUAL' as const, systolicBP: 112, diastolicBP: 72, heartRate: 80, respiratoryRate: 14, temperature: 36.4, temperatureMethod: 'AXILLARY' as const, oxygenSaturation: 99, oxygenSupplementation: 'ROOM_AIR' as const, painScale: 2, weight: 62.0, height: 167 },
    { patientId: IDS.camila, encounterId: IDS.enc_camila_psiq, recordedById: IDS.enfJoao, recordedAt: daysAgo(45), source: 'MANUAL' as const, systolicBP: 115, diastolicBP: 75, heartRate: 84, respiratoryRate: 15, temperature: 36.6, temperatureMethod: 'AXILLARY' as const, oxygenSaturation: 99, oxygenSupplementation: 'ROOM_AIR' as const, painScale: 3, weight: 63.5, height: 167 },

    // Rafael — HIV follow-ups
    { patientId: IDS.rafael, encounterId: IDS.enc_rafael_infecto, recordedById: IDS.enfJoao, recordedAt: daysAgo(7), source: 'MANUAL' as const, systolicBP: 120, diastolicBP: 78, heartRate: 68, respiratoryRate: 14, temperature: 36.3, temperatureMethod: 'AXILLARY' as const, oxygenSaturation: 99, oxygenSupplementation: 'ROOM_AIR' as const, painScale: 0, weight: 78.0, height: 180 },
    { patientId: IDS.rafael, encounterId: IDS.enc_rafael_infecto, recordedById: IDS.enfJoao, recordedAt: daysAgo(90), source: 'MANUAL' as const, systolicBP: 118, diastolicBP: 76, heartRate: 70, respiratoryRate: 14, temperature: 36.4, temperatureMethod: 'AXILLARY' as const, oxygenSaturation: 99, oxygenSupplementation: 'ROOM_AIR' as const, painScale: 0, weight: 77.5, height: 180 },

    // Isabella — neonatal vitals
    { patientId: IDS.isabella, encounterId: IDS.enc_isabella_neo, recordedById: IDS.enfPatricia, recordedAt: daysAgo(10), source: 'MANUAL' as const, systolicBP: 65, diastolicBP: 40, heartRate: 148, respiratoryRate: 44, temperature: 36.7, temperatureMethod: 'AXILLARY' as const, oxygenSaturation: 97, oxygenSupplementation: 'ROOM_AIR' as const, painScale: 0, weight: 2.1, height: 46 },
    { patientId: IDS.isabella, encounterId: IDS.enc_isabella_neo, recordedById: IDS.enfPatricia, recordedAt: daysAgo(30), source: 'MANUAL' as const, systolicBP: 62, diastolicBP: 38, heartRate: 152, respiratoryRate: 46, temperature: 36.9, temperatureMethod: 'AXILLARY' as const, oxygenSaturation: 95, oxygenSupplementation: 'NASAL_CANNULA' as const, painScale: 0, weight: 1.8, height: 44 },
  ];

  for (const v of additionalVitals) {
    await prisma.vitalSigns.create({ data: { id: uuidv4(), ...v } });
  }

  // ─── 15. Additional Appointments ───────────────────────────────────────

  console.log('  → Creating additional appointments...');

  const additionalAppointments = [
    // Confirmed appointments
    { patientId: IDS.pedro, doctorId: IDS.drCarlos, type: 'RETURN' as const, daysOffset: 1, status: 'CONFIRMED' as const, notes: 'Retorno cardiologia — alta UTI prevista' },
    { patientId: IDS.jose, doctorId: IDS.drRoberto, type: 'PROCEDURE' as const, daysOffset: 3, status: 'CONFIRMED' as const, notes: 'Avaliação pré-operatória herniorrafia' },
    // In progress
    { patientId: IDS.lucia, doctorId: IDS.drRoberto, type: 'RETURN' as const, daysOffset: 0, status: 'IN_PROGRESS' as const, notes: 'Consulta oncologia dia hospital' },
    // Cancelled
    { patientId: IDS.gabriel, doctorId: IDS.drAna, type: 'RETURN' as const, daysOffset: -1, status: 'CANCELLED' as const, notes: 'Cancelado pelo paciente — reagendado' },
    { patientId: IDS.maria, doctorId: IDS.drCarlos, type: 'EXAM' as const, daysOffset: -2, status: 'COMPLETED' as const, notes: 'Ecocardiograma — realizado' },
    // Future week
    { patientId: IDS.jose, doctorId: IDS.drAna, type: 'FIRST_VISIT' as const, daysOffset: 6, status: 'SCHEDULED' as const, notes: 'Consulta com nutricionista' },
    { patientId: IDS.francisco, doctorId: IDS.drRoberto, type: 'PROCEDURE' as const, daysOffset: 7, status: 'SCHEDULED' as const, notes: 'Avaliação urológica de rotina' },
    { patientId: IDS.camila, doctorId: IDS.drAna, type: 'FOLLOW_UP' as const, daysOffset: 4, status: 'CONFIRMED' as const, notes: 'Retorno psiquiatria — ajuste posologia' },
  ];

  for (const a of additionalAppointments) {
    const scheduledAt = new Date();
    scheduledAt.setDate(scheduledAt.getDate() + a.daysOffset);
    scheduledAt.setHours(8 + Math.floor(Math.random() * 9), Math.random() > 0.5 ? 30 : 0, 0, 0);
    await prisma.appointment.create({
      data: {
        id: uuidv4(),
        tenantId: IDS.tenant,
        patientId: a.patientId,
        doctorId: a.doctorId,
        type: a.type,
        status: a.status,
        scheduledAt,
        duration: 30,
        notes: a.notes,
      },
    });
  }

  // ─── 16. Medication Checks ─────────────────────────────────────────────

  console.log('  → Creating medication checks...');

  // Pedro ICU — furosemida 12/12h checks
  const pedroFurosemidaChecks = [
    { scheduledAt: hoursAgo(72), checkedAt: hoursAgo(71), status: 'ADMINISTERED' as const, observations: 'Administrado conforme prescrito. DU: 850mL/turno.' },
    { scheduledAt: hoursAgo(60), checkedAt: hoursAgo(59), status: 'ADMINISTERED' as const, observations: 'Administrado. DU: 720mL. Balanço negativo mantido.' },
    { scheduledAt: hoursAgo(48), checkedAt: hoursAgo(47), status: 'ADMINISTERED' as const, observations: 'Administrado. PA estável. DU adequado.' },
    { scheduledAt: hoursAgo(36), checkedAt: hoursAgo(35), status: 'ADMINISTERED' as const, observations: 'Administrado. Edema MMII em regressão.' },
    { scheduledAt: hoursAgo(24), checkedAt: null, status: 'SCHEDULED' as const },
  ];
  for (const c of pedroFurosemidaChecks) {
    await prisma.medicationCheck.create({
      data: { id: uuidv4(), prescriptionItemId: IDS.rxItem_pedro_furosemida, nurseId: IDS.enfPatricia, ...c },
    });
  }

  // Pedro ICU — enoxaparina 1x/dia
  const pedroEnoxaChecks = [
    { scheduledAt: hoursAgo(72), checkedAt: hoursAgo(71), status: 'ADMINISTERED' as const, observations: 'Aplicado região abdominal D. Sem hematoma.' },
    { scheduledAt: hoursAgo(48), checkedAt: hoursAgo(47), status: 'ADMINISTERED' as const, observations: 'Aplicado região abdominal E. Sem intercorrências.' },
    { scheduledAt: hoursAgo(24), checkedAt: null, status: 'SCHEDULED' as const },
  ];
  for (const c of pedroEnoxaChecks) {
    await prisma.medicationCheck.create({
      data: { id: uuidv4(), prescriptionItemId: IDS.rxItem_pedro_enoxaparina, nurseId: IDS.enfJoao, ...c },
    });
  }

  // Pedro ICU — insulina 2x/dia
  const pedroInsulinaChecks = [
    { scheduledAt: hoursAgo(60), checkedAt: hoursAgo(59), status: 'ADMINISTERED' as const, observations: 'Glicemia pré: 189mg/dL. Administrado 20UI NPH SC.' },
    { scheduledAt: hoursAgo(48), checkedAt: hoursAgo(46), status: 'DELAYED' as const, observations: 'Atraso de 2h por procedimento. Glicemia 210. Administrado.' },
    { scheduledAt: hoursAgo(36), checkedAt: hoursAgo(35), status: 'ADMINISTERED' as const, observations: 'Glicemia pré: 165mg/dL. Administrado 20UI.' },
    { scheduledAt: hoursAgo(24), checkedAt: null, status: 'SCHEDULED' as const },
  ];
  for (const c of pedroInsulinaChecks) {
    await prisma.medicationCheck.create({
      data: { id: uuidv4(), prescriptionItemId: IDS.rxItem_pedro_insulina, nurseId: IDS.enfPatricia, ...c },
    });
  }

  // Gabriel — salbutamol nebulizações
  const gabrielSalbutamolChecks = [
    { scheduledAt: hoursAgo(2), checkedAt: hoursAgo(2), status: 'ADMINISTERED' as const, observations: '1a nebulização. SpO2 antes: 93%. Após: 96%.' },
    { scheduledAt: hoursAgo(1), checkedAt: hoursAgo(1), status: 'ADMINISTERED' as const, observations: '2a nebulização. SpO2 97%. FC 105.' },
    { scheduledAt: new Date(Date.now() - 20 * 60 * 1000), checkedAt: null, status: 'SCHEDULED' as const },
  ];
  for (const c of gabrielSalbutamolChecks) {
    await prisma.medicationCheck.create({
      data: { id: uuidv4(), prescriptionItemId: IDS.rxItem_gabriel_salbutamol, nurseId: IDS.enfPatricia, ...c },
    });
  }

  // Maria — losartana checks
  const mariaLosartanaChecks = [
    { scheduledAt: daysAgo(3), checkedAt: daysAgo(3), status: 'ADMINISTERED' as const, observations: 'PA antes: 138x88. Medicamento administrado.' },
    { scheduledAt: daysAgo(2), checkedAt: daysAgo(2), status: 'ADMINISTERED' as const },
    { scheduledAt: daysAgo(1), checkedAt: daysAgo(1), status: 'ADMINISTERED' as const },
    { scheduledAt: new Date(), checkedAt: null, status: 'SCHEDULED' as const },
  ];
  for (const c of mariaLosartanaChecks) {
    await prisma.medicationCheck.create({
      data: { id: uuidv4(), prescriptionItemId: IDS.rxItem_maria_losartana, nurseId: IDS.enfJoao, ...c },
    });
  }

  // ─── 17. Surgical Procedures ───────────────────────────────────────────

  console.log('  → Creating surgical procedures...');

  await prisma.surgicalProcedure.create({
    data: {
      id: IDS.surg_pedro_uti_proc,
      encounterId: IDS.enc_pedro_uti,
      patientId: IDS.pedro,
      tenantId: IDS.tenant,
      surgeonId: IDS.drRoberto,
      anesthesiologistId: IDS.drCarlos,
      scrubNurseId: IDS.enfPatricia,
      procedureName: 'Toracocentese diagnóstica e terapêutica',
      procedureCode: '30606019',
      laterality: 'LEFT',
      anesthesiaType: 'LOCAL',
      scheduledAt: daysAgo(2),
      patientInAt: daysAgo(2),
      incisionAt: daysAgo(2),
      sutureAt: daysAgo(2),
      patientOutAt: daysAgo(2),
      status: 'COMPLETED',
      surgicalDescription: 'Toracocentese esquerda realizada com agulha 14G. Drenado 800mL de líquido seroso. Material enviado para citologia e bioquímica. Sem intercorrências. RX pós-procedimento confirmou reexpansão pulmonar adequada.',
      bloodLoss: 10,
    },
  });

  await prisma.surgicalProcedure.create({
    data: {
      id: IDS.surg_lucia_biopsia,
      encounterId: IDS.enc_lucia_onco,
      patientId: IDS.lucia,
      tenantId: IDS.tenant,
      surgeonId: IDS.drRoberto,
      scrubNurseId: IDS.enfPatricia,
      procedureName: 'Biópsia de gânglio sentinela por radioisótopo',
      procedureCode: '20104119',
      laterality: 'LEFT',
      anesthesiaType: 'GENERAL',
      scheduledAt: daysFromNow(14),
      status: 'SCHEDULED',
      safetyChecklistBefore: {
        patientIdentified: true,
        siteMarked: true,
        allergyCheck: true,
        consentSigned: true,
        bloodAvailable: false,
        implantCheck: false,
      },
    },
  });

  await prisma.surgicalProcedure.create({
    data: {
      id: IDS.surg_jose_herni,
      encounterId: IDS.enc_jose_geral,
      patientId: IDS.jose,
      tenantId: IDS.tenant,
      surgeonId: IDS.drRoberto,
      scrubNurseId: IDS.enfPatricia,
      circulatingNurseId: IDS.enfJoao,
      procedureName: 'Herniorrafia inguinal unilateral com tela (laparoscópica)',
      procedureCode: '30721064',
      laterality: 'RIGHT',
      anesthesiaType: 'GENERAL',
      scheduledAt: daysFromNow(10),
      status: 'SCHEDULED',
    },
  });

  await prisma.surgicalProcedure.create({
    data: {
      id: IDS.surg_maria_cateter,
      encounterId: IDS.enc_maria_emergency,
      patientId: IDS.maria,
      tenantId: IDS.tenant,
      surgeonId: IDS.drCarlos,
      scrubNurseId: IDS.enfPatricia,
      procedureName: 'Implante de cateter Holter 24h + MAPA 24h',
      procedureCode: '40301102',
      laterality: 'NOT_APPLICABLE',
      anesthesiaType: 'NONE',
      scheduledAt: hoursAgo(1),
      patientInAt: hoursAgo(1),
      patientOutAt: hoursAgo(0),
      status: 'COMPLETED',
      surgicalDescription: 'Holter 24h e MAPA instalados para investigação de síncope e avaliação de ritmo cardíaco durante episódio de dor torácica.',
      bloodLoss: 0,
    },
  });

  await prisma.surgicalProcedure.create({
    data: {
      id: IDS.surg_pedro_colec,
      encounterId: IDS.enc_pedro_cirurgia,
      patientId: IDS.pedro,
      tenantId: IDS.tenant,
      surgeonId: IDS.drRoberto,
      anesthesiologistId: IDS.drCarlos,
      scrubNurseId: IDS.enfPatricia,
      circulatingNurseId: IDS.enfJoao,
      procedureName: 'Herniorrafia inguinal direita com tela (aberta)',
      procedureCode: '30721056',
      laterality: 'RIGHT',
      anesthesiaType: 'SPINAL',
      scheduledAt: daysAgo(180),
      patientInAt: daysAgo(180),
      incisionAt: daysAgo(180),
      sutureAt: daysAgo(180),
      patientOutAt: daysAgo(180),
      status: 'COMPLETED',
      surgicalDescription: 'Herniorrafia inguinal D com colocação de tela de polipropileno por via anterior (técnica de Lichtenstein). Sem intercorrências. Alta hospitalar D+2.',
      bloodLoss: 50,
      complications: 'Seroma local leve no pós-operatório tardio, resolvido espontaneamente.',
    },
  });

  // ─── 18. Billing Entries ───────────────────────────────────────────────

  console.log('  → Creating billing entries...');

  await prisma.billingEntry.create({
    data: {
      id: IDS.bill_maria_cardio,
      encounterId: IDS.enc_maria_cardio,
      tenantId: IDS.tenant,
      patientId: IDS.maria,
      insuranceProvider: 'Bradesco Saúde',
      planType: 'Empresarial Top',
      guideNumber: 'BS-2024-987654-001',
      guideType: 'CONSULTATION',
      items: [
        { code: '10101012', description: 'Consulta em consultório — cardiologia', quantity: 1, unitValue: 180.00 },
        { code: '40301102', description: 'Eletrocardiograma de repouso — 12 derivações', quantity: 1, unitValue: 85.00 },
      ],
      totalAmount: 265.00,
      status: 'APPROVED',
      approvedAmount: 265.00,
      submittedAt: daysAgo(28),
      approvedAt: daysAgo(25),
    },
  });

  await prisma.billingEntry.create({
    data: {
      id: IDS.bill_pedro_uti,
      encounterId: IDS.enc_pedro_uti,
      tenantId: IDS.tenant,
      patientId: IDS.pedro,
      insuranceProvider: 'Bradesco Saúde',
      planType: 'Top Nacional Plus',
      guideNumber: 'BS-2024-111222-003',
      guideType: 'HOSPITALIZATION',
      items: [
        { code: '20101039', description: 'Diária UTI adulto', quantity: 3, unitValue: 1200.00 },
        { code: '20203012', description: 'Medicamentos UTI — furosemida EV', quantity: 6, unitValue: 45.00 },
        { code: '20203013', description: 'Medicamentos UTI — enoxaparina 40mg SC', quantity: 3, unitValue: 75.00 },
        { code: '30606019', description: 'Toracocentese', quantity: 1, unitValue: 450.00 },
      ],
      totalAmount: 4620.00,
      status: 'SUBMITTED',
      submittedAt: daysAgo(1),
    },
  });

  await prisma.billingEntry.create({
    data: {
      id: IDS.bill_jose_checkup,
      encounterId: IDS.enc_jose_geral,
      tenantId: IDS.tenant,
      patientId: IDS.jose,
      insuranceProvider: 'Amil',
      planType: 'S750',
      guideNumber: 'AM-2024-123456-001',
      guideType: 'SADT',
      items: [
        { code: '10101012', description: 'Consulta clínica geral', quantity: 1, unitValue: 150.00 },
        { code: '40301048', description: 'Hemograma completo', quantity: 1, unitValue: 35.00 },
        { code: '40301153', description: 'Glicemia de jejum', quantity: 1, unitValue: 15.00 },
        { code: '40301161', description: 'HbA1c', quantity: 1, unitValue: 55.00 },
        { code: '40301188', description: 'Perfil lipídico completo', quantity: 1, unitValue: 65.00 },
        { code: '40301242', description: 'Creatinina', quantity: 1, unitValue: 18.00 },
        { code: '40301197', description: 'TSH ultrassensível', quantity: 1, unitValue: 72.00 },
      ],
      totalAmount: 410.00,
      status: 'PAID',
      approvedAmount: 410.00,
      submittedAt: daysAgo(13),
      approvedAt: daysAgo(10),
      paidAt: daysAgo(5),
    },
  });

  await prisma.billingEntry.create({
    data: {
      id: IDS.bill_ana_prenatal,
      encounterId: IDS.enc_ana_prenatal,
      tenantId: IDS.tenant,
      patientId: IDS.anaBeatriz,
      insuranceProvider: 'SulAmérica',
      planType: 'Prestige',
      guideNumber: 'SA-2024-654321-001',
      guideType: 'CONSULTATION',
      items: [
        { code: '10101063', description: 'Consulta pré-natal — obstetrícia', quantity: 1, unitValue: 200.00 },
        { code: '40901106', description: 'Ultrassonografia obstétrica', quantity: 1, unitValue: 220.00 },
        { code: '40301048', description: 'Hemograma completo', quantity: 1, unitValue: 35.00 },
        { code: '40301153', description: 'Glicemia de jejum', quantity: 1, unitValue: 15.00 },
      ],
      totalAmount: 470.00,
      status: 'PENDING',
    },
  });

  await prisma.billingEntry.create({
    data: {
      id: IDS.bill_lucia_onco,
      encounterId: IDS.enc_lucia_onco,
      tenantId: IDS.tenant,
      patientId: IDS.lucia,
      insuranceProvider: 'Unimed',
      planType: 'Alfa Nacional',
      guideNumber: 'UN-2024-333444-004',
      guideType: 'SADT',
      items: [
        { code: '10101012', description: 'Consulta oncologia', quantity: 1, unitValue: 250.00 },
        { code: '20401026', description: 'Quimioterapia IV — Doxorrubicina 60mg/m²', quantity: 1, unitValue: 1800.00 },
        { code: '20401034', description: 'Quimioterapia IV — Ciclofosfamida 600mg/m²', quantity: 1, unitValue: 950.00 },
        { code: '40301048', description: 'Hemograma completo pré-QT', quantity: 1, unitValue: 35.00 },
      ],
      totalAmount: 3035.00,
      status: 'SUBMITTED',
      submittedAt: daysAgo(8),
    },
  });

  await prisma.billingEntry.create({
    data: {
      id: IDS.bill_gabriel_asma,
      encounterId: IDS.enc_gabriel_asma,
      tenantId: IDS.tenant,
      patientId: IDS.gabriel,
      insuranceProvider: 'Amil',
      planType: 'S450',
      guideNumber: 'AM-2024-555666-001',
      guideType: 'CONSULTATION',
      items: [
        { code: '10106062', description: 'Atendimento de emergência pediátrica', quantity: 1, unitValue: 180.00 },
        { code: '40301048', description: 'Hemograma', quantity: 1, unitValue: 35.00 },
        { code: '40601110', description: 'Nebulização terapêutica', quantity: 3, unitValue: 45.00 },
      ],
      totalAmount: 350.00,
      status: 'APPROVED',
      approvedAmount: 350.00,
      submittedAt: daysAgo(1),
      approvedAt: new Date(),
    },
  });

  await prisma.billingEntry.create({
    data: {
      id: IDS.bill_camila_psiq,
      encounterId: IDS.enc_camila_psiq,
      tenantId: IDS.tenant,
      patientId: IDS.camila,
      insuranceProvider: 'Amil',
      planType: 'S750',
      guideNumber: 'AM-2024-888999-002',
      guideType: 'CONSULTATION',
      items: [
        { code: '10101063', description: 'Consulta em psiquiatria', quantity: 1, unitValue: 220.00 },
      ],
      totalAmount: 220.00,
      status: 'APPROVED',
      approvedAmount: 220.00,
      submittedAt: daysAgo(12),
      approvedAt: daysAgo(10),
    },
  });

  await prisma.billingEntry.create({
    data: {
      id: IDS.bill_rafael_hiv,
      encounterId: IDS.enc_rafael_infecto,
      tenantId: IDS.tenant,
      patientId: IDS.rafael,
      insuranceProvider: 'Unimed',
      planType: 'Alfa',
      guideNumber: 'UN-2024-222333-001',
      guideType: 'SADT',
      items: [
        { code: '10101063', description: 'Consulta em infectologia', quantity: 1, unitValue: 200.00 },
        { code: '40301048', description: 'Hemograma completo', quantity: 1, unitValue: 35.00 },
        { code: '40501048', description: 'Carga viral HIV-1 (PCR quantitativo)', quantity: 1, unitValue: 320.00 },
        { code: '40501056', description: 'Linfócitos T-CD4+ (contagem)', quantity: 1, unitValue: 185.00 },
      ],
      totalAmount: 740.00,
      status: 'PAID',
      approvedAmount: 740.00,
      submittedAt: daysAgo(5),
      approvedAt: daysAgo(3),
      paidAt: daysAgo(1),
    },
  });

  // ─── 19. Additional Clinical Notes ─────────────────────────────────────

  console.log('  → Creating additional clinical notes...');

  const additionalNotes = [
    // Gabriel — emergency SOAP
    {
      encounterId: IDS.enc_gabriel_asma,
      authorId: IDS.drAna, authorRole: 'DOCTOR' as const,
      type: 'SOAP' as const, status: 'SIGNED' as const,
      subjective: 'Criança de 8 anos com episódio agudo de crise asmática. Mãe relata sibilância, dispnéia e tosse seca desde às 14h. Usou inalador domiciliar (salbutamol) 2 doses sem melhora. Nega febre, rinite ou exposição a alérgenos conhecidos. Última crise há 3 meses.',
      objective: 'Criança em REG, taquipneica, com uso de musculatura acessória. Sibilância expiratória difusa bilateralmente. SpO2 93% em ar ambiente. FC 120 bpm. FR 28 irpm. Peak flow não realizado (idade). Peso: 28.5kg.',
      assessment: 'Crise asmática moderada (classificação GINA). Gatilho não identificado. Resposta parcial à terapia broncodilatadora inicial.',
      plan: '1. Salbutamol 2.5mg nebulizado a cada 20 min — 3 doses\n2. Prednisolona 1mg/kg/dia VO por 5 dias\n3. Monitorar SpO2 e FR após cada nebulização\n4. Se SpO2 < 92% ou sem melhora após 3 doses: considerar BI, ipratrópio e avaliação para internação\n5. Orientar família sobre uso correto do inalador',
      diagnosisCodes: ['J45.0', 'J45.1'],
      signedAt: hoursAgo(1),
      signedById: IDS.drAna,
    },

    // Lucia — oncology evolution note
    {
      encounterId: IDS.enc_lucia_onco,
      authorId: IDS.drRoberto, authorRole: 'DOCTOR' as const,
      type: 'EVOLUTION' as const, status: 'SIGNED' as const,
      freeText: 'EVOLUÇÃO ONCOLÓGICA — ' + daysAgo(10).toLocaleDateString('pt-BR') + '\n\nPaciente Lucia F. Costa, 55 anos, portadora de neoplasia de mama (CDI T2N1M0, RE+/RP+/HER2-) em 4o ciclo de AC (doxorrubicina + ciclofosfamida).\n\nSubjetivo: Refere náuseas grau 2 nos primeiros 5 dias após QT, já em resolução. Alopecia grau 2. Nega mucosite, neutropenia febril ou sintomas cardíacos. Fadiga grau 1. Mantém atividade e apetite parcialmente preservados.\n\nObjetivo: BEG, alopecia. ECOG PS 1. Peso: 58kg (perda de 3kg desde início da QT). Mucosa oral sem ulcerações. Hemograma: Hb 10.2, Leucócitos 3800, neutrófilos 2100 (sem neutropenia grave). Plaquetas 185000.\n\nAvaliação: Toxicidade hematológica grau 1. Náuseas controladas. Alopecia esperada. Resposta clínica não avaliável neste momento.\n\nPlano: Manter protocolo AC. 5o ciclo programado para daqui a 14 dias, condicionado ao hemograma. Reforçar suporte antiemético: ondansetrona + dexametasona. Solicitar ecocardiograma (monitoramento cardiotoxicidade doxorrubicina). Encaminhar para suporte nutricional.',
      diagnosisCodes: ['C50.9', 'Z51.1'],
      signedAt: daysAgo(10),
      signedById: IDS.drRoberto,
    },

    // Pedro — ICU admission note
    {
      encounterId: IDS.enc_pedro_uti,
      authorId: IDS.drCarlos, authorRole: 'DOCTOR' as const,
      type: 'ADMISSION' as const, status: 'SIGNED' as const,
      freeText: 'NOTA DE ADMISSÃO — UTI ADULTO — ' + daysAgo(3).toLocaleDateString('pt-BR') + '\n\nPaciente Pedro Henrique Martins, 78 anos, M, admitido na UTI-A-03 por ICC descompensada.\n\nMOTIVO DA INTERNAÇÃO: Dispneia progressiva há 5 dias, com piora em 48h (repouso). Ganho ponderal de 5kg nas últimas 2 semanas. Edema MMII ++/4+. Tosse seca noturna. Ortopneia há 3 dias (2 travesseiros). Relato de não ter tomado furosemida domiciliar nos últimos 4 dias.\n\nHMA: ICC com FEVE 35% (etiologia isquêmica), FA permanente (CHA2DS2-VASc 5), DPOC GOLD C, DRC estágio 3a.\n\nExame de admissão: REG, taquidispneico, sat 88% ar ambiente. PA 100x60mmHg. FC 110 bpm (irregular — FA). FR 28 irpm. Estertores crepitantes bilaterais até 2/3 superiores. Edema MMII +++/4+ bilateral. Fígado palpável 2cm RCE. TVC elevada.\n\nImagem: RX tórax — cardiomegalia, infiltrado bilateral sugestivo de congestão pulmonar, pequeno derrame pleural E.\n\nDiagnóstico: ICC descompensada por não-aderência terapêutica. FA com RV inadequada.\n\nPlano inicial: Furosemida 40mg EV 12/12h + monitorização DU. Restrição hídrica 1000mL/dia. Monitorização PA, FC, sat. Enoxaparina profilaxia. Controle glicêmico. ECG. Eco controle.',
      diagnosisCodes: ['I50.0', 'I48.2', 'J44.1', 'N18.3'],
      signedAt: daysAgo(3),
      signedById: IDS.drCarlos,
    },

    // Francisco — neurology consultation note
    {
      encounterId: IDS.enc_francisco_neuro,
      authorId: IDS.drAna, authorRole: 'DOCTOR' as const,
      type: 'CONSULTATION' as const, status: 'SIGNED' as const,
      subjective: 'Acompanhante (esposa) relata piora cognitiva progressiva há 2 meses: mais esquecido, desorientado em ambiente doméstico, episódios de agitação noturna. Nega alucinações. Alimentação com auxílio. Higiene dependente. Em uso de donepezila 10mg e memantina 20mg.',
      objective: 'Paciente cooperativo, com dificuldade de manter atenção. MEEM: 14/30 (queda de 3 pontos em 6 meses). CDR 2 (moderado). Linguagem preservada mas com anomia. Marcha cadenciada sem alterações. Sem sinais focais. PA: 148/90 (HAS em controle parcial). Peso estável.',
      assessment: 'Doença de Alzheimer moderada com progressão cognitiva esperada. HAS com controle subótimo (meta < 130x80).\nPiora recente possivelmente relacionada a estresse familiar e irregularidade de sono.',
      plan: '1. Manter donepezila 10mg e memantina 20mg\n2. Ajustar anti-hipertensivo: aumentar anlodipino para 10mg\n3. Solicitar: ressonância magnética cerebral controle\n4. Encaminhar para grupo de apoio a cuidadores\n5. Fisioterapia cognitiva — manter\n6. Retorno em 3 meses',
      diagnosisCodes: ['G30.9', 'I10'],
      signedAt: daysAgo(20),
      signedById: IDS.drAna,
    },

    // Rafael — HIV follow-up SOAP
    {
      encounterId: IDS.enc_rafael_infecto,
      authorId: IDS.drAna, authorRole: 'DOCTOR' as const,
      type: 'SOAP' as const, status: 'SIGNED' as const,
      subjective: 'Paciente Rafael Santos, 42 anos, HIV+, em TARV há 6 anos. Boa aderência referida. Nega sintomas oportunistas. Sem queixas gastrointestinais relacionadas ao TARV. Ativo fisicamente. Sono regular.',
      objective: 'BEG, eutrófico, sem linfoadenomegalia. Exames: CD4+ 680 céls/mm³ (subida de 60 pontos). Carga Viral HIV-1: indetectável (< 50 cópias). TGO/TGP normais. Creatinina: 0.9mg/dL. Glicemia: 88mg/dL.',
      assessment: 'HIV bem controlado. Carga viral indetectável sustentada. CD4 em ascensão. Sem toxicidade TARV detectável.',
      plan: '1. Manter TDF/3TC/DTG\n2. Próxima carga viral/CD4 em 6 meses\n3. Vacina HPV (dose 1) — indicada\n4. Rastreio CA colo de útero anal — ANUSCOPIA\n5. Retorno em 6 meses ou SOS',
      diagnosisCodes: ['B24', 'Z79.899'],
      signedAt: daysAgo(7),
      signedById: IDS.drAna,
    },

    // Maria — emergency evolution note
    {
      encounterId: IDS.enc_maria_emergency,
      authorId: IDS.drCarlos, authorRole: 'DOCTOR' as const,
      type: 'PROGRESS_NOTE' as const, status: 'SIGNED' as const,
      freeText: 'EVOLUÇÃO MÉDICA — URGÊNCIA — ' + new Date().toLocaleDateString('pt-BR') + '\n\nPaciente Maria da Silva Santos, 62 anos, admitida com dor torácica opressiva e irradiação para MSE há 3h. PA admissional: 168x102. FC: 98.\n\nECG: Elevação ST V1-V4, padrão de BRE novo → IAMCSST anterior? Protocolo ACS ativado.\nTroponina I: 0.08 ng/mL (elevada). CK-MB: em coleta.\n\nConduta: AAS 300mg VO (1a dose), NTG sublingual 1 comp, Heparina não-fracionada EV bolus + infusão. Morfina SOS. Monitor contínuo.\n\nALERTA: Dipirona CONTRAINDICADA — anafilaxia prévia. AAS administrado apesar de registro de intolerância — benefício supera risco em IAMCSST.\n\nCTH ativado — hemodinâmica notificada para ICPP. Consentimento cirúrgico assinado.',
      diagnosisCodes: ['I21.0', 'I10', 'E11.9'],
      signedAt: hoursAgo(2),
      signedById: IDS.drCarlos,
    },
  ];

  for (const n of additionalNotes) {
    await prisma.clinicalNote.create({ data: { id: uuidv4(), ...n } });
  }

  // ─── 20. Exam Results ──────────────────────────────────────────────────

  console.log('  → Creating exam results...');

  const examResults = [
    // Pedro — UTI labs
    {
      patientId: IDS.pedro, encounterId: IDS.enc_pedro_uti,
      examName: 'Hemograma Completo', examCode: '40301048', examType: 'LABORATORY' as const,
      requestedById: IDS.drCarlos, requestedAt: daysAgo(3),
      collectedAt: daysAgo(3), completedAt: daysAgo(3),
      status: 'COMPLETED' as const,
      labResults: { hb: 10.8, ht: 32, leucocitos: 9800, neutrofilos: 7200, linfocitos: 1800, plaquetas: 210000, vhs: 45 },
      aiInterpretation: 'Anemia leve normocítica. Leucocitose com neutrofilia — sugere processo infeccioso/inflamatório. Plaquetas normais.',
    },
    {
      patientId: IDS.pedro, encounterId: IDS.enc_pedro_uti,
      examName: 'Eletrólitos + Função Renal', examCode: '40301153', examType: 'LABORATORY' as const,
      requestedById: IDS.drCarlos, requestedAt: daysAgo(3),
      collectedAt: daysAgo(3), completedAt: daysAgo(3),
      status: 'REVIEWED' as const,
      labResults: { sodio: 136, potassio: 6.2, cloro: 102, ureia: 68, creatinina: 1.8, tfg: 38, bicarbonato: 20 },
      reviewedById: IDS.drCarlos, reviewedAt: daysAgo(3),
      aiInterpretation: 'HIPERCALEMIA GRAVE — K+ 6.2 mEq/L. Valor crítico. Insuficiência renal crônica agudizada (creatinina subiu de 1.5 para 1.8). TFG reduzida. Bicarbonato levemente baixo — acidose metabólica leve.',
      aiAlerts: [{ type: 'CRITICAL', message: 'Hipercalemia: K+ 6.2 mEq/L. Risco de arritmia.' }],
    },
    {
      patientId: IDS.pedro, encounterId: IDS.enc_pedro_uti,
      examName: 'BNP (Peptídeo Natriurético)', examCode: '40302058', examType: 'LABORATORY' as const,
      requestedById: IDS.drCarlos, requestedAt: daysAgo(3),
      collectedAt: daysAgo(3), completedAt: daysAgo(3),
      status: 'REVIEWED' as const,
      labResults: { bnp: 1850, referencia: '< 100 pg/mL' },
      reviewedById: IDS.drCarlos, reviewedAt: daysAgo(3),
      aiInterpretation: 'BNP muito elevado (1850 pg/mL). Confirma descompensação de ICC. Valor de referência para alta hospitalar < 300 pg/mL.',
    },
    // Pedro — chest X-ray
    {
      patientId: IDS.pedro, encounterId: IDS.enc_pedro_uti,
      examName: 'Radiografia de Tórax PA', examCode: '40901079', examType: 'IMAGING' as const,
      requestedById: IDS.drCarlos, requestedAt: daysAgo(3),
      completedAt: daysAgo(3), status: 'REVIEWED' as const,
      imageModality: 'XRAY' as const,
      radiologistReport: 'Cardiomegalia com índice cardiotorácico de 0.58. Aumento da trama vascular pulmonar. Infiltrado perihilar bilateral compatible com edema pulmonar. Pequeno derrame pleural esquerdo (obliteração do seio costofrênico). Sem consolidações.',
      reviewedById: IDS.drCarlos, reviewedAt: daysAgo(3),
    },

    // Maria — emergency troponin
    {
      patientId: IDS.maria, encounterId: IDS.enc_maria_emergency,
      examName: 'Troponina I de Alta Sensibilidade', examCode: '40302066', examType: 'LABORATORY' as const,
      requestedById: IDS.drCarlos, requestedAt: hoursAgo(3),
      collectedAt: hoursAgo(3), completedAt: hoursAgo(2),
      status: 'REVIEWED' as const,
      labResults: { troponina_i: 0.08, referencia: '< 0.03 ng/mL', resultado: 'ELEVADO' },
      reviewedById: IDS.drCarlos, reviewedAt: hoursAgo(2),
      aiInterpretation: 'Troponina I elevada (0.08 ng/mL). Confirma lesão miocárdica aguda. Contexto clínico + ECG: IAMCSST anterior provável. Indicação de cineangiocoronariografia de urgência.',
      aiAlerts: [{ type: 'CRITICAL', message: 'Troponina elevada. Suspeita de IAMCSST.' }],
    },
    {
      patientId: IDS.maria, encounterId: IDS.enc_maria_emergency,
      examName: 'ECG 12 Derivações', examCode: '40301102', examType: 'FUNCTIONAL' as const,
      requestedById: IDS.drCarlos, requestedAt: hoursAgo(3),
      completedAt: hoursAgo(3), status: 'REVIEWED' as const,
      labResults: { ritmo: 'Sinusal', fc: 98, eixo: '+60°', pr: 180, qrs: 95, qt: 400, alteracoes: 'Supradesnível ST V1-V4 (2-3mm). BRE de 3o grau novo' },
      reviewedById: IDS.drCarlos, reviewedAt: hoursAgo(3),
    },

    // Jose — checkup labs
    {
      patientId: IDS.jose, encounterId: IDS.enc_jose_geral,
      examName: 'Hemograma Completo', examCode: '40301048', examType: 'LABORATORY' as const,
      requestedById: IDS.drAna, requestedAt: daysAgo(15),
      collectedAt: daysAgo(14), completedAt: daysAgo(14),
      status: 'REVIEWED' as const,
      labResults: { hb: 14.2, ht: 42, leucocitos: 7200, neutrofilos: 4500, linfocitos: 2100, plaquetas: 230000 },
      reviewedById: IDS.drAna, reviewedAt: daysAgo(13),
      aiInterpretation: 'Hemograma normal. Sem anemia ou alterações leucocitárias.',
    },
    {
      patientId: IDS.jose, encounterId: IDS.enc_jose_exame,
      examName: 'Perfil Lipídico Completo', examCode: '40301188', examType: 'LABORATORY' as const,
      requestedById: IDS.drAna, requestedAt: daysAgo(15),
      collectedAt: daysAgo(14), completedAt: daysAgo(14),
      status: 'REVIEWED' as const,
      labResults: { colesterol_total: 215, hdl: 42, ldl: 148, triglicerides: 185, vldl: 37, naoHdl: 173 },
      reviewedById: IDS.drAna, reviewedAt: daysAgo(7),
      aiInterpretation: 'Dislipidemia: CT bordeline alto, LDL elevado (148mg/dL), HDL baixo para homens (< 40). Triglicérides levemente elevado. Recomendado: mudança no estilo de vida + reavaliação em 3 meses. Considerar estatina se sem melhora.',
    },

    // Gabriel — asthma CBC
    {
      patientId: IDS.gabriel, encounterId: IDS.enc_gabriel_asma,
      examName: 'Hemograma + Proteína C Reativa', examCode: '40301048', examType: 'LABORATORY' as const,
      requestedById: IDS.drAna, requestedAt: hoursAgo(2),
      collectedAt: hoursAgo(2), completedAt: hoursAgo(1),
      status: 'REVIEWED' as const,
      labResults: { hb: 13.2, leucocitos: 12500, eosinofilos: 8, neutrofilos: 55, linfocitos: 28, plaquetas: 290000, pcr: 0.8 },
      reviewedById: IDS.drAna, reviewedAt: hoursAgo(1),
      aiInterpretation: 'Eosinofilia periférica (8%) compatível com atopia/asma. Leucocitose leve. PCR normal — sem evidência de infecção bacteriana.',
    },

    // Lucia — tumor markers
    {
      patientId: IDS.lucia, encounterId: IDS.enc_lucia_onco,
      examName: 'Marcadores Tumorais (CA 15-3, CEA)', examCode: '40501307', examType: 'LABORATORY' as const,
      requestedById: IDS.drRoberto, requestedAt: daysAgo(10),
      collectedAt: daysAgo(10), completedAt: daysAgo(9),
      status: 'REVIEWED' as const,
      labResults: { ca153: 38.5, cea: 4.2, referencia_ca153: '< 31.3 U/mL', referencia_cea: '< 5 ng/mL' },
      reviewedById: IDS.drRoberto, reviewedAt: daysAgo(9),
      aiInterpretation: 'CA 15-3 levemente elevado (38.5 U/mL — VR < 31.3). Tendência importante para acompanhamento. CEA dentro da normalidade.',
    },
    // Lucia — echocardiogram (pre-chemo)
    {
      patientId: IDS.lucia, encounterId: IDS.enc_lucia_onco,
      examName: 'Ecocardiograma Transtorácico', examCode: '40304361', examType: 'IMAGING' as const,
      requestedById: IDS.drRoberto, requestedAt: daysAgo(10),
      completedAt: daysAgo(8), status: 'REVIEWED' as const,
      imageModality: 'ECHOCARDIOGRAPHY' as const,
      radiologistReport: 'FEVE: 62% (normal). VE de dimensões normais. Sem alterações segmentares de contratilidade. Função sistólica preservada. Sem derrame pericárdico. Valvas sem alterações significativas. Aorta ascendente sem ectasia.',
      reviewedById: IDS.drRoberto, reviewedAt: daysAgo(8),
    },

    // Ana Beatriz — prenatal ultrasound
    {
      patientId: IDS.anaBeatriz, encounterId: IDS.enc_ana_prenatal,
      examName: 'Ultrassonografia Obstétrica com Doppler', examCode: '40901114', examType: 'IMAGING' as const,
      requestedById: IDS.drAna, requestedAt: daysAgo(5),
      completedAt: daysAgo(5), status: 'REVIEWED' as const,
      imageModality: 'ULTRASOUND' as const,
      radiologistReport: 'Gestação única, tópica, de 32 semanas e 2 dias (DUM). Feto em apresentação cefálica. BCF: 142 bpm. ILA: 14,5 cm (normal). Peso fetal estimado: 1.820g (P48 — Hadlock). Placenta posterior grau I. Doppler umbilical: relação S/D 2.8 (normal). Doppler ACM normal. Colo uterino: 3,8 cm.',
      reviewedById: IDS.drAna, reviewedAt: daysAgo(4),
      aiInterpretation: 'Gestação de 32 semanas. Crescimento fetal adequado (P48). Parâmetros Doppler normais. ILA normal. Sem sinais de sofrimento fetal.',
    },

    // Rafael — HIV labs
    {
      patientId: IDS.rafael, encounterId: IDS.enc_rafael_infecto,
      examName: 'Carga Viral HIV-1 (PCR Quantitativo)', examCode: '40501048', examType: 'MICROBIOLOGICAL' as const,
      requestedById: IDS.drAna, requestedAt: daysAgo(7),
      collectedAt: daysAgo(7), completedAt: daysAgo(5),
      status: 'REVIEWED' as const,
      labResults: { resultado: 'Indetectável', limite_deteccao: '< 50 cópias/mL', tecnica: 'Abbott RealTime HIV-1' },
      reviewedById: IDS.drAna, reviewedAt: daysAgo(5),
      aiInterpretation: 'Carga viral indetectável. Excelente resposta ao TARV com TDF/3TC/DTG. Aderência confirmada laboratorialmente.',
    },
    {
      patientId: IDS.rafael, encounterId: IDS.enc_rafael_infecto,
      examName: 'Contagem de Linfócitos T-CD4+', examCode: '40501056', examType: 'LABORATORY' as const,
      requestedById: IDS.drAna, requestedAt: daysAgo(7),
      collectedAt: daysAgo(7), completedAt: daysAgo(5),
      status: 'REVIEWED' as const,
      labResults: { cd4: 680, porcentagem_cd4: 38, cd8: 890, relacao_cd4_cd8: 0.76 },
      reviewedById: IDS.drAna, reviewedAt: daysAgo(5),
      aiInterpretation: 'CD4+ 680 céls/mm³ — progressão positiva (+60 células em 6 meses). Relação CD4/CD8 em recuperação.',
    },

    // Francisco — brain MRI
    {
      patientId: IDS.francisco, encounterId: IDS.enc_francisco_neuro,
      examName: 'Ressonância Magnética do Crânio', examCode: '40901203', examType: 'IMAGING' as const,
      requestedById: IDS.drAna, requestedAt: daysAgo(20),
      completedAt: daysAgo(18), status: 'REVIEWED' as const,
      imageModality: 'MRI' as const,
      radiologistReport: 'Atrofia cortical difusa de predomínio parieto-temporal bilateral, mais pronunciada à esquerda. Alargamento sulcal e ventricular compatível com a atrofia. Lesões de substância branca periventricular (Fazekas 2). Hipocampos com volume reduzido bilateralmente. Sem lesões expansivas, isquemia aguda ou hemorragia.',
      reviewedById: IDS.drAna, reviewedAt: daysAgo(17),
      aiInterpretation: 'Padrão de atrofia cortical compatível com doença de Alzheimer moderada. Hipocampos atrofiados confirma o diagnóstico clínico.',
    },
    {
      patientId: IDS.francisco, encounterId: IDS.enc_francisco_neuro,
      examName: 'Eletrólitos e Função Renal', examCode: '40301153', examType: 'LABORATORY' as const,
      requestedById: IDS.drAna, requestedAt: daysAgo(20),
      collectedAt: daysAgo(20), completedAt: daysAgo(19),
      status: 'REVIEWED' as const,
      labResults: { sodio: 139, potassio: 4.8, creatinina: 1.9, ureia: 55, tfg: 38, glicemia: 92 },
      reviewedById: IDS.drAna, reviewedAt: daysAgo(19),
      aiInterpretation: 'DRC estágio 3b. TFG 38 mL/min — ajuste de doses de medicamentos necessário. Eletrólitos normais.',
    },
  ];

  for (const e of examResults) {
    await prisma.examResult.create({ data: { id: uuidv4(), ...e } });
  }

  // ─── 21. Nursing Processes ─────────────────────────────────────────────

  console.log('  → Creating nursing processes...');

  // Pedro — ICU nursing process
  const nursingProcessPedro = await prisma.nursingProcess.create({
    data: {
      id: uuidv4(),
      encounterId: IDS.enc_pedro_uti,
      patientId: IDS.pedro,
      nurseId: IDS.enfPatricia,
      status: 'IN_PROGRESS',
      dataCollectionNotes: 'Paciente Pedro H. Martins, 78 anos, admitido por ICC descompensada. Dispneico em repouso, com SpO2 88% em AA. Edema MMII ++++. Peso 88.5kg. Diurese ausente nas últimas 4h. PA 100x60mmHg. FC 110 (FA). Família presente e ansiosa.',
    },
  });

  const dxPedroVolume = await prisma.nursingDiagnosis.create({
    data: {
      id: uuidv4(),
      nursingProcessId: nursingProcessPedro.id,
      nandaCode: '00026',
      nandaDomain: 'Domínio 2 — Nutrição',
      nandaClass: 'Classe 5 — Hidratação',
      nandaTitle: 'Volume de líquidos excessivo',
      relatedFactors: ['Comprometimento dos mecanismos de regulação', 'Excesso de ingestão de sódio'],
      definingCharacteristics: ['Edema', 'Ganho de peso', 'Dispneia', 'Sons respiratórios adventícios', 'Pressão arterial alterada'],
      status: 'ACTIVE',
      priority: 'HIGH',
    },
  });

  await prisma.nursingOutcome.create({
    data: {
      id: uuidv4(),
      nursingDiagnosisId: dxPedroVolume.id,
      nocCode: '0601',
      nocTitle: 'Equilíbrio eletrolítico e ácido-base',
      baselineScore: 2,
      targetScore: 4,
      currentScore: 2,
      evaluationFrequency: 'A cada 6 horas',
      indicators: { edema: 'presente ++++', peso: '88.5kg', spo2: '88%', diurese: 'ausente' },
    },
  });

  await prisma.nursingIntervention.create({
    data: {
      id: uuidv4(),
      nursingDiagnosisId: dxPedroVolume.id,
      nicCode: '4120',
      nicTitle: 'Controle de líquidos',
      activities: [
        'Monitorar débito urinário a cada 1 hora',
        'Controle hídrico rigoroso — balanço a cada 6h',
        'Pesar diariamente às 6h (mesmo horário, mesma balança)',
        'Administrar furosemida EV conforme prescrito',
        'Posicionamento semi-Fowler para reduzir dispneia',
        'Restrição hídrica 1000mL/24h',
        'Orientar família sobre restrição',
      ],
      status: 'IN_PROGRESS',
      notes: 'Iniciar balanço às 0h. Notificar médico se DU < 30mL/h por 2h consecutivas.',
    },
  });

  const dxPedroBreath = await prisma.nursingDiagnosis.create({
    data: {
      id: uuidv4(),
      nursingProcessId: nursingProcessPedro.id,
      nandaCode: '00032',
      nandaDomain: 'Domínio 4 — Atividade/Repouso',
      nandaClass: 'Classe 4 — Respostas cardiovasculares/pulmonares',
      nandaTitle: 'Padrão respiratório ineficaz',
      relatedFactors: ['Ansiedade', 'Dor', 'Fadiga muscular', 'Hiperventilação associada à hipoxia'],
      definingCharacteristics: ['Dispneia', 'FR 28irpm', 'SpO2 88%', 'Uso de musculatura acessória', 'Ortopneia'],
      status: 'ACTIVE',
      priority: 'HIGH',
    },
  });

  await prisma.nursingIntervention.create({
    data: {
      id: uuidv4(),
      nursingDiagnosisId: dxPedroBreath.id,
      nicCode: '3140',
      nicTitle: 'Manejo das vias aéreas',
      activities: [
        'Monitorar SpO2 continuamente — alarme configurado para < 88%',
        'Oxigenoterapia: cateter nasal 2L/min — titular para SpO2 ≥ 92%',
        'Posição cabeceira 30-45°',
        'Ausculta pulmonar a cada 4h',
        'Preparar material para IOT se deterioração clínica',
      ],
      status: 'IN_PROGRESS',
    },
  });

  // Gabriel — emergency nursing process
  const nursingProcessGabriel = await prisma.nursingProcess.create({
    data: {
      id: uuidv4(),
      encounterId: IDS.enc_gabriel_asma,
      patientId: IDS.gabriel,
      nurseId: IDS.enfPatricia,
      status: 'IN_PROGRESS',
      dataCollectionNotes: 'Criança de 8 anos com crise asmática moderada. Taquipneica, sibilância expiratória difusa. SpO2 93%. Mãe presente. Ansiedade materna elevada.',
    },
  });

  const dxGabrielGas = await prisma.nursingDiagnosis.create({
    data: {
      id: uuidv4(),
      nursingProcessId: nursingProcessGabriel.id,
      nandaCode: '00030',
      nandaDomain: 'Domínio 4 — Atividade/Repouso',
      nandaClass: 'Classe 4 — Respostas cardiovasculares/pulmonares',
      nandaTitle: 'Troca de gases prejudicada',
      relatedFactors: ['Obstrução das vias aéreas — broncoespasmo', 'Processo inflamatório das vias aéreas'],
      definingCharacteristics: ['SpO2 93%', 'Taquipneia', 'Sibilância', 'Dispneia'],
      status: 'ACTIVE',
      priority: 'HIGH',
    },
  });

  await prisma.nursingOutcome.create({
    data: {
      id: uuidv4(),
      nursingDiagnosisId: dxGabrielGas.id,
      nocCode: '0402',
      nocTitle: 'Estado respiratório: troca gasosa',
      baselineScore: 2,
      targetScore: 4,
      currentScore: 2,
      evaluationFrequency: 'Após cada nebulização',
    },
  });

  await prisma.nursingIntervention.create({
    data: {
      id: uuidv4(),
      nursingDiagnosisId: dxGabrielGas.id,
      nicCode: '3350',
      nicTitle: 'Monitoração respiratória',
      activities: [
        'Monitorar SpO2 a cada 15 minutos durante nebulização',
        'Ausculta pulmonar antes e após cada nebulização',
        'Preparar nebulizador: salbutamol 2.5mg em 3mL SF 0.9%',
        'Registrar resposta clínica após cada dose',
        'Orientar mãe sobre técnica de inalação domiciliar',
      ],
      status: 'IN_PROGRESS',
    },
  });

  // Maria — emergency nursing process
  const nursingProcessMaria = await prisma.nursingProcess.create({
    data: {
      id: uuidv4(),
      encounterId: IDS.enc_maria_emergency,
      patientId: IDS.maria,
      nurseId: IDS.enfPatricia,
      status: 'IN_PROGRESS',
      dataCollectionNotes: 'Paciente Maria S. Santos, 62 anos, admitida com dor torácica grau 8/10. PA 168x102. FC 98. SpO2 95%. ECG com supradesnivelamento ST anterior. Protocolo IAMCSST ativado.',
    },
  });

  const dxMariaDor = await prisma.nursingDiagnosis.create({
    data: {
      id: uuidv4(),
      nursingProcessId: nursingProcessMaria.id,
      nandaCode: '00132',
      nandaDomain: 'Domínio 12 — Conforto',
      nandaClass: 'Classe 1 — Conforto físico',
      nandaTitle: 'Dor aguda',
      relatedFactors: ['Agentes lesivos biológicos — isquemia miocárdica'],
      definingCharacteristics: ['Relato verbal de dor 8/10', 'Expressão facial de dor', 'Taquicardia', 'Hipertensão'],
      status: 'ACTIVE',
      priority: 'HIGH',
    },
  });

  await prisma.nursingIntervention.create({
    data: {
      id: uuidv4(),
      nursingDiagnosisId: dxMariaDor.id,
      nicCode: '1400',
      nicTitle: 'Controle da dor',
      activities: [
        'Monitorar dor com escala numérica a cada 30 min',
        'Administrar morfina SOS conforme prescrição',
        'Posicionamento: decúbito semi-Fowler',
        'Monitorização cardíaca contínua',
        'Acesso venoso periférico calibroso (G18) — ambos os membros',
        'Coleta de sangue para troponina seriada',
        'Preparar paciente para cateterismo de urgência',
      ],
      status: 'IN_PROGRESS',
    },
  });

  // ─── 22. Nursing Notes ─────────────────────────────────────────────────

  console.log('  → Creating nursing notes...');

  const nursingNotes = [
    // Pedro — ICU nursing evolution notes
    {
      encounterId: IDS.enc_pedro_uti, nurseId: IDS.enfPatricia,
      type: 'EVOLUTION' as const, shift: 'MORNING' as const,
      content: 'EVOLUÇÃO DE ENFERMAGEM — MANHÃ — UTI-A-03\n\nPaciente Pedro H. Martins, 78 anos, 2o DIH por ICC descompensada.\n\nEstado geral: REG, consciente, orientado, queixando-se de dispneia leve.\nSinais vitais: PA 108/68, FC 96 (FA), SpO2 92% (cateter nasal 2L), FR 22, T 36.8°C.\nEdema MMII ++/4+ (melhora de ontem +++). Sem estertores crepitantes neste turno.\nDiurese acumulada 720mL (turno 7-13h). Balanço hídrico: -480mL.\nFurosemida 40mg EV administrada às 7h30 sem intercorrências.\nEnoxaparina 40mg SC aplicada em abdome.\nAccesso venoso central funcionante. Sem sinais flogísticos locais.\nBocal e higiene oral realizados. Curativo de acesso sem alterações.\nFamília orientada sobre melhora do quadro.',
      signedAt: hoursAgo(6),
    },
    {
      encounterId: IDS.enc_pedro_uti, nurseId: IDS.enfJoao,
      type: 'EVOLUTION' as const, shift: 'AFTERNOON' as const,
      content: 'EVOLUÇÃO DE ENFERMAGEM — TARDE — UTI-A-03\n\nPaciente em REG, cooperativo. Dispneia leve em repouso.\nPA 110/70, FC 94 (FA), SpO2 93% (cateter nasal 2L), FR 20.\nEdema MMII ++/4+ estável.\nDiurese 650mL (turno 13-19h). Balanço -320mL.\nAdministração de furosemida 40mg EV 19h (próxima dose).\nGlicemia capilar 19h: 168 mg/dL — insulina NPH 20UI SC aplicada.\nPaciente relatou melhora da dispneia em relação à admissão.',
      signedAt: hoursAgo(4),
    },
    {
      encounterId: IDS.enc_pedro_uti, nurseId: IDS.enfPatricia,
      type: 'OBSERVATION' as const, shift: 'MORNING' as const,
      content: 'OBSERVAÇÃO ESPECIAL — 10h30\n\nHipercalemia grave (K+ 6.2 mEq/L) identificada em exame laboratorial. Médico Dr. Carlos Eduardo notificado imediatamente. ECG realizado — sem alterações agudas (sem tent T, sem BRE). Iniciado protocolo de hipercalemia: gluconato de cálcio EV 1g + bicarbonato de sódio 8,4% 50mL EV. Monitorização cardíaca intensificada. Coleta de novo eletrólito em 2h.',
    },
    // Gabriel — emergency nursing
    {
      encounterId: IDS.enc_gabriel_asma, nurseId: IDS.enfPatricia,
      type: 'ADMISSION' as const, shift: 'AFTERNOON' as const,
      content: 'ADMISSÃO DE ENFERMAGEM — EMERGÊNCIA PEDIÁTRICA\n\nCriança Gabriel S. Lima, 8 anos, trazida pela mãe com crise asmática. Dispneia, sibilância e tosse seca há ~6h. Usou inalador domiciliar sem alívio.\n\nTriagem Manchester: Nível AMARELO. PA 100/65, FC 120, FR 28, SpO2 93%, T 36.8°C. Peso: 28.5kg.\n\nAcesso venoso periférico G22 em membro superior esquerdo.\nNebulização 1a dose: salbutamol 2.5mg em 3mL SF 0.9%. Início às 15h20.\nMãe orientada sobre procedimento e evolução esperada.',
      signedAt: hoursAgo(2),
    },
    {
      encounterId: IDS.enc_gabriel_asma, nurseId: IDS.enfPatricia,
      type: 'PROCEDURE' as const, shift: 'AFTERNOON' as const,
      content: 'REGISTRO DE PROCEDIMENTO — Nebulização terapêutica\n\nHorário: 15h20 — 1a nebulização (salbutamol 2.5mg)\nSpO2 antes: 93% | depois: 96%\nFC antes: 120 | depois: 108\nAusculta: sibilância difusa → melhora parcial (sibilância leve)\nGabriel tolerou bem o procedimento. Cooperativo.\n\nHorário: 15h40 — 2a nebulização (salbutamol 2.5mg)\nSpO2 antes: 96% | depois: 98%\nFC: 105\nAusculta: esparsos sibilos expiratórios\nMelhora clínica evidente. Criança menos taquipneica.',
    },
    // Maria — emergency nursing
    {
      encounterId: IDS.enc_maria_emergency, nurseId: IDS.enfPatricia,
      type: 'ADMISSION' as const, shift: 'MORNING' as const,
      content: 'ADMISSÃO DE ENFERMAGEM — URGÊNCIA CARDIOLÓGICA\n\nPaciente Maria da Silva Santos, 62 anos, admitida com dor torácica opressiva irradiando para MSE há 3h. Sudorese fria. Náusea.\n\nPA: 168x102 mmHg. FC: 98 bpm. SpO2: 95% (AR). FR: 22. T: 36.8°C.\n\nECG imediato realizado e encaminhado ao cardiologista de plantão. Eletrodos de monitorização contínua instalados.\nAcesso venoso periférico G18 em MSE.\nSolicitado acesso venoso contralateral.\nAleRTA: Paciente tem ALERGIA GRAVE a dipirona (anafilaxia). Identificado pulseira de alerta e flag no prontuário.\nFamiliar notificado e presente.',
      signedAt: hoursAgo(2),
    },
    {
      encounterId: IDS.enc_maria_emergency, nurseId: IDS.enfJoao,
      type: 'PROCEDURE' as const, shift: 'MORNING' as const,
      content: 'REGISTRO DE PROCEDIMENTO — Coleta de exames urgência\n\nColetados conforme protocolos de dor torácica:\n- Troponina I de alta sensibilidade (1a coleta)\n- CK-MB massa\n- Hemograma completo\n- Coagulograma (TTPA, TP/RNI)\n- Eletrólitos (Na, K, Mg, Ca)\n- Função renal (ureia, creatinina)\n- Glicemia\n\nAll amostras enviadas ao laboratório às 08h45. Resultado troponina recebido às 09h30: 0.08 ng/mL (ELEVADO — valor crítico). Médico Dr. Carlos Eduardo imediatamente notificado. Protocolo IAMCSST confirmado.',
    },
    // ICU handoff note
    {
      encounterId: IDS.enc_pedro_uti, nurseId: IDS.enfJoao,
      type: 'HANDOFF' as const, shift: 'NIGHT' as const,
      content: 'PASSAGEM DE PLANTÃO — TURNO NOTURNO — UTI-A-03\n\nPedro H. Martins, 78A, 2o DIH ICC descompensada + FA crônica + DRC 3a.\n\nESTADO ATUAL: Estável, melhora progressiva. Dispneia leve em repouso.\nPENDÊNCIAS:\n- Furosemida 40mg EV às 01h e 07h\n- Insulina NPH 20UI SC às 07h (glicemia capilar pré)\n- Repetir eletrólitos às 06h (hipercalemia em resolução)\n- Pesar às 06h\n- ECG às 06h\n\nALERTAS: Hipercalemia em tratamento. Monitorizar ritmo cardíaco continuamente. Notificar médico se K+ > 5.5 nos novos exames.\n\nFamiliar Helena Martins (esposa): informada sobre estabilização. Tel: (11) 97321-0987.',
    },
  ];

  for (const n of nursingNotes) {
    await prisma.nursingNote.create({ data: { id: uuidv4(), ...n } });
  }

  // ─── 23. Fluid Balances ────────────────────────────────────────────────

  console.log('  → Creating fluid balances...');

  // Pedro — 3 days of ICU fluid balance
  const pedroDayFluidBalances = [
    {
      recordedAt: daysAgo(3), period: '24h — Dia 1 internação',
      intakeOral: 300, intakeIV: 950, intakeOther: 0, intakeTotal: 1250,
      outputUrine: 580, outputDrain: 0, outputEmesis: 120, outputStool: 0, outputOther: 0, outputTotal: 700,
      balance: 550, cumulativeBalance24h: 550,
    },
    {
      recordedAt: daysAgo(2), period: '24h — Dia 2 internação',
      intakeOral: 400, intakeIV: 880, intakeOther: 0, intakeTotal: 1280,
      outputUrine: 1250, outputDrain: 0, outputEmesis: 0, outputStool: 100, outputOther: 0, outputTotal: 1350,
      balance: -70, cumulativeBalance24h: 480,
    },
    {
      recordedAt: daysAgo(1), period: '24h — Dia 3 internação',
      intakeOral: 500, intakeIV: 800, intakeOther: 0, intakeTotal: 1300,
      outputUrine: 1650, outputDrain: 0, outputEmesis: 0, outputStool: 0, outputOther: 0, outputTotal: 1650,
      balance: -350, cumulativeBalance24h: 130,
      aiAlert: 'Balanço negativo acumulado em melhora. Meta: atingir balanço -500mL/dia.',
    },
  ];

  for (const fb of pedroDayFluidBalances) {
    await prisma.fluidBalance.create({
      data: {
        id: uuidv4(),
        encounterId: IDS.enc_pedro_uti,
        patientId: IDS.pedro,
        nurseId: IDS.enfPatricia,
        ...fb,
      },
    });
  }

  // Gabriel — today's fluid balance
  await prisma.fluidBalance.create({
    data: {
      id: uuidv4(),
      encounterId: IDS.enc_gabriel_asma,
      patientId: IDS.gabriel,
      nurseId: IDS.enfPatricia,
      recordedAt: new Date(),
      period: 'Turno tarde — emergência',
      intakeOral: 150, intakeIV: 100, intakeOther: 0, intakeTotal: 250,
      outputUrine: 80, outputDrain: 0, outputEmesis: 0, outputStool: 0, outputOther: 0, outputTotal: 80,
      balance: 170,
    },
  });

  // Maria — emergency fluid balance
  await prisma.fluidBalance.create({
    data: {
      id: uuidv4(),
      encounterId: IDS.enc_maria_emergency,
      patientId: IDS.maria,
      nurseId: IDS.enfJoao,
      recordedAt: new Date(),
      period: 'Turno manhã — urgência',
      intakeOral: 0, intakeIV: 500, intakeOther: 0, intakeTotal: 500,
      outputUrine: 200, outputDrain: 0, outputEmesis: 0, outputStool: 0, outputOther: 0, outputTotal: 200,
      balance: 300,
    },
  });

  // ─── 24. Additional Document Templates ─────────────────────────────────

  console.log('  → Creating additional document templates...');

  const additionalTemplates = [
    {
      tenantId: IDS.tenant,
      name: 'Encaminhamento Especialidade',
      type: 'ENCAMINHAMENTO' as const,
      category: 'referral',
      content: `{{hospital_header}}\n\nENCaminHAMENTO MÉDICO\n\nEncaminho o(a) paciente {{patient_name}}, {{patient_age}} anos, CPF {{patient_cpf}}, para avaliação por {{specialty}}.\n\nMOTIVO: {{referral_reason}}\n\nHIPÓTESE DIAGNÓSTICA: {{diagnosis}}\n\nINFORMAÇÕES RELEVANTES:\n{{clinical_info}}\n\nMEDICAMENTOS EM USO:\n{{medications}}\n\n{{city}}, {{full_date}}.\n\n{{doctor_signature}}\n{{doctor_crm}}`,
      isActive: true,
      createdById: IDS.admRicardo,
    },
    {
      tenantId: IDS.tenant,
      name: 'Laudo Médico Pericial',
      type: 'LAUDO' as const,
      category: 'report',
      content: `{{hospital_header}}\n\nLAUDO MÉDICO\n\nNome: {{patient_name}}\nData de nascimento: {{patient_birthdate}}\nCPF: {{patient_cpf}}\n\nO(A) paciente acima identificado(a) encontra-se sob cuidados médicos nesta instituição, com o seguinte diagnóstico:\n\nDIAGNÓSTICO(S):\n{{diagnoses}}\n\nESTADO CLÍNICO ATUAL:\n{{clinical_status}}\n\nCAPACIDADE FUNCIONAL:\n{{functional_capacity}}\n\nOBSERVAÇÕES:\n{{observations}}\n\n{{city}}, {{full_date}}.\n\n{{doctor_signature}}\n{{doctor_crm}}`,
      isActive: true,
      createdById: IDS.admRicardo,
    },
    {
      tenantId: IDS.tenant,
      name: 'Declaração de Comparecimento',
      type: 'DECLARACAO' as const,
      category: 'certificate',
      content: `{{hospital_header}}\n\nDECLARAÇÃO DE COMPARECIMENTO\n\nDeclaro que o(a) Sr(a). {{patient_name}}, portador(a) do CPF {{patient_cpf}}, esteve presente nesta instituição no dia {{date}}, no período {{period}}, para atendimento médico.\n\nEsta declaração é emitida a pedido do(a) interessado(a) para os fins que se fizerem necessários.\n\n{{city}}, {{full_date}}.\n\n_______________________________\nAssinatura e Carimbo\n{{hospital_name}}`,
      isActive: true,
      createdById: IDS.admRicardo,
    },
  ];

  for (const t of additionalTemplates) {
    await prisma.documentTemplate.create({ data: { id: uuidv4(), ...t } });
  }

  // ─── 25. Chemotherapy Protocols & Cycles ───────────────────────────────

  console.log('  → Creating chemotherapy protocols and cycles...');

  await prisma.chemotherapyProtocol.create({
    data: {
      id: IDS.proto_ac,
      tenantId: IDS.tenant,
      name: 'AC (Doxorrubicina + Ciclofosfamida)',
      nameEn: 'AC (Adriamycin + Cyclophosphamide)',
      regimen: 'AC',
      indication: 'Câncer de mama adjuvante/neoadjuvante. RE+/RP+/HER2-, estágios I-III.',
      drugs: [
        { name: 'Doxorrubicina (Adriamicina)', dose: 60, unit: 'mg/m²', route: 'IV', day: 1, infusionTime: 15, notes: 'Infundir em 15 min. Vesicante — acesso venoso central preferencial.' },
        { name: 'Ciclofosfamida', dose: 600, unit: 'mg/m²', route: 'IV', day: 1, infusionTime: 60, notes: 'Hidratação vigorosa antes e durante.' },
      ],
      premedications: [
        { name: 'Ondansetrona', dose: '8mg EV', timing: '30 min antes da QT' },
        { name: 'Dexametasona', dose: '20mg EV', timing: '30 min antes da QT' },
        { name: 'Ranitidina', dose: '50mg EV', timing: '30 min antes da QT' },
      ],
      cycleDays: 21,
      maxCycles: 4,
      emetogenicRisk: 'HIGH',
      notes: 'Monitorar função cardíaca (ECO/MUGA antes e após 4 ciclos). Dose cumulativa máxima de doxorrubicina: 550mg/m². Hemograma com diferencial antes de cada ciclo. Não iniciar se neutrófilos < 1500.',
    },
  });

  await prisma.chemotherapyProtocol.create({
    data: {
      id: IDS.proto_folfox,
      tenantId: IDS.tenant,
      name: 'FOLFOX (Oxaliplatina + 5-FU + Leucovorina)',
      nameEn: 'FOLFOX (Oxaliplatin + 5-FU + Leucovorin)',
      regimen: 'FOLFOX-6',
      indication: 'Câncer colorretal metastático ou adjuvante (estágio III). Segunda linha após FOLFIRI.',
      drugs: [
        { name: 'Oxaliplatina', dose: 85, unit: 'mg/m²', route: 'IV', day: 1, infusionTime: 120, notes: 'Infundir em 2h. Não misturar com soluções alcalinas.' },
        { name: 'Leucovorina', dose: 400, unit: 'mg/m²', route: 'IV', day: 1, infusionTime: 120, notes: 'Infundir concomitantemente com oxaliplatina em Y.' },
        { name: '5-Fluorouracil (bolus)', dose: 400, unit: 'mg/m²', route: 'IV', day: 1, infusionTime: 0, notes: 'Bolus EV após leucovorina.' },
        { name: '5-Fluorouracil (infusão contínua)', dose: 2400, unit: 'mg/m²', route: 'IV', day: '1-2', infusionTime: 46 * 60, notes: 'Infusão contínua 46h via bomba de infusão portátil.' },
      ],
      cycleDays: 14,
      maxCycles: 12,
      emetogenicRisk: 'MODERATE',
    },
  });

  await prisma.chemotherapyProtocol.create({
    data: {
      id: IDS.proto_chop,
      tenantId: IDS.tenant,
      name: 'R-CHOP (Rituximabe + CHOP)',
      nameEn: 'R-CHOP (Rituximab + Cyclophosphamide + Doxorubicin + Vincristine + Prednisone)',
      regimen: 'R-CHOP-21',
      indication: 'Linfoma não-Hodgkin difuso de grandes células B (DLBCL). CD20+. Primeira linha.',
      drugs: [
        { name: 'Rituximabe', dose: 375, unit: 'mg/m²', route: 'IV', day: 1, infusionTime: 240, notes: 'Pré-medicar com antialérgico. Iniciar infusão lentamente.' },
        { name: 'Ciclofosfamida', dose: 750, unit: 'mg/m²', route: 'IV', day: 1, infusionTime: 60 },
        { name: 'Doxorrubicina', dose: 50, unit: 'mg/m²', route: 'IV', day: 1, infusionTime: 15 },
        { name: 'Vincristina', dose: 1.4, unit: 'mg/m² (máx 2mg)', route: 'IV', day: 1, infusionTime: 10 },
        { name: 'Prednisona', dose: 100, unit: 'mg/dia VO', route: 'ORAL', day: '1-5', infusionTime: 0 },
      ],
      cycleDays: 21,
      maxCycles: 6,
      emetogenicRisk: 'HIGH',
    },
  });

  // Lucia's AC cycles (4 completed, based on encounter history)
  const luciaCycles = [
    {
      id: IDS.cycle_lucia_ac1,
      cycleNumber: 1, status: 'COMPLETED' as const,
      scheduledDate: daysAgo(84), startedAt: daysAgo(84), completedAt: daysAgo(83),
      bsa: 1.62, weight: 62.0, height: 162,
      toxicities: { nausea: 2, alopecia: 1, fatigue: 1, neutropenia: 0 },
      labResults: { hb: 12.8, leucocitos: 8200, neutrofilos: 5800, plaquetas: 195000 },
      doctorNotes: 'Ciclo 1 AC administrado sem intercorrências. Náuseas grau 2 no D+1 a D+5, controladas com ondansetrona. Tolerado bem.',
    },
    {
      id: IDS.cycle_lucia_ac2,
      cycleNumber: 2, status: 'COMPLETED' as const,
      scheduledDate: daysAgo(63), startedAt: daysAgo(63), completedAt: daysAgo(62),
      bsa: 1.60, weight: 60.5, height: 162,
      toxicities: { nausea: 2, alopecia: 2, fatigue: 2, neutropenia: 1 },
      labResults: { hb: 11.5, leucocitos: 6200, neutrofilos: 3500, plaquetas: 178000 },
      doctorNotes: 'Ciclo 2 AC. Alopecia grau 2 iniciada. Neutropenia grau 1 (neutrófilos 1500-2000). Atraso de 3 dias por recuperação. Dose mantida.',
    },
    {
      id: IDS.cycle_lucia_ac3,
      cycleNumber: 3, status: 'COMPLETED' as const,
      scheduledDate: daysAgo(42), startedAt: daysAgo(42), completedAt: daysAgo(41),
      bsa: 1.59, weight: 59.0, height: 162,
      toxicities: { nausea: 2, alopecia: 2, fatigue: 2, neutropenia: 1, mucositis: 1 },
      labResults: { hb: 10.8, leucocitos: 7100, neutrofilos: 4200, plaquetas: 188000 },
      doctorNotes: 'Ciclo 3 AC. Mucosite oral grau 1 — orientado colutório. Fadiga grau 2 persistente. Boa resposta clínica.',
    },
    {
      id: IDS.cycle_lucia_ac4,
      cycleNumber: 4, status: 'COMPLETED' as const,
      scheduledDate: daysAgo(21), startedAt: daysAgo(21), completedAt: daysAgo(20),
      bsa: 1.57, weight: 58.0, height: 162,
      toxicities: { nausea: 2, alopecia: 2, fatigue: 1, neutropenia: 0 },
      labResults: { hb: 10.2, leucocitos: 3800, neutrofilos: 2100, plaquetas: 185000 },
      doctorNotes: 'Ciclo 4/4 AC (último ciclo). Tolerado. Ecocardiograma pós-AC: FEVE 62% (sem cardiotoxicidade). Transição para fase hormonal: tamoxifeno 20mg/dia. Aguardar recuperação medular para hormonioterapia.',
      nurseNotes: 'Infusão realizada sem complicações. Port-a-cath funcionante. Paciente orientada sobre término do AC e início de tamoxifeno.',
    },
  ];

  for (const cycle of luciaCycles) {
    await prisma.chemotherapyCycle.create({
      data: {
        ...cycle,
        tenantId: IDS.tenant,
        patientId: IDS.lucia,
        encounterId: IDS.enc_lucia_onco,
        protocolId: IDS.proto_ac,
      },
    });
  }

  // ─── Done ──────────────────────────────────────────────────────────────

  console.log('\n✅ Seed completed successfully!');
  console.log('   Created:');
  console.log('   - 1 Tenant (Hospital São Lucas)');
  console.log('   - 8 Users (3 doctors, 2 nurses, 1 pharmacist, 1 admin, 1 receptionist)');
  console.log('   - 3 Doctor Profiles + 1 Nurse Profile');
  console.log('   - 10 Patients with rich clinical histories');
  console.log('   - 10 Social Histories');
  console.log('   - 12 Family Histories');
  console.log('   - 7 Surgical Histories');
  console.log('   - 11 Vaccinations');
  console.log('   - 7 Allergies');
  console.log('   - 15 Chronic Conditions');
  console.log('   - 15 Encounters');
  console.log('   - 30+ Vital Sign records');
  console.log('   - 5 Prescriptions with 14 items');
  console.log('   - 17 Medication Checks');
  console.log('   - 10 Clinical Notes (original + 6 additional)');
  console.log('   - 30 Beds (10 UTI + 20 Enfermaria)');
  console.log('   - 18 Appointments (10 original + 8 additional)');
  console.log('   - 7 Clinical Alerts');
  console.log('   - 8 Document Templates (5 original + 3 additional)');
  console.log('   - 5 Surgical Procedures');
  console.log('   - 8 Billing Entries with TISS data');
  console.log('   - 16 Exam Results (lab + imaging)');
  console.log('   - 3 Nursing Processes with 5 diagnoses, 3 outcomes, 5 interventions');
  console.log('   - 8 Nursing Notes');
  console.log('   - 5 Fluid Balance records');
  console.log('   - 3 Chemotherapy Protocols + 4 Lucia AC Cycles');
  console.log('   - 8 LGPD Data Retention Policies');
  console.log('   - 6 LGPD Consent Records');

  // ─── Drug Database ─────────────────────────────────────────────────────
  await seedDrugs(prisma);
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
