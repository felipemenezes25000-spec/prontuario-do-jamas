import type { TriageLevel, EncounterType, EncounterStatus, RiskLevel } from '@/types';

export const triageLevelColors: Record<TriageLevel, { bg: string; text: string; label: string }> = {
  RED: { bg: 'bg-red-500', text: 'text-red-500', label: 'Emergência' },
  ORANGE: { bg: 'bg-orange-500', text: 'text-orange-500', label: 'Muito Urgente' },
  YELLOW: { bg: 'bg-yellow-500', text: 'text-yellow-500', label: 'Urgente' },
  GREEN: { bg: 'bg-green-500', text: 'text-green-500', label: 'Pouco Urgente' },
  BLUE: { bg: 'bg-blue-500', text: 'text-blue-500', label: 'Não Urgente' },
};

export const encounterStatusLabels: Record<EncounterStatus, { label: string; color: string }> = {
  SCHEDULED: { label: 'Agendado', color: 'bg-zinc-600' },
  WAITING: { label: 'Aguardando', color: 'bg-yellow-600' },
  IN_TRIAGE: { label: 'Triagem', color: 'bg-orange-600' },
  IN_PROGRESS: { label: 'Em Andamento', color: 'bg-teal-600' },
  ON_HOLD: { label: 'Em Espera', color: 'bg-blue-600' },
  COMPLETED: { label: 'Concluído', color: 'bg-zinc-500' },
  CANCELLED: { label: 'Cancelado', color: 'bg-red-800' },
  NO_SHOW: { label: 'Faltou', color: 'bg-red-600' },
  TRANSFERRED: { label: 'Transferido', color: 'bg-purple-600' },
};

export const encounterTypeLabels: Record<EncounterType, string> = {
  CONSULTATION: 'Consulta',
  RETURN_VISIT: 'Retorno',
  EMERGENCY: 'Emergência',
  HOSPITALIZATION: 'Internação',
  TELEMEDICINE: 'Teleconsulta',
  HOME_VISIT: 'Visita Domiciliar',
  DAY_HOSPITAL: 'Hospital-dia',
  PROCEDURE: 'Procedimento',
  PRE_OPERATIVE: 'Pré-operatório',
  POST_OPERATIVE: 'Pós-operatório',
  LAB_COLLECTION: 'Coleta Lab.',
  IMAGING: 'Imagem',
  VACCINATION: 'Vacinação',
  NURSING: 'Enfermagem',
  NUTRITION: 'Nutrição',
  PHYSIOTHERAPY: 'Fisioterapia',
  PSYCHOLOGY: 'Psicologia',
  SOCIAL_WORK: 'Serviço Social',
};

export const riskLevelInfo: Record<RiskLevel, { label: string; color: string; score: number }> = {
  LOW: { label: 'Baixo', color: 'text-green-400', score: 15 },
  MEDIUM: { label: 'Médio', color: 'text-yellow-400', score: 45 },
  HIGH: { label: 'Alto', color: 'text-orange-400', score: 72 },
  CRITICAL: { label: 'Crítico', color: 'text-red-400', score: 92 },
};
