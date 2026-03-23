import { PrismaClient, ExamType } from '@prisma/client';

interface ExamSeedEntry {
  name: string;
  code: string;
  examType: ExamType;
  category: string;
  description?: string;
}

const EXAM_CATALOG: ExamSeedEntry[] = [
  // ── Laboratoriais (60) ─────────────────────────────────────
  { name: 'Hemograma completo', code: '40304361', examType: 'LABORATORY', category: 'Hematologia', description: 'Contagem completa de celulas sanguineas' },
  { name: 'Glicemia de jejum', code: '40302040', examType: 'LABORATORY', category: 'Bioquimica', description: 'Dosagem de glicose em jejum' },
  { name: 'Creatinina serica', code: '40311163', examType: 'LABORATORY', category: 'Bioquimica', description: 'Avaliacao da funcao renal' },
  { name: 'Ureia serica', code: '40311228', examType: 'LABORATORY', category: 'Bioquimica', description: 'Avaliacao da funcao renal' },
  { name: 'TGO (AST)', code: '40302580', examType: 'LABORATORY', category: 'Bioquimica', description: 'Transaminase glutamico-oxalacetica' },
  { name: 'TGP (ALT)', code: '40302610', examType: 'LABORATORY', category: 'Bioquimica', description: 'Transaminase glutamico-piruvica' },
  { name: 'Sodio serico', code: '40311180', examType: 'LABORATORY', category: 'Bioquimica', description: 'Eletrolitro sodio' },
  { name: 'Potassio serico', code: '40311120', examType: 'LABORATORY', category: 'Bioquimica', description: 'Eletrolitro potassio' },
  { name: 'PCR (Proteina C-reativa)', code: '40308375', examType: 'LABORATORY', category: 'Imunologia', description: 'Marcador inflamatorio' },
  { name: 'VHS (Velocidade de hemossedimentacao)', code: '40304337', examType: 'LABORATORY', category: 'Hematologia', description: 'Marcador inflamatorio inespecifico' },
  { name: 'Coagulograma (TP + TTPA)', code: '40304230', examType: 'LABORATORY', category: 'Hematologia', description: 'Avaliacao da coagulacao' },
  { name: 'EAS (Urina tipo I)', code: '40311074', examType: 'LABORATORY', category: 'Urinanalise', description: 'Exame de elementos anormais e sedimento' },
  { name: 'Urocultura', code: '40310213', examType: 'LABORATORY', category: 'Microbiologia', description: 'Cultura de urina com antibiograma' },
  { name: 'Hemocultura (2 amostras)', code: '40310060', examType: 'LABORATORY', category: 'Microbiologia', description: 'Cultura de sangue para deteccao de bacteremia' },
  { name: 'TSH', code: '40316530', examType: 'LABORATORY', category: 'Hormonios', description: 'Hormonio tireoestimulante' },
  { name: 'T4 livre', code: '40316491', examType: 'LABORATORY', category: 'Hormonios', description: 'Tiroxina livre' },
  { name: 'Hemoglobina glicada (HbA1c)', code: '40302075', examType: 'LABORATORY', category: 'Bioquimica', description: 'Controle glicemico dos ultimos 3 meses' },
  { name: 'Colesterol total', code: '40301630', examType: 'LABORATORY', category: 'Bioquimica', description: 'Perfil lipidico parcial' },
  { name: 'HDL colesterol', code: '40301648', examType: 'LABORATORY', category: 'Bioquimica', description: 'Colesterol de alta densidade' },
  { name: 'LDL colesterol', code: '40301656', examType: 'LABORATORY', category: 'Bioquimica', description: 'Colesterol de baixa densidade' },
  { name: 'Triglicerideos', code: '40301699', examType: 'LABORATORY', category: 'Bioquimica', description: 'Dosagem de triglicerideos' },
  { name: 'Acido urico', code: '40301010', examType: 'LABORATORY', category: 'Bioquimica', description: 'Dosagem de acido urico serico' },
  { name: 'Bilirrubina total e fracoes', code: '40301397', examType: 'LABORATORY', category: 'Bioquimica', description: 'Bilirrubina direta e indireta' },
  { name: 'Calcio serico', code: '40301460', examType: 'LABORATORY', category: 'Bioquimica', description: 'Dosagem de calcio total' },
  { name: 'Magnesio serico', code: '40302270', examType: 'LABORATORY', category: 'Bioquimica', description: 'Dosagem de magnesio' },
  { name: 'Fosforo serico', code: '40301966', examType: 'LABORATORY', category: 'Bioquimica', description: 'Dosagem de fosforo inorganico' },
  { name: 'Ferro serico', code: '40301940', examType: 'LABORATORY', category: 'Bioquimica', description: 'Dosagem de ferro' },
  { name: 'Ferritina', code: '40308022', examType: 'LABORATORY', category: 'Bioquimica', description: 'Reserva de ferro corporal' },
  { name: 'Transferrina', code: '40308430', examType: 'LABORATORY', category: 'Bioquimica', description: 'Proteina transportadora de ferro' },
  { name: 'Fosfatase alcalina', code: '40301958', examType: 'LABORATORY', category: 'Bioquimica', description: 'Enzima hepato-biliar e ossea' },
  { name: 'Gama-GT', code: '40301974', examType: 'LABORATORY', category: 'Bioquimica', description: 'Gama-glutamiltransferase' },
  { name: 'Amilase serica', code: '40301290', examType: 'LABORATORY', category: 'Bioquimica', description: 'Enzima pancreatica' },
  { name: 'Lipase serica', code: '40302245', examType: 'LABORATORY', category: 'Bioquimica', description: 'Enzima pancreatica' },
  { name: 'DHL (Desidrogenase lactica)', code: '40301753', examType: 'LABORATORY', category: 'Bioquimica', description: 'Marcador de lesao celular' },
  { name: 'CPK total', code: '40301680', examType: 'LABORATORY', category: 'Bioquimica', description: 'Creatinoquinase' },
  { name: 'CPK-MB', code: '40301702', examType: 'LABORATORY', category: 'Bioquimica', description: 'Fracao MB da creatinoquinase' },
  { name: 'Troponina I', code: '40308618', examType: 'LABORATORY', category: 'Bioquimica', description: 'Marcador de lesao miocardica' },
  { name: 'BNP (Peptideo natriuretico cerebral)', code: '40308588', examType: 'LABORATORY', category: 'Bioquimica', description: 'Marcador de insuficiencia cardiaca' },
  { name: 'D-dimero', code: '40304299', examType: 'LABORATORY', category: 'Hematologia', description: 'Marcador de trombose/embolia' },
  { name: 'Fibrinogenio', code: '40304256', examType: 'LABORATORY', category: 'Hematologia', description: 'Proteina da coagulacao' },
  { name: 'INR', code: '40304264', examType: 'LABORATORY', category: 'Hematologia', description: 'Relacao normalizada internacional' },
  { name: 'Gasometria arterial', code: '40302016', examType: 'LABORATORY', category: 'Bioquimica', description: 'Equilibrio acido-basico e gases' },
  { name: 'Lactato serico', code: '40302229', examType: 'LABORATORY', category: 'Bioquimica', description: 'Marcador de hipoperfusao' },
  { name: 'Albumina serica', code: '40301141', examType: 'LABORATORY', category: 'Bioquimica', description: 'Proteina hepatica' },
  { name: 'Proteinas totais e fracoes', code: '40302415', examType: 'LABORATORY', category: 'Bioquimica', description: 'Albumina e globulinas' },
  { name: 'Beta-HCG quantitativo', code: '40316092', examType: 'LABORATORY', category: 'Hormonios', description: 'Teste de gravidez quantitativo' },
  { name: 'PSA total', code: '40316386', examType: 'LABORATORY', category: 'Hormonios', description: 'Antigeno prostatico especifico' },
  { name: 'Vitamina D (25-OH)', code: '40316572', examType: 'LABORATORY', category: 'Hormonios', description: '25-hidroxivitamina D' },
  { name: 'Vitamina B12', code: '40316564', examType: 'LABORATORY', category: 'Bioquimica', description: 'Cobalamina' },
  { name: 'Acido folico', code: '40316017', examType: 'LABORATORY', category: 'Bioquimica', description: 'Folato serico' },
  { name: 'Reticulocitos', code: '40304310', examType: 'LABORATORY', category: 'Hematologia', description: 'Contagem de reticulocitos' },
  { name: 'Coombs direto', code: '40306089', examType: 'LABORATORY', category: 'Imunohematologia', description: 'Teste de antiglobulina direto' },
  { name: 'Tipagem sanguinea (ABO+Rh)', code: '40306011', examType: 'LABORATORY', category: 'Imunohematologia', description: 'Grupo sanguineo e fator Rh' },
  { name: 'Procalcitonina', code: '40308600', examType: 'LABORATORY', category: 'Imunologia', description: 'Marcador de infeccao bacteriana' },
  { name: 'Cultura de secrecao', code: '40310108', examType: 'LABORATORY', category: 'Microbiologia', description: 'Cultura com antibiograma' },
  { name: 'Parasitologico de fezes (EPF)', code: '40311031', examType: 'LABORATORY', category: 'Parasitologia', description: 'Exame parasitologico' },
  { name: 'Pesquisa de sangue oculto nas fezes', code: '40311040', examType: 'LABORATORY', category: 'Fezes', description: 'Rastreio de sangramento GI' },
  { name: 'Curva glicemica (TOTG 75g)', code: '40302059', examType: 'LABORATORY', category: 'Bioquimica', description: 'Teste oral de tolerancia a glicose' },
  { name: 'Microalbuminuria', code: '40311147', examType: 'LABORATORY', category: 'Urinanalise', description: 'Deteccao precoce de nefropatia' },
  { name: 'Clearance de creatinina', code: '40311090', examType: 'LABORATORY', category: 'Urinanalise', description: 'Taxa de filtracao glomerular' },

  // ── Imagem (25) ────────────────────────────────────────────
  { name: 'Radiografia de torax PA', code: '40801020', examType: 'IMAGING', category: 'Radiologia', description: 'RX torax incidencia posteroanterior' },
  { name: 'Radiografia de torax PA e perfil', code: '40801039', examType: 'IMAGING', category: 'Radiologia', description: 'RX torax duas incidencias' },
  { name: 'Tomografia computadorizada de cranio', code: '41001010', examType: 'IMAGING', category: 'Tomografia', description: 'TC cranio sem contraste' },
  { name: 'Tomografia computadorizada de torax', code: '41001052', examType: 'IMAGING', category: 'Tomografia', description: 'TC torax sem contraste' },
  { name: 'Tomografia computadorizada de abdome total', code: '41001079', examType: 'IMAGING', category: 'Tomografia', description: 'TC abdome e pelve' },
  { name: 'Ultrassonografia de abdome total', code: '40901017', examType: 'IMAGING', category: 'Ultrassonografia', description: 'USG abdome superior e inferior' },
  { name: 'Ultrassonografia obstetrica', code: '40901050', examType: 'IMAGING', category: 'Ultrassonografia', description: 'USG obstetrica morfologica' },
  { name: 'Ultrassonografia de tireoide', code: '40901076', examType: 'IMAGING', category: 'Ultrassonografia', description: 'USG cervical para tireoide' },
  { name: 'Ultrassonografia de mama bilateral', code: '40901041', examType: 'IMAGING', category: 'Ultrassonografia', description: 'USG mamaria' },
  { name: 'Ultrassonografia de vias urinarias', code: '40901084', examType: 'IMAGING', category: 'Ultrassonografia', description: 'USG rins e bexiga' },
  { name: 'Ressonancia magnetica de coluna lombar', code: '41101120', examType: 'IMAGING', category: 'Ressonancia', description: 'RNM coluna lombar' },
  { name: 'Ressonancia magnetica de cranio', code: '41101014', examType: 'IMAGING', category: 'Ressonancia', description: 'RNM encefalica' },
  { name: 'Ressonancia magnetica de joelho', code: '41101138', examType: 'IMAGING', category: 'Ressonancia', description: 'RNM articulacao do joelho' },
  { name: 'Ecocardiograma transtorácico', code: '40901025', examType: 'IMAGING', category: 'Ecocardiografia', description: 'Ecocardiograma com Doppler' },
  { name: 'Doppler venoso de membros inferiores', code: '40901092', examType: 'IMAGING', category: 'Ultrassonografia', description: 'Doppler venoso MMII bilateral' },
  { name: 'Doppler de carotidas e vertebrais', code: '40901106', examType: 'IMAGING', category: 'Ultrassonografia', description: 'Doppler vasos cervicais' },
  { name: 'Mamografia bilateral', code: '40801055', examType: 'IMAGING', category: 'Radiologia', description: 'Mamografia de rastreamento' },
  { name: 'Densitometria ossea', code: '40801047', examType: 'IMAGING', category: 'Radiologia', description: 'Avaliacao de densidade mineral ossea' },
  { name: 'Angiotomografia de torax', code: '41001060', examType: 'IMAGING', category: 'Tomografia', description: 'AngioTC para TEP' },
  { name: 'Radiografia de abdome agudo', code: '40801012', examType: 'IMAGING', category: 'Radiologia', description: 'RX abdome em 3 posicoes' },
  { name: 'Radiografia de coluna lombar', code: '40801071', examType: 'IMAGING', category: 'Radiologia', description: 'RX coluna lombar AP e perfil' },
  { name: 'Radiografia de mao e punho', code: '40801080', examType: 'IMAGING', category: 'Radiologia', description: 'RX mao/punho AP e obliqua' },
  { name: 'Tomografia de seios da face', code: '41001028', examType: 'IMAGING', category: 'Tomografia', description: 'TC seios paranasais' },
  { name: 'Ultrassonografia transvaginal', code: '40901068', examType: 'IMAGING', category: 'Ultrassonografia', description: 'USG endovaginal' },
  { name: 'Ultrassonografia de partes moles', code: '40901114', examType: 'IMAGING', category: 'Ultrassonografia', description: 'USG de partes moles localizada' },

  // ── Funcionais (15) ────────────────────────────────────────
  { name: 'Eletrocardiograma (ECG)', code: '40401014', examType: 'FUNCTIONAL', category: 'Cardiologia', description: 'ECG de repouso 12 derivacoes' },
  { name: 'Espirometria', code: '40501012', examType: 'FUNCTIONAL', category: 'Pneumologia', description: 'Prova de funcao pulmonar' },
  { name: 'Teste ergometrico', code: '40401022', examType: 'FUNCTIONAL', category: 'Cardiologia', description: 'Teste de esforco em esteira' },
  { name: 'Eletroencefalograma (EEG)', code: '40601013', examType: 'FUNCTIONAL', category: 'Neurologia', description: 'EEG de rotina com mapeamento' },
  { name: 'Holter 24 horas', code: '40401030', examType: 'FUNCTIONAL', category: 'Cardiologia', description: 'Monitorizacao eletrocardiografica contınua' },
  { name: 'MAPA 24 horas', code: '40401049', examType: 'FUNCTIONAL', category: 'Cardiologia', description: 'Monitorizacao ambulatorial de pressao arterial' },
  { name: 'Eletroneuromiografia (ENMG)', code: '40601021', examType: 'FUNCTIONAL', category: 'Neurologia', description: 'Estudo de conducao nervosa e eletromiografia' },
  { name: 'Polissonografia', code: '40601048', examType: 'FUNCTIONAL', category: 'Neurologia', description: 'Estudo do sono' },
  { name: 'Audiometria', code: '40701018', examType: 'FUNCTIONAL', category: 'Otorrinolaringologia', description: 'Avaliacao auditiva' },
  { name: 'Impedanciometria', code: '40701026', examType: 'FUNCTIONAL', category: 'Otorrinolaringologia', description: 'Timpanometria e reflexos acusticos' },
  { name: 'Endoscopia digestiva alta', code: '40201015', examType: 'FUNCTIONAL', category: 'Gastroenterologia', description: 'EDA com ou sem biopsia' },
  { name: 'Colonoscopia', code: '40201023', examType: 'FUNCTIONAL', category: 'Gastroenterologia', description: 'Colonoscopia com ou sem biopsia' },
  { name: 'Broncoscopia', code: '40201031', examType: 'FUNCTIONAL', category: 'Pneumologia', description: 'Broncoscopia flexivel' },
  { name: 'Cistoscopia', code: '40201058', examType: 'FUNCTIONAL', category: 'Urologia', description: 'Exame endoscopico da bexiga' },
  { name: 'Prova de funcao pulmonar completa', code: '40501020', examType: 'FUNCTIONAL', category: 'Pneumologia', description: 'Espirometria + volumes + difusao' },
];

export async function seedExams(prisma: PrismaClient, tenantId: string): Promise<number> {
  let count = 0;

  for (const exam of EXAM_CATALOG) {
    await prisma.examCatalog.upsert({
      where: { code: exam.code },
      update: {
        name: exam.name,
        examType: exam.examType,
        category: exam.category,
        description: exam.description,
        isActive: true,
        tenantId,
      },
      create: {
        name: exam.name,
        code: exam.code,
        examType: exam.examType,
        category: exam.category,
        description: exam.description,
        tenantId,
      },
    });
    count++;
  }

  return count;
}
