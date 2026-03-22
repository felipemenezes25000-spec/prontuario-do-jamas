import { MedicationRoute } from '@voxpep/shared-types';

export interface MedicationRouteOption {
  value: MedicationRoute;
  label: string;
}

export const MEDICATION_ROUTES: readonly MedicationRouteOption[] = [
  { value: MedicationRoute.VO, label: 'Via Oral' },
  { value: MedicationRoute.IV, label: 'Intravenosa' },
  { value: MedicationRoute.IM, label: 'Intramuscular' },
  { value: MedicationRoute.SC, label: 'Subcutânea' },
  { value: MedicationRoute.SL, label: 'Sublingual' },
  { value: MedicationRoute.TOP, label: 'Tópica' },
  { value: MedicationRoute.INH, label: 'Inalatória' },
  { value: MedicationRoute.REC, label: 'Retal' },
  { value: MedicationRoute.OFT, label: 'Oftálmica' },
  { value: MedicationRoute.OTO, label: 'Otológica' },
  { value: MedicationRoute.NASAL, label: 'Nasal' },
] as const;
