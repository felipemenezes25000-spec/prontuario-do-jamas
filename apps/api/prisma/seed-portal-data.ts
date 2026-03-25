/**
 * seed-portal-data.ts — Popula dados adicionais para o Portal do Paciente
 * e enriquece o projeto com documentos, agendamentos, sinais vitais, exames e prescrições.
 */
import { PrismaClient, Prisma } from '@prisma/client';
import { v4 } from 'uuid';

function daysAgo(n: number): Date {
  const d = new Date(); d.setDate(d.getDate() - n); return d;
}
function daysFromNow(n: number): Date {
  const d = new Date(); d.setDate(d.getDate() + n); return d;
}
function hoursAgo(n: number): Date {
  const d = new Date(); d.setHours(d.getHours() - n); return d;
}

export async function seedPortalData(
  prisma: PrismaClient,
  IDS: Record<string, string>,
): Promise<void> {
  console.log('  → Creating clinical documents...');

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. CLINICAL DOCUMENTS (25 documentos)
  // ═══════════════════════════════════════════════════════════════════════════

  const documents = [
    // ─── Maria ───
    {
      patientId: IDS.maria, authorId: IDS.drCarlos, tenantId: IDS.tenant,
      encounterId: IDS.enc_maria_cardio,
      type: 'ATESTADO' as const, title: 'Atestado Médico — Consulta Cardiológica',
      content: 'Atesto para os devidos fins que a Sra. Maria da Silva Santos, CPF XXX, foi atendida nesta data em consulta cardiológica, necessitando de repouso por 3 (três) dias a partir desta data. CID: I10 — Hipertensão Essencial.',
      status: 'SIGNED' as const, signedAt: daysAgo(5), signedById: IDS.drCarlos,
      generatedByAI: false, createdAt: daysAgo(5),
    },
    {
      patientId: IDS.maria, authorId: IDS.drCarlos, tenantId: IDS.tenant,
      encounterId: IDS.enc_maria_cardio,
      type: 'RECEITA' as const, title: 'Receita — Ajuste Anti-hipertensivo',
      content: '1) Losartana 50mg — Tomar 1 comprimido pela manhã e 1 à noite\n2) Hidroclorotiazida 25mg — Tomar 1 comprimido pela manhã\n3) Metformina 850mg — Tomar 1 comprimido após almoço e jantar\n4) AAS 100mg — Tomar 1 comprimido após almoço\n\nRetorno em 30 dias com exames de controle.',
      status: 'SIGNED' as const, signedAt: daysAgo(5), signedById: IDS.drCarlos,
      generatedByAI: false, createdAt: daysAgo(5),
    },
    {
      patientId: IDS.maria, authorId: IDS.drCarlos, tenantId: IDS.tenant,
      encounterId: IDS.enc_maria_cardio,
      type: 'ENCAMINHAMENTO' as const, title: 'Encaminhamento — Ecocardiograma',
      content: 'Encaminho a paciente Maria da Silva Santos para realização de ecocardiograma transtorácico de controle.\n\nHipótese diagnóstica: Hipertensão arterial sistêmica estágio 2, Diabetes mellitus tipo 2.\nMedicações em uso: Losartana 100mg/dia, HCTZ 25mg/dia, Metformina 1700mg/dia.\nÚltimo eco (6 meses): FEVE 58%, hipertrofia VE concêntrica leve.',
      status: 'SIGNED' as const, signedAt: daysAgo(5), signedById: IDS.drCarlos,
      generatedByAI: true, createdAt: daysAgo(5),
    },
    {
      patientId: IDS.maria, authorId: IDS.drCarlos, tenantId: IDS.tenant,
      encounterId: IDS.enc_maria_cardio,
      type: 'LAUDO' as const, title: 'Laudo — Eletrocardiograma de Repouso',
      content: 'ELETROCARDIOGRAMA DE 12 DERIVAÇÕES\n\nRitmo: Sinusal\nFC: 72 bpm\nEixo QRS: Normal (-30° a +90°)\nIntervalo PR: 0,18s (normal)\nDuração QRS: 0,08s (normal)\nSegmento ST: Sem desnivelamento\nOnda T: Positiva em todas derivações precordiais\n\nLaudo: Ritmo sinusal regular. Sinais de sobrecarga atrial esquerda (P > 120ms em DII). Critérios de Sokolow-Lyon limítrofes (35mm). ECG compatível com hipertrofia VE incipiente.\n\nConclusão: ECG com sinais de sobrecarga atrial esquerda e hipertrofia VE incipiente. Correlacionar com ecocardiograma.',
      status: 'SIGNED' as const, signedAt: daysAgo(4), signedById: IDS.drCarlos,
      generatedByAI: true, createdAt: daysAgo(4),
    },
    {
      patientId: IDS.maria, authorId: IDS.drCarlos, tenantId: IDS.tenant,
      encounterId: IDS.enc_maria_cardio,
      type: 'CONSENTIMENTO' as const, title: 'Termo de Consentimento — Cateterismo Cardíaco',
      content: 'TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO\n\nEu, Maria da Silva Santos, declaro que fui informada sobre o procedimento de cateterismo cardíaco diagnóstico, incluindo:\n- Objetivo: avaliar anatomia coronariana\n- Riscos: hematoma no local de punção, reação alérgica ao contraste, sangramento, arritmia, evento vascular cerebral (raro)\n- Alternativas: angiotomografia coronariana\n\nAutorizo a realização do procedimento.',
      status: 'DRAFT' as const, generatedByAI: false, createdAt: daysAgo(2),
    },

    // ─── José ───
    {
      patientId: IDS.jose, authorId: IDS.drAna, tenantId: IDS.tenant,
      encounterId: IDS.enc_jose_geral,
      type: 'ATESTADO' as const, title: 'Atestado Médico — Check-up Anual',
      content: 'Atesto que o Sr. José Aparecido de Souza compareceu para consulta de check-up anual nesta data, necessitando de dispensa de suas atividades laborais pelo período de 1 (um) dia. CID: Z00.0.',
      status: 'SIGNED' as const, signedAt: daysAgo(12), signedById: IDS.drAna,
      generatedByAI: false, createdAt: daysAgo(12),
    },
    {
      patientId: IDS.jose, authorId: IDS.drAna, tenantId: IDS.tenant,
      encounterId: IDS.enc_jose_geral,
      type: 'SUMARIO_ALTA' as const, title: 'Sumário de Alta — Observação Clínica',
      content: 'SUMÁRIO DE ALTA\n\nPaciente: José Aparecido de Souza, 62 anos\nInternação: Observação clínica 24h\nMotivo: Dor torácica atípica + dispneia aos esforços\n\nEvolução: Paciente admitido para investigação de dor precordial. ECG seriados sem alterações isquêmicas. Troponina I seriada negativa (0h e 6h). Ecocardiograma: FEVE 60%, sem alterações segmentares.\n\nDiagnóstico de Alta: Dor torácica a esclarecer — provável origem musculoesquelética. HAS controlada.\nMedicações: Manter Enalapril 20mg 12/12h.\nOrientações: Retorno em 15 dias. Teste ergométrico ambulatorial.',
      status: 'SIGNED' as const, signedAt: daysAgo(11), signedById: IDS.drAna,
      generatedByAI: true, createdAt: daysAgo(12),
    },
    {
      patientId: IDS.jose, authorId: IDS.drAna, tenantId: IDS.tenant,
      encounterId: IDS.enc_jose_geral,
      type: 'RELATORIO' as const, title: 'Relatório Médico — Aptidão Laboral',
      content: 'RELATÓRIO MÉDICO\n\nPaciente José Aparecido de Souza, 62 anos, portador de hipertensão arterial controlada (I10), em acompanhamento regular.\n\nApto para atividades laborais habituais, com restrição para esforço físico intenso.\nNecessita de acompanhamento cardiológico semestral.',
      status: 'FINAL' as const, generatedByAI: false, createdAt: daysAgo(10),
    },

    // ─── Pedro (UTI) ───
    {
      patientId: IDS.pedro, authorId: IDS.drCarlos, tenantId: IDS.tenant,
      encounterId: IDS.enc_pedro_uti,
      type: 'FICHA_INTERNACAO' as const, title: 'Ficha de Internação — UTI Cardiológica',
      content: 'FICHA DE INTERNAÇÃO\n\nPaciente: Pedro Henrique Martins, 78 anos\nProcedência: Pronto-socorro\nMotivo: ICC descompensada + Fibrilação atrial com RVR\nLeito: UTI-03\nDiagnósticos: I50.0 ICC, I48 FA, E11 DM2, N18.3 DRC estágio 3\nAlergias: Dipirona, AAS\nAcompanhante: Esposa (Maria Helena)\nMédico responsável: Dr. Carlos Mendes\nData: ' + daysAgo(8).toLocaleDateString('pt-BR'),
      status: 'SIGNED' as const, signedAt: daysAgo(8), signedById: IDS.drCarlos,
      generatedByAI: false, createdAt: daysAgo(8),
    },
    {
      patientId: IDS.pedro, authorId: IDS.drCarlos, tenantId: IDS.tenant,
      encounterId: IDS.enc_pedro_uti,
      type: 'SUMARIO_ALTA' as const, title: 'Sumário de Alta — UTI para Enfermaria',
      content: 'SUMÁRIO DE TRANSFERÊNCIA UTI → ENFERMARIA\n\nPaciente Pedro Henrique Martins. Permanência UTI: 5 dias.\nMotivo internação: ICC descompensada classe IV NYHA + FA com RVR.\nEvolução: Compensação com furosemida EV, controle de FC com digoxina + amiodarona. Diurese restabelecida. Balanço hídrico negativo de 8.200mL em 5 dias. Peso: 88.5kg → 80.3kg (-8.2kg). SpO2 em AA: 94%. PA: 130x80mmHg.\nMedicações atuais: Furosemida 40mg VO 12/12h, Digoxina 0.125mg/dia, Amiodarona 200mg/dia, Insulina NPH 20UI manhã/10UI noite.\nPendências: Ecocardiograma de controle, ajuste de IECA após função renal estabilizar.',
      status: 'SIGNED' as const, signedAt: daysAgo(3), signedById: IDS.drCarlos,
      generatedByAI: true, createdAt: daysAgo(3),
    },
    {
      patientId: IDS.pedro, authorId: IDS.drCarlos, tenantId: IDS.tenant,
      encounterId: IDS.enc_pedro_cirurgia,
      type: 'CONSENTIMENTO' as const, title: 'TCLE — Implante de Marcapasso',
      content: 'TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO\n\nProcedimento: Implante de marcapasso cardíaco definitivo (DDDR)\nPaciente: Pedro Henrique Martins\nIndicação: Bloqueio atrioventricular de 2º grau tipo II + bradicardia sintomática\n\nFui informado sobre riscos: infecção, pneumotórax, hematoma de loja, deslocamento de eletrodo.\n\nDeclaro que compreendi as informações e autorizo o procedimento.',
      status: 'SIGNED' as const, signedAt: daysAgo(2), signedById: IDS.drCarlos,
      generatedByAI: false, createdAt: daysAgo(2),
    },
    {
      patientId: IDS.pedro, authorId: IDS.drCarlos, tenantId: IDS.tenant,
      encounterId: IDS.enc_pedro_cirurgia,
      type: 'LAUDO' as const, title: 'Laudo Cirúrgico — Implante de Marcapasso',
      content: 'RELATÓRIO CIRÚRGICO\n\nProcedimento: Implante de marcapasso definitivo DDDR\nData: ' + daysAgo(1).toLocaleDateString('pt-BR') + '\nCirurgião: Dr. Carlos Mendes (CRM-SP 123456)\nAnestesia: Local + sedação consciente\nDuração: 1h15min\n\nDescrição: Incisão infraclavicular esquerda. Punção de veia subclávia. Posicionamento de eletrodo atrial em apêndice AD e eletrodo ventricular em septo RV. Limiares adequados: Atrial 0.5V/0.4ms, Ventricular 0.6V/0.4ms. Impedâncias normais. Gerador Medtronic Adapta ADDR01 implantado em loja subcutânea.\n\nComplicações: Nenhuma.\nSangramento estimado: < 50mL.',
      status: 'SIGNED' as const, signedAt: daysAgo(1), signedById: IDS.drCarlos,
      generatedByAI: false, createdAt: daysAgo(1),
    },

    // ─── Ana Beatriz (Pré-natal) ───
    {
      patientId: IDS.anaBeatriz, authorId: IDS.drAna, tenantId: IDS.tenant,
      encounterId: IDS.enc_ana_prenatal,
      type: 'RELATORIO' as const, title: 'Relatório Pré-Natal — 32 Semanas',
      content: 'RELATÓRIO DE ACOMPANHAMENTO PRÉ-NATAL\n\nPaciente: Ana Beatriz Oliveira Lima, 29 anos, G1P0A0\nIG: 32 semanas e 2 dias (DUM concordante com USG 1º trimestre)\nConsultas realizadas: 8/8 dentro do calendário\n\nExames: Sorologias negativas. GJ: 82 mg/dL. HbA1c: 5.2%. TSH: 2.1. Hb: 11.8g/dL.\nUSG morfológico (22s): Normal. USG Doppler (32s): Normal, PFE P48.\nVacinas: dTpa realizada (28s). Influenza em dia.\n\nPA: 110/70mmHg. Ganho ponderal: +9kg (adequado).\nConduta: Manter sulfato ferroso 40mg/dia. Próxima consulta em 15 dias. Orientado sinais de alarme.',
      status: 'SIGNED' as const, signedAt: daysAgo(5), signedById: IDS.drAna,
      generatedByAI: true, createdAt: daysAgo(5),
    },
    {
      patientId: IDS.anaBeatriz, authorId: IDS.drAna, tenantId: IDS.tenant,
      encounterId: IDS.enc_ana_prenatal,
      type: 'DECLARACAO' as const, title: 'Declaração de Acompanhante — Parto',
      content: 'DECLARAÇÃO DE ACOMPANHANTE\n\nDeclaro que o Sr. Lucas Rodrigues Lima (RG: XXXXX, CPF: XXXXX), companheiro da paciente Ana Beatriz Oliveira Lima, é o acompanhante designado para o momento do parto, conforme Lei nº 11.108/2005.',
      status: 'FINAL' as const, generatedByAI: false, createdAt: daysAgo(3),
    },

    // ─── Lúcia (Oncologia) ───
    {
      patientId: IDS.lucia, authorId: IDS.drRoberto, tenantId: IDS.tenant,
      encounterId: IDS.enc_lucia_onco,
      type: 'LAUDO' as const, title: 'Laudo Anatomopatológico — Biópsia de Mama',
      content: 'LAUDO ANATOMOPATOLÓGICO\n\nMaterial: Fragmento de biópsia por agulha grossa — mama esquerda, QSE\nMacroscopia: 3 fragmentos cilíndricos medindo 1,2 a 1,5 cm\n\nMICROSCOPIA:\nCarcinoma ductal invasivo — grau histológico 2 (Nottingham)\nTipo: SOE (sem outra especificação)\nGrau nuclear: 2/3\nÍndice mitótico: 8/10 CGA\nInvasão angiolinfática: Presente\nNecrose tumoral: Ausente\n\nIMUNO-HISTOQUÍMICA:\nRE: Positivo (90%, forte) | RP: Positivo (70%, moderado)\nHER2: Score 1+ (negativo) | Ki-67: 25%\n\nClassificação molecular: Luminal B (HER2 negativo)\nEstadio patológico: pT2 N1a (1/3 linfonodos positivos)',
      status: 'SIGNED' as const, signedAt: daysAgo(15), signedById: IDS.drRoberto,
      generatedByAI: false, createdAt: daysAgo(16),
    },
    {
      patientId: IDS.lucia, authorId: IDS.drRoberto, tenantId: IDS.tenant,
      encounterId: IDS.enc_lucia_onco,
      type: 'ENCAMINHAMENTO' as const, title: 'Encaminhamento — Radioterapia Adjuvante',
      content: 'Encaminho a paciente Lúcia Ferreira Gomes para avaliação e planejamento de radioterapia adjuvante.\n\nDiagnóstico: Carcinoma ductal invasivo de mama E — Luminal B, pT2N1aM0 (IIA)\nCirurgia realizada: Mastectomia parcial + BLS (1/3 positivo)\nQuimioterapia: Completou 4 ciclos de AC (doxorrubicina + ciclofosfamida)\nHormonioterapia: Iniciará tamoxifeno 20mg/dia após RT.',
      status: 'SIGNED' as const, signedAt: daysAgo(3), signedById: IDS.drRoberto,
      generatedByAI: true, createdAt: daysAgo(3),
    },
    {
      patientId: IDS.lucia, authorId: IDS.drRoberto, tenantId: IDS.tenant,
      encounterId: IDS.enc_lucia_onco,
      type: 'CONSENTIMENTO' as const, title: 'TCLE — Quimioterapia Protocolo AC',
      content: 'TERMO DE CONSENTIMENTO — QUIMIOTERAPIA\n\nProtocolo: AC (Doxorrubicina 60mg/m² + Ciclofosfamida 600mg/m²)\nCiclos: 4, a cada 21 dias\n\nEfeitos colaterais explicados: náusea/vômito, alopecia, mielossupressão, cardiotoxicidade (monitorar com eco), infertilidade.\n\nA paciente Lúcia Ferreira Gomes declara ter sido informada e autoriza o tratamento.',
      status: 'SIGNED' as const, signedAt: daysAgo(30), signedById: IDS.drRoberto,
      generatedByAI: false, createdAt: daysAgo(30),
    },

    // ─── Gabriel (Asma) ───
    {
      patientId: IDS.gabriel, authorId: IDS.drAna, tenantId: IDS.tenant,
      encounterId: IDS.enc_gabriel_asma,
      type: 'ATESTADO' as const, title: 'Atestado Médico — Crise Asmática',
      content: 'Atesto que o menor Gabriel Santos Oliveira, 8 anos, foi atendido nesta unidade por crise asmática moderada (J45.1), necessitando de dispensa escolar por 5 (cinco) dias.',
      status: 'SIGNED' as const, signedAt: daysAgo(2), signedById: IDS.drAna,
      generatedByAI: false, createdAt: daysAgo(2),
    },
    {
      patientId: IDS.gabriel, authorId: IDS.drAna, tenantId: IDS.tenant,
      encounterId: IDS.enc_gabriel_asma,
      type: 'RECEITA' as const, title: 'Receita — Tratamento de Manutenção Asma',
      content: '1) Budesonida 200mcg spray — 1 jato 12/12h (usar com espaçador)\n2) Salbutamol 100mcg spray — SOS, até 4 jatos a cada 4h se dispneia\n3) Prednisolona 3mg/mL — 1mg/kg/dia por 5 dias (dose de ataque)\n\nOrientações: Higiene do espaçador semanal. Evitar alérgenos. Retorno em 30 dias.',
      status: 'SIGNED' as const, signedAt: daysAgo(2), signedById: IDS.drAna,
      generatedByAI: true, createdAt: daysAgo(2),
    },

    // ─── Camila (Psiquiatria) ───
    {
      patientId: IDS.camila, authorId: IDS.drAna, tenantId: IDS.tenant,
      encounterId: IDS.enc_camila_psiq,
      type: 'LAUDO' as const, title: 'Laudo Psiquiátrico — Avaliação Inicial',
      content: 'LAUDO DE AVALIAÇÃO PSIQUIÁTRICA\n\nPaciente: Camila Rodrigues Costa, 34 anos\nQueixa principal: Insônia, ansiedade, humor deprimido há 6 meses\n\nHistória: Episódio depressivo maior recorrente. Primeiro episódio aos 22 anos. Sem internações prévias. Nega ideação suicida atual.\n\nExame do estado mental: Vigil, orientada, humor deprimido, afeto restrito, pensamento sem alterações formais, sem sintomas psicóticos.\n\nHAM-D: 22 (depressão moderada) | BAI: 28 (ansiedade moderada)\n\nHipótese diagnóstica: F33.1 — Transtorno depressivo recorrente, episódio atual moderado\n\nConduta: Escitalopram 10mg/dia (titular para 20mg em 2 semanas). Clonazepam 0.5mg à noite (por 30 dias). Encaminhamento para psicoterapia TCC.',
      status: 'SIGNED' as const, signedAt: daysAgo(14), signedById: IDS.drAna,
      generatedByAI: false, createdAt: daysAgo(14),
    },
    {
      patientId: IDS.camila, authorId: IDS.drAna, tenantId: IDS.tenant,
      encounterId: IDS.enc_camila_psiq,
      type: 'ENCAMINHAMENTO' as const, title: 'Encaminhamento — Psicoterapia TCC',
      content: 'Encaminho a paciente Camila Rodrigues Costa para psicoterapia cognitivo-comportamental.\n\nDiagnóstico: Transtorno depressivo recorrente, episódio atual moderado (F33.1)\nComorbidade: Transtorno de ansiedade generalizada (F41.1)\nMedicação: Escitalopram 20mg/dia + Clonazepam 0.5mg/noite\n\nSolicito acompanhamento semanal inicial, com reavaliação em 30 dias.',
      status: 'SIGNED' as const, signedAt: daysAgo(14), signedById: IDS.drAna,
      generatedByAI: true, createdAt: daysAgo(14),
    },

    // ─── Rafael (Infectologia) ───
    {
      patientId: IDS.rafael, authorId: IDS.drAna, tenantId: IDS.tenant,
      encounterId: IDS.enc_rafael_infecto,
      type: 'RELATORIO' as const, title: 'Relatório — Acompanhamento HIV/AIDS',
      content: 'RELATÓRIO DE ACOMPANHAMENTO\n\nPaciente: Rafael Almeida Pereira, 31 anos\nDiagnóstico: HIV positivo desde 2022\nTARV: TDF/3TC + DTG (Tenofovir/Lamivudina + Dolutegravir)\nAdesão: > 95% (auto-relato + farmácia)\n\nÚltimos exames:\n- CV HIV-1: Indetectável (< 50 cópias/mL) — 3ª indetectável consecutiva\n- CD4+: 680 céls/mm³ (↑60 em 6 meses)\n- HBsAg: Negativo | Anti-HBs: > 100 (vacinado)\n- VDRL: Não reagente | Anti-HCV: Negativo\n- Função renal: TFG > 90 mL/min\n\nConduta: Manter esquema ARV. Próxima CV/CD4 em 6 meses.',
      status: 'SIGNED' as const, signedAt: daysAgo(7), signedById: IDS.drAna,
      generatedByAI: true, createdAt: daysAgo(7),
    },

    // ─── Francisco (Neurologia) ───
    {
      patientId: IDS.francisco, authorId: IDS.drAna, tenantId: IDS.tenant,
      encounterId: IDS.enc_francisco_neuro,
      type: 'LAUDO' as const, title: 'Avaliação Neuropsicológica — Doença de Alzheimer',
      content: 'AVALIAÇÃO NEUROPSICOLÓGICA\n\nPaciente: Francisco Pereira da Costa, 72 anos\n\nTestes aplicados:\n- MEEM: 18/30 (abaixo do corte para escolaridade)\n- Teste do Relógio: 2/5 (desorganização visuoespacial)\n- Fluência verbal (animais): 7 (abaixo do esperado)\n- Trilhas A: 180s (lentificado) | Trilhas B: Não completou\n- Rey-AVLT: Aprendizagem reduzida, perda rápida de evocação tardia\n\nPerfil: Comprometimento predominante em memória episódica, atenção e funções executivas. Linguagem com empobrecimento de vocabulário. Praxia preservada.\n\nConclusão: Padrão compatível com Doença de Alzheimer em estágio moderado (CDR 2).\n\nRecomendações: Donepezila 10mg/dia. Estimulação cognitiva. Suporte ao cuidador.',
      status: 'SIGNED' as const, signedAt: daysAgo(18), signedById: IDS.drAna,
      generatedByAI: false, createdAt: daysAgo(19),
    },

    // ─── Isabella (Neonatal) ───
    {
      patientId: IDS.isabella, authorId: IDS.drAna, tenantId: IDS.tenant,
      encounterId: IDS.enc_isabella_neo,
      type: 'FICHA_INTERNACAO' as const, title: 'Ficha de Internação — Berçário/UTIN',
      content: 'FICHA DE INTERNAÇÃO NEONATAL\n\nRN: Isabella Costa Nascimento\nData nascimento: ' + daysAgo(3).toLocaleDateString('pt-BR') + '\nIG: 36 semanas e 4 dias (pré-termo tardio)\nPeso nascimento: 2.450g | Comprimento: 46cm | PC: 33cm\nApgar: 8/9\nTipo de parto: Cesárea (iteratividade)\nMãe: Tipo sanguíneo O+, sorologias negativas\n\nMotivo internação: Prematuridade + Taquipneia transitória do RN\nLeito: Berçário intermediário - B02\nConduta: O2 por CPAP nasal, controle térmico, monitorização.',
      status: 'SIGNED' as const, signedAt: daysAgo(3), signedById: IDS.drAna,
      generatedByAI: false, createdAt: daysAgo(3),
    },
  ];

  for (const doc of documents) {
    await prisma.clinicalDocument.create({ data: { id: v4(), ...doc } });
  }
  console.log(`   - ${documents.length} Clinical Documents`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. ADDITIONAL APPOINTMENTS (20 agendamentos)
  // ═══════════════════════════════════════════════════════════════════════════

  console.log('  → Creating additional appointments...');

  const appointments = [
    // Retornos futuros
    { tenantId: IDS.tenant, patientId: IDS.maria, doctorId: IDS.drCarlos, type: 'RETURN' as const, status: 'SCHEDULED' as const, scheduledAt: daysFromNow(7), duration: 30, notes: 'Retorno cardiologia — controle PA e eco' },
    { tenantId: IDS.tenant, patientId: IDS.maria, doctorId: IDS.drCarlos, type: 'EXAM' as const, status: 'CONFIRMED' as const, scheduledAt: daysFromNow(3), duration: 45, notes: 'Ecocardiograma transtorácico de controle' },
    { tenantId: IDS.tenant, patientId: IDS.jose, doctorId: IDS.drAna, type: 'RETURN' as const, status: 'SCHEDULED' as const, scheduledAt: daysFromNow(5), duration: 30, notes: 'Retorno check-up — resultado de exames' },
    { tenantId: IDS.tenant, patientId: IDS.jose, doctorId: IDS.drCarlos, type: 'EXAM' as const, status: 'SCHEDULED' as const, scheduledAt: daysFromNow(2), duration: 60, notes: 'Teste ergométrico' },
    { tenantId: IDS.tenant, patientId: IDS.anaBeatriz, doctorId: IDS.drAna, type: 'RETURN' as const, status: 'CONFIRMED' as const, scheduledAt: daysFromNow(10), duration: 30, notes: 'Pré-natal 34 semanas — CTG + peso' },
    { tenantId: IDS.tenant, patientId: IDS.anaBeatriz, doctorId: IDS.drAna, type: 'RETURN' as const, status: 'SCHEDULED' as const, scheduledAt: daysFromNow(24), duration: 30, notes: 'Pré-natal 36 semanas' },
    { tenantId: IDS.tenant, patientId: IDS.pedro, doctorId: IDS.drCarlos, type: 'RETURN' as const, status: 'SCHEDULED' as const, scheduledAt: daysFromNow(14), duration: 30, notes: 'Pós-op marcapasso — checar ferida + interrogação gerador' },
    { tenantId: IDS.tenant, patientId: IDS.lucia, doctorId: IDS.drRoberto, type: 'RETURN' as const, status: 'CONFIRMED' as const, scheduledAt: daysFromNow(4), duration: 45, notes: 'Avaliação pós-QT — hemograma + marcadores' },
    { tenantId: IDS.tenant, patientId: IDS.lucia, doctorId: IDS.drRoberto, type: 'PROCEDURE' as const, status: 'SCHEDULED' as const, scheduledAt: daysFromNow(18), duration: 30, notes: 'Consulta radioterapia — planejamento' },
    { tenantId: IDS.tenant, patientId: IDS.gabriel, doctorId: IDS.drAna, type: 'RETURN' as const, status: 'SCHEDULED' as const, scheduledAt: daysFromNow(28), duration: 20, notes: 'Retorno asma — reavaliação controle e espirometria' },
    { tenantId: IDS.tenant, patientId: IDS.camila, doctorId: IDS.drAna, type: 'RETURN' as const, status: 'CONFIRMED' as const, scheduledAt: daysFromNow(6), duration: 30, notes: 'Retorno psiquiatria — ajuste medicação' },
    { tenantId: IDS.tenant, patientId: IDS.rafael, doctorId: IDS.drAna, type: 'RETURN' as const, status: 'SCHEDULED' as const, scheduledAt: daysFromNow(60), duration: 30, notes: 'Retorno infectologia — CV + CD4 semestral' },
    { tenantId: IDS.tenant, patientId: IDS.francisco, doctorId: IDS.drAna, type: 'RETURN' as const, status: 'CONFIRMED' as const, scheduledAt: daysFromNow(12), duration: 45, notes: 'Retorno neurologia — reavaliação cognitiva + cuidador' },
    { tenantId: IDS.tenant, patientId: IDS.isabella, doctorId: IDS.drAna, type: 'RETURN' as const, status: 'SCHEDULED' as const, scheduledAt: daysFromNow(27), duration: 30, notes: 'Puericultura 1 mês — peso, reflexos, triagem' },
    // Consultas passadas (completadas)
    { tenantId: IDS.tenant, patientId: IDS.maria, doctorId: IDS.drCarlos, type: 'RETURN' as const, status: 'COMPLETED' as const, scheduledAt: daysAgo(30), duration: 30, notes: 'Retorno cardiologia — ajuste losartana' },
    { tenantId: IDS.tenant, patientId: IDS.camila, doctorId: IDS.drAna, type: 'FIRST_VISIT' as const, status: 'COMPLETED' as const, scheduledAt: daysAgo(14), duration: 60, notes: 'Primeira consulta psiquiatria' },
    { tenantId: IDS.tenant, patientId: IDS.rafael, doctorId: IDS.drAna, type: 'RETURN' as const, status: 'COMPLETED' as const, scheduledAt: daysAgo(7), duration: 30, notes: 'Retorno infectologia — resultado CV indetectável' },
    { tenantId: IDS.tenant, patientId: IDS.lucia, doctorId: IDS.drRoberto, type: 'RETURN' as const, status: 'COMPLETED' as const, scheduledAt: daysAgo(10), duration: 45, notes: 'Avaliação pré-4º ciclo QT' },
    // Canceladas / Faltou
    { tenantId: IDS.tenant, patientId: IDS.francisco, doctorId: IDS.drAna, type: 'RETURN' as const, status: 'NO_SHOW' as const, scheduledAt: daysAgo(5), duration: 30, notes: 'Paciente não compareceu — cuidador informou dificuldade de transporte' },
    { tenantId: IDS.tenant, patientId: IDS.gabriel, doctorId: IDS.drAna, type: 'RETURN' as const, status: 'CANCELLED' as const, scheduledAt: daysAgo(3), duration: 20, notes: 'Cancelado pela mãe — criança com virose' },
  ];

  for (const appt of appointments) {
    await prisma.appointment.create({ data: { id: v4(), ...appt } });
  }
  console.log(`   - ${appointments.length} Additional Appointments`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. ADDITIONAL VITAL SIGNS (40 registros)
  // ═══════════════════════════════════════════════════════════════════════════

  console.log('  → Creating additional vital signs...');

  const vitals: Array<Record<string, unknown>> = [];

  // Maria — 30 dias de acompanhamento PA
  for (let i = 0; i < 10; i++) {
    const sys = 130 + Math.floor(Math.random() * 30) - 10; // 120-150
    const dia = 80 + Math.floor(Math.random() * 15) - 5;   // 75-90
    vitals.push({
      patientId: IDS.maria, recordedById: IDS.enfPatricia,
      encounterId: i < 2 ? IDS.enc_maria_cardio : undefined,
      recordedAt: daysAgo(30 - i * 3),
      systolicBP: sys, diastolicBP: dia,
      heartRate: 68 + Math.floor(Math.random() * 15),
      respiratoryRate: 16 + Math.floor(Math.random() * 4),
      temperature: 36.2 + Math.random() * 0.8,
      oxygenSaturation: 95 + Math.floor(Math.random() * 4),
      weight: 72.5, height: 160, bmi: 28.3,
      glucoseLevel: 110 + Math.floor(Math.random() * 50),
      painScale: Math.floor(Math.random() * 3),
    });
  }

  // Pedro — UTI monitorização intensiva
  for (let i = 0; i < 12; i++) {
    const improving = i > 6;
    vitals.push({
      patientId: IDS.pedro, recordedById: IDS.enfPatricia,
      encounterId: IDS.enc_pedro_uti,
      recordedAt: hoursAgo(192 - i * 12), // a cada 12h por 8 dias
      systolicBP: improving ? 120 + Math.floor(Math.random() * 15) : 90 + Math.floor(Math.random() * 20),
      diastolicBP: improving ? 75 + Math.floor(Math.random() * 10) : 55 + Math.floor(Math.random() * 15),
      heartRate: improving ? 78 + Math.floor(Math.random() * 15) : 100 + Math.floor(Math.random() * 25),
      respiratoryRate: improving ? 16 + Math.floor(Math.random() * 4) : 22 + Math.floor(Math.random() * 6),
      temperature: 36.5 + Math.random() * (improving ? 0.5 : 1.2),
      oxygenSaturation: improving ? 94 + Math.floor(Math.random() * 4) : 86 + Math.floor(Math.random() * 6),
      weight: 88.5 - i * 0.7, // perdendo peso com diurético
      height: 175, bmi: parseFloat(((88.5 - i * 0.7) / (1.75 * 1.75)).toFixed(1)),
      glucoseLevel: 150 + Math.floor(Math.random() * 80),
      painScale: improving ? Math.floor(Math.random() * 2) : 2 + Math.floor(Math.random() * 4),
    });
  }

  // Gabriel — pediátrico
  for (let i = 0; i < 4; i++) {
    vitals.push({
      patientId: IDS.gabriel, recordedById: IDS.enfJoao,
      encounterId: IDS.enc_gabriel_asma,
      recordedAt: hoursAgo(48 - i * 8),
      systolicBP: 95 + Math.floor(Math.random() * 10),
      diastolicBP: 60 + Math.floor(Math.random() * 8),
      heartRate: 90 + Math.floor(Math.random() * 20),
      respiratoryRate: 22 + Math.floor(Math.random() * 8),
      temperature: 36.8 + Math.random() * 0.6,
      oxygenSaturation: 92 + Math.floor(Math.random() * 6),
      weight: 28.5, height: 130, bmi: 16.9,
      painScale: 0,
    });
  }

  // Lúcia — durante quimioterapia
  for (let i = 0; i < 6; i++) {
    vitals.push({
      patientId: IDS.lucia, recordedById: IDS.enfPatricia,
      encounterId: IDS.enc_lucia_onco,
      recordedAt: daysAgo(35 - i * 7),
      systolicBP: 105 + Math.floor(Math.random() * 15),
      diastolicBP: 65 + Math.floor(Math.random() * 10),
      heartRate: 75 + Math.floor(Math.random() * 15),
      respiratoryRate: 16 + Math.floor(Math.random() * 4),
      temperature: 36.5 + Math.random() * 0.8,
      oxygenSaturation: 96 + Math.floor(Math.random() * 3),
      weight: 58.0 - i * 0.3, // perda ponderal leve na QT
      height: 162, bmi: parseFloat(((58.0 - i * 0.3) / (1.62 * 1.62)).toFixed(1)),
      painScale: Math.floor(Math.random() * 3),
    });
  }

  // Ana Beatriz — pré-natal
  for (let i = 0; i < 5; i++) {
    vitals.push({
      patientId: IDS.anaBeatriz, recordedById: IDS.enfJoao,
      encounterId: IDS.enc_ana_prenatal,
      recordedAt: daysAgo(40 - i * 10),
      systolicBP: 108 + Math.floor(Math.random() * 12),
      diastolicBP: 68 + Math.floor(Math.random() * 8),
      heartRate: 80 + Math.floor(Math.random() * 10),
      respiratoryRate: 18 + Math.floor(Math.random() * 3),
      temperature: 36.3 + Math.random() * 0.5,
      oxygenSaturation: 97 + Math.floor(Math.random() * 2),
      weight: 65.0 + i * 0.8,
      height: 165, bmi: parseFloat(((65.0 + i * 0.8) / (1.65 * 1.65)).toFixed(1)),
      painScale: 0,
    });
  }

  // Francisco — neurologia
  for (let i = 0; i < 3; i++) {
    vitals.push({
      patientId: IDS.francisco, recordedById: IDS.enfPatricia,
      encounterId: IDS.enc_francisco_neuro,
      recordedAt: daysAgo(20 - i * 7),
      systolicBP: 145 + Math.floor(Math.random() * 15),
      diastolicBP: 85 + Math.floor(Math.random() * 10),
      heartRate: 72 + Math.floor(Math.random() * 10),
      respiratoryRate: 16 + Math.floor(Math.random() * 3),
      temperature: 36.4 + Math.random() * 0.4,
      oxygenSaturation: 95 + Math.floor(Math.random() * 3),
      weight: 70.0, height: 168, bmi: 24.8,
      glucoseLevel: 88 + Math.floor(Math.random() * 15),
      painScale: 0,
    });
  }

  for (const v of vitals) {
    await prisma.vitalSigns.create({ data: { id: v4(), ...v } as Prisma.VitalSignsUncheckedCreateInput });
  }
  console.log(`   - ${vitals.length} Additional Vital Signs`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. ADDITIONAL EXAM RESULTS (12 exames)
  // ═══════════════════════════════════════════════════════════════════════════

  console.log('  → Creating additional exam results...');

  const exams = [
    // Maria — hemograma + perfil lipídico
    {
      patientId: IDS.maria, encounterId: IDS.enc_maria_retorno,
      examName: 'Hemograma Completo', examCode: '40301048', examType: 'LABORATORY' as const,
      requestedById: IDS.drCarlos, requestedAt: daysAgo(3),
      collectedAt: daysAgo(3), completedAt: daysAgo(2),
      status: 'REVIEWED' as const,
      labResults: { hb: 12.8, ht: 38, leucocitos: 7200, neutrofilos: 58, linfocitos: 32, plaquetas: 245000, vcm: 86, hcm: 29 } as unknown as Prisma.InputJsonValue,
      reviewedById: IDS.drCarlos, reviewedAt: daysAgo(2),
      aiInterpretation: 'Hemograma dentro da normalidade. Hb adequada para a faixa etária.',
    },
    {
      patientId: IDS.maria, encounterId: IDS.enc_maria_retorno,
      examName: 'Perfil Lipídico', examCode: '40301117', examType: 'LABORATORY' as const,
      requestedById: IDS.drCarlos, requestedAt: daysAgo(3),
      collectedAt: daysAgo(3), completedAt: daysAgo(2),
      status: 'REVIEWED' as const,
      labResults: { colesterol_total: 215, hdl: 48, ldl: 138, vldl: 29, triglicerides: 145, nao_hdl: 167 } as unknown as Prisma.InputJsonValue,
      reviewedById: IDS.drCarlos, reviewedAt: daysAgo(2),
      aiInterpretation: 'Dislipidemia mista. LDL acima da meta para paciente de alto risco cardiovascular (meta < 70). Considerar estatina.',
    },
    {
      patientId: IDS.maria, encounterId: IDS.enc_maria_retorno,
      examName: 'HbA1c — Hemoglobina Glicada', examCode: '40301095', examType: 'LABORATORY' as const,
      requestedById: IDS.drCarlos, requestedAt: daysAgo(3),
      collectedAt: daysAgo(3), completedAt: daysAgo(2),
      status: 'REVIEWED' as const,
      labResults: { hba1c: 7.8, glicemia_media_estimada: 177 } as unknown as Prisma.InputJsonValue,
      reviewedById: IDS.drCarlos, reviewedAt: daysAgo(2),
      aiInterpretation: 'HbA1c 7.8% — acima da meta de 7%. Controle glicêmico insatisfatório. Considerar ajuste terapêutico.',
    },

    // José — PSA + função renal
    {
      patientId: IDS.jose, encounterId: IDS.enc_jose_exame,
      examName: 'PSA Total e Livre', examCode: '40316149', examType: 'LABORATORY' as const,
      requestedById: IDS.drAna, requestedAt: daysAgo(12),
      collectedAt: daysAgo(12), completedAt: daysAgo(10),
      status: 'REVIEWED' as const,
      labResults: { psa_total: 2.1, psa_livre: 0.58, relacao_livre_total: 27.6 } as unknown as Prisma.InputJsonValue,
      reviewedById: IDS.drAna, reviewedAt: daysAgo(10),
      aiInterpretation: 'PSA total dentro dos limites normais (< 4.0). Relação livre/total > 25% — baixo risco.',
    },

    // Camila — TSH (triagem psiquiatria)
    {
      patientId: IDS.camila, encounterId: IDS.enc_camila_psiq,
      examName: 'TSH + T4 Livre', examCode: '40316360', examType: 'LABORATORY' as const,
      requestedById: IDS.drAna, requestedAt: daysAgo(14),
      collectedAt: daysAgo(14), completedAt: daysAgo(12),
      status: 'REVIEWED' as const,
      labResults: { tsh: 2.8, t4_livre: 1.2, referencia_tsh: '0.4-4.0', referencia_t4l: '0.8-1.8' } as unknown as Prisma.InputJsonValue,
      reviewedById: IDS.drAna, reviewedAt: daysAgo(12),
      aiInterpretation: 'Função tireoidiana normal. Descartada causa endócrina para quadro depressivo.',
    },

    // Pedro — BNP + troponina
    {
      patientId: IDS.pedro, encounterId: IDS.enc_pedro_uti,
      examName: 'NT-proBNP', examCode: '40301290', examType: 'LABORATORY' as const,
      requestedById: IDS.drCarlos, requestedAt: daysAgo(8),
      collectedAt: daysAgo(8), completedAt: daysAgo(8),
      status: 'REVIEWED' as const,
      labResults: { nt_probnp: 4850, referencia: '< 450 pg/mL para 75+ anos' } as unknown as Prisma.InputJsonValue,
      reviewedById: IDS.drCarlos, reviewedAt: daysAgo(8),
      aiInterpretation: 'NT-proBNP muito elevado (4850 pg/mL), compatível com ICC descompensada. Monitorar queda com tratamento.',
    },
    {
      patientId: IDS.pedro, encounterId: IDS.enc_pedro_uti,
      examName: 'NT-proBNP (Controle D5)', examCode: '40301290', examType: 'LABORATORY' as const,
      requestedById: IDS.drCarlos, requestedAt: daysAgo(3),
      collectedAt: daysAgo(3), completedAt: daysAgo(3),
      status: 'REVIEWED' as const,
      labResults: { nt_probnp: 1200, referencia: '< 450 pg/mL', variacao: '-75% em 5 dias' } as unknown as Prisma.InputJsonValue,
      reviewedById: IDS.drCarlos, reviewedAt: daysAgo(3),
      aiInterpretation: 'Queda significativa do NT-proBNP (4850 → 1200, -75%). Boa resposta ao tratamento. Ainda acima do VR — manter otimização.',
    },

    // Gabriel — espirometria
    {
      patientId: IDS.gabriel, encounterId: IDS.enc_gabriel_asma,
      examName: 'Espirometria', examCode: '40201058', examType: 'FUNCTIONAL' as const,
      requestedById: IDS.drAna, requestedAt: daysAgo(2),
      completedAt: daysAgo(2),
      status: 'REVIEWED' as const,
      labResults: { cvf: 1.85, vef1: 1.42, tiffeneau: 76.8, fef25_75: 1.10, resposta_bd: '+18%' } as unknown as Prisma.InputJsonValue,
      reviewedById: IDS.drAna, reviewedAt: daysAgo(1),
      aiInterpretation: 'Espirometria com distúrbio obstrutivo leve (VEF1/CVF 76.8%). Resposta significativa ao broncodilatador (+18%) confirma hiperresponsividade brônquica. Compatível com asma.',
    },

    // Isabella — triagem neonatal
    {
      patientId: IDS.isabella, encounterId: IDS.enc_isabella_neo,
      examName: 'Triagem Neonatal (Teste do Pezinho)', examCode: '40301311', examType: 'LABORATORY' as const,
      requestedById: IDS.drAna, requestedAt: daysAgo(2),
      collectedAt: daysAgo(2), completedAt: daysAgo(1),
      status: 'REVIEWED' as const,
      labResults: { pku: 'Normal', tsh: 'Normal', hemoglobinopatia: 'FA (normal)', biotinidase: 'Normal', fibrose_cistica: 'Normal', hiperplasia_adrenal: 'Normal' } as unknown as Prisma.InputJsonValue,
      reviewedById: IDS.drAna, reviewedAt: daysAgo(1),
      aiInterpretation: 'Triagem neonatal completa — todos os marcadores dentro da normalidade. Sem necessidade de reconvocação.',
    },

    // Ana Beatriz — TOTG (tolerância glicose gestacional)
    {
      patientId: IDS.anaBeatriz, encounterId: IDS.enc_ana_prenatal,
      examName: 'TOTG 75g (Diabetes Gestacional)', examCode: '40301230', examType: 'LABORATORY' as const,
      requestedById: IDS.drAna, requestedAt: daysAgo(25),
      collectedAt: daysAgo(25), completedAt: daysAgo(24),
      status: 'REVIEWED' as const,
      labResults: { jejum: 82, '1h': 148, '2h': 118, criterio: 'IADPSG: jejum<92, 1h<180, 2h<153' } as unknown as Prisma.InputJsonValue,
      reviewedById: IDS.drAna, reviewedAt: daysAgo(24),
      aiInterpretation: 'TOTG normal. Sem critérios para diabetes gestacional pelo IADPSG. Manter acompanhamento nutricional.',
    },

    // Rafael — função hepática
    {
      patientId: IDS.rafael, encounterId: IDS.enc_rafael_infecto,
      examName: 'Hepatograma Completo', examCode: '40301168', examType: 'LABORATORY' as const,
      requestedById: IDS.drAna, requestedAt: daysAgo(7),
      collectedAt: daysAgo(7), completedAt: daysAgo(6),
      status: 'REVIEWED' as const,
      labResults: { tgo: 28, tgp: 32, ggt: 45, fa: 78, bt: 0.8, bd: 0.2, bi: 0.6, albumina: 4.2 } as unknown as Prisma.InputJsonValue,
      reviewedById: IDS.drAna, reviewedAt: daysAgo(6),
      aiInterpretation: 'Hepatograma normal. Sem hepatotoxicidade medicamentosa pelo TARV. Albumina adequada.',
    },

    // Francisco — RX tórax
    {
      patientId: IDS.francisco, encounterId: IDS.enc_francisco_neuro,
      examName: 'Radiografia de Tórax PA/Perfil', examCode: '40801020', examType: 'IMAGING' as const,
      requestedById: IDS.drAna, requestedAt: daysAgo(20),
      completedAt: daysAgo(19), status: 'REVIEWED' as const,
      radiologistReport: 'Campos pulmonares limpos, sem consolidações ou derrames. Área cardíaca dentro dos limites. Aorta ectasiada. Sem lesões ósseas.',
      reviewedById: IDS.drAna, reviewedAt: daysAgo(19),
      aiInterpretation: 'RX tórax sem alterações parenquimatosas. Ectasia aórtica compatível com idade.',
    },
  ];

  for (const e of exams) {
    await prisma.examResult.create({ data: { id: v4(), ...e } as Prisma.ExamResultUncheckedCreateInput });
  }
  console.log(`   - ${exams.length} Additional Exam Results`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. ADDITIONAL PRESCRIPTIONS (6 prescrições com itens)
  // ═══════════════════════════════════════════════════════════════════════════

  console.log('  → Creating additional prescriptions...');

  // José — anti-hipertensivo
  const rxJose = await prisma.prescription.create({
    data: {
      id: v4(), tenantId: IDS.tenant, patientId: IDS.jose,
      encounterId: IDS.enc_jose_geral, doctorId: IDS.drAna,
      status: 'ACTIVE', type: 'MEDICATION', createdAt: daysAgo(12),
    },
  });
  await prisma.prescriptionItem.createMany({
    data: [
      { id: v4(), prescriptionId: rxJose.id, medicationName: 'Enalapril 20mg', dose: '20mg', route: 'ORAL', frequency: '12/12h', duration: 'Uso contínuo' },
      { id: v4(), prescriptionId: rxJose.id, medicationName: 'Sinvastatina 20mg', dose: '20mg', route: 'ORAL', frequency: '1x/dia à noite', duration: 'Uso contínuo' },
    ],
  });

  // Ana Beatriz — suplementos pré-natal
  const rxAna = await prisma.prescription.create({
    data: {
      id: v4(), tenantId: IDS.tenant, patientId: IDS.anaBeatriz,
      encounterId: IDS.enc_ana_prenatal, doctorId: IDS.drAna,
      status: 'ACTIVE', type: 'MEDICATION', createdAt: daysAgo(5),
    },
  });
  await prisma.prescriptionItem.createMany({
    data: [
      { id: v4(), prescriptionId: rxAna.id, medicationName: 'Sulfato Ferroso 40mg Fe elementar', dose: '40mg', route: 'ORAL', frequency: '1x/dia em jejum', duration: 'Até o parto' },
      { id: v4(), prescriptionId: rxAna.id, medicationName: 'Ácido Fólico 5mg', dose: '5mg', route: 'ORAL', frequency: '1x/dia', duration: 'Até o parto' },
      { id: v4(), prescriptionId: rxAna.id, medicationName: 'Carbonato de Cálcio 500mg + Vitamina D3 200UI', dose: '500mg/200UI', route: 'ORAL', frequency: '12/12h', duration: 'Até o parto' },
    ],
  });

  // Lúcia — suporte QT
  const rxLucia = await prisma.prescription.create({
    data: {
      id: v4(), tenantId: IDS.tenant, patientId: IDS.lucia,
      encounterId: IDS.enc_lucia_onco, doctorId: IDS.drRoberto,
      status: 'ACTIVE', type: 'MEDICATION', createdAt: daysAgo(10),
    },
  });
  await prisma.prescriptionItem.createMany({
    data: [
      { id: v4(), prescriptionId: rxLucia.id, medicationName: 'Ondansetrona 8mg', dose: '8mg', route: 'ORAL', frequency: '8/8h nos dias de QT', duration: '3 dias por ciclo' },
      { id: v4(), prescriptionId: rxLucia.id, medicationName: 'Dexametasona 4mg', dose: '4mg', route: 'ORAL', frequency: '12/12h', duration: '3 dias por ciclo' },
      { id: v4(), prescriptionId: rxLucia.id, medicationName: 'Filgrastim 300mcg', dose: '300mcg', route: 'SC', frequency: '1x/dia', duration: 'D3-D7 pós-QT se neutropenia' },
    ],
  });

  // Francisco — Alzheimer
  const rxFrancisco = await prisma.prescription.create({
    data: {
      id: v4(), tenantId: IDS.tenant, patientId: IDS.francisco,
      encounterId: IDS.enc_francisco_neuro, doctorId: IDS.drAna,
      status: 'ACTIVE', type: 'MEDICATION', createdAt: daysAgo(18),
    },
  });
  await prisma.prescriptionItem.createMany({
    data: [
      { id: v4(), prescriptionId: rxFrancisco.id, medicationName: 'Donepezila 10mg', dose: '10mg', route: 'ORAL', frequency: '1x/dia à noite', duration: 'Uso contínuo' },
      { id: v4(), prescriptionId: rxFrancisco.id, medicationName: 'Memantina 10mg', dose: '10mg', route: 'ORAL', frequency: '12/12h', duration: 'Uso contínuo' },
      { id: v4(), prescriptionId: rxFrancisco.id, medicationName: 'Quetiapina 25mg', dose: '25mg', route: 'ORAL', frequency: '1x à noite (SOS agitação)', duration: '30 dias' },
    ],
  });

  // Isabella — neonatal
  const rxIsabella = await prisma.prescription.create({
    data: {
      id: v4(), tenantId: IDS.tenant, patientId: IDS.isabella,
      encounterId: IDS.enc_isabella_neo, doctorId: IDS.drAna,
      status: 'ACTIVE', type: 'MEDICATION', createdAt: daysAgo(3),
    },
  });
  await prisma.prescriptionItem.createMany({
    data: [
      { id: v4(), prescriptionId: rxIsabella.id, medicationName: 'Vitamina K1 (Fitomenadiona) 1mg', dose: '1mg', route: 'IM', frequency: 'Dose única', duration: 'Aplicado ao nascimento' },
      { id: v4(), prescriptionId: rxIsabella.id, medicationName: 'Vitamina D3 400UI gotas', dose: '400UI (2 gotas)', route: 'ORAL', frequency: '1x/dia', duration: 'Até 2 anos' },
    ],
  });

  // Lúcia — hormonioterapia (próxima fase)
  const rxLuciaHormono = await prisma.prescription.create({
    data: {
      id: v4(), tenantId: IDS.tenant, patientId: IDS.lucia,
      encounterId: IDS.enc_lucia_onco, doctorId: IDS.drRoberto,
      status: 'DRAFT', type: 'MEDICATION', createdAt: daysAgo(1),
    },
  });
  await prisma.prescriptionItem.createMany({
    data: [
      { id: v4(), prescriptionId: rxLuciaHormono.id, medicationName: 'Tamoxifeno 20mg', dose: '20mg', route: 'ORAL', frequency: '1x/dia', duration: '5 anos' },
    ],
  });

  console.log('   - 6 Additional Prescriptions with items');

  // ═══════════════════════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════

  console.log('\n  ✅ Portal data seeding complete!');
  console.log(`   - ${documents.length} Clinical Documents`);
  console.log(`   - ${appointments.length} Appointments`);
  console.log(`   - ${vitals.length} Vital Sign records`);
  console.log(`   - ${exams.length} Exam Results`);
  console.log('   - 6 Prescriptions with 16 items');
}
