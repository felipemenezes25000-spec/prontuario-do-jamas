export { MEDICATION_ROUTES } from './medication-routes.js';
export type { MedicationRouteOption } from './medication-routes.js';

export { TRIAGE_LEVELS } from './triage-levels.js';
export type { TriageLevelConfig } from './triage-levels.js';

export { CONTROLLED_SCHEDULES } from './controlled-schedules.js';
export type { ControlledScheduleConfig } from './controlled-schedules.js';

export { HIGH_ALERT_MEDICATIONS } from './high-alert-medications.js';
export type { HighAlertMedicationClass } from './high-alert-medications.js';

export { SPECIALTY_LIST } from './specialty-list.js';
export type { SpecialtyOption } from './specialty-list.js';

export { VITAL_SIGN_RANGES } from './vital-sign-ranges.js';
export type { AgeGroup, VitalSignRange, VitalSignRangeByAge } from './vital-sign-ranges.js';

export { MANCHESTER_FLOWCHARTS, getDiscriminatorsByLevel, getFlowchartByName } from './manchester-discriminators.js';
export type { ManchesterDiscriminator, ManchesterFlowchart } from './manchester-discriminators.js';

export { NANDA_DIAGNOSES, getNANDAByCode, getNANDAByDomain } from './nanda-diagnoses.js';
export type { NANDADiagnosis } from './nanda-diagnoses.js';

export { NIC_INTERVENTIONS, getNICByNANDA } from './nic-interventions.js';
export type { NICIntervention } from './nic-interventions.js';

export { NOC_OUTCOMES, getNOCByNANDA } from './noc-outcomes.js';
export type { NOCOutcome, NOCIndicator } from './noc-outcomes.js';

export {
  GLASGOW_SCALE,
  BRADEN_SCALE,
  MORSE_FALL_SCALE,
  MEWS_SCALE,
  PAIN_SCALE,
  RASS_SCALE,
  NEWS2_SCALE,
  APGAR_SCALE,
  calculateGlasgow,
  calculateBraden,
  calculateMorse,
  getPainLevel,
} from './clinical-scales.js';
export type {
  GlasgowItem,
  GlasgowInterpretation,
  BradenOption,
  BradenCategory,
  BradenInterpretation,
  MorseOption,
  MorseCategory,
  MorseInterpretation,
  MEWSScoreRange,
  MEWSParameter,
  MEWSInterpretation,
  PainLevel,
  RASSLevel,
  NEWS2ScoreRange,
  NEWS2Parameter,
  ApgarCategory,
} from './clinical-scales.js';

export { COMMON_MEDICATIONS, findMedication, getHighAlertMedications, getAntibiotics, getBeersListMedications } from './common-medications.js';
export type { MedicationReference } from './common-medications.js';
