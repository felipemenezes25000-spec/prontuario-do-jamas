export interface HighAlertMedicationClass {
  className: string;
  examples: string[];
  risks: string;
  safetyMeasures: string[];
}

/**
 * Medicamentos de Alta Vigilância (MAV) conforme ISMP Brasil.
 * Requerem dupla checagem e protocolos especiais de segurança.
 */
export const HIGH_ALERT_MEDICATIONS: readonly HighAlertMedicationClass[] = [
  {
    className: 'Insulinas',
    examples: ['Insulina Regular', 'Insulina NPH', 'Insulina Glargina', 'Insulina Lispro', 'Insulina Asparte'],
    risks: 'Hipoglicemia grave, coma hipoglicêmico, óbito',
    safetyMeasures: [
      'Dupla checagem independente antes da administração',
      'Conferir glicemia capilar antes de cada dose',
      'Armazenar separado de heparina',
      'Não abreviar "U" (unidades)',
    ],
  },
  {
    className: 'Heparinas e anticoagulantes',
    examples: ['Heparina Não Fracionada', 'Enoxaparina', 'Dalteparina', 'Fondaparinux', 'Warfarina'],
    risks: 'Hemorragia grave, trombocitopenia induzida por heparina',
    safetyMeasures: [
      'Dupla checagem de dose e via',
      'Monitorar coagulograma (TTPa, INR)',
      'Verificar contagem de plaquetas',
      'Protocolo de reversão disponível',
    ],
  },
  {
    className: 'Cloreto de potássio (KCl) injetável',
    examples: ['KCl 19,1%', 'KCl 10%'],
    risks: 'Arritmia cardíaca fatal, parada cardíaca',
    safetyMeasures: [
      'Nunca administrar em bolus IV',
      'Concentração máxima: 40 mEq/L em veia periférica',
      'Velocidade máxima: 10-20 mEq/h',
      'Monitorização cardíaca contínua em altas doses',
      'Armazenar separado de outros eletrólitos',
    ],
  },
  {
    className: 'Soluções concentradas de eletrólitos',
    examples: ['NaCl 20%', 'Gluconato de Cálcio 10%', 'Sulfato de Magnésio 50%', 'Fosfato de Potássio'],
    risks: 'Arritmias, parada cardíaca, necrose tecidual',
    safetyMeasures: [
      'Diluir antes de administrar',
      'Dupla checagem de concentração e velocidade',
      'Não armazenar em unidades de internação',
    ],
  },
  {
    className: 'Opioides',
    examples: ['Morfina', 'Fentanil', 'Metadona', 'Meperidina', 'Tramadol IV'],
    risks: 'Depressão respiratória, sedação excessiva, óbito',
    safetyMeasures: [
      'Monitorar sedação e frequência respiratória',
      'Naloxona disponível à beira do leito',
      'Calcular dose com base em peso e função renal',
      'Atenção especial em idosos e neonatos',
    ],
  },
  {
    className: 'Bloqueadores neuromusculares',
    examples: ['Succinilcolina', 'Rocurônio', 'Atracúrio', 'Cisatracúrio', 'Pancurônio'],
    risks: 'Paralisia respiratória, óbito se usado sem suporte ventilatório',
    safetyMeasures: [
      'Uso exclusivo com ventilação mecânica',
      'Etiqueta de alerta "PARALISA RESPIRAÇÃO"',
      'Armazenar separado de outros medicamentos',
      'Sugamadex disponível para reversão',
    ],
  },
  {
    className: 'Quimioterápicos / Antineoplásicos',
    examples: ['Metotrexato', 'Vincristina', 'Ciclofosfamida', 'Doxorrubicina', 'Cisplatina'],
    risks: 'Toxicidade grave multiorgânica, aplasia medular, óbito',
    safetyMeasures: [
      'Dupla checagem de protocolo, dose e superfície corporal',
      'Vincristina: NUNCA por via intratecal',
      'Manipulação em cabine de segurança biológica',
      'EPI obrigatório para manipulação',
    ],
  },
  {
    className: 'Sedativos e anestésicos IV',
    examples: ['Propofol', 'Midazolam IV', 'Ketamina', 'Etomidato', 'Dexmedetomidina'],
    risks: 'Depressão respiratória, hipotensão, apneia',
    safetyMeasures: [
      'Monitorização contínua obrigatória',
      'Material de via aérea disponível',
      'Flumazenil disponível para benzodiazepínicos',
      'Titular dose conforme resposta',
    ],
  },
  {
    className: 'Vasopressores e inotrópicos',
    examples: ['Noradrenalina', 'Adrenalina', 'Dobutamina', 'Dopamina', 'Vasopressina'],
    risks: 'Hipertensão grave, arritmias, isquemia tecidual, necrose por extravasamento',
    safetyMeasures: [
      'Infusão exclusivamente em bomba de infusão',
      'Preferir acesso venoso central',
      'Monitorização hemodinâmica contínua',
      'Verificar diluição e concentração',
    ],
  },
  {
    className: 'Glicose hipertônica',
    examples: ['Glicose 50%', 'Glicose 25%'],
    risks: 'Hiperglicemia grave, desidratação, tromboflebite, necrose por extravasamento',
    safetyMeasures: [
      'Administrar por acesso venoso central se concentração > 12,5%',
      'Monitorar glicemia frequentemente',
      'Dupla checagem de concentração',
    ],
  },
  {
    className: 'Medicamentos com nomes semelhantes (LASA)',
    examples: ['Dopamina/Dobutamina', 'Losartana/Valsartana', 'Hidralazina/Hidroxizina', 'Cefazolina/Ceftriaxona'],
    risks: 'Troca de medicamentos, dose incorreta',
    safetyMeasures: [
      'Destaque visual (Tall Man Lettering)',
      'Armazenar separados fisicamente',
      'Conferir prescrição com nome genérico + comercial',
    ],
  },
] as const;
