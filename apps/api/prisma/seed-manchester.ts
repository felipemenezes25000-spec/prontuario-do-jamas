/**
 * Manchester Triage System — Seed data with 15 real flowcharts
 *
 * Each flowchart contains discriminators ordered from highest severity (RED)
 * down to lowest (BLUE). The discriminator structure follows:
 * { question: string, yesLevel: TriageLevel, noNext: boolean }
 *
 * Usage: import { seedManchester } from './seed-manchester' and call it from seed.ts
 */

import { PrismaClient, Prisma } from '@prisma/client';

interface Discriminator {
  question: string;
  yesLevel: 'RED' | 'ORANGE' | 'YELLOW' | 'GREEN' | 'BLUE';
  noNext: boolean;
}

interface FlowchartSeed {
  name: string;
  code: string;
  category: string;
  discriminators: Discriminator[];
}

const FLOWCHARTS: FlowchartSeed[] = [
  // 1. Dor Torácica
  {
    name: 'Dor Torácica',
    code: 'DOR_TORACICA',
    category: 'CARDIO',
    discriminators: [
      { question: 'Via aérea comprometida ou respiração inadequada?', yesLevel: 'RED', noNext: true },
      { question: 'Choque (pele fria, sudorese, hipotensão)?', yesLevel: 'RED', noNext: true },
      { question: 'Dor torácica com irradiação para membro superior esquerdo, mandíbula ou dorso?', yesLevel: 'ORANGE', noNext: true },
      { question: 'Dor precordial tipo opressiva ou em aperto?', yesLevel: 'ORANGE', noNext: true },
      { question: 'Dispneia associada à dor torácica?', yesLevel: 'ORANGE', noNext: true },
      { question: 'Dor torácica pleurítica (piora com respiração)?', yesLevel: 'YELLOW', noNext: true },
      { question: 'Dor torácica com início há menos de 12 horas?', yesLevel: 'YELLOW', noNext: true },
      { question: 'Dor torácica leve, sem fatores de risco cardiovascular?', yesLevel: 'GREEN', noNext: true },
      { question: 'Dor musculoesquelética pós-esforço ou trauma menor?', yesLevel: 'BLUE', noNext: false },
    ],
  },
  // 2. Dispneia
  {
    name: 'Dispneia',
    code: 'DISPNEIA',
    category: 'RESPIRATORY',
    discriminators: [
      { question: 'Via aérea comprometida?', yesLevel: 'RED', noNext: true },
      { question: 'Respiração inadequada (apneia, gasping, SpO2 < 90%)?', yesLevel: 'RED', noNext: true },
      { question: 'Estridor ou sibilância severa com uso de musculatura acessória?', yesLevel: 'ORANGE', noNext: true },
      { question: 'Incapacidade de completar frases?', yesLevel: 'ORANGE', noNext: true },
      { question: 'SpO2 entre 90-94% em ar ambiente?', yesLevel: 'ORANGE', noNext: true },
      { question: 'Dispneia moderada com taquipneia (FR > 25)?', yesLevel: 'YELLOW', noNext: true },
      { question: 'Dispneia aos mínimos esforços?', yesLevel: 'YELLOW', noNext: true },
      { question: 'Dispneia apenas aos grandes esforços?', yesLevel: 'GREEN', noNext: true },
      { question: 'Queixa subjetiva de falta de ar sem alterações ao exame?', yesLevel: 'BLUE', noNext: false },
    ],
  },
  // 3. Dor Abdominal
  {
    name: 'Dor Abdominal',
    code: 'DOR_ABDOMINAL',
    category: 'GASTRO',
    discriminators: [
      { question: 'Choque ou hipotensão (PAS < 90 mmHg)?', yesLevel: 'RED', noNext: true },
      { question: 'Dor abdominal com rigidez de parede (abdome em tábua)?', yesLevel: 'RED', noNext: true },
      { question: 'Dor abdominal intensa (EVA >= 8) com vômitos persistentes?', yesLevel: 'ORANGE', noNext: true },
      { question: 'Dor abdominal com sinais de peritonismo (Blumberg+)?', yesLevel: 'ORANGE', noNext: true },
      { question: 'Hematêmese ou melena associada?', yesLevel: 'ORANGE', noNext: true },
      { question: 'Dor abdominal moderada (EVA 4-7) com febre?', yesLevel: 'YELLOW', noNext: true },
      { question: 'Dor abdominal em cólica sem sinais de alarme?', yesLevel: 'YELLOW', noNext: true },
      { question: 'Dor abdominal leve, localizada, sem alteração de sinais vitais?', yesLevel: 'GREEN', noNext: true },
      { question: 'Desconforto abdominal crônico, sem mudança recente no padrão?', yesLevel: 'BLUE', noNext: false },
    ],
  },
  // 4. Cefaleia
  {
    name: 'Cefaleia',
    code: 'CEFALEIA',
    category: 'NEURO',
    discriminators: [
      { question: 'Alteração do nível de consciência (Glasgow < 13)?', yesLevel: 'RED', noNext: true },
      { question: 'Convulsão ativa?', yesLevel: 'RED', noNext: true },
      { question: 'Cefaleia de início súbito ("a pior dor de cabeça da vida")?', yesLevel: 'ORANGE', noNext: true },
      { question: 'Rigidez de nuca ou sinais meníngeos?', yesLevel: 'ORANGE', noNext: true },
      { question: 'Déficit neurológico focal agudo?', yesLevel: 'ORANGE', noNext: true },
      { question: 'Cefaleia intensa com febre elevada (> 39°C)?', yesLevel: 'YELLOW', noNext: true },
      { question: 'Cefaleia intensa (EVA >= 7) sem sinais de alarme?', yesLevel: 'YELLOW', noNext: true },
      { question: 'Cefaleia moderada, padrão habitual, sem febre?', yesLevel: 'GREEN', noNext: true },
      { question: 'Cefaleia leve, crônica, sem mudança de padrão?', yesLevel: 'BLUE', noNext: false },
    ],
  },
  // 5. Febre
  {
    name: 'Febre',
    code: 'FEBRE',
    category: 'INFECTION',
    discriminators: [
      { question: 'Choque séptico (hipotensão + taquicardia + confusão)?', yesLevel: 'RED', noNext: true },
      { question: 'Temperatura > 40.5°C com alteração do nível de consciência?', yesLevel: 'RED', noNext: true },
      { question: 'Febre com petéquias ou púrpura (suspeita meningococcemia)?', yesLevel: 'ORANGE', noNext: true },
      { question: 'Febre com taquicardia (FC > 120) ou hipotensão?', yesLevel: 'ORANGE', noNext: true },
      { question: 'Imunossuprimido (HIV, quimioterapia, transplantado) com febre?', yesLevel: 'ORANGE', noNext: true },
      { question: 'Febre persistente > 48h sem foco identificado?', yesLevel: 'YELLOW', noNext: true },
      { question: 'Febre com sinais localizatórios (disúria, tosse produtiva)?', yesLevel: 'YELLOW', noNext: true },
      { question: 'Febre baixa (37.8-38.5°C) com bom estado geral?', yesLevel: 'GREEN', noNext: true },
      { question: 'Sensação febril sem febre aferida, bom estado geral?', yesLevel: 'BLUE', noNext: false },
    ],
  },
  // 6. Trauma de Extremidade
  {
    name: 'Trauma de Extremidade',
    code: 'TRAUMA_EXTREMIDADE',
    category: 'TRAUMA',
    discriminators: [
      { question: 'Hemorragia exsanguinante não controlada?', yesLevel: 'RED', noNext: true },
      { question: 'Ausência de pulso distal ao trauma?', yesLevel: 'RED', noNext: true },
      { question: 'Fratura exposta ou deformidade com comprometimento neurovascular?', yesLevel: 'ORANGE', noNext: true },
      { question: 'Amputação traumática?', yesLevel: 'ORANGE', noNext: true },
      { question: 'Síndrome compartimental (dor desproporcional, parestesia)?', yesLevel: 'ORANGE', noNext: true },
      { question: 'Deformidade angulada com dor intensa (EVA >= 7)?', yesLevel: 'YELLOW', noNext: true },
      { question: 'Incapacidade funcional do membro?', yesLevel: 'YELLOW', noNext: true },
      { question: 'Edema e dor moderada com mobilidade preservada?', yesLevel: 'GREEN', noNext: true },
      { question: 'Escoriação ou contusão leve sem limitação funcional?', yesLevel: 'BLUE', noNext: false },
    ],
  },
  // 7. Dor Lombar
  {
    name: 'Dor Lombar',
    code: 'DOR_LOMBAR',
    category: 'MUSCULOSKELETAL',
    discriminators: [
      { question: 'Perda do controle esfincteriano (síndrome da cauda equina)?', yesLevel: 'RED', noNext: true },
      { question: 'Déficit motor progressivo bilateral?', yesLevel: 'RED', noNext: true },
      { question: 'Dor lombar com febre e sinais de infecção espinhal?', yesLevel: 'ORANGE', noNext: true },
      { question: 'Ciatalgia hiperaguda com déficit motor?', yesLevel: 'ORANGE', noNext: true },
      { question: 'Dor lombar pós-trauma com suspeita de fratura vertebral?', yesLevel: 'ORANGE', noNext: true },
      { question: 'Dor lombar intensa (EVA >= 7) com irradiação para membro inferior?', yesLevel: 'YELLOW', noNext: true },
      { question: 'Lombalgia aguda com limitação funcional importante?', yesLevel: 'YELLOW', noNext: true },
      { question: 'Lombalgia mecânica sem sinais de alarme?', yesLevel: 'GREEN', noNext: true },
      { question: 'Lombalgia crônica sem mudança recente?', yesLevel: 'BLUE', noNext: false },
    ],
  },
  // 8. Mal-estar Geral
  {
    name: 'Mal-estar Geral',
    code: 'MAL_ESTAR',
    category: 'GENERAL',
    discriminators: [
      { question: 'Alteração do nível de consciência ou Glasgow < 13?', yesLevel: 'RED', noNext: true },
      { question: 'Choque (pele fria, sudorese, hipotensão)?', yesLevel: 'RED', noNext: true },
      { question: 'Dor intensa associada (EVA >= 8)?', yesLevel: 'ORANGE', noNext: true },
      { question: 'Febre alta (> 39°C) com taquicardia?', yesLevel: 'ORANGE', noNext: true },
      { question: 'Idoso (> 70 anos) ou criança (< 1 ano) com prostração?', yesLevel: 'ORANGE', noNext: true },
      { question: 'Mal-estar com vômitos repetidos ou desidratação moderada?', yesLevel: 'YELLOW', noNext: true },
      { question: 'Astenia intensa com alteração de sinais vitais?', yesLevel: 'YELLOW', noNext: true },
      { question: 'Mal-estar leve com sinais vitais estáveis?', yesLevel: 'GREEN', noNext: true },
      { question: 'Queixa vaga de indisposição, bom estado geral?', yesLevel: 'BLUE', noNext: false },
    ],
  },
  // 9. Vômitos
  {
    name: 'Vômitos',
    code: 'VOMITOS',
    category: 'GASTRO',
    discriminators: [
      { question: 'Via aérea comprometida (aspiração)?', yesLevel: 'RED', noNext: true },
      { question: 'Hematêmese volumosa com instabilidade hemodinâmica?', yesLevel: 'RED', noNext: true },
      { question: 'Vômitos em jato com cefaleia intensa (hipertensão intracraniana)?', yesLevel: 'ORANGE', noNext: true },
      { question: 'Vômitos persistentes com sinais de desidratação severa?', yesLevel: 'ORANGE', noNext: true },
      { question: 'Vômitos com dor abdominal intensa?', yesLevel: 'ORANGE', noNext: true },
      { question: 'Vômitos repetidos (> 6 episódios) nas últimas 12 horas?', yesLevel: 'YELLOW', noNext: true },
      { question: 'Vômitos com febre ou diarreia associada?', yesLevel: 'YELLOW', noNext: true },
      { question: 'Episódios isolados de vômito, tolera líquidos?', yesLevel: 'GREEN', noNext: true },
      { question: 'Náuseas sem vômito, bom estado geral?', yesLevel: 'BLUE', noNext: false },
    ],
  },
  // 10. Diarreia
  {
    name: 'Diarreia',
    code: 'DIARREIA',
    category: 'GASTRO',
    discriminators: [
      { question: 'Choque hipovolêmico (hipotensão, taquicardia, oligúria)?', yesLevel: 'RED', noNext: true },
      { question: 'Alteração do nível de consciência?', yesLevel: 'RED', noNext: true },
      { question: 'Desidratação grave (mucosas secas, olhos fundos, turgor diminuído)?', yesLevel: 'ORANGE', noNext: true },
      { question: 'Diarreia sanguinolenta (disenteria) com febre alta?', yesLevel: 'ORANGE', noNext: true },
      { question: 'Idoso ou criança com desidratação moderada?', yesLevel: 'ORANGE', noNext: true },
      { question: 'Diarreia aquosa profusa (> 8 episódios/dia)?', yesLevel: 'YELLOW', noNext: true },
      { question: 'Diarreia com febre e cólicas abdominais?', yesLevel: 'YELLOW', noNext: true },
      { question: 'Diarreia leve (< 4 episódios/dia), sem febre, tolera líquidos?', yesLevel: 'GREEN', noNext: true },
      { question: 'Fezes amolecidas, sem outros sintomas?', yesLevel: 'BLUE', noNext: false },
    ],
  },
  // 11. Síncope
  {
    name: 'Síncope',
    code: 'SINCOPE',
    category: 'NEURO',
    discriminators: [
      { question: 'Inconsciente ou não recuperou nível de consciência?', yesLevel: 'RED', noNext: true },
      { question: 'Crise convulsiva durante ou após a síncope?', yesLevel: 'RED', noNext: true },
      { question: 'Síncope com dor torácica ou palpitação prévia?', yesLevel: 'ORANGE', noNext: true },
      { question: 'Síncope ao esforço (suspeita cardíaca)?', yesLevel: 'ORANGE', noNext: true },
      { question: 'ECG com alterações agudas ou arritmia?', yesLevel: 'ORANGE', noNext: true },
      { question: 'Episódio sincopal com recuperação, mas cefaleia persistente?', yesLevel: 'YELLOW', noNext: true },
      { question: 'Síncope com trauma craniano na queda?', yesLevel: 'YELLOW', noNext: true },
      { question: 'Síncope vasovagal típica, recuperação completa?', yesLevel: 'GREEN', noNext: true },
      { question: 'Pré-síncope (quase desmaio) sem perda real de consciência?', yesLevel: 'BLUE', noNext: false },
    ],
  },
  // 12. Convulsão
  {
    name: 'Convulsão',
    code: 'CONVULSAO',
    category: 'NEURO',
    discriminators: [
      { question: 'Convulsão ativa (status epilepticus)?', yesLevel: 'RED', noNext: true },
      { question: 'Via aérea comprometida no período pós-ictal?', yesLevel: 'RED', noNext: true },
      { question: 'Primeira crise convulsiva da vida?', yesLevel: 'ORANGE', noNext: true },
      { question: 'Crise convulsiva com febre em adulto?', yesLevel: 'ORANGE', noNext: true },
      { question: 'Período pós-ictal prolongado (> 30 min) com confusão?', yesLevel: 'ORANGE', noNext: true },
      { question: 'Epiléptico conhecido com crise diferente do habitual?', yesLevel: 'YELLOW', noNext: true },
      { question: 'Pós-crise com recuperação parcial, cefaleia intensa?', yesLevel: 'YELLOW', noNext: true },
      { question: 'Epiléptico com crise habitual, recuperação completa?', yesLevel: 'GREEN', noNext: true },
      { question: 'Solicitação de receita para anticonvulsivante, sem crise recente?', yesLevel: 'BLUE', noNext: false },
    ],
  },
  // 13. Sangramento
  {
    name: 'Sangramento',
    code: 'SANGRAMENTO',
    category: 'TRAUMA',
    discriminators: [
      { question: 'Hemorragia maciça com instabilidade hemodinâmica?', yesLevel: 'RED', noNext: true },
      { question: 'Sangramento de via aérea com risco de aspiração?', yesLevel: 'RED', noNext: true },
      { question: 'Sangramento ativo não controlado com compressão direta?', yesLevel: 'ORANGE', noNext: true },
      { question: 'Sangramento GI (hematêmese/enterorragia) ativo?', yesLevel: 'ORANGE', noNext: true },
      { question: 'Uso de anticoagulante com sangramento ativo?', yesLevel: 'ORANGE', noNext: true },
      { question: 'Sangramento moderado controlado com compressão?', yesLevel: 'YELLOW', noNext: true },
      { question: 'Epistaxe anterior persistente (> 20 min)?', yesLevel: 'YELLOW', noNext: true },
      { question: 'Sangramento leve já controlado, sem sinais de choque?', yesLevel: 'GREEN', noNext: true },
      { question: 'Sangramento mínimo, intermitente, crônico?', yesLevel: 'BLUE', noNext: false },
    ],
  },
  // 14. Queimadura
  {
    name: 'Queimadura',
    code: 'QUEIMADURA',
    category: 'TRAUMA',
    discriminators: [
      { question: 'Queimadura de via aérea (rouquidão, fuligem, edema)?', yesLevel: 'RED', noNext: true },
      { question: 'Queimadura > 20% SCQ em adulto ou > 10% em criança?', yesLevel: 'RED', noNext: true },
      { question: 'Queimadura de 3° grau em face, mãos, pés, genitália ou articulações?', yesLevel: 'ORANGE', noNext: true },
      { question: 'Queimadura circunferencial de extremidade?', yesLevel: 'ORANGE', noNext: true },
      { question: 'Queimadura química ou elétrica?', yesLevel: 'ORANGE', noNext: true },
      { question: 'Queimadura de 2° grau com área 5-20% SCQ?', yesLevel: 'YELLOW', noNext: true },
      { question: 'Queimadura com dor intensa (EVA >= 7)?', yesLevel: 'YELLOW', noNext: true },
      { question: 'Queimadura de 1° grau ou 2° grau superficial < 5% SCQ?', yesLevel: 'GREEN', noNext: true },
      { question: 'Queimadura solar leve, sem bolhas?', yesLevel: 'BLUE', noNext: false },
    ],
  },
  // 15. Reação Alérgica
  {
    name: 'Reação Alérgica',
    code: 'REACAO_ALERGICA',
    category: 'ALLERGY',
    discriminators: [
      { question: 'Anafilaxia com comprometimento de via aérea (estridor, edema de glote)?', yesLevel: 'RED', noNext: true },
      { question: 'Hipotensão ou choque anafilático?', yesLevel: 'RED', noNext: true },
      { question: 'Edema de face/lábios/língua com dispneia?', yesLevel: 'ORANGE', noNext: true },
      { question: 'Broncoespasmo severo (sibilância audível)?', yesLevel: 'ORANGE', noNext: true },
      { question: 'Urticária generalizada com sintomas sistêmicos (náusea, tontura)?', yesLevel: 'ORANGE', noNext: true },
      { question: 'Urticária extensa com prurido intenso?', yesLevel: 'YELLOW', noNext: true },
      { question: 'Edema localizado sem comprometimento respiratório?', yesLevel: 'YELLOW', noNext: true },
      { question: 'Urticária localizada, prurido moderado?', yesLevel: 'GREEN', noNext: true },
      { question: 'Reação leve (eritema, coceira local), exposição remota?', yesLevel: 'BLUE', noNext: false },
    ],
  },
];

export async function seedManchester(prisma: PrismaClient, tenantId: string): Promise<void> {
  console.log('  Seeding Manchester flowcharts...');

  for (const flowchart of FLOWCHARTS) {
    await prisma.manchesterFlowchart.upsert({
      where: { code: flowchart.code },
      update: {
        name: flowchart.name,
        category: flowchart.category,
        discriminators: flowchart.discriminators as unknown as Prisma.InputJsonValue,
        isActive: true,
      },
      create: {
        name: flowchart.name,
        code: flowchart.code,
        category: flowchart.category,
        discriminators: flowchart.discriminators as unknown as Prisma.InputJsonValue,
        isActive: true,
        tenantId,
      },
    });
  }

  console.log(`  ✓ ${FLOWCHARTS.length} Manchester flowcharts seeded`);
}
