import { Specialty } from '@voxpep/shared-types';

export interface SpecialtyOption {
  value: Specialty;
  label: string;
}

export const SPECIALTY_LIST: readonly SpecialtyOption[] = [
  { value: Specialty.GENERAL_PRACTICE, label: 'Clínica Geral' },
  { value: Specialty.CARDIOLOGY, label: 'Cardiologia' },
  { value: Specialty.DERMATOLOGY, label: 'Dermatologia' },
  { value: Specialty.ENDOCRINOLOGY, label: 'Endocrinologia' },
  { value: Specialty.GASTROENTEROLOGY, label: 'Gastroenterologia' },
  { value: Specialty.GERIATRICS, label: 'Geriatria' },
  { value: Specialty.GYNECOLOGY, label: 'Ginecologia' },
  { value: Specialty.HEMATOLOGY, label: 'Hematologia' },
  { value: Specialty.INFECTIOUS_DISEASE, label: 'Infectologia' },
  { value: Specialty.NEPHROLOGY, label: 'Nefrologia' },
  { value: Specialty.NEUROLOGY, label: 'Neurologia' },
  { value: Specialty.ONCOLOGY, label: 'Oncologia' },
  { value: Specialty.OPHTHALMOLOGY, label: 'Oftalmologia' },
  { value: Specialty.ORTHOPEDICS, label: 'Ortopedia' },
  { value: Specialty.OTOLARYNGOLOGY, label: 'Otorrinolaringologia' },
  { value: Specialty.PEDIATRICS, label: 'Pediatria' },
  { value: Specialty.PNEUMOLOGY, label: 'Pneumologia' },
  { value: Specialty.PSYCHIATRY, label: 'Psiquiatria' },
  { value: Specialty.RHEUMATOLOGY, label: 'Reumatologia' },
  { value: Specialty.UROLOGY, label: 'Urologia' },
  { value: Specialty.SURGERY_GENERAL, label: 'Cirurgia Geral' },
  { value: Specialty.SURGERY_CARDIAC, label: 'Cirurgia Cardíaca' },
  { value: Specialty.SURGERY_NEURO, label: 'Neurocirurgia' },
  { value: Specialty.SURGERY_PLASTIC, label: 'Cirurgia Plástica' },
  { value: Specialty.SURGERY_THORACIC, label: 'Cirurgia Torácica' },
  { value: Specialty.SURGERY_VASCULAR, label: 'Cirurgia Vascular' },
  { value: Specialty.ANESTHESIOLOGY, label: 'Anestesiologia' },
  { value: Specialty.RADIOLOGY, label: 'Radiologia' },
  { value: Specialty.PATHOLOGY, label: 'Patologia' },
  { value: Specialty.EMERGENCY, label: 'Medicina de Emergência' },
  { value: Specialty.INTENSIVE_CARE, label: 'Medicina Intensiva' },
  { value: Specialty.FAMILY_MEDICINE, label: 'Medicina de Família e Comunidade' },
  { value: Specialty.OBSTETRICS, label: 'Obstetrícia' },
  { value: Specialty.ALLERGY_IMMUNOLOGY, label: 'Alergia e Imunologia' },
  { value: Specialty.PHYSICAL_MEDICINE, label: 'Medicina Física e Reabilitação' },
] as const;
