export interface NOCIndicator {
  name: string;
  scale: string;
}

export interface NOCOutcome {
  code: string;
  title: string;
  titleEn: string;
  definition: string;
  indicators: NOCIndicator[];
  relatedNANDA: string[];
}

/**
 * Resultados de Enfermagem NOC mais utilizados em hospitais brasileiros.
 */
export const NOC_OUTCOMES: readonly NOCOutcome[] = [
  {
    code: '2102',
    title: 'Nível de dor',
    titleEn: 'Pain Level',
    definition: 'Gravidade da dor observada ou relatada',
    indicators: [
      { name: 'Dor relatada', scale: '1 (grave) a 5 (nenhuma)' },
      { name: 'Duração dos episódios de dor', scale: '1 (grave) a 5 (nenhuma)' },
      { name: 'Expressões faciais de dor', scale: '1 (grave) a 5 (nenhuma)' },
      { name: 'Inquietação', scale: '1 (grave) a 5 (nenhuma)' },
      { name: 'Tensão muscular', scale: '1 (grave) a 5 (nenhuma)' },
      { name: 'Perda de apetite', scale: '1 (grave) a 5 (nenhuma)' },
    ],
    relatedNANDA: ['00132', '00133'],
  },
  {
    code: '1605',
    title: 'Controle da dor',
    titleEn: 'Pain Control',
    definition: 'Ações pessoais para controlar a dor',
    indicators: [
      { name: 'Reconhece início da dor', scale: '1 (nunca) a 5 (sempre)' },
      { name: 'Descreve fatores causais', scale: '1 (nunca) a 5 (sempre)' },
      { name: 'Usa medidas preventivas', scale: '1 (nunca) a 5 (sempre)' },
      { name: 'Usa analgésicos conforme recomendado', scale: '1 (nunca) a 5 (sempre)' },
      { name: 'Relata dor controlada', scale: '1 (nunca) a 5 (sempre)' },
    ],
    relatedNANDA: ['00132', '00133'],
  },
  {
    code: '0703',
    title: 'Gravidade da infecção',
    titleEn: 'Infection Severity',
    definition: 'Gravidade dos sinais e sintomas de infecção',
    indicators: [
      { name: 'Rubor', scale: '1 (grave) a 5 (nenhum)' },
      { name: 'Febre', scale: '1 (grave) a 5 (nenhuma)' },
      { name: 'Drenagem purulenta', scale: '1 (grave) a 5 (nenhuma)' },
      { name: 'Leucocitose', scale: '1 (grave) a 5 (nenhuma)' },
      { name: 'Hipotensão', scale: '1 (grave) a 5 (nenhuma)' },
      { name: 'Dor/Sensibilidade', scale: '1 (grave) a 5 (nenhuma)' },
    ],
    relatedNANDA: ['00004'],
  },
  {
    code: '1902',
    title: 'Controle de risco',
    titleEn: 'Risk Control',
    definition: 'Ações pessoais para prevenir, eliminar ou reduzir ameaças à saúde modificáveis',
    indicators: [
      { name: 'Reconhece fatores de risco pessoais', scale: '1 (nunca) a 5 (sempre)' },
      { name: 'Monitora fatores de risco ambientais', scale: '1 (nunca) a 5 (sempre)' },
      { name: 'Modifica estilo de vida para reduzir risco', scale: '1 (nunca) a 5 (sempre)' },
      { name: 'Segue estratégias de controle de risco selecionadas', scale: '1 (nunca) a 5 (sempre)' },
    ],
    relatedNANDA: ['00155', '00035'],
  },
  {
    code: '1912',
    title: 'Ocorrências de quedas',
    titleEn: 'Fall Occurrence',
    definition: 'Número de quedas nos últimos períodos',
    indicators: [
      { name: 'Quedas da cama', scale: '1 (>= 10) a 5 (nenhuma)' },
      { name: 'Quedas ao deambular', scale: '1 (>= 10) a 5 (nenhuma)' },
      { name: 'Quedas ao transferir-se', scale: '1 (>= 10) a 5 (nenhuma)' },
      { name: 'Quedas no banheiro', scale: '1 (>= 10) a 5 (nenhuma)' },
    ],
    relatedNANDA: ['00155'],
  },
  {
    code: '1101',
    title: 'Integridade tissular: pele e mucosas',
    titleEn: 'Tissue Integrity: Skin & Mucous Membranes',
    definition: 'Integridade estrutural e função fisiológica normal da pele e mucosas',
    indicators: [
      { name: 'Temperatura da pele', scale: '1 (gravemente comprometido) a 5 (não comprometido)' },
      { name: 'Elasticidade', scale: '1 (gravemente comprometido) a 5 (não comprometido)' },
      { name: 'Hidratação', scale: '1 (gravemente comprometido) a 5 (não comprometido)' },
      { name: 'Integridade da pele', scale: '1 (gravemente comprometido) a 5 (não comprometido)' },
      { name: 'Lesões na pele', scale: '1 (grave) a 5 (nenhuma)' },
    ],
    relatedNANDA: ['00046', '00047', '00205'],
  },
  {
    code: '0601',
    title: 'Equilíbrio hídrico',
    titleEn: 'Fluid Balance',
    definition: 'Equilíbrio de água nos compartimentos intra e extracelulares do corpo',
    indicators: [
      { name: 'PA dentro dos parâmetros esperados', scale: '1 (gravemente comprometido) a 5 (não comprometido)' },
      { name: 'Pulsos periféricos palpáveis', scale: '1 (gravemente comprometido) a 5 (não comprometido)' },
      { name: 'Turgor da pele', scale: '1 (gravemente comprometido) a 5 (não comprometido)' },
      { name: 'Mucosas úmidas', scale: '1 (gravemente comprometido) a 5 (não comprometido)' },
      { name: 'Edema periférico', scale: '1 (grave) a 5 (nenhum)' },
      { name: 'Débito urinário adequado', scale: '1 (gravemente comprometido) a 5 (não comprometido)' },
    ],
    relatedNANDA: ['00025', '00026', '00027'],
  },
  {
    code: '1004',
    title: 'Estado nutricional',
    titleEn: 'Nutritional Status',
    definition: 'Extensão em que os nutrientes estão disponíveis para atender às necessidades metabólicas',
    indicators: [
      { name: 'Ingestão de nutrientes', scale: '1 (desvio grave) a 5 (sem desvio)' },
      { name: 'Ingestão de líquidos', scale: '1 (desvio grave) a 5 (sem desvio)' },
      { name: 'Peso/altura', scale: '1 (desvio grave) a 5 (sem desvio)' },
      { name: 'Energia', scale: '1 (desvio grave) a 5 (sem desvio)' },
      { name: 'Valores laboratoriais (albumina, Hb)', scale: '1 (desvio grave) a 5 (sem desvio)' },
    ],
    relatedNANDA: ['00002'],
  },
  {
    code: '0208',
    title: 'Mobilidade',
    titleEn: 'Mobility',
    definition: 'Capacidade de movimentar-se de maneira independente com ou sem dispositivo auxiliar',
    indicators: [
      { name: 'Equilíbrio', scale: '1 (gravemente comprometido) a 5 (não comprometido)' },
      { name: 'Coordenação', scale: '1 (gravemente comprometido) a 5 (não comprometido)' },
      { name: 'Marcha', scale: '1 (gravemente comprometido) a 5 (não comprometido)' },
      { name: 'Movimento articular', scale: '1 (gravemente comprometido) a 5 (não comprometido)' },
      { name: 'Desempenho da transferência', scale: '1 (gravemente comprometido) a 5 (não comprometido)' },
    ],
    relatedNANDA: ['00085'],
  },
  {
    code: '1211',
    title: 'Nível de ansiedade',
    titleEn: 'Anxiety Level',
    definition: 'Gravidade da apreensão, tensão ou desassossego manifestados decorrentes de fonte não identificável',
    indicators: [
      { name: 'Inquietação', scale: '1 (grave) a 5 (nenhuma)' },
      { name: 'Tensão muscular', scale: '1 (grave) a 5 (nenhuma)' },
      { name: 'Irritabilidade', scale: '1 (grave) a 5 (nenhuma)' },
      { name: 'Dificuldade de concentração', scale: '1 (grave) a 5 (nenhuma)' },
      { name: 'Distúrbios do sono', scale: '1 (grave) a 5 (nenhum)' },
      { name: 'Aumento de PA e FC', scale: '1 (grave) a 5 (nenhum)' },
    ],
    relatedNANDA: ['00146', '00148'],
  },
  {
    code: '0402',
    title: 'Estado respiratório: troca gasosa',
    titleEn: 'Respiratory Status: Gas Exchange',
    definition: 'Troca alveolar de CO2 e O2 para manter concentrações de gases arteriais',
    indicators: [
      { name: 'PaO2 dentro da normalidade', scale: '1 (desvio grave) a 5 (sem desvio)' },
      { name: 'PaCO2 dentro da normalidade', scale: '1 (desvio grave) a 5 (sem desvio)' },
      { name: 'pH arterial dentro da normalidade', scale: '1 (desvio grave) a 5 (sem desvio)' },
      { name: 'SpO2 dentro da normalidade', scale: '1 (desvio grave) a 5 (sem desvio)' },
      { name: 'Dispneia em repouso', scale: '1 (grave) a 5 (nenhuma)' },
      { name: 'Cianose', scale: '1 (grave) a 5 (nenhuma)' },
    ],
    relatedNANDA: ['00030'],
  },
  {
    code: '0410',
    title: 'Estado respiratório: permeabilidade das vias aéreas',
    titleEn: 'Respiratory Status: Airway Patency',
    definition: 'Vias traqueobrônquicas abertas, desobstruídas e limpas para troca gasosa',
    indicators: [
      { name: 'FR dentro dos parâmetros esperados', scale: '1 (desvio grave) a 5 (sem desvio)' },
      { name: 'Ritmo respiratório', scale: '1 (desvio grave) a 5 (sem desvio)' },
      { name: 'Capacidade de eliminar secreções', scale: '1 (gravemente comprometido) a 5 (não comprometido)' },
      { name: 'Ruídos adventícios ausentes', scale: '1 (grave) a 5 (nenhum)' },
      { name: 'Dispneia em repouso', scale: '1 (grave) a 5 (nenhuma)' },
    ],
    relatedNANDA: ['00031', '00032'],
  },
  {
    code: '0400',
    title: 'Eficácia da bomba cardíaca',
    titleEn: 'Cardiac Pump Effectiveness',
    definition: 'Adequação do volume de sangue ejetado do ventrículo esquerdo para suportar pressão de perfusão sistêmica',
    indicators: [
      { name: 'PA sistólica', scale: '1 (desvio grave) a 5 (sem desvio)' },
      { name: 'Frequência cardíaca', scale: '1 (desvio grave) a 5 (sem desvio)' },
      { name: 'Índice cardíaco', scale: '1 (desvio grave) a 5 (sem desvio)' },
      { name: 'Fração de ejeção', scale: '1 (desvio grave) a 5 (sem desvio)' },
      { name: 'Edema pulmonar', scale: '1 (grave) a 5 (nenhum)' },
      { name: 'Edema periférico', scale: '1 (grave) a 5 (nenhum)' },
    ],
    relatedNANDA: ['00029'],
  },
  {
    code: '0407',
    title: 'Perfusão tissular: periférica',
    titleEn: 'Tissue Perfusion: Peripheral',
    definition: 'Adequação do fluxo sanguíneo através dos pequenos vasos das extremidades para manter a função tissular',
    indicators: [
      { name: 'Enchimento capilar dos dedos', scale: '1 (desvio grave) a 5 (sem desvio)' },
      { name: 'Temperatura de extremidades', scale: '1 (desvio grave) a 5 (sem desvio)' },
      { name: 'Força dos pulsos periféricos', scale: '1 (desvio grave) a 5 (sem desvio)' },
      { name: 'Edema periférico', scale: '1 (grave) a 5 (nenhum)' },
      { name: 'Dor em extremidades', scale: '1 (grave) a 5 (nenhuma)' },
      { name: 'Parestesia', scale: '1 (grave) a 5 (nenhuma)' },
    ],
    relatedNANDA: ['00024'],
  },
  {
    code: '0802',
    title: 'Sinais vitais',
    titleEn: 'Vital Signs',
    definition: 'Extensão em que temperatura, pulso, respiração e pressão arterial estão dentro da faixa normal',
    indicators: [
      { name: 'Temperatura corporal', scale: '1 (desvio grave) a 5 (sem desvio)' },
      { name: 'Frequência de pulso apical', scale: '1 (desvio grave) a 5 (sem desvio)' },
      { name: 'Frequência respiratória', scale: '1 (desvio grave) a 5 (sem desvio)' },
      { name: 'PA sistólica', scale: '1 (desvio grave) a 5 (sem desvio)' },
      { name: 'PA diastólica', scale: '1 (desvio grave) a 5 (sem desvio)' },
    ],
    relatedNANDA: ['00007', '00006'],
  },
  {
    code: '0300',
    title: 'Autocuidado: atividades da vida diária',
    titleEn: 'Self-Care: Activities of Daily Living',
    definition: 'Capacidade de realizar as atividades físicas mais básicas e as de cuidado pessoal de maneira independente, com ou sem dispositivo auxiliar',
    indicators: [
      { name: 'Alimentação', scale: '1 (gravemente comprometido) a 5 (não comprometido)' },
      { name: 'Banho', scale: '1 (gravemente comprometido) a 5 (não comprometido)' },
      { name: 'Vestir-se', scale: '1 (gravemente comprometido) a 5 (não comprometido)' },
      { name: 'Higiene', scale: '1 (gravemente comprometido) a 5 (não comprometido)' },
      { name: 'Uso do banheiro', scale: '1 (gravemente comprometido) a 5 (não comprometido)' },
      { name: 'Transferência', scale: '1 (gravemente comprometido) a 5 (não comprometido)' },
    ],
    relatedNANDA: ['00108', '00102'],
  },
  {
    code: '0004',
    title: 'Sono',
    titleEn: 'Sleep',
    definition: 'Suspensão natural e periódica da consciência durante a qual o corpo se restaura',
    indicators: [
      { name: 'Horas de sono', scale: '1 (gravemente comprometido) a 5 (não comprometido)' },
      { name: 'Padrão de sono', scale: '1 (gravemente comprometido) a 5 (não comprometido)' },
      { name: 'Qualidade do sono', scale: '1 (gravemente comprometido) a 5 (não comprometido)' },
      { name: 'Acordar em horários adequados', scale: '1 (gravemente comprometido) a 5 (não comprometido)' },
      { name: 'Sensação de descanso após o sono', scale: '1 (gravemente comprometido) a 5 (não comprometido)' },
    ],
    relatedNANDA: ['00198'],
  },
  {
    code: '0909',
    title: 'Estado neurológico',
    titleEn: 'Neurological Status',
    definition: 'Capacidade do sistema nervoso periférico e central de receber, processar e responder a estímulos internos e externos',
    indicators: [
      { name: 'Consciência', scale: '1 (gravemente comprometido) a 5 (não comprometido)' },
      { name: 'Função sensorial/motora dos nervos cranianos', scale: '1 (gravemente comprometido) a 5 (não comprometido)' },
      { name: 'Função motora espinal', scale: '1 (gravemente comprometido) a 5 (não comprometido)' },
      { name: 'Orientação cognitiva', scale: '1 (gravemente comprometido) a 5 (não comprometido)' },
      { name: 'Tamanho pupilar', scale: '1 (desvio grave) a 5 (sem desvio)' },
      { name: 'Reatividade pupilar', scale: '1 (desvio grave) a 5 (sem desvio)' },
    ],
    relatedNANDA: ['00128'],
  },
  {
    code: '1803',
    title: 'Conhecimento: processo de doença',
    titleEn: 'Knowledge: Disease Process',
    definition: 'Extensão da compreensão transmitida sobre o processo de uma doença específica e prevenção de complicações',
    indicators: [
      { name: 'Processo específico da doença', scale: '1 (nenhum) a 5 (extenso)' },
      { name: 'Fatores de risco', scale: '1 (nenhum) a 5 (extenso)' },
      { name: 'Fatores causais', scale: '1 (nenhum) a 5 (extenso)' },
      { name: 'Sinais e sintomas', scale: '1 (nenhum) a 5 (extenso)' },
      { name: 'Estratégias para minimizar progressão da doença', scale: '1 (nenhum) a 5 (extenso)' },
      { name: 'Complicações potenciais', scale: '1 (nenhum) a 5 (extenso)' },
    ],
    relatedNANDA: ['00126'],
  },
  {
    code: '0500',
    title: 'Continência urinária',
    titleEn: 'Urinary Continence',
    definition: 'Controle da eliminação de urina da bexiga',
    indicators: [
      { name: 'Reconhece urgência para urinar', scale: '1 (nunca) a 5 (sempre)' },
      { name: 'Chega ao banheiro a tempo', scale: '1 (nunca) a 5 (sempre)' },
      { name: 'Esvazia bexiga completamente', scale: '1 (nunca) a 5 (sempre)' },
      { name: 'Perdas urinárias', scale: '1 (sempre) a 5 (nenhuma)' },
      { name: 'Infecções do trato urinário', scale: '1 (>= 5) a 5 (nenhuma)' },
    ],
    relatedNANDA: ['00016'],
  },
  {
    code: '0501',
    title: 'Eliminação intestinal',
    titleEn: 'Bowel Elimination',
    definition: 'Formação e evacuação de fezes',
    indicators: [
      { name: 'Padrão de eliminação', scale: '1 (gravemente comprometido) a 5 (não comprometido)' },
      { name: 'Cor das fezes', scale: '1 (gravemente comprometido) a 5 (não comprometido)' },
      { name: 'Quantidade de fezes para a dieta', scale: '1 (gravemente comprometido) a 5 (não comprometido)' },
      { name: 'Fezes moles e formadas', scale: '1 (gravemente comprometido) a 5 (não comprometido)' },
      { name: 'Facilidade de eliminação', scale: '1 (gravemente comprometido) a 5 (não comprometido)' },
    ],
    relatedNANDA: ['00011'],
  },
] as const;

/**
 * Helper: busca resultados NOC por código NANDA relacionado.
 */
export function getNOCByNANDA(nandaCode: string): readonly NOCOutcome[] {
  return NOC_OUTCOMES.filter((o) => o.relatedNANDA.includes(nandaCode));
}
