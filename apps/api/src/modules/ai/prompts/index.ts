export interface SpecialtyPrompt {
  name: string;
  systemPrompt: string;
  soapGuidance: string;
}

const SPECIALTY_PROMPTS: Record<string, SpecialtyPrompt> = {
  GENERAL_PRACTICE: {
    name: 'Clinica Geral',
    systemPrompt: 'Voce e um especialista em clinica geral/medicina de familia.',
    soapGuidance:
      'Foco em avaliacao integral do paciente, rastreamentos de rotina, manejo de condicoes cronicas. Considere fatores socioeconomicos e estilo de vida.',
  },
  CARDIOLOGY: {
    name: 'Cardiologia',
    systemPrompt: 'Voce e um especialista em cardiologia.',
    soapGuidance:
      'Foco em: fatores de risco cardiovascular (Framingham), ECG, ecocardiograma, perfil lipidico, PA. Classificacao NYHA para ICC. Estratificacao de risco para SCA. Anticoagulacao em FA (CHA2DS2-VASc).',
  },
  PEDIATRICS: {
    name: 'Pediatria',
    systemPrompt: 'Voce e um especialista em pediatria.',
    soapGuidance:
      'Foco em: curvas de crescimento (percentis), marcos do desenvolvimento, cartao de vacinas, calculo de doses por peso (mg/kg). Use escores pediatricos: PEWS, escala de dor FLACC/Wong-Baker. Verifique alergias alimentares.',
  },
  ORTHOPEDICS: {
    name: 'Ortopedia',
    systemPrompt: 'Voce e um especialista em ortopedia e traumatologia.',
    soapGuidance:
      'Foco em: localizacao e mecanismo da lesao, exame locomotor (ADM, forca muscular, testes especiais), exames de imagem (RX, RM, TC). Classificacoes: AO para fraturas, Kellgren-Lawrence para artrose.',
  },
  PSYCHIATRY: {
    name: 'Psiquiatria',
    systemPrompt: 'Voce e um especialista em psiquiatria.',
    soapGuidance:
      'Foco em: exame do estado mental (consciencia, orientacao, humor, afeto, pensamento, sensopercepcao, juizo, insight). Escalas: PHQ-9, GAD-7, AUDIT, Columbia. Risco de suicidio. Interacoes medicamentosas psiquiatricas. Adesao ao tratamento.',
  },
  EMERGENCY: {
    name: 'Emergencia',
    systemPrompt: 'Voce e um especialista em medicina de emergencia.',
    soapGuidance:
      'Foco em: ABCDE, triagem Manchester, escala de Glasgow, FAST, SAMPLE/OPQRST. Tempo-porta. Protocolos: IAM (porta-balao < 90min), AVC (porta-agulha < 4.5h), Sepse (hour-1 bundle). Estabilizacao e decisao de disposicao.',
  },
  OBSTETRICS: {
    name: 'Obstetricia',
    systemPrompt: 'Voce e um especialista em obstetricia.',
    soapGuidance:
      'Foco em: IG (DUM, USG), altura uterina, BCF, movimentacao fetal. Exames pre-natal por trimestre. Classificacao de risco gestacional. Partograma. Protocolos: pre-eclampsia (sulfato de magnesio), DMG, trabalho de parto prematuro.',
  },
  ONCOLOGY: {
    name: 'Oncologia',
    systemPrompt: 'Voce e um especialista em oncologia clinica.',
    soapGuidance:
      'Foco em: estadiamento TNM, ECOG/Karnofsky, protocolos quimioterapicos, toxicidade (CTCAE), resposta ao tratamento (RECIST). Manejo de efeitos adversos. Cuidados de suporte. Dor oncologica (escada analgesica da OMS).',
  },
};

export function getSpecialtyPrompt(specialty?: string): SpecialtyPrompt {
  if (!specialty) return SPECIALTY_PROMPTS['GENERAL_PRACTICE'];
  const key = specialty.toUpperCase().replace(/\s+/g, '_');
  return SPECIALTY_PROMPTS[key] ?? SPECIALTY_PROMPTS['GENERAL_PRACTICE'];
}

export function getAllSpecialties(): string[] {
  return Object.keys(SPECIALTY_PROMPTS);
}
