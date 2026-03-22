export interface NANDADiagnosis {
  code: string;
  domain: string;
  class: string;
  title: string;
  titleEn: string;
  definition: string;
  relatedFactors: string[];
  riskFactors?: string[];
  definingCharacteristics: string[];
}

/**
 * Diagnósticos de Enfermagem NANDA-I mais utilizados em hospitais brasileiros.
 */
export const NANDA_DIAGNOSES: readonly NANDADiagnosis[] = [
  // ─── Domínio: Conforto ──────────────────────────────────────────
  {
    code: '00132',
    domain: 'Conforto',
    class: 'Conforto Físico',
    title: 'Dor aguda',
    titleEn: 'Acute Pain',
    definition: 'Experiência sensorial e emocional desagradável associada a dano tecidual real ou potencial, com início súbito ou lento, de intensidade leve a grave, com término antecipado ou previsível, com duração inferior a 3 meses',
    relatedFactors: ['Agente biológico lesivo', 'Agente químico lesivo', 'Agente físico lesivo'],
    definingCharacteristics: ['Relato verbal de dor', 'Comportamento expressivo', 'Máscara facial de dor', 'Alteração do tônus muscular', 'Resposta autonômica', 'Comportamento de proteção', 'Posição antálgica'],
  },
  {
    code: '00133',
    domain: 'Conforto',
    class: 'Conforto Físico',
    title: 'Dor crônica',
    titleEn: 'Chronic Pain',
    definition: 'Experiência sensorial e emocional desagradável associada a dano tecidual real ou potencial, com duração superior a 3 meses',
    relatedFactors: ['Condição musculoesquelética crônica', 'Compressão nervosa', 'Doença crônica', 'Infiltração tumoral'],
    definingCharacteristics: ['Relato verbal de dor', 'Alteração na capacidade de continuar atividades prévias', 'Expressão facial de dor', 'Fadiga', 'Alteração do padrão de sono'],
  },

  // ─── Domínio: Segurança/Proteção ────────────────────────────────
  {
    code: '00004',
    domain: 'Segurança/Proteção',
    class: 'Infecção',
    title: 'Risco de infecção',
    titleEn: 'Risk for Infection',
    definition: 'Suscetibilidade aumentada a invasão de organismos patogênicos',
    relatedFactors: [],
    riskFactors: ['Procedimento invasivo', 'Defesas primárias inadequadas (pele rompida)', 'Imunossupressão', 'Desnutrição', 'Doença crônica', 'Conhecimento insuficiente para evitar exposição a patógenos'],
    definingCharacteristics: [],
  },
  {
    code: '00155',
    domain: 'Segurança/Proteção',
    class: 'Lesão Física',
    title: 'Risco de quedas',
    titleEn: 'Risk for Falls',
    definition: 'Suscetibilidade aumentada a quedas que podem causar dano físico e comprometer a saúde',
    relatedFactors: [],
    riskFactors: ['Idade >= 65 anos', 'Uso de dispositivos auxiliares', 'Prótese de membro inferior', 'Déficit visual', 'Uso de medicamentos (sedativos, anti-hipertensivos)', 'Mobilidade prejudicada', 'Hipotensão ortostática', 'Ambiente desconhecido'],
    definingCharacteristics: [],
  },
  {
    code: '00046',
    domain: 'Segurança/Proteção',
    class: 'Lesão Física',
    title: 'Integridade da pele prejudicada',
    titleEn: 'Impaired Skin Integrity',
    definition: 'Epiderme e/ou derme alterada',
    relatedFactors: ['Pressão sobre proeminência óssea', 'Imobilização física', 'Umidade', 'Estado nutricional deficiente', 'Circulação prejudicada', 'Extremos de idade'],
    definingCharacteristics: ['Destruição de camadas da pele', 'Rompimento da superfície da pele', 'Invasão de estruturas do corpo'],
  },
  {
    code: '00047',
    domain: 'Segurança/Proteção',
    class: 'Lesão Física',
    title: 'Risco de integridade da pele prejudicada',
    titleEn: 'Risk for Impaired Skin Integrity',
    definition: 'Suscetibilidade a alteração na epiderme e/ou derme',
    relatedFactors: [],
    riskFactors: ['Pressão sobre proeminência óssea', 'Imobilização física', 'Umidade excessiva', 'Extremos de idade', 'Estado nutricional deficiente', 'Circulação prejudicada', 'Uso de dispositivos de fixação'],
    definingCharacteristics: [],
  },
  {
    code: '00205',
    domain: 'Segurança/Proteção',
    class: 'Lesão Física',
    title: 'Risco de lesão por pressão',
    titleEn: 'Risk for Pressure Injury',
    definition: 'Suscetibilidade a dano localizado na pele e/ou tecido subjacente, em resultado de pressão ou combinação de pressão com cisalhamento',
    relatedFactors: [],
    riskFactors: ['Imobilidade', 'Pressão sobre proeminência óssea', 'Incontinência', 'Desnutrição', 'Perfusão tecidual diminuída', 'Pele úmida', 'Déficit sensorial'],
    definingCharacteristics: [],
  },

  // ─── Domínio: Nutrição ──────────────────────────────────────────
  {
    code: '00002',
    domain: 'Nutrição',
    class: 'Ingestão',
    title: 'Nutrição desequilibrada: menor do que as necessidades corporais',
    titleEn: 'Imbalanced Nutrition: Less Than Body Requirements',
    definition: 'Ingestão de nutrientes insuficiente para atender às necessidades metabólicas',
    relatedFactors: ['Incapacidade de ingerir alimentos', 'Incapacidade de digerir alimentos', 'Fatores biológicos', 'Fatores econômicos'],
    definingCharacteristics: ['Peso corporal 20% ou mais abaixo do ideal', 'Relato de ingestão inadequada', 'Fraqueza muscular', 'Mucosa oral pálida', 'Dor abdominal'],
  },
  {
    code: '00025',
    domain: 'Nutrição',
    class: 'Hidratação',
    title: 'Risco de volume de líquidos deficiente',
    titleEn: 'Risk for Deficient Fluid Volume',
    definition: 'Suscetibilidade a diminuição do volume de líquidos intravascular, intersticial e/ou intracelular',
    relatedFactors: [],
    riskFactors: ['Perda ativa de líquidos', 'Desvio de líquidos (ascite, edema)', 'Falha dos mecanismos reguladores', 'Extremos de idade', 'Extremos de peso', 'Conhecimento deficiente sobre necessidades de líquidos'],
    definingCharacteristics: [],
  },
  {
    code: '00026',
    domain: 'Nutrição',
    class: 'Hidratação',
    title: 'Volume de líquidos excessivo',
    titleEn: 'Excess Fluid Volume',
    definition: 'Retenção aumentada de líquidos isotônicos',
    relatedFactors: ['Mecanismos reguladores comprometidos', 'Excesso de ingestão de líquidos', 'Excesso de ingestão de sódio'],
    definingCharacteristics: ['Edema', 'Ganho de peso em curto período', 'Dispneia', 'Ortopneia', 'Alteração de pressão arterial', 'Congestão pulmonar', 'Oligúria'],
  },
  {
    code: '00027',
    domain: 'Nutrição',
    class: 'Hidratação',
    title: 'Volume de líquidos deficiente',
    titleEn: 'Deficient Fluid Volume',
    definition: 'Diminuição do líquido intravascular, intersticial e/ou intracelular',
    relatedFactors: ['Perda ativa de líquidos', 'Falha dos mecanismos reguladores'],
    definingCharacteristics: ['Diminuição do turgor da pele', 'Mucosas secas', 'Diminuição do débito urinário', 'Aumento da frequência cardíaca', 'Diminuição da pressão arterial', 'Sede', 'Fraqueza'],
  },

  // ─── Domínio: Atividade/Repouso ─────────────────────────────────
  {
    code: '00085',
    domain: 'Atividade/Repouso',
    class: 'Mobilidade',
    title: 'Mobilidade física prejudicada',
    titleEn: 'Impaired Physical Mobility',
    definition: 'Limitação no movimento físico independente e voluntário do corpo ou de uma ou mais extremidades',
    relatedFactors: ['Dor', 'Prejuízo musculoesquelético', 'Prejuízo neuromuscular', 'Intolerância à atividade', 'Restrição prescrita de movimento', 'Déficit cognitivo'],
    definingCharacteristics: ['Amplitude limitada de movimento', 'Dificuldade para virar-se', 'Instabilidade postural', 'Movimento descoordenado', 'Lentidão do movimento'],
  },
  {
    code: '00198',
    domain: 'Atividade/Repouso',
    class: 'Sono/Repouso',
    title: 'Padrão de sono perturbado',
    titleEn: 'Disturbed Sleep Pattern',
    definition: 'Interrupções na quantidade e qualidade do sono, limitadas pelo tempo, decorrentes de fatores externos',
    relatedFactors: ['Iluminação', 'Ruído', 'Contenções físicas', 'Padrão de sono do acompanhante', 'Interrupções para procedimentos'],
    definingCharacteristics: ['Relato de dificuldade para dormir', 'Relato de não se sentir descansado', 'Mudança no padrão normal de sono', 'Insatisfação com o sono'],
  },
  {
    code: '00092',
    domain: 'Atividade/Repouso',
    class: 'Respostas Cardiovasculares/Pulmonares',
    title: 'Intolerância à atividade',
    titleEn: 'Activity Intolerance',
    definition: 'Energia fisiológica ou psicológica insuficiente para suportar ou completar as atividades diárias requeridas ou desejadas',
    relatedFactors: ['Desequilíbrio entre oferta e demanda de oxigênio', 'Imobilidade', 'Fraqueza generalizada', 'Estilo de vida sedentário'],
    definingCharacteristics: ['Relato verbal de fadiga', 'Relato verbal de fraqueza', 'Dispneia aos esforços', 'Resposta anormal da FC à atividade', 'Resposta anormal da PA à atividade'],
  },

  // ─── Domínio: Percepção/Cognição ────────────────────────────────
  {
    code: '00128',
    domain: 'Percepção/Cognição',
    class: 'Cognição',
    title: 'Confusão aguda',
    titleEn: 'Acute Confusion',
    definition: 'Início abrupto de distúrbios reversíveis de consciência, atenção, cognição e percepção que se desenvolvem em curto período de tempo',
    relatedFactors: ['Abuso de substâncias', 'Delirium', 'Demência', 'Idade > 60 anos'],
    definingCharacteristics: ['Flutuação na cognição', 'Flutuação no nível de consciência', 'Alucinações', 'Agitação', 'Inquietação'],
  },
  {
    code: '00126',
    domain: 'Percepção/Cognição',
    class: 'Cognição',
    title: 'Conhecimento deficiente',
    titleEn: 'Deficient Knowledge',
    definition: 'Ausência ou deficiência de informação cognitiva relacionada a um tópico específico',
    relatedFactors: ['Falta de exposição à informação', 'Falta de interesse em aprender', 'Interpretação errônea de informação', 'Limitação cognitiva', 'Barreira de idioma'],
    definingCharacteristics: ['Verbalização do problema', 'Seguimento inadequado de instruções', 'Comportamentos inapropriados ou exagerados', 'Desempenho inadequado em teste'],
  },

  // ─── Domínio: Enfrentamento/Tolerância ao Estresse ──────────────
  {
    code: '00146',
    domain: 'Enfrentamento/Tolerância ao Estresse',
    class: 'Respostas de Enfrentamento',
    title: 'Ansiedade',
    titleEn: 'Anxiety',
    definition: 'Sentimento vago e incômodo de desconforto ou temor, acompanhado por resposta autonômica; sentimento de apreensão causado pela antecipação de perigo',
    relatedFactors: ['Ameaça ao estado de saúde', 'Mudança no ambiente', 'Estressores', 'Necessidades não atendidas', 'Ameaça de morte'],
    definingCharacteristics: ['Inquietação', 'Insônia', 'Angústia', 'Apreensão', 'Aumento da frequência cardíaca', 'Aumento da frequência respiratória', 'Tensão facial', 'Preocupação'],
  },
  {
    code: '00148',
    domain: 'Enfrentamento/Tolerância ao Estresse',
    class: 'Respostas de Enfrentamento',
    title: 'Medo',
    titleEn: 'Fear',
    definition: 'Resposta à ameaça percebida que é conscientemente reconhecida como um perigo',
    relatedFactors: ['Estímulo fóbico', 'Separação do sistema de apoio', 'Falta de familiaridade com a experiência', 'Barreira de idioma'],
    definingCharacteristics: ['Relato de apreensão', 'Relato de alarme', 'Relato de pavor', 'Aumento da tensão', 'Náusea', 'Vômito', 'Diarreia', 'Sudorese aumentada'],
  },

  // ─── Domínio: Eliminação e Troca ────────────────────────────────
  {
    code: '00016',
    domain: 'Eliminação e Troca',
    class: 'Função Urinária',
    title: 'Eliminação urinária prejudicada',
    titleEn: 'Impaired Urinary Elimination',
    definition: 'Disfunção na eliminação urinária',
    relatedFactors: ['Infecção do trato urinário', 'Obstrução anatômica', 'Multicausalidade', 'Dano sensório-motor'],
    definingCharacteristics: ['Disúria', 'Frequência urinária', 'Urgência urinária', 'Incontinência', 'Retenção urinária', 'Noctúria'],
  },
  {
    code: '00011',
    domain: 'Eliminação e Troca',
    class: 'Função Gastrointestinal',
    title: 'Constipação',
    titleEn: 'Constipation',
    definition: 'Diminuição na frequência normal de evacuação, acompanhada de eliminação difícil ou incompleta de fezes',
    relatedFactors: ['Ingestão insuficiente de fibras', 'Ingestão insuficiente de líquidos', 'Atividade física insuficiente', 'Efeitos secundários de medicamentos (opioides)'],
    definingCharacteristics: ['Frequência diminuída', 'Fezes duras e secas', 'Esforço para evacuar', 'Distensão abdominal', 'Dor abdominal'],
  },

  // ─── Domínio: Troca de Gases / Respiração ───────────────────────
  {
    code: '00030',
    domain: 'Eliminação e Troca',
    class: 'Função Respiratória',
    title: 'Troca de gases prejudicada',
    titleEn: 'Impaired Gas Exchange',
    definition: 'Excesso ou déficit na oxigenação e/ou na eliminação de dióxido de carbono na membrana alveolocapilar',
    relatedFactors: ['Desequilíbrio ventilação-perfusão', 'Alterações da membrana alveolocapilar'],
    definingCharacteristics: ['Dispneia', 'Gasometria arterial anormal', 'Hipóxia', 'Hipercapnia', 'Cianose', 'Confusão', 'Inquietação', 'Taquicardia', 'Sonolência'],
  },
  {
    code: '00031',
    domain: 'Atividade/Repouso',
    class: 'Respostas Cardiovasculares/Pulmonares',
    title: 'Desobstrução ineficaz das vias aéreas',
    titleEn: 'Ineffective Airway Clearance',
    definition: 'Incapacidade de eliminar secreções ou obstruções do trato respiratório para manter a permeabilidade das vias aéreas',
    relatedFactors: ['Muco excessivo', 'Secreções retidas', 'Presença de via aérea artificial', 'Corpo estranho nas vias aéreas', 'Espasmo das vias aéreas'],
    definingCharacteristics: ['Ruídos adventícios respiratórios', 'Tosse ineficaz', 'Dispneia', 'Inquietação', 'Ortopneia', 'Quantidade excessiva de escarro', 'Alteração na frequência respiratória'],
  },
  {
    code: '00032',
    domain: 'Atividade/Repouso',
    class: 'Respostas Cardiovasculares/Pulmonares',
    title: 'Padrão respiratório ineficaz',
    titleEn: 'Ineffective Breathing Pattern',
    definition: 'Inspiração e/ou expiração que não proporciona ventilação adequada',
    relatedFactors: ['Dor', 'Fadiga da musculatura respiratória', 'Hiperventilação', 'Obesidade', 'Lesão musculoesquelética', 'Ansiedade'],
    definingCharacteristics: ['Dispneia', 'Uso de musculatura acessória', 'Alteração na profundidade respiratória', 'Alteração na frequência respiratória', 'Padrão respiratório anormal'],
  },

  // ─── Domínio: Atividade/Repouso - Cardiovascular ───────────────
  {
    code: '00029',
    domain: 'Atividade/Repouso',
    class: 'Respostas Cardiovasculares/Pulmonares',
    title: 'Débito cardíaco diminuído',
    titleEn: 'Decreased Cardiac Output',
    definition: 'Quantidade inadequada de sangue bombeado pelo coração para atender às demandas metabólicas do corpo',
    relatedFactors: ['Contratilidade alterada', 'Frequência cardíaca alterada', 'Ritmo cardíaco alterado', 'Pré-carga alterada', 'Pós-carga alterada'],
    definingCharacteristics: ['Bradicardia/taquicardia', 'Arritmias', 'Alteração na PA', 'Pulsos periféricos diminuídos', 'Pele fria e pegajosa', 'Oligúria', 'Edema', 'Dispneia', 'Fadiga'],
  },
  {
    code: '00024',
    domain: 'Atividade/Repouso',
    class: 'Respostas Cardiovasculares/Pulmonares',
    title: 'Perfusão tissular periférica ineficaz',
    titleEn: 'Ineffective Peripheral Tissue Perfusion',
    definition: 'Diminuição na circulação sanguínea para a periferia, que pode comprometer a saúde',
    relatedFactors: ['Diabetes mellitus', 'Hipertensão arterial', 'Estilo de vida sedentário', 'Tabagismo', 'Conhecimento deficiente sobre fatores agravantes'],
    definingCharacteristics: ['Pulsos periféricos ausentes ou diminuídos', 'Alteração de cor da pele', 'Temperatura da pele alterada', 'Edema', 'Tempo de enchimento capilar > 3 s', 'Claudicação intermitente', 'Parestesias'],
  },

  // ─── Domínio: Autopercepção ─────────────────────────────────────
  {
    code: '00120',
    domain: 'Autopercepção',
    class: 'Autoconceito',
    title: 'Baixa autoestima situacional',
    titleEn: 'Situational Low Self-Esteem',
    definition: 'Desenvolvimento de percepção negativa sobre o próprio valor em resposta a uma situação atual',
    relatedFactors: ['Alteração na imagem corporal', 'Alteração no papel social', 'Histórico de rejeição', 'Comportamento inconsistente com os valores'],
    definingCharacteristics: ['Verbalização de autoavaliação negativa', 'Comportamento indeciso', 'Expressões de desamparo', 'Expressões de inutilidade'],
  },

  // ─── Domínio: Promoção da Saúde ─────────────────────────────────
  {
    code: '00078',
    domain: 'Promoção da Saúde',
    class: 'Gestão da Saúde',
    title: 'Autocontrole ineficaz da saúde',
    titleEn: 'Ineffective Health Self-Management',
    definition: 'Padrão de regulação e integração à vida diária de um regime terapêutico para o tratamento de doença e suas sequelas que é insatisfatório para atingir objetivos específicos de saúde',
    relatedFactors: ['Complexidade do regime terapêutico', 'Déficit de conhecimento', 'Conflito de decisão', 'Dificuldades econômicas', 'Rede de apoio social insuficiente'],
    definingCharacteristics: ['Falha em incluir regime de tratamento na vida diária', 'Falha em agir para reduzir fatores de risco', 'Escolhas ineficazes na vida diária para atingir objetivos de saúde'],
  },

  // ─── Domínio: Segurança - Termorregulação ───────────────────────
  {
    code: '00007',
    domain: 'Segurança/Proteção',
    class: 'Termorregulação',
    title: 'Hipertermia',
    titleEn: 'Hyperthermia',
    definition: 'Temperatura corporal central acima da faixa normal diurna por falha da termorregulação',
    relatedFactors: ['Doença', 'Trauma', 'Aumento da taxa metabólica', 'Desidratação', 'Atividade vigorosa', 'Medicamentos/anestesia'],
    definingCharacteristics: ['Aumento da temperatura corporal acima dos parâmetros normais', 'Pele quente ao toque', 'Taquicardia', 'Taquipneia', 'Convulsão', 'Rubor'],
  },
  {
    code: '00006',
    domain: 'Segurança/Proteção',
    class: 'Termorregulação',
    title: 'Hipotermia',
    titleEn: 'Hypothermia',
    definition: 'Temperatura corporal central abaixo da faixa normal diurna',
    relatedFactors: ['Exposição a ambiente frio', 'Doença', 'Trauma', 'Inatividade', 'Idade extrema', 'Medicamentos que causam vasodilatação'],
    definingCharacteristics: ['Redução da temperatura corporal abaixo dos parâmetros normais', 'Pele fria', 'Tremores', 'Lentidão no enchimento capilar', 'Taquicardia seguida de bradicardia', 'Palidez'],
  },

  // ─── Domínio: Segurança - Outros ────────────────────────────────
  {
    code: '00035',
    domain: 'Segurança/Proteção',
    class: 'Lesão Física',
    title: 'Risco de lesão',
    titleEn: 'Risk for Injury',
    definition: 'Suscetibilidade a dano físico corporal em consequência de condições ambientais interagindo com os recursos adaptativos e defensivos do indivíduo',
    relatedFactors: [],
    riskFactors: ['Perfil sanguíneo anormal', 'Disfunção bioquímica', 'Hipóxia tecidual', 'Disfunção imune', 'Disfunção sensorial', 'Mobilidade alterada'],
    definingCharacteristics: [],
  },
  {
    code: '00039',
    domain: 'Segurança/Proteção',
    class: 'Violência',
    title: 'Risco de aspiração',
    titleEn: 'Risk for Aspiration',
    definition: 'Suscetibilidade à entrada de secreções gastrointestinais, secreções orofaríngeas, sólidos ou líquidos nas vias traqueobrônquicas',
    relatedFactors: [],
    riskFactors: ['Nível de consciência reduzido', 'Presença de tubo endotraqueal/traqueostomia', 'Resíduo gástrico aumentado', 'Reflexo de tosse diminuído', 'Alimentação por sonda', 'Cirurgia de cabeça/pescoço', 'Disfagia'],
    definingCharacteristics: [],
  },

  // ─── Domínio: Atividade/Repouso - Autocuidado ──────────────────
  {
    code: '00108',
    domain: 'Atividade/Repouso',
    class: 'Autocuidado',
    title: 'Déficit no autocuidado para banho',
    titleEn: 'Bathing Self-Care Deficit',
    definition: 'Capacidade prejudicada de realizar ou completar as atividades de banho por si mesmo',
    relatedFactors: ['Dor', 'Fraqueza', 'Prejuízo musculoesquelético', 'Prejuízo neuromuscular', 'Prejuízo perceptual', 'Barreira ambiental'],
    definingCharacteristics: ['Incapacidade de acessar o banheiro', 'Incapacidade de lavar o corpo', 'Incapacidade de secar o corpo', 'Incapacidade de obter a fonte de água'],
  },
  {
    code: '00102',
    domain: 'Atividade/Repouso',
    class: 'Autocuidado',
    title: 'Déficit no autocuidado para alimentação',
    titleEn: 'Feeding Self-Care Deficit',
    definition: 'Capacidade prejudicada de realizar ou completar atividades de autoalimentação',
    relatedFactors: ['Dor', 'Fraqueza', 'Prejuízo musculoesquelético', 'Prejuízo neuromuscular', 'Prejuízo cognitivo', 'Ansiedade grave'],
    definingCharacteristics: ['Incapacidade de levar alimento à boca', 'Incapacidade de mastigar alimento', 'Incapacidade de deglutir alimento', 'Incapacidade de preparar alimento para ingestão'],
  },
] as const;

/**
 * Helper: busca diagnóstico NANDA por código.
 */
export function getNANDAByCode(code: string): NANDADiagnosis | undefined {
  return NANDA_DIAGNOSES.find((d) => d.code === code);
}

/**
 * Helper: busca diagnósticos NANDA por domínio.
 */
export function getNANDAByDomain(domain: string): readonly NANDADiagnosis[] {
  return NANDA_DIAGNOSES.filter(
    (d) => d.domain.toLowerCase() === domain.toLowerCase(),
  );
}
