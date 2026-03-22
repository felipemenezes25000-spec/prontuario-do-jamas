import { ControlledSchedule } from '@voxpep/shared-types';

export interface ControlledScheduleConfig {
  schedule: ControlledSchedule;
  description: string;
  receiptType: string;
  receiptColor: string;
  maxDaysPrescription: number;
  maxUnits: number | null;
}

/**
 * Classificação de substâncias controladas conforme Portaria 344/98 - ANVISA.
 */
export const CONTROLLED_SCHEDULES: readonly ControlledScheduleConfig[] = [
  {
    schedule: ControlledSchedule.A1,
    description: 'Entorpecentes (ex.: morfina, codeína, metadona)',
    receiptType: 'Receita Amarela (Notificação de Receita A)',
    receiptColor: '#FFD700',
    maxDaysPrescription: 30,
    maxUnits: null,
  },
  {
    schedule: ControlledSchedule.A2,
    description: 'Entorpecentes de uso permitido apenas em concentrações especiais',
    receiptType: 'Receita Amarela (Notificação de Receita A)',
    receiptColor: '#FFD700',
    maxDaysPrescription: 30,
    maxUnits: null,
  },
  {
    schedule: ControlledSchedule.A3,
    description: 'Psicotrópicos (ex.: anfetaminas - uso terapêutico)',
    receiptType: 'Receita Amarela (Notificação de Receita A)',
    receiptColor: '#FFD700',
    maxDaysPrescription: 30,
    maxUnits: null,
  },
  {
    schedule: ControlledSchedule.B1,
    description: 'Psicotrópicos (ex.: benzodiazepínicos, barbitúricos, zolpidem)',
    receiptType: 'Receita Azul (Notificação de Receita B)',
    receiptColor: '#4169E1',
    maxDaysPrescription: 60,
    maxUnits: null,
  },
  {
    schedule: ControlledSchedule.B2,
    description: 'Psicotrópicos anorexígenos (ex.: anfepramona, femproporex)',
    receiptType: 'Receita Azul (Notificação de Receita B)',
    receiptColor: '#4169E1',
    maxDaysPrescription: 30,
    maxUnits: null,
  },
  {
    schedule: ControlledSchedule.C1,
    description: 'Outras substâncias sujeitas a controle especial (ex.: antidepressivos, antipsicóticos, anticonvulsivantes)',
    receiptType: 'Receita de Controle Especial (2 vias)',
    receiptColor: '#FFFFFF',
    maxDaysPrescription: 60,
    maxUnits: null,
  },
  {
    schedule: ControlledSchedule.C2,
    description: 'Retinoides de uso sistêmico (ex.: isotretinoína, acitretina)',
    receiptType: 'Receita de Controle Especial + Termo de Consentimento',
    receiptColor: '#FFFFFF',
    maxDaysPrescription: 30,
    maxUnits: null,
  },
  {
    schedule: ControlledSchedule.C3,
    description: 'Imunossupressores (ex.: talidomida)',
    receiptType: 'Receita de Controle Especial + Termo de Responsabilidade',
    receiptColor: '#FFFFFF',
    maxDaysPrescription: 30,
    maxUnits: null,
  },
  {
    schedule: ControlledSchedule.C4,
    description: 'Anti-retrovirais (uso restrito a programas oficiais)',
    receiptType: 'Receituário do Programa DST/AIDS',
    receiptColor: '#FFFFFF',
    maxDaysPrescription: 30,
    maxUnits: null,
  },
  {
    schedule: ControlledSchedule.C5,
    description: 'Anabolizantes (ex.: testosterona, nandrolona, estanozolol)',
    receiptType: 'Receita de Controle Especial (2 vias)',
    receiptColor: '#FFFFFF',
    maxDaysPrescription: 60,
    maxUnits: null,
  },
] as const;
