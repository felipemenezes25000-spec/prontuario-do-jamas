export interface ManchesterDiscriminator {
  id: string;
  flowchart: string;
  discriminator: string;
  level: 'RED' | 'ORANGE' | 'YELLOW' | 'GREEN' | 'BLUE';
  description: string;
}

export interface ManchesterFlowchart {
  name: string;
  nameEn: string;
  discriminators: ManchesterDiscriminator[];
}

export const MANCHESTER_FLOWCHARTS: readonly ManchesterFlowchart[] = [
  // ─── 1. Dor Torácica ───────────────────────────────────────────────
  {
    name: 'Dor Torácica',
    nameEn: 'Chest Pain',
    discriminators: [
      { id: 'DT-R1', flowchart: 'Dor Torácica', discriminator: 'Comprometimento da via aérea', level: 'RED', description: 'Via aérea comprometida ou em risco' },
      { id: 'DT-R2', flowchart: 'Dor Torácica', discriminator: 'Respiração inadequada', level: 'RED', description: 'Esforço respiratório severo ou apneia' },
      { id: 'DT-R3', flowchart: 'Dor Torácica', discriminator: 'Choque', level: 'RED', description: 'Sinais de choque circulatório' },
      { id: 'DT-O1', flowchart: 'Dor Torácica', discriminator: 'Dor precordial', level: 'ORANGE', description: 'Dor tipo opressiva/constritiva em região precordial' },
      { id: 'DT-O2', flowchart: 'Dor Torácica', discriminator: 'Dor pleurítica aguda', level: 'ORANGE', description: 'Dor pleurítica de início súbito' },
      { id: 'DT-O3', flowchart: 'Dor Torácica', discriminator: 'Sudorese', level: 'ORANGE', description: 'Sudorese profusa associada' },
      { id: 'DT-O4', flowchart: 'Dor Torácica', discriminator: 'Pulso anormal', level: 'ORANGE', description: 'Taquicardia >120 ou bradicardia <40' },
      { id: 'DT-Y1', flowchart: 'Dor Torácica', discriminator: 'Dor moderada', level: 'YELLOW', description: 'Dor torácica moderada sem sinais de gravidade' },
      { id: 'DT-Y2', flowchart: 'Dor Torácica', discriminator: 'Vômitos persistentes', level: 'YELLOW', description: 'Vômitos associados' },
      { id: 'DT-Y3', flowchart: 'Dor Torácica', discriminator: 'História cardíaca significativa', level: 'YELLOW', description: 'Antecedente de doença coronariana ou valvar' },
      { id: 'DT-G1', flowchart: 'Dor Torácica', discriminator: 'Dor leve recente', level: 'GREEN', description: 'Dor torácica leve, início recente' },
      { id: 'DT-G2', flowchart: 'Dor Torácica', discriminator: 'Problema recente', level: 'GREEN', description: 'Queixa há menos de 7 dias, sem piora' },
      { id: 'DT-B1', flowchart: 'Dor Torácica', discriminator: 'Problema menor', level: 'BLUE', description: 'Dor torácica crônica, sem alterações' },
    ],
  },

  // ─── 2. Dor Abdominal ──────────────────────────────────────────────
  {
    name: 'Dor Abdominal',
    nameEn: 'Abdominal Pain',
    discriminators: [
      { id: 'DA-R1', flowchart: 'Dor Abdominal', discriminator: 'Comprometimento da via aérea', level: 'RED', description: 'Via aérea comprometida' },
      { id: 'DA-R2', flowchart: 'Dor Abdominal', discriminator: 'Choque', level: 'RED', description: 'Sinais de choque' },
      { id: 'DA-R3', flowchart: 'Dor Abdominal', discriminator: 'Hemorragia exanguinante', level: 'RED', description: 'Hemorragia digestiva com instabilidade hemodinâmica' },
      { id: 'DA-O1', flowchart: 'Dor Abdominal', discriminator: 'Dor severa', level: 'ORANGE', description: 'Dor abdominal severa (EVA >= 7)' },
      { id: 'DA-O2', flowchart: 'Dor Abdominal', discriminator: 'Hematêmese', level: 'ORANGE', description: 'Vômito com sangue' },
      { id: 'DA-O3', flowchart: 'Dor Abdominal', discriminator: 'Melena/Enterorragia', level: 'ORANGE', description: 'Sangue nas fezes' },
      { id: 'DA-O4', flowchart: 'Dor Abdominal', discriminator: 'Possível gravidez ectópica', level: 'ORANGE', description: 'Mulher em idade fértil com dor abdominal aguda' },
      { id: 'DA-O5', flowchart: 'Dor Abdominal', discriminator: 'Abdome rígido', level: 'ORANGE', description: 'Defesa muscular involuntária ou abdome em tábua' },
      { id: 'DA-Y1', flowchart: 'Dor Abdominal', discriminator: 'Dor moderada', level: 'YELLOW', description: 'Dor abdominal moderada (EVA 4-6)' },
      { id: 'DA-Y2', flowchart: 'Dor Abdominal', discriminator: 'Vômitos persistentes', level: 'YELLOW', description: 'Vômitos repetidos' },
      { id: 'DA-Y3', flowchart: 'Dor Abdominal', discriminator: 'Febre', level: 'YELLOW', description: 'Temperatura >= 38.5°C associada' },
      { id: 'DA-G1', flowchart: 'Dor Abdominal', discriminator: 'Dor leve', level: 'GREEN', description: 'Dor abdominal leve' },
      { id: 'DA-G2', flowchart: 'Dor Abdominal', discriminator: 'Problema recente', level: 'GREEN', description: 'Início há menos de 7 dias' },
      { id: 'DA-B1', flowchart: 'Dor Abdominal', discriminator: 'Problema crônico', level: 'BLUE', description: 'Queixa crônica sem alterações' },
    ],
  },

  // ─── 3. Dispneia ───────────────────────────────────────────────────
  {
    name: 'Dispneia',
    nameEn: 'Shortness of Breath',
    discriminators: [
      { id: 'DI-R1', flowchart: 'Dispneia', discriminator: 'Comprometimento da via aérea', level: 'RED', description: 'Via aérea comprometida ou obstruída' },
      { id: 'DI-R2', flowchart: 'Dispneia', discriminator: 'Respiração inadequada', level: 'RED', description: 'FR < 8 ou > 40, apneia, esforço respiratório grave' },
      { id: 'DI-R3', flowchart: 'Dispneia', discriminator: 'Choque', level: 'RED', description: 'Sinais de choque circulatório' },
      { id: 'DI-R4', flowchart: 'Dispneia', discriminator: 'SpO2 muito baixa', level: 'RED', description: 'Saturação de oxigênio < 90%' },
      { id: 'DI-O1', flowchart: 'Dispneia', discriminator: 'SpO2 baixa', level: 'ORANGE', description: 'Saturação de oxigênio 90-94%' },
      { id: 'DI-O2', flowchart: 'Dispneia', discriminator: 'Estridor', level: 'ORANGE', description: 'Estridor inspiratório presente' },
      { id: 'DI-O3', flowchart: 'Dispneia', discriminator: 'Sibilância significativa', level: 'ORANGE', description: 'Sibilância audível com esforço respiratório' },
      { id: 'DI-O4', flowchart: 'Dispneia', discriminator: 'Incapacidade de falar frases completas', level: 'ORANGE', description: 'Dispneia que impede fala em frases' },
      { id: 'DI-O5', flowchart: 'Dispneia', discriminator: 'Dor pleurítica aguda', level: 'ORANGE', description: 'Dor torácica pleurítica de início súbito' },
      { id: 'DI-Y1', flowchart: 'Dispneia', discriminator: 'Dispneia moderada', level: 'YELLOW', description: 'Dispneia com esforço leve, SpO2 >= 95%' },
      { id: 'DI-Y2', flowchart: 'Dispneia', discriminator: 'Febre', level: 'YELLOW', description: 'Febre associada a quadro respiratório' },
      { id: 'DI-Y3', flowchart: 'Dispneia', discriminator: 'História significativa', level: 'YELLOW', description: 'Antecedente de DPOC, asma grave ou IC' },
      { id: 'DI-G1', flowchart: 'Dispneia', discriminator: 'Dispneia leve', level: 'GREEN', description: 'Dispneia leve aos grandes esforços' },
      { id: 'DI-G2', flowchart: 'Dispneia', discriminator: 'Tosse sem dispneia', level: 'GREEN', description: 'Tosse produtiva sem desconforto respiratório' },
      { id: 'DI-B1', flowchart: 'Dispneia', discriminator: 'Problema menor', level: 'BLUE', description: 'Queixa respiratória crônica sem piora' },
    ],
  },

  // ─── 4. Cefaleia ───────────────────────────────────────────────────
  {
    name: 'Cefaleia',
    nameEn: 'Headache',
    discriminators: [
      { id: 'CE-R1', flowchart: 'Cefaleia', discriminator: 'Comprometimento da via aérea', level: 'RED', description: 'Via aérea comprometida' },
      { id: 'CE-R2', flowchart: 'Cefaleia', discriminator: 'Respiração inadequada', level: 'RED', description: 'Padrão respiratório anormal' },
      { id: 'CE-R3', flowchart: 'Cefaleia', discriminator: 'Inconsciente', level: 'RED', description: 'Sem resposta, Glasgow <= 8' },
      { id: 'CE-O1', flowchart: 'Cefaleia', discriminator: 'Déficit neurológico agudo', level: 'ORANGE', description: 'Perda de força, fala ou visão de início súbito' },
      { id: 'CE-O2', flowchart: 'Cefaleia', discriminator: 'Cefaleia súbita severa', level: 'ORANGE', description: 'Pior cefaleia da vida, início em thunderclap' },
      { id: 'CE-O3', flowchart: 'Cefaleia', discriminator: 'Rigidez de nuca', level: 'ORANGE', description: 'Meningismo presente' },
      { id: 'CE-O4', flowchart: 'Cefaleia', discriminator: 'Febre alta com cefaleia', level: 'ORANGE', description: 'Temperatura >= 39°C com cefaleia intensa' },
      { id: 'CE-O5', flowchart: 'Cefaleia', discriminator: 'Alteração do nível de consciência', level: 'ORANGE', description: 'Sonolência, confusão ou agitação' },
      { id: 'CE-Y1', flowchart: 'Cefaleia', discriminator: 'Dor moderada', level: 'YELLOW', description: 'Cefaleia moderada (EVA 4-6)' },
      { id: 'CE-Y2', flowchart: 'Cefaleia', discriminator: 'Vômitos associados', level: 'YELLOW', description: 'Cefaleia com vômitos' },
      { id: 'CE-Y3', flowchart: 'Cefaleia', discriminator: 'História de HAS descontrolada', level: 'YELLOW', description: 'PA elevada com cefaleia' },
      { id: 'CE-G1', flowchart: 'Cefaleia', discriminator: 'Cefaleia leve', level: 'GREEN', description: 'Cefaleia leve, início recente' },
      { id: 'CE-G2', flowchart: 'Cefaleia', discriminator: 'Cefaleia recorrente conhecida', level: 'GREEN', description: 'Padrão similar a cefaleias prévias' },
      { id: 'CE-B1', flowchart: 'Cefaleia', discriminator: 'Problema menor', level: 'BLUE', description: 'Cefaleia crônica sem alterações' },
    ],
  },

  // ─── 5. Febre em Adulto ────────────────────────────────────────────
  {
    name: 'Febre em Adulto',
    nameEn: 'Fever in Adult',
    discriminators: [
      { id: 'FA-R1', flowchart: 'Febre em Adulto', discriminator: 'Comprometimento da via aérea', level: 'RED', description: 'Via aérea comprometida' },
      { id: 'FA-R2', flowchart: 'Febre em Adulto', discriminator: 'Respiração inadequada', level: 'RED', description: 'Esforço respiratório grave' },
      { id: 'FA-R3', flowchart: 'Febre em Adulto', discriminator: 'Choque', level: 'RED', description: 'Sinais de choque séptico' },
      { id: 'FA-O1', flowchart: 'Febre em Adulto', discriminator: 'Febre muito alta', level: 'ORANGE', description: 'Temperatura >= 40°C' },
      { id: 'FA-O2', flowchart: 'Febre em Adulto', discriminator: 'Petéquias / Púrpura', level: 'ORANGE', description: 'Rash petequial ou purpúrico não evanescente' },
      { id: 'FA-O3', flowchart: 'Febre em Adulto', discriminator: 'Rigidez de nuca', level: 'ORANGE', description: 'Meningismo com febre' },
      { id: 'FA-O4', flowchart: 'Febre em Adulto', discriminator: 'Imunossupressão com febre', level: 'ORANGE', description: 'Neutropenia febril ou imunossuprimido' },
      { id: 'FA-O5', flowchart: 'Febre em Adulto', discriminator: 'Dor severa associada', level: 'ORANGE', description: 'Dor intensa associada à febre' },
      { id: 'FA-Y1', flowchart: 'Febre em Adulto', discriminator: 'Febre alta', level: 'YELLOW', description: 'Temperatura 38.5-39.9°C' },
      { id: 'FA-Y2', flowchart: 'Febre em Adulto', discriminator: 'Dor moderada', level: 'YELLOW', description: 'Dor moderada associada à febre' },
      { id: 'FA-Y3', flowchart: 'Febre em Adulto', discriminator: 'Febre por > 5 dias', level: 'YELLOW', description: 'Febre persistente por mais de 5 dias' },
      { id: 'FA-G1', flowchart: 'Febre em Adulto', discriminator: 'Febre baixa', level: 'GREEN', description: 'Temperatura 37.5-38.4°C sem sinais de alerta' },
      { id: 'FA-G2', flowchart: 'Febre em Adulto', discriminator: 'Problema recente', level: 'GREEN', description: 'Febre há menos de 48 horas' },
      { id: 'FA-B1', flowchart: 'Febre em Adulto', discriminator: 'Problema menor', level: 'BLUE', description: 'Febre baixa com quadro gripal leve' },
    ],
  },

  // ─── 6. Febre em Criança ───────────────────────────────────────────
  {
    name: 'Febre em Criança',
    nameEn: 'Fever in Child',
    discriminators: [
      { id: 'FC-R1', flowchart: 'Febre em Criança', discriminator: 'Comprometimento da via aérea', level: 'RED', description: 'Via aérea comprometida' },
      { id: 'FC-R2', flowchart: 'Febre em Criança', discriminator: 'Respiração inadequada', level: 'RED', description: 'Esforço respiratório grave' },
      { id: 'FC-R3', flowchart: 'Febre em Criança', discriminator: 'Criança não responsiva', level: 'RED', description: 'Sem resposta a estímulos' },
      { id: 'FC-R4', flowchart: 'Febre em Criança', discriminator: 'Convulsão ativa', level: 'RED', description: 'Convulsão em andamento' },
      { id: 'FC-O1', flowchart: 'Febre em Criança', discriminator: 'Neonato com febre', level: 'ORANGE', description: 'Idade < 28 dias com temperatura >= 38°C' },
      { id: 'FC-O2', flowchart: 'Febre em Criança', discriminator: 'Petéquias / Púrpura', level: 'ORANGE', description: 'Rash petequial ou purpúrico' },
      { id: 'FC-O3', flowchart: 'Febre em Criança', discriminator: 'Lactente < 3 meses com febre', level: 'ORANGE', description: 'Idade 28 dias a 3 meses com temperatura >= 38°C' },
      { id: 'FC-O4', flowchart: 'Febre em Criança', discriminator: 'Febre muito alta', level: 'ORANGE', description: 'Temperatura >= 40°C em criança' },
      { id: 'FC-O5', flowchart: 'Febre em Criança', discriminator: 'Prostração', level: 'ORANGE', description: 'Criança prostrada, hipotônica ou irritável' },
      { id: 'FC-Y1', flowchart: 'Febre em Criança', discriminator: 'Febre alta', level: 'YELLOW', description: 'Temperatura 38.5-39.9°C em criança > 3 meses' },
      { id: 'FC-Y2', flowchart: 'Febre em Criança', discriminator: 'Febre > 5 dias', level: 'YELLOW', description: 'Febre persistente por mais de 5 dias' },
      { id: 'FC-Y3', flowchart: 'Febre em Criança', discriminator: 'Imunossupressão', level: 'YELLOW', description: 'Criança imunossuprimida com febre' },
      { id: 'FC-G1', flowchart: 'Febre em Criança', discriminator: 'Febre baixa', level: 'GREEN', description: 'Temperatura 37.5-38.4°C, criança ativa' },
      { id: 'FC-G2', flowchart: 'Febre em Criança', discriminator: 'Problema recente', level: 'GREEN', description: 'Febre há menos de 48 horas, criança bem' },
      { id: 'FC-B1', flowchart: 'Febre em Criança', discriminator: 'Problema menor', level: 'BLUE', description: 'Febre baixa resolvida, criança bem' },
    ],
  },

  // ─── 7. Convulsão ──────────────────────────────────────────────────
  {
    name: 'Convulsão',
    nameEn: 'Seizure',
    discriminators: [
      { id: 'CO-R1', flowchart: 'Convulsão', discriminator: 'Comprometimento da via aérea', level: 'RED', description: 'Via aérea comprometida' },
      { id: 'CO-R2', flowchart: 'Convulsão', discriminator: 'Respiração inadequada', level: 'RED', description: 'Apneia ou hipoventilação grave' },
      { id: 'CO-R3', flowchart: 'Convulsão', discriminator: 'Convulsão ativa', level: 'RED', description: 'Convulsão em andamento (status epilepticus)' },
      { id: 'CO-R4', flowchart: 'Convulsão', discriminator: 'Inconsciente', level: 'RED', description: 'Sem resposta após convulsão' },
      { id: 'CO-O1', flowchart: 'Convulsão', discriminator: 'Pós-ictal com alteração da consciência', level: 'ORANGE', description: 'Confusão mental persistente pós-ictal' },
      { id: 'CO-O2', flowchart: 'Convulsão', discriminator: 'Déficit neurológico pós-ictal', level: 'ORANGE', description: 'Paralisia de Todd ou outro déficit focal' },
      { id: 'CO-O3', flowchart: 'Convulsão', discriminator: 'Primeira convulsão', level: 'ORANGE', description: 'Primeiro episódio convulsivo na vida' },
      { id: 'CO-O4', flowchart: 'Convulsão', discriminator: 'Hipoglicemia', level: 'ORANGE', description: 'Glicemia capilar < 60 mg/dL' },
      { id: 'CO-Y1', flowchart: 'Convulsão', discriminator: 'Epiléptico com convulsão habitual', level: 'YELLOW', description: 'Crise convulsiva em epiléptico conhecido, recuperado' },
      { id: 'CO-Y2', flowchart: 'Convulsão', discriminator: 'Febre em criança após convulsão', level: 'YELLOW', description: 'Convulsão febril em criança, recuperada' },
      { id: 'CO-Y3', flowchart: 'Convulsão', discriminator: 'Cefaleia pós-ictal', level: 'YELLOW', description: 'Cefaleia intensa após convulsão' },
      { id: 'CO-G1', flowchart: 'Convulsão', discriminator: 'Epiléptico sem crise recente', level: 'GREEN', description: 'Epiléptico com dúvida sobre ajuste medicamentoso' },
      { id: 'CO-B1', flowchart: 'Convulsão', discriminator: 'Problema menor', level: 'BLUE', description: 'Consulta de rotina para epilepsia controlada' },
    ],
  },

  // ─── 8. Trauma Crânio ──────────────────────────────────────────────
  {
    name: 'Trauma Crânio',
    nameEn: 'Head Trauma',
    discriminators: [
      { id: 'TC-R1', flowchart: 'Trauma Crânio', discriminator: 'Comprometimento da via aérea', level: 'RED', description: 'Via aérea comprometida' },
      { id: 'TC-R2', flowchart: 'Trauma Crânio', discriminator: 'Respiração inadequada', level: 'RED', description: 'Padrão respiratório anormal' },
      { id: 'TC-R3', flowchart: 'Trauma Crânio', discriminator: 'Inconsciente', level: 'RED', description: 'Glasgow <= 8' },
      { id: 'TC-R4', flowchart: 'Trauma Crânio', discriminator: 'Hemorragia exanguinante', level: 'RED', description: 'Sangramento ativo grave do couro cabeludo' },
      { id: 'TC-O1', flowchart: 'Trauma Crânio', discriminator: 'Alteração do nível de consciência', level: 'ORANGE', description: 'Glasgow 9-13' },
      { id: 'TC-O2', flowchart: 'Trauma Crânio', discriminator: 'Déficit neurológico focal', level: 'ORANGE', description: 'Assimetria pupilar, paresia, afasia' },
      { id: 'TC-O3', flowchart: 'Trauma Crânio', discriminator: 'Fratura de crânio aparente', level: 'ORANGE', description: 'Depressão óssea palpável ou sinais de fratura de base' },
      { id: 'TC-O4', flowchart: 'Trauma Crânio', discriminator: 'Convulsão pós-trauma', level: 'ORANGE', description: 'Convulsão após TCE' },
      { id: 'TC-O5', flowchart: 'Trauma Crânio', discriminator: 'Mecanismo de alta energia', level: 'ORANGE', description: 'Queda > 3m, acidente veicular > 60 km/h, ejeção' },
      { id: 'TC-Y1', flowchart: 'Trauma Crânio', discriminator: 'Glasgow 14', level: 'YELLOW', description: 'Glasgow 14 com cefaleia' },
      { id: 'TC-Y2', flowchart: 'Trauma Crânio', discriminator: 'Vômitos pós-trauma', level: 'YELLOW', description: 'Mais de 1 episódio de vômito após TCE' },
      { id: 'TC-Y3', flowchart: 'Trauma Crânio', discriminator: 'Uso de anticoagulante', level: 'YELLOW', description: 'Paciente em uso de anticoagulante que sofreu TCE' },
      { id: 'TC-Y4', flowchart: 'Trauma Crânio', discriminator: 'Perda de consciência breve', level: 'YELLOW', description: 'Perda de consciência < 5 min com recuperação completa' },
      { id: 'TC-G1', flowchart: 'Trauma Crânio', discriminator: 'TCE leve sem sinais de alerta', level: 'GREEN', description: 'Glasgow 15, sem perda de consciência, sem vômitos' },
      { id: 'TC-G2', flowchart: 'Trauma Crânio', discriminator: 'Ferimento superficial do couro cabeludo', level: 'GREEN', description: 'Escoriação ou laceração pequena, sem sinais neurológicos' },
      { id: 'TC-B1', flowchart: 'Trauma Crânio', discriminator: 'Problema menor', level: 'BLUE', description: 'Trauma leve sem queixas significativas' },
    ],
  },

  // ─── 9. Queda ──────────────────────────────────────────────────────
  {
    name: 'Queda',
    nameEn: 'Falls',
    discriminators: [
      { id: 'QU-R1', flowchart: 'Queda', discriminator: 'Comprometimento da via aérea', level: 'RED', description: 'Via aérea comprometida' },
      { id: 'QU-R2', flowchart: 'Queda', discriminator: 'Respiração inadequada', level: 'RED', description: 'Esforço respiratório grave após queda' },
      { id: 'QU-R3', flowchart: 'Queda', discriminator: 'Choque', level: 'RED', description: 'Sinais de choque (hemorragia interna)' },
      { id: 'QU-R4', flowchart: 'Queda', discriminator: 'Inconsciente', level: 'RED', description: 'Sem resposta após queda' },
      { id: 'QU-O1', flowchart: 'Queda', discriminator: 'Queda de grande altura', level: 'ORANGE', description: 'Queda de mais de 3 metros ou 2 andares' },
      { id: 'QU-O2', flowchart: 'Queda', discriminator: 'Deformidade de membro', level: 'ORANGE', description: 'Deformidade óbvia ou fratura exposta' },
      { id: 'QU-O3', flowchart: 'Queda', discriminator: 'Déficit neurológico', level: 'ORANGE', description: 'Perda de sensibilidade ou força após queda' },
      { id: 'QU-O4', flowchart: 'Queda', discriminator: 'Dor severa', level: 'ORANGE', description: 'Dor intensa (EVA >= 7)' },
      { id: 'QU-O5', flowchart: 'Queda', discriminator: 'Lesão de coluna suspeita', level: 'ORANGE', description: 'Dor cervical ou dorsal com mecanismo compatível' },
      { id: 'QU-Y1', flowchart: 'Queda', discriminator: 'Dor moderada', level: 'YELLOW', description: 'Dor moderada com limitação funcional' },
      { id: 'QU-Y2', flowchart: 'Queda', discriminator: 'Idoso com queda', level: 'YELLOW', description: 'Idade > 65 anos com queda da própria altura' },
      { id: 'QU-Y3', flowchart: 'Queda', discriminator: 'Uso de anticoagulante', level: 'YELLOW', description: 'Em uso de anticoagulante com trauma' },
      { id: 'QU-G1', flowchart: 'Queda', discriminator: 'Queda simples', level: 'GREEN', description: 'Queda da própria altura sem sinais de gravidade' },
      { id: 'QU-G2', flowchart: 'Queda', discriminator: 'Dor leve', level: 'GREEN', description: 'Dor leve, deambulando sem dificuldade' },
      { id: 'QU-B1', flowchart: 'Queda', discriminator: 'Problema menor', level: 'BLUE', description: 'Queda sem queixas, sem lesão aparente' },
    ],
  },

  // ─── 10. Dor Lombar ────────────────────────────────────────────────
  {
    name: 'Dor Lombar',
    nameEn: 'Back Pain',
    discriminators: [
      { id: 'DL-R1', flowchart: 'Dor Lombar', discriminator: 'Comprometimento da via aérea', level: 'RED', description: 'Via aérea comprometida' },
      { id: 'DL-R2', flowchart: 'Dor Lombar', discriminator: 'Choque', level: 'RED', description: 'Sinais de choque (dissecção/ruptura de aorta)' },
      { id: 'DL-O1', flowchart: 'Dor Lombar', discriminator: 'Síndrome da cauda equina', level: 'ORANGE', description: 'Retenção urinária, anestesia em sela, perda de controle esfincteriano' },
      { id: 'DL-O2', flowchart: 'Dor Lombar', discriminator: 'Déficit motor progressivo', level: 'ORANGE', description: 'Perda de força progressiva em membros inferiores' },
      { id: 'DL-O3', flowchart: 'Dor Lombar', discriminator: 'Dor severa', level: 'ORANGE', description: 'Dor lombar severa (EVA >= 7)' },
      { id: 'DL-O4', flowchart: 'Dor Lombar', discriminator: 'Dor abdominal pulsátil', level: 'ORANGE', description: 'Dor lombar + massa abdominal pulsátil (aneurisma)' },
      { id: 'DL-Y1', flowchart: 'Dor Lombar', discriminator: 'Dor moderada', level: 'YELLOW', description: 'Dor lombar moderada (EVA 4-6)' },
      { id: 'DL-Y2', flowchart: 'Dor Lombar', discriminator: 'Ciatalgia', level: 'YELLOW', description: 'Dor irradiada para membro inferior' },
      { id: 'DL-Y3', flowchart: 'Dor Lombar', discriminator: 'Febre associada', level: 'YELLOW', description: 'Febre com dor lombar (espondilodiscite?)' },
      { id: 'DL-Y4', flowchart: 'Dor Lombar', discriminator: 'Antecedente oncológico', level: 'YELLOW', description: 'Dor lombar em paciente com história de câncer' },
      { id: 'DL-G1', flowchart: 'Dor Lombar', discriminator: 'Dor leve', level: 'GREEN', description: 'Lombalgia leve sem irradiação' },
      { id: 'DL-G2', flowchart: 'Dor Lombar', discriminator: 'Problema recente', level: 'GREEN', description: 'Lombalgia aguda há menos de 48 horas' },
      { id: 'DL-B1', flowchart: 'Dor Lombar', discriminator: 'Problema crônico', level: 'BLUE', description: 'Lombalgia crônica sem alterações' },
    ],
  },

  // ─── 11. Síncope / Desmaio ─────────────────────────────────────────
  {
    name: 'Síncope/Desmaio',
    nameEn: 'Syncope/Collapse',
    discriminators: [
      { id: 'SI-R1', flowchart: 'Síncope/Desmaio', discriminator: 'Comprometimento da via aérea', level: 'RED', description: 'Via aérea comprometida' },
      { id: 'SI-R2', flowchart: 'Síncope/Desmaio', discriminator: 'Respiração inadequada', level: 'RED', description: 'Esforço respiratório grave' },
      { id: 'SI-R3', flowchart: 'Síncope/Desmaio', discriminator: 'Inconsciente', level: 'RED', description: 'Sem resposta, não recuperou consciência' },
      { id: 'SI-R4', flowchart: 'Síncope/Desmaio', discriminator: 'Sem pulso', level: 'RED', description: 'Ausência de pulso (PCR)' },
      { id: 'SI-O1', flowchart: 'Síncope/Desmaio', discriminator: 'Dor torácica associada', level: 'ORANGE', description: 'Síncope precedida ou seguida de dor precordial' },
      { id: 'SI-O2', flowchart: 'Síncope/Desmaio', discriminator: 'Arritmia detectada', level: 'ORANGE', description: 'Pulso irregular ou extremos de frequência' },
      { id: 'SI-O3', flowchart: 'Síncope/Desmaio', discriminator: 'Síncope durante exercício', level: 'ORANGE', description: 'Perda de consciência durante esforço físico' },
      { id: 'SI-O4', flowchart: 'Síncope/Desmaio', discriminator: 'Déficit neurológico', level: 'ORANGE', description: 'Déficit focal associado à síncope' },
      { id: 'SI-O5', flowchart: 'Síncope/Desmaio', discriminator: 'Hipotensão significativa', level: 'ORANGE', description: 'PAS < 90 mmHg persistente' },
      { id: 'SI-Y1', flowchart: 'Síncope/Desmaio', discriminator: 'Síncope com recuperação', level: 'YELLOW', description: 'Síncope com recuperação completa da consciência' },
      { id: 'SI-Y2', flowchart: 'Síncope/Desmaio', discriminator: 'Síncope em cardiopata', level: 'YELLOW', description: 'Antecedente de cardiopatia' },
      { id: 'SI-Y3', flowchart: 'Síncope/Desmaio', discriminator: 'Uso de medicamentos hipotensores', level: 'YELLOW', description: 'Uso de anti-hipertensivos ou diuréticos' },
      { id: 'SI-G1', flowchart: 'Síncope/Desmaio', discriminator: 'Síncope vasovagal típica', level: 'GREEN', description: 'Síncope situacional com pródromos típicos' },
      { id: 'SI-G2', flowchart: 'Síncope/Desmaio', discriminator: 'Pré-síncope', level: 'GREEN', description: 'Sensação de desmaio sem perda de consciência' },
      { id: 'SI-B1', flowchart: 'Síncope/Desmaio', discriminator: 'Problema menor', level: 'BLUE', description: 'Tontura leve crônica' },
    ],
  },

  // ─── 12. Reação Alérgica ───────────────────────────────────────────
  {
    name: 'Reação Alérgica',
    nameEn: 'Allergic Reaction',
    discriminators: [
      { id: 'RA-R1', flowchart: 'Reação Alérgica', discriminator: 'Comprometimento da via aérea', level: 'RED', description: 'Edema de via aérea, estridor, rouquidão' },
      { id: 'RA-R2', flowchart: 'Reação Alérgica', discriminator: 'Respiração inadequada', level: 'RED', description: 'Broncoespasmo grave, SpO2 < 90%' },
      { id: 'RA-R3', flowchart: 'Reação Alérgica', discriminator: 'Choque anafilático', level: 'RED', description: 'Hipotensão, taquicardia, má perfusão' },
      { id: 'RA-O1', flowchart: 'Reação Alérgica', discriminator: 'Edema de face/lábios/língua', level: 'ORANGE', description: 'Angioedema de face ou orofaringe' },
      { id: 'RA-O2', flowchart: 'Reação Alérgica', discriminator: 'Sibilância', level: 'ORANGE', description: 'Sibilância ou estridor associado a alergia' },
      { id: 'RA-O3', flowchart: 'Reação Alérgica', discriminator: 'Dispneia', level: 'ORANGE', description: 'Dificuldade respiratória após exposição a alérgeno' },
      { id: 'RA-O4', flowchart: 'Reação Alérgica', discriminator: 'Urticária generalizada com sintomas sistêmicos', level: 'ORANGE', description: 'Urticária difusa + náusea, tontura ou dispneia' },
      { id: 'RA-Y1', flowchart: 'Reação Alérgica', discriminator: 'Urticária generalizada', level: 'YELLOW', description: 'Urticária disseminada sem sintomas sistêmicos' },
      { id: 'RA-Y2', flowchart: 'Reação Alérgica', discriminator: 'Edema localizado', level: 'YELLOW', description: 'Angioedema de extremidade sem dispneia' },
      { id: 'RA-Y3', flowchart: 'Reação Alérgica', discriminator: 'Prurido intenso', level: 'YELLOW', description: 'Prurido generalizado intenso' },
      { id: 'RA-G1', flowchart: 'Reação Alérgica', discriminator: 'Urticária localizada', level: 'GREEN', description: 'Urticária localizada sem progressão' },
      { id: 'RA-G2', flowchart: 'Reação Alérgica', discriminator: 'Prurido leve', level: 'GREEN', description: 'Prurido localizado, leve' },
      { id: 'RA-B1', flowchart: 'Reação Alérgica', discriminator: 'Problema menor', level: 'BLUE', description: 'Reação alérgica leve crônica/recorrente' },
    ],
  },

  // ─── 13. Gestante com Queixas ──────────────────────────────────────
  {
    name: 'Gestante com Queixas',
    nameEn: 'Pregnancy Complaints',
    discriminators: [
      { id: 'GE-R1', flowchart: 'Gestante com Queixas', discriminator: 'Comprometimento da via aérea', level: 'RED', description: 'Via aérea comprometida' },
      { id: 'GE-R2', flowchart: 'Gestante com Queixas', discriminator: 'Respiração inadequada', level: 'RED', description: 'Esforço respiratório grave' },
      { id: 'GE-R3', flowchart: 'Gestante com Queixas', discriminator: 'Choque', level: 'RED', description: 'Sinais de choque hemorrágico' },
      { id: 'GE-R4', flowchart: 'Gestante com Queixas', discriminator: 'Convulsão / Eclâmpsia', level: 'RED', description: 'Convulsão na gestação' },
      { id: 'GE-R5', flowchart: 'Gestante com Queixas', discriminator: 'Parto iminente com complicação', level: 'RED', description: 'Prolapso de cordão ou apresentação anômala em expulsão' },
      { id: 'GE-O1', flowchart: 'Gestante com Queixas', discriminator: 'Hemorragia vaginal significativa', level: 'ORANGE', description: 'Sangramento vaginal ativo e abundante' },
      { id: 'GE-O2', flowchart: 'Gestante com Queixas', discriminator: 'PA muito elevada', level: 'ORANGE', description: 'PA >= 160/110 mmHg' },
      { id: 'GE-O3', flowchart: 'Gestante com Queixas', discriminator: 'Dor abdominal severa', level: 'ORANGE', description: 'Dor abdominal intensa (DPP, ruptura uterina)' },
      { id: 'GE-O4', flowchart: 'Gestante com Queixas', discriminator: 'Parto iminente', level: 'ORANGE', description: 'Contrações fortes e frequentes, puxo' },
      { id: 'GE-O5', flowchart: 'Gestante com Queixas', discriminator: 'Perda de líquido amniótico com febre', level: 'ORANGE', description: 'Rotura prematura de membranas com sinais de infecção' },
      { id: 'GE-Y1', flowchart: 'Gestante com Queixas', discriminator: 'PA elevada', level: 'YELLOW', description: 'PA 140/90 a 159/109 mmHg' },
      { id: 'GE-Y2', flowchart: 'Gestante com Queixas', discriminator: 'Sangramento vaginal leve', level: 'YELLOW', description: 'Sangramento vaginal discreto sem instabilidade' },
      { id: 'GE-Y3', flowchart: 'Gestante com Queixas', discriminator: 'Contrações regulares', level: 'YELLOW', description: 'Trabalho de parto em andamento' },
      { id: 'GE-Y4', flowchart: 'Gestante com Queixas', discriminator: 'Perda de líquido amniótico', level: 'YELLOW', description: 'Rotura de membranas sem sinais de infecção' },
      { id: 'GE-Y5', flowchart: 'Gestante com Queixas', discriminator: 'Diminuição dos movimentos fetais', level: 'YELLOW', description: 'Percepção de redução dos movimentos do bebê' },
      { id: 'GE-G1', flowchart: 'Gestante com Queixas', discriminator: 'Queixas gestacionais comuns', level: 'GREEN', description: 'Náuseas, lombalgia, edema leve' },
      { id: 'GE-G2', flowchart: 'Gestante com Queixas', discriminator: 'Contrações esporádicas', level: 'GREEN', description: 'Contrações de Braxton-Hicks' },
      { id: 'GE-B1', flowchart: 'Gestante com Queixas', discriminator: 'Problema menor', level: 'BLUE', description: 'Queixas leves, rotineiras da gravidez' },
    ],
  },
] as const;

/**
 * Helper: retorna todos os discriminadores de um determinado nível.
 */
export function getDiscriminatorsByLevel(
  level: ManchesterDiscriminator['level'],
): ManchesterDiscriminator[] {
  return MANCHESTER_FLOWCHARTS.flatMap((f) =>
    f.discriminators.filter((d) => d.level === level),
  );
}

/**
 * Helper: busca fluxograma pelo nome.
 */
export function getFlowchartByName(
  name: string,
): ManchesterFlowchart | undefined {
  return MANCHESTER_FLOWCHARTS.find(
    (f) => f.name.toLowerCase() === name.toLowerCase(),
  );
}
