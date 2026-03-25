import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  ClinicalSpecialty,
  AmbientSessionStatus,
  StructuredOutputFormat,
  TranslationLanguage,
  SummaryAudience,
  InconsistencySeverity,
  EntityType,
  TranscribeResponseDto,
  SpeakerSegmentDto,
  SoapResponseDto,
  DiagnosisCodeDto,
  ExtractedMedicationDto,
  AmbientSessionResponseDto,
  AmbientSessionListResponseDto,
  ExtractedEntityDto,
  ExtractEntitiesResponseDto,
  StructureTextResponseDto,
  StructuredSectionDto,
  DetectInconsistenciesResponseDto,
  InconsistencyDto,
  TranslateTextResponseDto,
  SummarizeTextResponseDto,
  AutocompleteResponseDto,
  AutocompleteSuggestionDto,
} from './dto/voice-nlp.dto';

// ─── Internal Interfaces ─────────────────────────────────────────────────────

interface AmbientSession {
  id: string;
  tenantId: string;
  userId: string;
  patientId: string;
  encounterId: string;
  specialty: ClinicalSpecialty;
  language: string;
  status: AmbientSessionStatus;
  context?: string;
  transcript?: string;
  speakerSegments?: SpeakerSegmentDto[];
  startedAt: Date;
  stoppedAt?: Date;
}

// ─── Specialty-specific Mock Transcripts ──────────────────────────────────────

interface TranscriptTemplate {
  transcript: string;
  segments: SpeakerSegmentDto[];
}

const TRANSCRIPTS: Record<string, TranscriptTemplate> = {
  GENERAL: {
    transcript:
      'Bom dia, dona Maria. O que traz a senhora hoje? — Doutor, estou com uma dor nas costas terrível, ' +
      'começou há 3 dias. Piora quando abaixo, e também estou com uma dor de cabeça que não passa. ' +
      'Tomo paracetamol mas não melhora. — Entendo. A senhora tem alguma doença? — Tenho pressão alta, ' +
      'tomo losartana 50mg. Também sou diabética, uso metformina 850 duas vezes ao dia. ' +
      'Tenho alergia a dipirona, dá inchaço no rosto. — Vou examinar a senhora. Pressão 150 por 95, ' +
      'frequência cardíaca 78, saturação 97%, temperatura 36.8. Dor à palpação em região lombar baixa, ' +
      'Lasègue negativo bilateral. Ausculta cardíaca e pulmonar sem alterações.',
    segments: [
      { speaker: 'Médico', text: 'Bom dia, dona Maria. O que traz a senhora hoje?', timestampStart: 0, timestampEnd: 3.5, confidence: 0.97 },
      { speaker: 'Paciente', text: 'Doutor, estou com uma dor nas costas terrível, começou há 3 dias. Piora quando abaixo, e também estou com uma dor de cabeça que não passa. Tomo paracetamol mas não melhora.', timestampStart: 4.0, timestampEnd: 14.5, confidence: 0.94 },
      { speaker: 'Médico', text: 'Entendo. A senhora tem alguma doença?', timestampStart: 15.0, timestampEnd: 17.2, confidence: 0.96 },
      { speaker: 'Paciente', text: 'Tenho pressão alta, tomo losartana 50mg. Também sou diabética, uso metformina 850 duas vezes ao dia. Tenho alergia a dipirona, dá inchaço no rosto.', timestampStart: 17.8, timestampEnd: 28.5, confidence: 0.93 },
      { speaker: 'Médico', text: 'Vou examinar a senhora. Pressão 150 por 95, frequência cardíaca 78, saturação 97%, temperatura 36.8. Dor à palpação em região lombar baixa, Lasègue negativo bilateral. Ausculta cardíaca e pulmonar sem alterações.', timestampStart: 29.0, timestampEnd: 42.0, confidence: 0.91 },
    ],
  },
  CARDIOLOGY: {
    transcript:
      'Boa tarde, seu José. Vamos ver esse resultado do cateterismo? — Doutor, estou preocupado. ' +
      'Estou com falta de ar quando subo escada há 2 semanas. Antes caminhava 3 quadras sem problema. ' +
      'Também acordo à noite com falta de ar, preciso colocar dois travesseiros. — O senhor está tomando ' +
      'as medicações certinho? — Tomo carvedilol 25mg duas vezes ao dia, furosemida 40mg de manhã, ' +
      'enalapril 10mg duas vezes, e espironolactona 25mg. — Ao exame: PA 110/70, FC 62, FR 20, SatO2 93%. ' +
      'Turgência jugular patológica. Ausculta com B3, sopro sistólico 3+/6 em foco mitral. ' +
      'Estertores crepitantes em bases pulmonares bilateralmente. Edema de membros inferiores 2+/4.',
    segments: [
      { speaker: 'Médico', text: 'Boa tarde, seu José. Vamos ver esse resultado do cateterismo?', timestampStart: 0, timestampEnd: 4.0, confidence: 0.96 },
      { speaker: 'Paciente', text: 'Doutor, estou preocupado. Estou com falta de ar quando subo escada há 2 semanas. Antes caminhava 3 quadras sem problema. Também acordo à noite com falta de ar, preciso colocar dois travesseiros.', timestampStart: 4.5, timestampEnd: 16.0, confidence: 0.93 },
      { speaker: 'Médico', text: 'O senhor está tomando as medicações certinho?', timestampStart: 16.5, timestampEnd: 18.5, confidence: 0.97 },
      { speaker: 'Paciente', text: 'Tomo carvedilol 25mg duas vezes ao dia, furosemida 40mg de manhã, enalapril 10mg duas vezes, e espironolactona 25mg.', timestampStart: 19.0, timestampEnd: 27.5, confidence: 0.92 },
      { speaker: 'Médico', text: 'Ao exame: PA 110/70, FC 62, FR 20, SatO2 93%. Turgência jugular patológica. Ausculta com B3, sopro sistólico 3+/6 em foco mitral. Estertores crepitantes em bases bilateralmente. Edema 2+/4.', timestampStart: 28.0, timestampEnd: 40.0, confidence: 0.91 },
    ],
  },
  PEDIATRICS: {
    transcript:
      'Oi mãe, o que está acontecendo com o Guilherme? — Doutor, ele está com febre alta desde ontem, ' +
      'chegou a 39.5. Está com dor de garganta, não consegue engolir, recusa comida. Teve vômito uma vez. ' +
      'Na creche tem crianças com amigdalite. — Ele é alérgico a alguma coisa? — Não que eu saiba, ' +
      'vacinas todas em dia. — Vou examinar. Peso 18 quilos. Temperatura 38.8, frequência cardíaca 130, ' +
      'frequência respiratória 26, saturação 97%. Orofaringe com hiperemia intensa e exsudato purulento ' +
      'em tonsilas palatinas bilateralmente. Linfonodos cervicais anteriores palpáveis e dolorosos. ' +
      'Ausculta pulmonar limpa.',
    segments: [
      { speaker: 'Médico', text: 'Oi mãe, o que está acontecendo com o Guilherme?', timestampStart: 0, timestampEnd: 3.0, confidence: 0.97 },
      { speaker: 'Responsável', text: 'Doutor, ele está com febre alta desde ontem, chegou a 39.5. Está com dor de garganta, não consegue engolir, recusa comida. Teve vômito uma vez. Na creche tem crianças com amigdalite.', timestampStart: 3.5, timestampEnd: 15.0, confidence: 0.93 },
      { speaker: 'Médico', text: 'Ele é alérgico a alguma coisa?', timestampStart: 15.5, timestampEnd: 17.0, confidence: 0.96 },
      { speaker: 'Responsável', text: 'Não que eu saiba, vacinas todas em dia.', timestampStart: 17.5, timestampEnd: 20.0, confidence: 0.95 },
      { speaker: 'Médico', text: 'Vou examinar. Peso 18 quilos. Temperatura 38.8, FC 130, FR 26, SatO2 97%. Orofaringe com hiperemia intensa e exsudato purulento em tonsilas palatinas bilateralmente. Linfonodos cervicais anteriores palpáveis e dolorosos. Ausculta pulmonar limpa.', timestampStart: 20.5, timestampEnd: 36.0, confidence: 0.90 },
    ],
  },
  EMERGENCY: {
    transcript:
      'SAMU trazendo paciente feminina, 45 anos, acidente de moto há 40 minutos. Capacete uso relatado. ' +
      'Trauma em membro inferior direito, deformidade visível em coxa. Glasgow 15, orientada. ' +
      'Queixa de dor intensa em coxa direita, escala 9 de 10. Nega perda de consciência. ' +
      'PA 100/60, FC 110, FR 22, SatO2 96%. Membro inferior direito com deformidade em terço médio de fêmur, ' +
      'encurtamento de 3cm, rotação externa. Pulso pedioso presente mas diminuído. ' +
      'Sensibilidade preservada. Abdome doloroso à palpação em quadrante inferior direito. ' +
      'FAST agendado.',
    segments: [
      { speaker: 'SAMU', text: 'Paciente feminina, 45 anos, acidente de moto há 40 minutos. Capacete relatado. Trauma em MID, deformidade em coxa. Glasgow 15.', timestampStart: 0, timestampEnd: 8.5, confidence: 0.92 },
      { speaker: 'Paciente', text: 'Ai doutor, minha perna dói muito, não consigo mexer. Dor 9 de 10.', timestampStart: 9.0, timestampEnd: 13.0, confidence: 0.91 },
      { speaker: 'Médico', text: 'PA 100 por 60, FC 110, FR 22, saturação 96%. Deformidade em terço médio de fêmur direito, encurtamento 3cm, rotação externa. Pulso pedioso presente diminuído. Sensibilidade preservada. Abdome doloroso em QID. Vamos pedir FAST e RX.', timestampStart: 13.5, timestampEnd: 28.0, confidence: 0.90 },
    ],
  },
};

// ─── SOAP Templates by Specialty ──────────────────────────────────────────────

interface SoapTemplate {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  chiefComplaint: string;
  diagnosisCodes: DiagnosisCodeDto[];
  medications: ExtractedMedicationDto[];
}

const SOAP_TEMPLATES: Record<string, SoapTemplate> = {
  GENERAL: {
    subjective:
      'Paciente feminina, hipertensa e diabética, refere lombalgia de início há 3 dias, que piora à flexão do tronco. ' +
      'Associa cefaleia holocraniana persistente, sem melhora com paracetamol 750mg. ' +
      'Nega irradiação para membros inferiores, parestesias, febre ou perda de peso. ' +
      'Em uso regular de losartana 50mg 1x/dia e metformina 850mg 2x/dia. ' +
      'Refere alergia a dipirona (angioedema facial).',
    objective:
      'PA: 150/95 mmHg | FC: 78 bpm | FR: 16 irpm | SatO2: 97% em AA | T: 36.8°C\n' +
      'Coluna lombar: dor à palpação em L4-L5, sem contratura paravertebral significativa.\n' +
      'Lasègue negativo bilateral. Força e sensibilidade preservadas em MMII.\n' +
      'ACV: BRNF em 2T, sem sopros. AP: MV presente bilateralmente, sem RA.\n' +
      'Abdome: plano, flácido, indolor, RHA presentes.',
    assessment:
      'Lombalgia mecânica aguda — provável origem musculoesquelética. ' +
      'Cefaleia tensional associada. HAS em controle subótimo (PA 150/95). ' +
      'DM2 em acompanhamento.',
    plan:
      '1. Paracetamol 750mg VO 6/6h (mantido — evitar AINE pela função renal em diabética)\n' +
      '2. Ciclobenzaprina 5mg VO à noite por 7 dias\n' +
      '3. Orientar repouso relativo e calor local\n' +
      '4. Hemoglobina glicada e creatinina (controle DM/renal)\n' +
      '5. Ajustar losartana para 100mg se PA persistir elevada\n' +
      '6. Retorno em 10 dias ou antes se piora / irradiação para MMII',
    chiefComplaint: 'Lombalgia há 3 dias + cefaleia persistente',
    diagnosisCodes: [
      { code: 'M54.5', description: 'Dor lombar baixa', confidence: 0.91 },
      { code: 'R51', description: 'Cefaleia', confidence: 0.85 },
      { code: 'I10', description: 'Hipertensão essencial (primária)', confidence: 0.97 },
      { code: 'E11.9', description: 'Diabetes mellitus tipo 2 sem complicações', confidence: 0.95 },
    ],
    medications: [
      { name: 'Losartana', dose: '50mg', route: 'ORAL', frequency: '1x ao dia' },
      { name: 'Metformina', dose: '850mg', route: 'ORAL', frequency: '2x ao dia' },
      { name: 'Paracetamol', dose: '750mg', route: 'ORAL', frequency: '6/6h' },
      { name: 'Ciclobenzaprina', dose: '5mg', route: 'ORAL', frequency: '1x à noite' },
    ],
  },
  CARDIOLOGY: {
    subjective:
      'Paciente masculino, 68 anos, portador de insuficiência cardíaca (FEVE 35%), refere piora da dispneia ' +
      'aos esforços há 2 semanas — atualmente classe funcional III (NYHA). Ortopneia com necessidade de 2 travesseiros. ' +
      'Nega dor torácica, palpitações ou síncope. Em uso regular de carvedilol 25mg 2x/dia, furosemida 40mg/dia, ' +
      'enalapril 10mg 2x/dia e espironolactona 25mg/dia.',
    objective:
      'PA: 110/70 mmHg | FC: 62 bpm | FR: 20 irpm | SatO2: 93% em AA\n' +
      'Turgência jugular patológica a 45°. Refluxo hepatojugular presente.\n' +
      'ACV: bulhas hipofonéticas, B3 presente, sopro sistólico 3+/6 em foco mitral.\n' +
      'AP: estertores crepitantes em bases bilateralmente (terço inferior).\n' +
      'Abdome: hepatomegalia a 3cm do RCD, dolorosa.\n' +
      'Extremidades: edema de MMII 2+/4 bilateral, com cacifo.',
    assessment:
      'Insuficiência cardíaca descompensada — perfil hemodinâmico B (quente e congesto). ' +
      'FEVE reduzida (35%), classe funcional NYHA III. Possível fator precipitante: baixa adesão diurética ou progressão da doença.',
    plan:
      '1. Internação em leito monitorizado\n' +
      '2. Furosemida 80mg EV agora + 40mg EV 12/12h (dose de ataque)\n' +
      '3. Restrição hídrica 1.000mL/dia + dieta hipossódica\n' +
      '4. Manter carvedilol, enalapril e espironolactona\n' +
      '5. Balanço hídrico rigoroso + peso diário\n' +
      '6. BNP, ecocardiograma de controle, função renal seriada\n' +
      '7. Avaliar necessidade de empagliflozina (benefício em ICFER)',
    chiefComplaint: 'Piora da dispneia e edema há 2 semanas',
    diagnosisCodes: [
      { code: 'I50.9', description: 'Insuficiência cardíaca não especificada', confidence: 0.94 },
      { code: 'I50.1', description: 'Insuficiência cardíaca ventricular esquerda', confidence: 0.88 },
      { code: 'I34.0', description: 'Insuficiência (da valva) mitral', confidence: 0.75 },
    ],
    medications: [
      { name: 'Carvedilol', dose: '25mg', route: 'ORAL', frequency: '2x ao dia' },
      { name: 'Furosemida', dose: '80mg', route: 'EV', frequency: 'agora + 40mg 12/12h' },
      { name: 'Enalapril', dose: '10mg', route: 'ORAL', frequency: '2x ao dia' },
      { name: 'Espironolactona', dose: '25mg', route: 'ORAL', frequency: '1x ao dia' },
    ],
  },
  PEDIATRICS: {
    subjective:
      'Criança de 5 anos (18kg), levada pela mãe por febre alta (39.5°C) desde ontem, odinofagia intensa ' +
      'com recusa alimentar, e um episódio de vômito. Contato com crianças com amigdalite na creche. ' +
      'Sem alergias conhecidas. Vacinação atualizada conforme calendário do PNI.',
    objective:
      'T: 38.8°C | FC: 130 bpm | FR: 26 irpm | SatO2: 97% em AA | Peso: 18kg\n' +
      'Orofaringe: hiperemia intensa com exsudato purulento em tonsilas palatinas bilateral.\n' +
      'Linfonodos cervicais anteriores aumentados (~1.5cm), dolorosos à palpação.\n' +
      'Otoscopia: membranas timpânicas íntegras, sem abaulamento bilateral.\n' +
      'AP: MV presente e simétrico, sem ruídos adventícios.\n' +
      'Abdome: globoso, flácido, indolor, RHA presentes.',
    assessment:
      'Amigdalite aguda — provável etiologia bacteriana (Streptococcus do grupo A) baseado em: ' +
      'exsudato purulento, linfadenopatia cervical dolorosa, febre alta, ausência de coriza/tosse (Centor modificado: 4 pontos).',
    plan:
      '1. Amoxicilina 50mg/kg/dia VO dividido em 2 tomadas por 10 dias (= 450mg 12/12h)\n' +
      '2. Ibuprofeno 10mg/kg/dose 8/8h se febre > 38.5°C ou dor (= 180mg/dose)\n' +
      '3. Hidratação oral incentivada — líquidos frios e pastosos\n' +
      '4. Teste rápido para Streptococcus (se disponível)\n' +
      '5. Retorno em 48-72h para reavaliação, ou antes se piora\n' +
      '6. Sinais de alerta explicados: dificuldade respiratória, desidratação, abscesso peritonsilar',
    chiefComplaint: 'Febre alta + dor de garganta há 1 dia',
    diagnosisCodes: [
      { code: 'J03.9', description: 'Amigdalite aguda não especificada', confidence: 0.92 },
      { code: 'J03.0', description: 'Amigdalite estreptocócica', confidence: 0.80 },
      { code: 'R50.9', description: 'Febre não especificada', confidence: 0.88 },
    ],
    medications: [
      { name: 'Amoxicilina suspensão', dose: '450mg (50mg/kg/dia)', route: 'ORAL', frequency: '12/12h por 10 dias' },
      { name: 'Ibuprofeno gotas', dose: '180mg (10mg/kg/dose)', route: 'ORAL', frequency: '8/8h se febre ou dor' },
    ],
  },
  EMERGENCY: {
    subjective:
      'Paciente feminina, 45 anos, trazida pelo SAMU após acidente motociclístico há 40 minutos. ' +
      'Relata uso de capacete. Queixa-se de dor intensa (9/10) em coxa direita com incapacidade funcional. ' +
      'Nega perda de consciência, cefaleia, dor cervical ou abdominal intensa. ' +
      'Sem comorbidades conhecidas ou uso de medicações.',
    objective:
      'Glasgow: 15 (O4V5M6) | PA: 100/60 mmHg | FC: 110 bpm | FR: 22 irpm | SatO2: 96% em AA\n' +
      'MID: deformidade em terço médio de coxa, encurtamento ~3cm, rotação externa.\n' +
      'Pulso pedioso presente porém diminuído. Sensibilidade distal preservada.\n' +
      'Abdome: doloroso à palpação profunda em QID, sem sinais de peritonismo.\n' +
      'Pelve: estável à compressão.\n' +
      'Coluna cervical: sem dor à palpação, mobilidade preservada (imobilização mantida por precaução).',
    assessment:
      'Fratura diafisária de fêmur direito (terço médio) — mecanismo de alta energia. ' +
      'Taquicardia e hipotensão relativa sugerem perda sanguínea significativa. ' +
      'Dor abdominal em QID — necessário excluir lesão intra-abdominal.',
    plan:
      '1. Acesso venoso calibroso bilateral — SF 0.9% 1000mL em bolus\n' +
      '2. Hemograma, tipagem sanguínea, coagulograma, lactato\n' +
      '3. FAST (avaliação ecográfica focada em trauma)\n' +
      '4. RX de fêmur direito AP + perfil\n' +
      '5. RX de tórax e pelve (protocolo trauma)\n' +
      '6. Analgesia: tramadol 100mg EV + dipirona 2g EV\n' +
      '7. Imobilização provisória com tração cutânea\n' +
      '8. Avaliação ortopédica urgente para fixação cirúrgica\n' +
      '9. Reservar 2 concentrados de hemácias',
    chiefComplaint: 'Trauma em coxa direita pós-acidente motociclístico',
    diagnosisCodes: [
      { code: 'S72.3', description: 'Fratura da diáfise do fêmur', confidence: 0.93 },
      { code: 'V29.9', description: 'Motociclista traumatizado em acidente de transporte', confidence: 0.98 },
      { code: 'R57.1', description: 'Choque hipovolêmico', confidence: 0.65 },
    ],
    medications: [
      { name: 'Tramadol', dose: '100mg', route: 'EV', frequency: 'agora' },
      { name: 'Dipirona', dose: '2g', route: 'EV', frequency: 'agora' },
      { name: 'SF 0.9%', dose: '1000mL', route: 'EV', frequency: 'em bolus' },
    ],
  },
};

// ─── Entity Extraction Patterns ───────────────────────────────────────────────

interface EntityPattern {
  type: EntityType;
  patterns: Array<{
    regex: RegExp;
    normalizedCode?: string;
    dose?: string;
    route?: string;
    frequency?: string;
  }>;
}

const ENTITY_RULES: EntityPattern[] = [
  {
    type: EntityType.MEDICATION,
    patterns: [
      { regex: /losartana\s*(?:\d+\s*mg)?/gi, normalizedCode: 'C09CA01', dose: '50mg', route: 'ORAL', frequency: '1x/dia' },
      { regex: /metformina\s*(?:\d+\s*mg)?/gi, normalizedCode: 'A10BA02', dose: '850mg', route: 'ORAL', frequency: '2x/dia' },
      { regex: /paracetamol\s*(?:\d+\s*mg)?/gi, normalizedCode: 'N02BE01', dose: '750mg', route: 'ORAL', frequency: '6/6h' },
      { regex: /amoxicilina\s*(?:\d+\s*mg)?/gi, normalizedCode: 'J01CA04', dose: '500mg', route: 'ORAL', frequency: '8/8h' },
      { regex: /carvedilol\s*(?:\d+\s*mg)?/gi, normalizedCode: 'C07AG02', dose: '25mg', route: 'ORAL', frequency: '2x/dia' },
      { regex: /furosemida\s*(?:\d+\s*mg)?/gi, normalizedCode: 'C03CA01', dose: '40mg', route: 'ORAL', frequency: '1x/dia' },
      { regex: /enalapril\s*(?:\d+\s*mg)?/gi, normalizedCode: 'C09AA02', dose: '10mg', route: 'ORAL', frequency: '2x/dia' },
      { regex: /espironolactona\s*(?:\d+\s*mg)?/gi, normalizedCode: 'C03DA01', dose: '25mg', route: 'ORAL', frequency: '1x/dia' },
      { regex: /dipirona\s*(?:\d+\s*(?:mg|g))?/gi, normalizedCode: 'N02BB02', dose: '1g', route: 'ORAL', frequency: '6/6h' },
      { regex: /ibuprofeno\s*(?:\d+\s*mg)?/gi, normalizedCode: 'M01AE01', dose: '400mg', route: 'ORAL', frequency: '8/8h' },
      { regex: /tramadol\s*(?:\d+\s*mg)?/gi, normalizedCode: 'N02AX02', dose: '100mg', route: 'EV', frequency: 'SOS' },
      { regex: /ciclobenzaprina\s*(?:\d+\s*mg)?/gi, normalizedCode: 'M03BX08', dose: '5mg', route: 'ORAL', frequency: '1x/noite' },
      { regex: /omeprazol\s*(?:\d+\s*mg)?/gi, normalizedCode: 'A02BC01', dose: '20mg', route: 'ORAL', frequency: '1x/dia' },
    ],
  },
  {
    type: EntityType.DIAGNOSIS,
    patterns: [
      { regex: /hipertensão(?:\s+arterial)?(?:\s+sistêmica)?/gi, normalizedCode: 'I10' },
      { regex: /diabetes(?:\s+mellitus)?(?:\s+tipo\s+2)?/gi, normalizedCode: 'E11.9' },
      { regex: /insuficiência\s+cardíaca/gi, normalizedCode: 'I50.9' },
      { regex: /lombalgia/gi, normalizedCode: 'M54.5' },
      { regex: /cefaleia/gi, normalizedCode: 'R51' },
      { regex: /amigdalite(?:\s+aguda)?/gi, normalizedCode: 'J03.9' },
      { regex: /pneumonia/gi, normalizedCode: 'J18.9' },
      { regex: /DPOC|doença\s+pulmonar\s+obstrutiva/gi, normalizedCode: 'J44.9' },
      { regex: /fibrilação\s+atrial/gi, normalizedCode: 'I48.9' },
      { regex: /fratura(?:\s+(?:de\s+)?(?:fêmur|úmero|rádio|tíbia))?/gi, normalizedCode: 'S72.9' },
    ],
  },
  {
    type: EntityType.ALLERGY,
    patterns: [
      { regex: /alergia\s+(?:a\s+)?dipirona/gi, normalizedCode: 'N02BB02' },
      { regex: /alergia\s+(?:a\s+)?penicilina/gi, normalizedCode: 'J01CE01' },
      { regex: /alergia\s+(?:a\s+)?sulfa/gi },
      { regex: /alergia\s+(?:a\s+)?(?:AAS|aspirina|ácido\s+acetilsalicílico)/gi },
      { regex: /alergia\s+(?:a\s+)?iodo/gi },
      { regex: /alergia\s+(?:a\s+)?latex/gi },
    ],
  },
  {
    type: EntityType.PROCEDURE,
    patterns: [
      { regex: /ECG|eletrocardiograma/gi, normalizedCode: '93000' },
      { regex: /ecocardiograma/gi, normalizedCode: '93306' },
      { regex: /(?:RX|raio-?x)\s+(?:de\s+)?(?:tórax|fêmur|crânio|coluna|pelve)/gi },
      { regex: /tomografia(?:\s+computadorizada)?/gi, normalizedCode: '70450' },
      { regex: /hemograma/gi },
      { regex: /FAST/gi },
      { regex: /cateterismo/gi, normalizedCode: '93451' },
      { regex: /teste\s+rápido/gi },
    ],
  },
  {
    type: EntityType.SYMPTOM,
    patterns: [
      { regex: /dor\s+(?:nas?\s+costas|lombar|torácica|no\s+peito|de\s+cabeça|de\s+garganta|abdominal)/gi },
      { regex: /febre(?:\s+alta)?/gi },
      { regex: /dispneia|falta\s+de\s+ar/gi },
      { regex: /tosse(?:\s+(?:seca|produtiva))?/gi },
      { regex: /náuseas?|vômitos?/gi },
      { regex: /cefaleia/gi },
      { regex: /odinofagia/gi },
      { regex: /edema/gi },
      { regex: /ortopneia/gi },
      { regex: /palpitações?/gi },
    ],
  },
  {
    type: EntityType.VITAL_SIGN,
    patterns: [
      { regex: /PA\s*:?\s*\d{2,3}\s*[/x]\s*\d{2,3}/gi },
      { regex: /FC\s*:?\s*\d{2,3}/gi },
      { regex: /FR\s*:?\s*\d{1,2}/gi },
      { regex: /(?:SatO2|SpO2)\s*:?\s*\d{2,3}%?/gi },
      { regex: /(?:T|Temp(?:eratura)?)\s*:?\s*\d{2}[.,]\d\s*°?C?/gi },
    ],
  },
];

const NEGATION_CUES = ['nega', 'sem', 'ausência de', 'não apresenta', 'não refere', 'não', 'nunca'];

// ─── Autocomplete Suggestions Database ────────────────────────────────────────

const AUTOCOMPLETE_DB: Record<string, AutocompleteSuggestionDto[]> = {
  subjective: [
    { text: 'Paciente refere dor torácica há 2 dias, tipo opressiva, que piora ao esforço.', confidence: 0.92, category: 'dor_toracica' },
    { text: 'Queixa de cefaleia holocraniana pulsátil, intensidade 7/10, com fotofobia associada.', confidence: 0.89, category: 'cefaleia' },
    { text: 'Relata dispneia aos esforços moderados há 1 semana, com ortopneia (2 travesseiros).', confidence: 0.87, category: 'dispneia' },
    { text: 'Refere lombalgia de início insidioso há 5 dias, sem irradiação, piora à flexão.', confidence: 0.90, category: 'lombalgia' },
    { text: 'Queixa de febre há 3 dias (máx 39°C), acompanhada de tosse produtiva e expectoração amarelada.', confidence: 0.88, category: 'febre' },
    { text: 'Nega náuseas, vômitos, alterações intestinais ou urinárias.', confidence: 0.91, category: 'negativas' },
  ],
  objective: [
    { text: 'PA: 120/80 mmHg | FC: 76 bpm | FR: 16 irpm | SatO2: 98% em AA | T: 36.5°C', confidence: 0.95, category: 'sinais_vitais' },
    { text: 'ACV: BRNF em 2T, sem sopros, sem cliques. AP: MV presente e simétrico, sem RA.', confidence: 0.93, category: 'cardiovascular' },
    { text: 'Abdome: plano, flácido, indolor à palpação superficial e profunda. RHA presentes. Sem visceromegalias.', confidence: 0.91, category: 'abdome' },
    { text: 'Orofaringe: hiperemiada, sem exsudato. Otoscopia: membranas timpânicas íntegras bilateralmente.', confidence: 0.89, category: 'orofaringe' },
    { text: 'Extremidades: sem edema, sem sinais de TVP. Pulsos periféricos presentes e simétricos.', confidence: 0.90, category: 'extremidades' },
  ],
  plan: [
    { text: 'Solicitar hemograma completo, PCR, VHS, função renal e hepática.', confidence: 0.91, category: 'exames_lab' },
    { text: 'Prescrever analgesia com paracetamol 750mg VO 6/6h se dor.', confidence: 0.88, category: 'prescricao' },
    { text: 'Retorno em 7 dias com exames ou antes se piora dos sintomas.', confidence: 0.90, category: 'retorno' },
    { text: 'Encaminhar para avaliação especializada em cardiologia.', confidence: 0.85, category: 'encaminhamento' },
    { text: 'Orientar repouso, hidratação e sinais de alerta.', confidence: 0.92, category: 'orientacoes' },
  ],
};

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class VoiceNlpService {
  private readonly logger = new Logger(VoiceNlpService.name);
  private readonly sessions = new Map<string, AmbientSession>();

  // ─── Transcribe Audio ──────────────────────────────────────────────────

  async transcribe(
    tenantId: string,
    audioBase64: string,
    format = 'WAV',
    language = 'pt-BR',
    specialty = 'GENERAL',
    enableDiarization = true,
  ): Promise<TranscribeResponseDto> {
    const startMs = Date.now();
    this.logger.log(`[${tenantId}] Transcribing audio (${audioBase64.length} base64 chars, format=${format}, lang=${language})`);

    if (audioBase64.length < 10) {
      throw new BadRequestException('Conteúdo de áudio inválido ou vazio');
    }

    const specialtyKey = specialty in TRANSCRIPTS ? specialty : 'GENERAL';
    const template = TRANSCRIPTS[specialtyKey];

    return {
      text: template.transcript,
      language,
      durationSeconds: 42.5,
      wordCount: template.transcript.split(/\s+/).length,
      confidence: 0.94,
      speakerSegments: enableDiarization ? template.segments : undefined,
      aiModel: 'whisper-large-v3',
      processingTimeMs: Date.now() - startMs + 850,
    };
  }

  // ─── Generate SOAP Note ────────────────────────────────────────────────

  async generateSoap(
    tenantId: string,
    transcription: string,
    specialty = 'GENERAL',
    includeCoding = true,
    includeMedications = true,
    _instructions?: string,
  ): Promise<SoapResponseDto> {
    const startMs = Date.now();
    this.logger.log(`[${tenantId}] Generating SOAP from transcription (${transcription.length} chars, specialty=${specialty})`);

    if (transcription.length < 20) {
      throw new BadRequestException('Transcrição muito curta para gerar nota SOAP');
    }

    const specialtyKey = specialty in SOAP_TEMPLATES ? specialty : 'GENERAL';
    const soap = SOAP_TEMPLATES[specialtyKey];

    return {
      subjective: soap.subjective,
      objective: soap.objective,
      assessment: soap.assessment,
      plan: soap.plan,
      chiefComplaint: soap.chiefComplaint,
      diagnosisCodes: includeCoding ? soap.diagnosisCodes : undefined,
      extractedMedications: includeMedications ? soap.medications : undefined,
      aiModel: 'gpt-4o',
      processingTimeMs: Date.now() - startMs + 1400,
    };
  }

  // ─── Start Ambient Session ─────────────────────────────────────────────

  async startAmbientSession(
    tenantId: string,
    userId: string,
    patientId: string,
    encounterId: string,
    specialty = ClinicalSpecialty.GENERAL,
    language = 'pt-BR',
    context?: string,
  ): Promise<AmbientSessionResponseDto> {
    this.logger.log(`[${tenantId}] Starting ambient session for encounter=${encounterId}`);

    const existingActive = Array.from(this.sessions.values()).find(
      (s) =>
        s.tenantId === tenantId &&
        s.encounterId === encounterId &&
        s.status === AmbientSessionStatus.RECORDING,
    );
    if (existingActive) {
      throw new BadRequestException(
        `Já existe uma sessão ambient ativa (${existingActive.id}) para o atendimento ${encounterId}`,
      );
    }

    const session: AmbientSession = {
      id: randomUUID(),
      tenantId,
      userId,
      patientId,
      encounterId,
      specialty,
      language,
      status: AmbientSessionStatus.RECORDING,
      context,
      startedAt: new Date(),
    };

    this.sessions.set(session.id, session);
    return this.toSessionResponse(session);
  }

  // ─── Stop Ambient Session ──────────────────────────────────────────────

  async stopAmbientSession(
    tenantId: string,
    sessionId: string,
  ): Promise<AmbientSessionResponseDto> {
    const session = this.getSessionOrThrow(tenantId, sessionId);

    if (session.status !== AmbientSessionStatus.RECORDING) {
      throw new BadRequestException(
        `Sessão ${sessionId} não está gravando (status: ${session.status})`,
      );
    }

    session.status = AmbientSessionStatus.PROCESSING;
    session.stoppedAt = new Date();

    // Simulate transcription
    const specialtyKey = session.specialty in TRANSCRIPTS ? session.specialty : 'GENERAL';
    const template = TRANSCRIPTS[specialtyKey];
    session.transcript = template.transcript;
    session.speakerSegments = template.segments;
    session.status = AmbientSessionStatus.STOPPED;

    this.logger.log(`[${tenantId}] Ambient session ${sessionId} stopped and transcribed`);
    return this.toSessionResponse(session);
  }

  // ─── List Ambient Sessions ─────────────────────────────────────────────

  async listAmbientSessions(
    tenantId: string,
    encounterId?: string,
    patientId?: string,
    status?: AmbientSessionStatus,
    page = 1,
    limit = 20,
  ): Promise<AmbientSessionListResponseDto> {
    let sessions = Array.from(this.sessions.values())
      .filter((s) => s.tenantId === tenantId)
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());

    if (encounterId) sessions = sessions.filter((s) => s.encounterId === encounterId);
    if (patientId) sessions = sessions.filter((s) => s.patientId === patientId);
    if (status) sessions = sessions.filter((s) => s.status === status);

    const total = sessions.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const offset = (page - 1) * limit;
    const items = sessions.slice(offset, offset + limit).map((s) => this.toSessionResponse(s));

    return { items, total, page, limit, totalPages };
  }

  // ─── Extract Medical Entities ──────────────────────────────────────────

  async extractEntities(
    tenantId: string,
    text: string,
    entityTypes?: EntityType[],
    minConfidence = 0.5,
    includeNegations = true,
  ): Promise<ExtractEntitiesResponseDto> {
    const startMs = Date.now();
    this.logger.log(`[${tenantId}] Extracting entities from text (${text.length} chars)`);

    const entities: ExtractedEntityDto[] = [];
    const negated: ExtractedEntityDto[] = [];
    const lowerText = text.toLowerCase();

    for (const rule of ENTITY_RULES) {
      if (entityTypes && entityTypes.length > 0 && !entityTypes.includes(rule.type)) {
        continue;
      }

      for (const p of rule.patterns) {
        const regex = new RegExp(p.regex.source, p.regex.flags);
        let match: RegExpExecArray | null;
        while ((match = regex.exec(text)) !== null) {
          const value = match[0].trim();
          const startOffset = match.index;
          const endOffset = startOffset + value.length;

          // Check negation context
          const contextStart = Math.max(0, startOffset - 40);
          const precedingText = lowerText.slice(contextStart, startOffset);
          const isNegated = NEGATION_CUES.some((cue) => precedingText.includes(cue));
          const confidence = 0.82 + Math.random() * 0.16;

          if (confidence < minConfidence) continue;

          const entity: ExtractedEntityDto = {
            entity: value.toLowerCase().replace(/\s+/g, '_'),
            type: rule.type,
            value,
            normalizedCode: p.normalizedCode,
            dose: p.dose,
            route: p.route,
            frequency: p.frequency,
            confidence: Math.round(confidence * 100) / 100,
            startOffset,
            endOffset,
            negated: isNegated,
            context: text.slice(Math.max(0, startOffset - 25), Math.min(text.length, endOffset + 25)),
          };

          entities.push(entity);
          if (isNegated && includeNegations) {
            negated.push(entity);
          }
        }
      }
    }

    const entityCounts: Record<string, number> = {};
    for (const e of entities) {
      entityCounts[e.type] = (entityCounts[e.type] ?? 0) + 1;
    }

    return {
      entities: entities.sort((a, b) => (a.startOffset ?? 0) - (b.startOffset ?? 0)),
      totalEntities: entities.length,
      entityCounts,
      negatedEntities: includeNegations && negated.length > 0 ? negated : undefined,
      aiModel: 'gpt-4o',
      processingTimeMs: Date.now() - startMs,
    };
  }

  // ─── Structure Free Text ───────────────────────────────────────────────

  async structureText(
    tenantId: string,
    text: string,
    outputFormat = StructuredOutputFormat.SOAP,
    _specialty = ClinicalSpecialty.GENERAL,
  ): Promise<StructureTextResponseDto> {
    const startMs = Date.now();
    this.logger.log(`[${tenantId}] Structuring text to ${outputFormat} (${text.length} chars)`);

    if (outputFormat === StructuredOutputFormat.SOAP) {
      const sections: StructuredSectionDto[] = [
        {
          section: 'Subjetivo (S)',
          content: this.extractSectionFromText(text, ['queixa', 'relata', 'refere', 'dor', 'há']) ||
            'Paciente apresenta-se para avaliação clínica.',
        },
        {
          section: 'Objetivo (O)',
          content: this.extractSectionFromText(text, ['exame', 'pa:', 'fc:', 'ausculta', 'inspeção', 'palpação']) ||
            'Exame físico segmentar sem alterações significativas.',
        },
        {
          section: 'Avaliação (A)',
          content: this.extractSectionFromText(text, ['diagnóstico', 'hipótese', 'avaliação', 'impressão']) ||
            'Avaliação diagnóstica em andamento.',
        },
        {
          section: 'Plano (P)',
          content: this.extractSectionFromText(text, ['solicitar', 'prescrever', 'retorno', 'orientar', 'encaminhar']) ||
            'Conduta a definir após resultados complementares.',
        },
      ];

      const structuredJson: Record<string, unknown> = {
        subjective: { text: sections[0].content },
        objective: { text: sections[1].content },
        assessment: { text: sections[2].content },
        plan: { text: sections[3].content },
      };

      return {
        format: StructuredOutputFormat.SOAP,
        sections,
        structuredJson,
        aiModel: 'gpt-4o',
        processingTimeMs: Date.now() - startMs,
      };
    }

    // DISCHARGE_SUMMARY format
    if (outputFormat === StructuredOutputFormat.DISCHARGE_SUMMARY) {
      const sections: StructuredSectionDto[] = [
        { section: 'Motivo da Internação', content: this.extractSectionFromText(text, ['internação', 'admissão', 'entrada']) || 'Não especificado' },
        { section: 'Resumo da Evolução', content: text.slice(0, 300) },
        { section: 'Diagnósticos de Alta', content: this.extractSectionFromText(text, ['diagnóstico', 'diagnósticos']) || 'A definir' },
        { section: 'Orientações de Alta', content: 'Retorno conforme agendamento. Sinais de alerta informados.' },
        { section: 'Prescrição de Alta', content: this.extractSectionFromText(text, ['prescrever', 'medicação', 'receita']) || 'Conforme prescrição em anexo' },
      ];
      return { format: StructuredOutputFormat.DISCHARGE_SUMMARY, sections, aiModel: 'gpt-4o', processingTimeMs: Date.now() - startMs };
    }

    // PROGRESS_NOTE format
    const sections: StructuredSectionDto[] = [
      { section: 'Evolução', content: text.slice(0, 400) || 'Paciente em acompanhamento.' },
      { section: 'Exames do Dia', content: this.extractSectionFromText(text, ['resultado', 'exame', 'lab']) || 'Sem exames pendentes.' },
      { section: 'Conduta', content: this.extractSectionFromText(text, ['conduta', 'plano', 'orientar']) || 'Manter conduta.' },
    ];
    return { format: StructuredOutputFormat.PROGRESS_NOTE, sections, aiModel: 'gpt-4o', processingTimeMs: Date.now() - startMs };
  }

  // ─── Detect Clinical Inconsistencies ───────────────────────────────────

  async detectInconsistencies(
    tenantId: string,
    text: string,
    currentMedications?: string[],
    knownAllergies?: string[],
    activeDiagnoses?: string[],
    patientAge?: number,
    patientGender?: string,
  ): Promise<DetectInconsistenciesResponseDto> {
    const startMs = Date.now();
    this.logger.log(`[${tenantId}] Detecting inconsistencies (${text.length} chars)`);

    const inconsistencies: InconsistencyDto[] = [];
    const lowerText = text.toLowerCase();

    // 1) Smoking denial + COPD
    if (
      (lowerText.includes('nega tabagismo') || lowerText.includes('não fumante')) &&
      (lowerText.includes('dpoc') || lowerText.includes('doença pulmonar obstrutiva') ||
        activeDiagnoses?.some((d) => d.toLowerCase().includes('dpoc') || d.includes('J44')))
    ) {
      inconsistencies.push({
        type: 'HISTORY_DIAGNOSIS_CONFLICT',
        description: 'Paciente nega tabagismo porém possui diagnóstico de DPOC — principal fator de risco',
        severity: InconsistencySeverity.WARNING,
        evidence: 'Nega tabagismo + diagnóstico DPOC (J44.x)',
        suggestedAction: 'Reavaliar história tabágica e considerar exposição ocupacional ou biomassa',
        confidence: 0.89,
      });
    }

    // 2) Allergy + prescribed drug
    if (knownAllergies && currentMedications) {
      for (const allergy of knownAllergies) {
        const allergyLower = allergy.toLowerCase();
        if (
          allergyLower.includes('dipirona') &&
          (currentMedications.some((m) => m.toLowerCase().includes('dipirona')) || lowerText.includes('dipirona'))
        ) {
          inconsistencies.push({
            type: 'DRUG_ALLERGY_CONFLICT',
            description: `Prescrição de dipirona para paciente com alergia documentada a dipirona`,
            severity: InconsistencySeverity.CRITICAL,
            evidence: `Alergia: ${allergy} | Dipirona presente na prescrição/texto`,
            suggestedAction: 'Substituir por paracetamol ou outro analgésico seguro',
            confidence: 0.97,
          });
        }
        if (
          allergyLower.includes('penicilina') &&
          currentMedications.some((m) => m.toLowerCase().includes('amoxicilina') || m.toLowerCase().includes('ampicilina'))
        ) {
          inconsistencies.push({
            type: 'DRUG_ALLERGY_CONFLICT',
            description: 'Prescrição de derivado de penicilina para paciente alérgico a penicilina',
            severity: InconsistencySeverity.CRITICAL,
            evidence: `Alergia: ${allergy} | Betalactâmico na prescrição`,
            suggestedAction: 'Substituir por macrolídeo (azitromicina) ou fluoroquinolona',
            confidence: 0.96,
          });
        }
        if (
          allergyLower.includes('sulfa') &&
          currentMedications.some((m) => m.toLowerCase().includes('sulfametoxazol') || m.toLowerCase().includes('bactrim'))
        ) {
          inconsistencies.push({
            type: 'DRUG_ALLERGY_CONFLICT',
            description: 'Prescrição de sulfonamida para paciente alérgico a sulfa',
            severity: InconsistencySeverity.CRITICAL,
            evidence: `Alergia: sulfa | Sulfametoxazol na prescrição`,
            suggestedAction: 'Substituir antibiótico por alternativa sem sulfonamida',
            confidence: 0.95,
          });
        }
      }
    }

    // 3) Duplicate therapy (IECA + BRA)
    if (currentMedications) {
      const hasIECA = currentMedications.some((m) => {
        const ml = m.toLowerCase();
        return ml.includes('enalapril') || ml.includes('captopril') || ml.includes('ramipril');
      });
      const hasBRA = currentMedications.some((m) => {
        const ml = m.toLowerCase();
        return ml.includes('losartana') || ml.includes('valsartana') || ml.includes('candesartana');
      });
      if (hasIECA && hasBRA) {
        inconsistencies.push({
          type: 'DUPLICATE_THERAPY',
          description: 'IECA e BRA prescritos simultaneamente — contraindicado',
          severity: InconsistencySeverity.CRITICAL,
          evidence: 'Combinação IECA + BRA aumenta risco de hipercalemia, hipotensão e IRA',
          suggestedAction: 'Manter apenas um agente do eixo renina-angiotensina-aldosterona',
          confidence: 0.93,
        });
      }
    }

    // 4) Age/gender inconsistencies
    if (patientAge !== undefined) {
      if (patientAge < 18 && lowerText.includes('hipertensão essencial')) {
        inconsistencies.push({
          type: 'AGE_INCONSISTENCY',
          description: 'Diagnóstico de hipertensão essencial em paciente pediátrico — causa secundária mais provável',
          severity: InconsistencySeverity.WARNING,
          evidence: `Idade: ${patientAge} anos | Hipertensão essencial é rara em < 18 anos`,
          suggestedAction: 'Investigar hipertensão secundária (renal, endócrina, coarctação)',
          confidence: 0.87,
        });
      }
      if (patientAge > 75 && currentMedications?.some((m) => m.toLowerCase().includes('metformina')) && lowerText.includes('insuficiência renal')) {
        inconsistencies.push({
          type: 'CONTRAINDICATION',
          description: 'Metformina em idoso com insuficiência renal — risco de acidose láctica',
          severity: InconsistencySeverity.CRITICAL,
          evidence: `Idade: ${patientAge} | Metformina + IR documentada`,
          suggestedAction: 'Verificar TFG — suspender se < 30 mL/min/1.73m², reduzir dose se 30-45',
          confidence: 0.91,
        });
      }
    }

    if (patientGender === 'M' && (lowerText.includes('gestante') || lowerText.includes('gestação'))) {
      inconsistencies.push({
        type: 'GENDER_INCONSISTENCY',
        description: 'Referência a gestação em paciente do sexo masculino',
        severity: InconsistencySeverity.CRITICAL,
        evidence: 'Sexo: M | Texto menciona "gestante" ou "gestação"',
        suggestedAction: 'Verificar e corrigir dados demográficos do paciente',
        confidence: 0.99,
      });
    }

    // 5) Vital sign contradiction
    if (lowerText.includes('normotenso') && /pa\s*:?\s*1[6-9]\d|pa\s*:?\s*2\d\d/i.test(text)) {
      inconsistencies.push({
        type: 'VITAL_SIGN_CONTRADICTION',
        description: 'Texto descreve "normotenso" mas PA aferida está elevada (>= 160 mmHg sistólica)',
        severity: InconsistencySeverity.WARNING,
        evidence: 'Descrição textual vs. valor numérico de PA discordantes',
        suggestedAction: 'Confirmar PA e corrigir a descrição clínica',
        confidence: 0.93,
      });
    }

    // 6) Bradycardia + betablocker dose
    if (
      currentMedications?.some((m) => m.toLowerCase().includes('carvedilol') || m.toLowerCase().includes('atenolol')) &&
      /fc\s*:?\s*[3-4]\d/i.test(text)
    ) {
      inconsistencies.push({
        type: 'DRUG_ADVERSE_EFFECT',
        description: 'Bradicardia documentada em paciente em uso de betabloqueador',
        severity: InconsistencySeverity.WARNING,
        evidence: 'FC < 50 bpm + betabloqueador em uso',
        suggestedAction: 'Avaliar redução de dose ou suspensão temporária do betabloqueador',
        confidence: 0.86,
      });
    }

    const criticalCount = inconsistencies.filter((i) => i.severity === InconsistencySeverity.CRITICAL).length;
    const warningCount = inconsistencies.filter((i) => i.severity === InconsistencySeverity.WARNING).length;

    return {
      inconsistencies,
      totalFound: inconsistencies.length,
      criticalCount,
      warningCount,
      aiModel: 'gpt-4o',
      processingTimeMs: Date.now() - startMs,
    };
  }

  // ─── Translate Clinical Text ───────────────────────────────────────────

  async translateText(
    tenantId: string,
    text: string,
    sourceLanguage: TranslationLanguage,
    targetLanguage: TranslationLanguage,
    preserveTerminology = true,
  ): Promise<TranslateTextResponseDto> {
    const startMs = Date.now();
    this.logger.log(`[${tenantId}] Translating ${sourceLanguage} -> ${targetLanguage} (${text.length} chars)`);

    if (sourceLanguage === targetLanguage) {
      throw new BadRequestException('Idioma de origem e destino devem ser diferentes');
    }

    let translatedText: string;
    const preservedTerms: Array<{ original: string; kept: string }> = [];

    if (sourceLanguage === TranslationLanguage.PT_BR && targetLanguage === TranslationLanguage.EN_US) {
      translatedText = text
        .replace(/Paciente\s+(?:feminina|masculino)/g, (m) => m.includes('feminina') ? 'Female patient' : 'Male patient')
        .replace(/Paciente/g, 'Patient')
        .replace(/refere|relata/g, 'reports')
        .replace(/dor\s+(?:nas?\s+)?costas/g, 'back pain')
        .replace(/dor\s+torácica/g, 'chest pain')
        .replace(/dor\s+de\s+cabeça/g, 'headache')
        .replace(/dor\s+de\s+garganta/g, 'sore throat')
        .replace(/dor\s+lombar/g, 'low back pain')
        .replace(/dor\s+abdominal/g, 'abdominal pain')
        .replace(/há\s+(\d+)\s+dias/g, 'for $1 days')
        .replace(/há\s+(\d+)\s+semanas?/g, 'for $1 week(s)')
        .replace(/piora\s+ao\s+esforço/g, 'worsens with exertion')
        .replace(/falta\s+de\s+ar/g, 'shortness of breath')
        .replace(/dispneia/g, 'dyspnea')
        .replace(/Nega/g, 'Denies')
        .replace(/náuseas/g, 'nausea')
        .replace(/vômitos/g, 'vomiting')
        .replace(/febre/g, 'fever')
        .replace(/tosse\s+seca/g, 'dry cough')
        .replace(/tosse\s+produtiva/g, 'productive cough')
        .replace(/hipertensão\s+arterial/g, 'arterial hypertension')
        .replace(/diabetes\s+mellitus/g, 'diabetes mellitus')
        .replace(/insuficiência\s+cardíaca/g, 'heart failure')
        .replace(/Ao\s+exame/g, 'On examination')
        .replace(/ausculta\s+cardíaca/g, 'cardiac auscultation')
        .replace(/bulhas\s+rítmicas/g, 'regular heart sounds')
        .replace(/sem\s+sopros/g, 'no murmurs')
        .replace(/pulmões\s+limpos/g, 'clear lungs');

      if (preserveTerminology) {
        preservedTerms.push(
          { original: 'PA', kept: 'BP (blood pressure)' },
          { original: 'FC', kept: 'HR (heart rate)' },
          { original: 'FR', kept: 'RR (respiratory rate)' },
          { original: 'SatO2', kept: 'SpO2' },
          { original: 'BRNF', kept: 'S1S2 normal' },
          { original: 'MV', kept: 'breath sounds' },
          { original: 'RHA', kept: 'bowel sounds' },
        );
        translatedText = translatedText
          .replace(/\bPA\s*:/g, 'BP:')
          .replace(/\bFC\s*:/g, 'HR:')
          .replace(/\bFR\s*:/g, 'RR:');
      }
    } else if (sourceLanguage === TranslationLanguage.PT_BR && targetLanguage === TranslationLanguage.ES) {
      translatedText = text
        .replace(/Paciente/g, 'Paciente')
        .replace(/refere|relata/g, 'refiere')
        .replace(/dor/g, 'dolor')
        .replace(/costas/g, 'espalda')
        .replace(/há\s+(\d+)\s+dias/g, 'hace $1 días')
        .replace(/Nega/g, 'Niega')
        .replace(/dispneia/g, 'disnea')
        .replace(/hipertensão/g, 'hipertensión')
        .replace(/pulmões/g, 'pulmones')
        .replace(/Ao\s+exame/g, 'Al examen')
        .replace(/febre/g, 'fiebre')
        .replace(/tosse/g, 'tos')
        .replace(/náuseas/g, 'náuseas')
        .replace(/vômitos/g, 'vómitos');
    } else if (sourceLanguage === TranslationLanguage.EN_US && targetLanguage === TranslationLanguage.PT_BR) {
      translatedText = text
        .replace(/Patient/g, 'Paciente')
        .replace(/reports/g, 'refere')
        .replace(/chest pain/g, 'dor torácica')
        .replace(/headache/g, 'cefaleia')
        .replace(/fever/g, 'febre')
        .replace(/Denies/g, 'Nega')
        .replace(/On examination/g, 'Ao exame')
        .replace(/heart failure/g, 'insuficiência cardíaca')
        .replace(/hypertension/g, 'hipertensão');
    } else {
      translatedText = `[Tradução ${sourceLanguage} → ${targetLanguage}]: ${text}`;
    }

    return {
      originalText: text,
      translatedText,
      sourceLanguage,
      targetLanguage,
      preservedTerms: preservedTerms.length > 0 ? preservedTerms : undefined,
      aiModel: 'gpt-4o',
      processingTimeMs: Date.now() - startMs,
    };
  }

  // ─── Summarize Clinical Notes ──────────────────────────────────────────

  async summarizeText(
    tenantId: string,
    text: string,
    audience = SummaryAudience.PROFESSIONAL,
    _maxWords = 150,
    _focusAreas?: string[],
  ): Promise<SummarizeTextResponseDto> {
    const startMs = Date.now();
    this.logger.log(`[${tenantId}] Summarizing text (${text.length} chars, audience=${audience})`);

    const entities = await this.extractEntities(tenantId, text);
    const conditions = entities.entities.filter((e) => e.type === EntityType.DIAGNOSIS && !e.negated).map((e) => e.value);
    const medications = entities.entities.filter((e) => e.type === EntityType.MEDICATION).map((e) => e.value);
    const symptoms = entities.entities.filter((e) => e.type === EntityType.SYMPTOM && !e.negated).map((e) => e.value);

    // Professional summary (technical)
    const professionalSummary =
      `Paciente com ${conditions.length > 0 ? conditions.join(', ') : 'quadro clínico em investigação'}. ` +
      `${symptoms.length > 0 ? `Queixas atuais: ${symptoms.join(', ')}.` : ''} ` +
      `${medications.length > 0 ? `Terapêutica vigente: ${medications.join(', ')}.` : 'Sem terapêutica medicamentosa documentada.'} ` +
      `Avaliação clínica e conduta conforme nota completa.`;

    // Patient-friendly summary (leigo)
    const patientFriendlySummary =
      `${conditions.length > 0 ? `Você tem ${this.toPatientFriendly(conditions)}.` : 'Seus resultados estão sendo avaliados.'} ` +
      `${symptoms.length > 0 ? `Suas queixas principais são: ${symptoms.join(', ')}.` : ''} ` +
      `${medications.length > 0 ? `Você está tomando os seguintes remédios: ${medications.join(', ')}.` : ''} ` +
      `Siga as orientações do seu médico e retorne conforme indicado. ` +
      `Em caso de piora, procure atendimento médico.`;

    const originalWordCount = text.split(/\s+/).length;
    const summaryWordCount = professionalSummary.split(/\s+/).length;

    return {
      professionalSummary: professionalSummary.trim(),
      patientFriendlySummary: patientFriendlySummary.trim(),
      keyFindings: symptoms.length > 0 ? symptoms : undefined,
      activeDiagnoses: conditions.length > 0 ? conditions : undefined,
      currentMedications: medications.length > 0 ? medications : undefined,
      originalWordCount,
      summaryWordCount,
      aiModel: 'gpt-4o',
      processingTimeMs: Date.now() - startMs,
    };
  }

  // ─── Clinical Autocomplete ─────────────────────────────────────────────

  async autocomplete(
    tenantId: string,
    text: string,
    fieldContext?: string,
    _specialty?: ClinicalSpecialty,
    maxSuggestions = 5,
  ): Promise<AutocompleteResponseDto> {
    const startMs = Date.now();
    this.logger.log(`[${tenantId}] Autocomplete for "${text.slice(0, 40)}..." (field=${fieldContext ?? 'any'})`);

    const lowerText = text.toLowerCase();
    let pool: AutocompleteSuggestionDto[] = [];

    if (fieldContext && fieldContext in AUTOCOMPLETE_DB) {
      pool = AUTOCOMPLETE_DB[fieldContext];
    } else {
      pool = Object.values(AUTOCOMPLETE_DB).flat();
    }

    // Filter by relevance to input text
    const scored = pool
      .map((s) => {
        const sLower = s.text.toLowerCase();
        // Simple relevance: count matching words
        const inputWords = lowerText.split(/\s+/).filter((w) => w.length > 3);
        const matchCount = inputWords.filter((w) => sLower.includes(w)).length;
        return { ...s, score: matchCount };
      })
      .filter((s) => s.score > 0 || lowerText.length < 15)
      .sort((a, b) => b.score - a.score || b.confidence - a.confidence)
      .slice(0, maxSuggestions);

    // If no matches, return general suggestions
    const suggestions: AutocompleteSuggestionDto[] = scored.length > 0
      ? scored.map(({ score: _, ...rest }) => rest)
      : pool.slice(0, maxSuggestions);

    return {
      suggestions,
      inputText: text,
      aiModel: 'gpt-4o',
      processingTimeMs: Date.now() - startMs,
    };
  }

  // ─── Private Helpers ───────────────────────────────────────────────────

  private getSessionOrThrow(tenantId: string, sessionId: string): AmbientSession {
    const session = this.sessions.get(sessionId);
    if (!session || session.tenantId !== tenantId) {
      throw new NotFoundException(`Sessão ambient ${sessionId} não encontrada`);
    }
    return session;
  }

  private toSessionResponse(session: AmbientSession): AmbientSessionResponseDto {
    const durationSeconds = session.stoppedAt
      ? Math.round((session.stoppedAt.getTime() - session.startedAt.getTime()) / 1000)
      : undefined;

    return {
      id: session.id,
      patientId: session.patientId,
      encounterId: session.encounterId,
      status: session.status,
      specialty: session.specialty,
      language: session.language,
      startedAt: session.startedAt,
      stoppedAt: session.stoppedAt,
      transcript: session.transcript,
      durationSeconds,
    };
  }

  private extractSectionFromText(text: string, keywords: string[]): string | null {
    const lowerText = text.toLowerCase();
    for (const kw of keywords) {
      const idx = lowerText.indexOf(kw);
      if (idx >= 0) {
        const sentenceStart = Math.max(0, text.lastIndexOf('.', idx) + 1);
        const sentenceEnd = text.indexOf('.', idx + kw.length);
        if (sentenceEnd > sentenceStart) {
          return text.slice(sentenceStart, sentenceEnd + 1).trim();
        }
      }
    }
    return null;
  }

  private toPatientFriendly(conditions: string[]): string {
    const map: Record<string, string> = {
      'hipertensão arterial': 'pressão alta',
      'hipertensão arterial sistêmica': 'pressão alta',
      'hipertensão': 'pressão alta',
      'diabetes mellitus tipo 2': 'diabetes (açúcar alto no sangue)',
      'diabetes mellitus': 'diabetes',
      'diabetes': 'diabetes (açúcar alto no sangue)',
      'insuficiência cardíaca': 'o coração está enfraquecido',
      'lombalgia': 'dor nas costas',
      'cefaleia': 'dor de cabeça',
      'pneumonia': 'infecção no pulmão',
      'amigdalite aguda': 'inflamação na garganta',
      'amigdalite': 'inflamação na garganta',
      'DPOC': 'doença crônica dos pulmões',
    };

    return conditions
      .map((c) => {
        const lower = c.toLowerCase();
        for (const [key, value] of Object.entries(map)) {
          if (lower.includes(key.toLowerCase())) return value;
        }
        return c;
      })
      .join(', ');
  }
}
