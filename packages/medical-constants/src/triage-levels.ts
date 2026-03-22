import { TriageLevel } from '@voxpep/shared-types';

export interface TriageLevelConfig {
  level: TriageLevel;
  color: string;
  label: string;
  maxWaitMinutes: number;
  description: string;
}

export const TRIAGE_LEVELS: readonly TriageLevelConfig[] = [
  {
    level: TriageLevel.RED,
    color: '#FF0000',
    label: 'Emergência',
    maxWaitMinutes: 0,
    description: 'Risco imediato de vida. Atendimento imediato.',
  },
  {
    level: TriageLevel.ORANGE,
    color: '#FF8C00',
    label: 'Muito Urgente',
    maxWaitMinutes: 10,
    description: 'Risco de perda de membro ou função orgânica. Atendimento em até 10 minutos.',
  },
  {
    level: TriageLevel.YELLOW,
    color: '#FFD700',
    label: 'Urgente',
    maxWaitMinutes: 60,
    description: 'Condição potencialmente grave. Atendimento em até 60 minutos.',
  },
  {
    level: TriageLevel.GREEN,
    color: '#008000',
    label: 'Pouco Urgente',
    maxWaitMinutes: 120,
    description: 'Condição estável sem risco imediato. Atendimento em até 120 minutos.',
  },
  {
    level: TriageLevel.BLUE,
    color: '#0000FF',
    label: 'Não Urgente',
    maxWaitMinutes: 240,
    description: 'Queixa crônica ou menor. Atendimento em até 240 minutos.',
  },
] as const;
