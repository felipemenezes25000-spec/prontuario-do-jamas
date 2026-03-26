import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CalculateScoreDto,
  CalculatorType,
  CalculatorResult,
  CalculatorMeta,
} from './dto/medical-calculators.dto';

// ============================================================================
// Calculator metadata registry
// ============================================================================

const CALCULATOR_REGISTRY: Record<CalculatorType, CalculatorMeta> = {
  [CalculatorType.CHADS2_VASC]: {
    name: 'CHA2DS2-VASc',
    description: 'Risco de AVC em fibrilacao atrial',
    requiredInputs: [
      { key: 'chf', label: 'Insuficiencia cardiaca', type: 'boolean' },
      { key: 'hypertension', label: 'Hipertensao', type: 'boolean' },
      { key: 'age75', label: 'Idade >= 75 anos', type: 'boolean' },
      { key: 'diabetes', label: 'Diabetes mellitus', type: 'boolean' },
      { key: 'stroke', label: 'AVC/AIT/tromboembolismo previo', type: 'boolean' },
      { key: 'vascular', label: 'Doenca vascular', type: 'boolean' },
      { key: 'age65', label: 'Idade 65-74 anos', type: 'boolean' },
      { key: 'female', label: 'Sexo feminino', type: 'boolean' },
    ],
  },
  [CalculatorType.MELD]: {
    name: 'MELD Score',
    description: 'Gravidade de doenca hepatica cronica',
    requiredInputs: [
      { key: 'bilirubin', label: 'Bilirrubina (mg/dL)', type: 'number', min: 0.1, max: 50 },
      { key: 'inr', label: 'INR', type: 'number', min: 0.1, max: 20 },
      { key: 'creatinine', label: 'Creatinina (mg/dL)', type: 'number', min: 0.1, max: 15 },
    ],
  },
  [CalculatorType.CHILD_PUGH]: {
    name: 'Child-Pugh Score',
    description: 'Classificacao de gravidade da cirrose hepatica',
    requiredInputs: [
      { key: 'ascites', label: 'Ascite', type: 'select', options: [{ value: 1, label: 'Ausente' }, { value: 2, label: 'Leve' }, { value: 3, label: 'Moderada/Grave' }] },
      { key: 'encephalopathy', label: 'Encefalopatia', type: 'select', options: [{ value: 1, label: 'Ausente' }, { value: 2, label: 'Grau I-II' }, { value: 3, label: 'Grau III-IV' }] },
      { key: 'bilirubin', label: 'Bilirrubina', type: 'select', options: [{ value: 1, label: '< 2 mg/dL' }, { value: 2, label: '2-3 mg/dL' }, { value: 3, label: '> 3 mg/dL' }] },
      { key: 'albumin', label: 'Albumina', type: 'select', options: [{ value: 1, label: '> 3.5 g/dL' }, { value: 2, label: '2.8-3.5 g/dL' }, { value: 3, label: '< 2.8 g/dL' }] },
      { key: 'inr', label: 'INR', type: 'select', options: [{ value: 1, label: '< 1.7' }, { value: 2, label: '1.7-2.3' }, { value: 3, label: '> 2.3' }] },
    ],
  },
  [CalculatorType.APACHE_II]: {
    name: 'APACHE II',
    description: 'Gravidade de doenca em UTI (0-71)',
    requiredInputs: [
      { key: 'agePoints', label: 'Pontos por idade (0-6)', type: 'number', min: 0, max: 6 },
      { key: 'temperature', label: 'Temperatura retal (pontos 0-4)', type: 'number', min: 0, max: 4 },
      { key: 'meanAP', label: 'PAM (pontos 0-4)', type: 'number', min: 0, max: 4 },
      { key: 'heartRate', label: 'FC (pontos 0-4)', type: 'number', min: 0, max: 4 },
      { key: 'respRate', label: 'FR (pontos 0-4)', type: 'number', min: 0, max: 4 },
      { key: 'oxygenation', label: 'Oxigenacao (pontos 0-4)', type: 'number', min: 0, max: 4 },
      { key: 'arterialPh', label: 'pH arterial (pontos 0-4)', type: 'number', min: 0, max: 4 },
      { key: 'sodium', label: 'Sodio (pontos 0-4)', type: 'number', min: 0, max: 4 },
      { key: 'potassium', label: 'Potassio (pontos 0-4)', type: 'number', min: 0, max: 4 },
      { key: 'creatinine', label: 'Creatinina (pontos 0-4)', type: 'number', min: 0, max: 4 },
      { key: 'hematocrit', label: 'Hematocrito (pontos 0-4)', type: 'number', min: 0, max: 4 },
      { key: 'wbc', label: 'Leucocitos (pontos 0-4)', type: 'number', min: 0, max: 4 },
      { key: 'gcs', label: 'Glasgow (pontos = 15 - GCS)', type: 'number', min: 0, max: 12 },
      { key: 'chronicHealth', label: 'Pontos doenca cronica (0, 2 ou 5)', type: 'number', min: 0, max: 5 },
    ],
  },
  [CalculatorType.WELLS_DVT]: {
    name: 'Wells Score (TVP)',
    description: 'Probabilidade de trombose venosa profunda',
    requiredInputs: [
      { key: 'activeCancer', label: 'Cancer ativo', type: 'boolean' },
      { key: 'paralysis', label: 'Paralisia/paresia/imobilizacao recente', type: 'boolean' },
      { key: 'bedridden', label: 'Acamado >3 dias ou cirurgia recente', type: 'boolean' },
      { key: 'tenderness', label: 'Sensibilidade ao longo do sistema venoso', type: 'boolean' },
      { key: 'swelling', label: 'Edema em toda a perna', type: 'boolean' },
      { key: 'calfSwelling', label: 'Pantorrillha >3cm maior que contralateral', type: 'boolean' },
      { key: 'pittingEdema', label: 'Edema depressivel (pitting)', type: 'boolean' },
      { key: 'collateralVeins', label: 'Veias superficiais colaterais', type: 'boolean' },
      { key: 'previousDvt', label: 'TVP previa documentada', type: 'boolean' },
      { key: 'alternativeDiagnosis', label: 'Diagnostico alternativo igualmente provavel', type: 'boolean' },
    ],
  },
  [CalculatorType.WELLS_PE]: {
    name: 'Wells Score (TEP)',
    description: 'Probabilidade de embolia pulmonar',
    requiredInputs: [
      { key: 'clinicalDvt', label: 'Sinais clinicos de TVP', type: 'boolean' },
      { key: 'peMostLikely', label: 'TEP como diagnostico mais provavel', type: 'boolean' },
      { key: 'heartRate100', label: 'FC > 100 bpm', type: 'boolean' },
      { key: 'immobilization', label: 'Imobilizacao ou cirurgia nas ultimas 4 semanas', type: 'boolean' },
      { key: 'previousPeDvt', label: 'TEP ou TVP previa', type: 'boolean' },
      { key: 'hemoptysis', label: 'Hemoptise', type: 'boolean' },
      { key: 'cancer', label: 'Cancer (tratamento nos ultimos 6 meses)', type: 'boolean' },
    ],
  },
  [CalculatorType.CURB65]: {
    name: 'CURB-65',
    description: 'Gravidade de pneumonia adquirida na comunidade',
    requiredInputs: [
      { key: 'confusion', label: 'Confusao mental', type: 'boolean' },
      { key: 'ureiaGt7', label: 'Ureia > 7 mmol/L (42 mg/dL)', type: 'boolean' },
      { key: 'respRateGt30', label: 'FR >= 30 irpm', type: 'boolean' },
      { key: 'lowBp', label: 'PAS < 90 ou PAD <= 60 mmHg', type: 'boolean' },
      { key: 'ageGt65', label: 'Idade >= 65 anos', type: 'boolean' },
    ],
  },
  [CalculatorType.SOFA]: {
    name: 'SOFA Score',
    description: 'Avaliacao sequencial de falencia organica (UTI)',
    requiredInputs: [
      { key: 'respiration', label: 'Respiracao PaO2/FiO2 (0-4)', type: 'number', min: 0, max: 4 },
      { key: 'coagulation', label: 'Coagulacao - Plaquetas (0-4)', type: 'number', min: 0, max: 4 },
      { key: 'liver', label: 'Figado - Bilirrubina (0-4)', type: 'number', min: 0, max: 4 },
      { key: 'cardiovascular', label: 'Cardiovascular - PAM/DVA (0-4)', type: 'number', min: 0, max: 4 },
      { key: 'cns', label: 'SNC - Glasgow (0-4)', type: 'number', min: 0, max: 4 },
      { key: 'renal', label: 'Renal - Creatinina/Diurese (0-4)', type: 'number', min: 0, max: 4 },
    ],
  },
  [CalculatorType.GRACE]: {
    name: 'GRACE Score',
    description: 'Risco em sindrome coronariana aguda',
    requiredInputs: [
      { key: 'age', label: 'Idade (anos)', type: 'number', min: 18, max: 120 },
      { key: 'heartRate', label: 'FC (bpm)', type: 'number', min: 20, max: 250 },
      { key: 'systolicBp', label: 'PAS (mmHg)', type: 'number', min: 40, max: 300 },
      { key: 'creatinine', label: 'Creatinina (mg/dL)', type: 'number', min: 0.1, max: 15 },
      { key: 'killipClass', label: 'Classe Killip (1-4)', type: 'number', min: 1, max: 4 },
      { key: 'cardiacArrest', label: 'PCR na admissao', type: 'boolean' },
      { key: 'stDeviation', label: 'Desvio do segmento ST', type: 'boolean' },
      { key: 'elevatedEnzymes', label: 'Enzimas cardiacas elevadas', type: 'boolean' },
    ],
  },
  [CalculatorType.HAS_BLED]: {
    name: 'HAS-BLED',
    description: 'Risco de sangramento em anticoagulacao',
    requiredInputs: [
      { key: 'hypertension', label: 'Hipertensao (PAS > 160)', type: 'boolean' },
      { key: 'renalDisease', label: 'Funcao renal anormal', type: 'boolean' },
      { key: 'liverDisease', label: 'Funcao hepatica anormal', type: 'boolean' },
      { key: 'stroke', label: 'AVC previo', type: 'boolean' },
      { key: 'bleeding', label: 'Sangramento previo ou predisposicao', type: 'boolean' },
      { key: 'labileInr', label: 'INR labil', type: 'boolean' },
      { key: 'elderly', label: 'Idade > 65 anos', type: 'boolean' },
      { key: 'drugs', label: 'Uso de antiplaquetarios/AINEs', type: 'boolean' },
      { key: 'alcohol', label: 'Uso de alcool', type: 'boolean' },
    ],
  },
};

@Injectable()
export class MedicalCalculatorsService {
  constructor(private readonly prisma: PrismaService) {}

  // =========================================================================
  // Main dispatcher
  // =========================================================================

  calculateScore(dto: CalculateScoreDto): CalculatorResult {
    switch (dto.calculator) {
      case CalculatorType.CHADS2_VASC:
        return this.calcChadsVasc(dto.inputs);
      case CalculatorType.MELD:
        return this.calcMeld(dto.inputs);
      case CalculatorType.CHILD_PUGH:
        return this.calcChildPugh(dto.inputs);
      case CalculatorType.APACHE_II:
        return this.calcApacheII(dto.inputs);
      case CalculatorType.WELLS_DVT:
        return this.calcWellsDvt(dto.inputs);
      case CalculatorType.WELLS_PE:
        return this.calcWellsPe(dto.inputs);
      case CalculatorType.CURB65:
        return this.calcCurb65(dto.inputs);
      case CalculatorType.SOFA:
        return this.calcSofa(dto.inputs);
      case CalculatorType.GRACE:
        return this.calcGrace(dto.inputs);
      case CalculatorType.HAS_BLED:
        return this.calcHasBled(dto.inputs);
      default:
        throw new BadRequestException(`Calculadora "${dto.calculator}" nao suportada`);
    }
  }

  // =========================================================================
  // Available calculators
  // =========================================================================

  getAvailableCalculators(): Array<{ calculator: CalculatorType; meta: CalculatorMeta }> {
    return Object.entries(CALCULATOR_REGISTRY).map(([key, meta]) => ({
      calculator: key as CalculatorType,
      meta,
    }));
  }

  // =========================================================================
  // Auto-fill from patient data
  // =========================================================================

  async getPatientAutoFill(tenantId: string, patientId: string, calculator: CalculatorType) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, tenantId },
    });
    if (!patient) {
      throw new NotFoundException(`Paciente "${patientId}" nao encontrado`);
    }

    const vitals = await this.prisma.vitalSigns.findFirst({
      where: { patientId },
      orderBy: { recordedAt: 'desc' },
    });

    const autoFill: Record<string, number> = {};

    if (vitals) {
      if (vitals.heartRate !== null && vitals.heartRate !== undefined) {
        autoFill['heartRate'] = Number(vitals.heartRate);
        if (Number(vitals.heartRate) > 100) autoFill['heartRate100'] = 1;
      }
      if (vitals.systolicBP !== null && vitals.systolicBP !== undefined) {
        autoFill['systolicBp'] = Number(vitals.systolicBP);
        if (Number(vitals.systolicBP) < 90) autoFill['lowBp'] = 1;
      }
      if (vitals.diastolicBP !== null && vitals.diastolicBP !== undefined) {
        if (Number(vitals.diastolicBP) <= 60) autoFill['lowBp'] = 1;
      }
      if (vitals.respiratoryRate !== null && vitals.respiratoryRate !== undefined) {
        if (Number(vitals.respiratoryRate) >= 30) autoFill['respRateGt30'] = 1;
      }
      if (vitals.temperature !== null && vitals.temperature !== undefined) {
        autoFill['temperature'] = Number(vitals.temperature);
      }
    }

    // Age-based auto-fill
    if (patient.birthDate) {
      const age = Math.floor(
        (Date.now() - new Date(patient.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000),
      );
      autoFill['age'] = age;
      if (age >= 75) autoFill['age75'] = 1;
      if (age >= 65 && age < 75) autoFill['age65'] = 1;
      if (age >= 65) {
        autoFill['ageGt65'] = 1;
        autoFill['elderly'] = 1;
      }
    }

    if (patient.gender === 'F') {
      autoFill['female'] = 1;
    }

    return {
      patientId,
      calculator,
      autoFill,
      source: {
        vitalsDate: vitals?.recordedAt ?? null,
        patientBirthDate: patient.birthDate ?? null,
      },
    };
  }

  // =========================================================================
  // Calculator implementations
  // =========================================================================

  private calcChadsVasc(inputs: Record<string, number>): CalculatorResult {
    const score =
      (inputs['chf'] ? 1 : 0) +
      (inputs['hypertension'] ? 1 : 0) +
      (inputs['age75'] ? 2 : 0) +
      (inputs['diabetes'] ? 1 : 0) +
      (inputs['stroke'] ? 2 : 0) +
      (inputs['vascular'] ? 1 : 0) +
      (inputs['age65'] ? 1 : 0) +
      (inputs['female'] ? 1 : 0);

    let interpretation: string;
    let risk: CalculatorResult['risk'];
    if (score === 0) {
      interpretation = 'Baixo risco. Considerar nao anticoagular.';
      risk = 'LOW';
    } else if (score === 1) {
      interpretation = 'Risco moderado. Considerar anticoagulacao.';
      risk = 'MODERATE';
    } else {
      interpretation = 'Alto risco. Anticoagulacao recomendada.';
      risk = score >= 4 ? 'VERY_HIGH' : 'HIGH';
    }

    return { calculator: CalculatorType.CHADS2_VASC, score, maxScore: 9, interpretation, risk, details: inputs };
  }

  private calcMeld(inputs: Record<string, number>): CalculatorResult {
    const bilirubin = Math.max(inputs['bilirubin'] ?? 1, 1);
    const inr = Math.max(inputs['inr'] ?? 1, 1);
    const creatinine = Math.min(Math.max(inputs['creatinine'] ?? 1, 1), 4);

    const score = Math.round(
      3.78 * Math.log(bilirubin) +
      11.2 * Math.log(inr) +
      9.57 * Math.log(creatinine) +
      6.43,
    );

    const clampedScore = Math.max(6, Math.min(score, 40));

    let interpretation: string;
    let risk: CalculatorResult['risk'];
    if (clampedScore < 10) {
      interpretation = 'Baixa gravidade. Mortalidade em 3 meses: ~1.9%.';
      risk = 'LOW';
    } else if (clampedScore < 20) {
      interpretation = 'Gravidade moderada. Mortalidade em 3 meses: ~6%.';
      risk = 'MODERATE';
    } else if (clampedScore < 30) {
      interpretation = 'Alta gravidade. Mortalidade em 3 meses: ~19.6%.';
      risk = 'HIGH';
    } else {
      interpretation = 'Gravidade muito alta. Mortalidade em 3 meses: ~52.6%.';
      risk = 'VERY_HIGH';
    }

    return { calculator: CalculatorType.MELD, score: clampedScore, maxScore: 40, interpretation, risk, details: { bilirubin, inr, creatinine } };
  }

  private calcChildPugh(inputs: Record<string, number>): CalculatorResult {
    const score =
      (inputs['ascites'] ?? 1) +
      (inputs['encephalopathy'] ?? 1) +
      (inputs['bilirubin'] ?? 1) +
      (inputs['albumin'] ?? 1) +
      (inputs['inr'] ?? 1);

    let interpretation: string;
    let risk: CalculatorResult['risk'];
    let classLabel: string;
    if (score <= 6) {
      classLabel = 'A';
      interpretation = 'Classe A (5-6): Bem compensado. Sobrevida 1 ano: ~100%. Sobrevida 2 anos: ~85%.';
      risk = 'LOW';
    } else if (score <= 9) {
      classLabel = 'B';
      interpretation = 'Classe B (7-9): Comprometimento funcional significativo. Sobrevida 1 ano: ~80%. Sobrevida 2 anos: ~60%.';
      risk = 'MODERATE';
    } else {
      classLabel = 'C';
      interpretation = 'Classe C (10-15): Descompensado. Sobrevida 1 ano: ~45%. Sobrevida 2 anos: ~35%.';
      risk = 'HIGH';
    }

    return { calculator: CalculatorType.CHILD_PUGH, score, maxScore: 15, interpretation, risk, details: { ...inputs, class: classLabel } };
  }

  private calcApacheII(inputs: Record<string, number>): CalculatorResult {
    const score =
      (inputs['agePoints'] ?? 0) +
      (inputs['temperature'] ?? 0) +
      (inputs['meanAP'] ?? 0) +
      (inputs['heartRate'] ?? 0) +
      (inputs['respRate'] ?? 0) +
      (inputs['oxygenation'] ?? 0) +
      (inputs['arterialPh'] ?? 0) +
      (inputs['sodium'] ?? 0) +
      (inputs['potassium'] ?? 0) +
      (inputs['creatinine'] ?? 0) +
      (inputs['hematocrit'] ?? 0) +
      (inputs['wbc'] ?? 0) +
      (inputs['gcs'] ?? 0) +
      (inputs['chronicHealth'] ?? 0);

    let interpretation: string;
    let risk: CalculatorResult['risk'];
    if (score <= 9) {
      interpretation = `APACHE II: ${score}/71. Mortalidade estimada: ~8%.`;
      risk = 'LOW';
    } else if (score <= 19) {
      interpretation = `APACHE II: ${score}/71. Mortalidade estimada: ~12-25%.`;
      risk = 'MODERATE';
    } else if (score <= 29) {
      interpretation = `APACHE II: ${score}/71. Mortalidade estimada: ~40%.`;
      risk = 'HIGH';
    } else {
      interpretation = `APACHE II: ${score}/71. Mortalidade estimada: ~55-73%.`;
      risk = 'VERY_HIGH';
    }

    return { calculator: CalculatorType.APACHE_II, score, maxScore: 71, interpretation, risk, details: inputs };
  }

  private calcWellsDvt(inputs: Record<string, number>): CalculatorResult {
    const score =
      (inputs['activeCancer'] ? 1 : 0) +
      (inputs['paralysis'] ? 1 : 0) +
      (inputs['bedridden'] ? 1 : 0) +
      (inputs['tenderness'] ? 1 : 0) +
      (inputs['swelling'] ? 1 : 0) +
      (inputs['calfSwelling'] ? 1 : 0) +
      (inputs['pittingEdema'] ? 1 : 0) +
      (inputs['collateralVeins'] ? 1 : 0) +
      (inputs['previousDvt'] ? 1 : 0) +
      (inputs['alternativeDiagnosis'] ? -2 : 0);

    let interpretation: string;
    let risk: CalculatorResult['risk'];
    if (score <= 0) {
      interpretation = 'Baixa probabilidade de TVP (~5%). Solicitar D-dimero.';
      risk = 'LOW';
    } else if (score <= 2) {
      interpretation = 'Probabilidade moderada de TVP (~17%). Solicitar D-dimero e/ou USG Doppler.';
      risk = 'MODERATE';
    } else {
      interpretation = 'Alta probabilidade de TVP (~53%). Solicitar USG Doppler venoso.';
      risk = 'HIGH';
    }

    return { calculator: CalculatorType.WELLS_DVT, score, maxScore: 9, interpretation, risk, details: inputs };
  }

  private calcWellsPe(inputs: Record<string, number>): CalculatorResult {
    const score =
      (inputs['clinicalDvt'] ? 3 : 0) +
      (inputs['peMostLikely'] ? 3 : 0) +
      (inputs['heartRate100'] ? 1.5 : 0) +
      (inputs['immobilization'] ? 1.5 : 0) +
      (inputs['previousPeDvt'] ? 1.5 : 0) +
      (inputs['hemoptysis'] ? 1 : 0) +
      (inputs['cancer'] ? 1 : 0);

    let interpretation: string;
    let risk: CalculatorResult['risk'];
    if (score <= 1) {
      interpretation = 'Baixa probabilidade de TEP (~1.3%). Solicitar D-dimero.';
      risk = 'LOW';
    } else if (score <= 4) {
      interpretation = 'Probabilidade moderada de TEP (~16.2%). Solicitar D-dimero e/ou angioTC.';
      risk = 'MODERATE';
    } else {
      interpretation = 'Alta probabilidade de TEP (~40.6%). Solicitar angioTC de torax.';
      risk = 'HIGH';
    }

    return { calculator: CalculatorType.WELLS_PE, score, maxScore: 12.5, interpretation, risk, details: inputs };
  }

  private calcCurb65(inputs: Record<string, number>): CalculatorResult {
    const score =
      (inputs['confusion'] ? 1 : 0) +
      (inputs['ureiaGt7'] ? 1 : 0) +
      (inputs['respRateGt30'] ? 1 : 0) +
      (inputs['lowBp'] ? 1 : 0) +
      (inputs['ageGt65'] ? 1 : 0);

    let interpretation: string;
    let risk: CalculatorResult['risk'];
    if (score <= 1) {
      interpretation = 'Baixa gravidade. Considerar tratamento ambulatorial. Mortalidade: ~1.5%.';
      risk = 'LOW';
    } else if (score === 2) {
      interpretation = 'Gravidade moderada. Considerar internacao hospitalar. Mortalidade: ~9.2%.';
      risk = 'MODERATE';
    } else {
      interpretation = 'Alta gravidade. Internacao em UTI. Mortalidade: ~22%.';
      risk = score >= 4 ? 'VERY_HIGH' : 'HIGH';
    }

    return { calculator: CalculatorType.CURB65, score, maxScore: 5, interpretation, risk, details: inputs };
  }

  private calcSofa(inputs: Record<string, number>): CalculatorResult {
    const score =
      (inputs['respiration'] ?? 0) +
      (inputs['coagulation'] ?? 0) +
      (inputs['liver'] ?? 0) +
      (inputs['cardiovascular'] ?? 0) +
      (inputs['cns'] ?? 0) +
      (inputs['renal'] ?? 0);

    let interpretation: string;
    let risk: CalculatorResult['risk'];
    if (score <= 1) {
      interpretation = 'SOFA baixo. Mortalidade: < 10%.';
      risk = 'LOW';
    } else if (score <= 6) {
      interpretation = 'SOFA moderado. Mortalidade: < 10%. Monitorar evolucao.';
      risk = 'MODERATE';
    } else if (score <= 12) {
      interpretation = 'SOFA alto. Mortalidade: 15-20%. Considerar intensificacao de cuidados.';
      risk = 'HIGH';
    } else {
      interpretation = 'SOFA muito alto. Mortalidade: > 50%. Quadro critico.';
      risk = 'VERY_HIGH';
    }

    return { calculator: CalculatorType.SOFA, score, maxScore: 24, interpretation, risk, details: inputs };
  }

  private calcGrace(inputs: Record<string, number>): CalculatorResult {
    // Simplified GRACE score calculation
    const age = inputs['age'] ?? 60;
    const hr = inputs['heartRate'] ?? 80;
    const sbp = inputs['systolicBp'] ?? 120;
    const creatinine = inputs['creatinine'] ?? 1.0;
    const killip = inputs['killipClass'] ?? 1;
    const cardiacArrest = inputs['cardiacArrest'] ? 1 : 0;
    const stDeviation = inputs['stDeviation'] ? 1 : 0;
    const elevatedEnzymes = inputs['elevatedEnzymes'] ? 1 : 0;

    // Approximate GRACE scoring (simplified linear model)
    let score = 0;
    // Age contribution
    if (age < 30) score += 0;
    else if (age < 40) score += 8;
    else if (age < 50) score += 25;
    else if (age < 60) score += 41;
    else if (age < 70) score += 58;
    else if (age < 80) score += 75;
    else if (age < 90) score += 91;
    else score += 100;

    // Heart rate
    if (hr < 50) score += 0;
    else if (hr < 70) score += 3;
    else if (hr < 90) score += 9;
    else if (hr < 110) score += 15;
    else if (hr < 150) score += 24;
    else if (hr < 200) score += 38;
    else score += 46;

    // Systolic BP (inverse)
    if (sbp < 80) score += 58;
    else if (sbp < 100) score += 53;
    else if (sbp < 120) score += 43;
    else if (sbp < 140) score += 34;
    else if (sbp < 160) score += 24;
    else if (sbp < 200) score += 10;
    else score += 0;

    // Creatinine
    if (creatinine < 0.4) score += 1;
    else if (creatinine < 0.8) score += 4;
    else if (creatinine < 1.2) score += 7;
    else if (creatinine < 1.6) score += 10;
    else if (creatinine < 2.0) score += 13;
    else if (creatinine < 4.0) score += 21;
    else score += 28;

    // Killip class
    score += (killip - 1) * 20;

    // Boolean factors
    score += cardiacArrest * 39;
    score += stDeviation * 28;
    score += elevatedEnzymes * 14;

    let interpretation: string;
    let risk: CalculatorResult['risk'];
    if (score <= 108) {
      interpretation = 'Baixo risco GRACE. Mortalidade hospitalar: < 1%.';
      risk = 'LOW';
    } else if (score <= 140) {
      interpretation = 'Risco intermediario GRACE. Mortalidade hospitalar: 1-3%.';
      risk = 'MODERATE';
    } else {
      interpretation = 'Alto risco GRACE. Mortalidade hospitalar: > 3%. Considerar estrategia invasiva precoce.';
      risk = score > 200 ? 'VERY_HIGH' : 'HIGH';
    }

    return { calculator: CalculatorType.GRACE, score, maxScore: 372, interpretation, risk, details: inputs };
  }

  private calcHasBled(inputs: Record<string, number>): CalculatorResult {
    const score =
      (inputs['hypertension'] ? 1 : 0) +
      (inputs['renalDisease'] ? 1 : 0) +
      (inputs['liverDisease'] ? 1 : 0) +
      (inputs['stroke'] ? 1 : 0) +
      (inputs['bleeding'] ? 1 : 0) +
      (inputs['labileInr'] ? 1 : 0) +
      (inputs['elderly'] ? 1 : 0) +
      (inputs['drugs'] ? 1 : 0) +
      (inputs['alcohol'] ? 1 : 0);

    let interpretation: string;
    let risk: CalculatorResult['risk'];
    if (score <= 1) {
      interpretation = 'Baixo risco de sangramento. Anticoagulacao relativamente segura.';
      risk = 'LOW';
    } else if (score === 2) {
      interpretation = 'Risco moderado de sangramento. Monitorar INR com mais frequencia.';
      risk = 'MODERATE';
    } else {
      interpretation = 'Alto risco de sangramento. Ponderar risco-beneficio da anticoagulacao. Considerar alternativas.';
      risk = score >= 5 ? 'VERY_HIGH' : 'HIGH';
    }

    return { calculator: CalculatorType.HAS_BLED, score, maxScore: 9, interpretation, risk, details: inputs };
  }
}
