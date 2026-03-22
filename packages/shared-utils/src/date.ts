import { Shift } from '@voxpep/shared-types';

/**
 * Formata uma data no padrão brasileiro DD/MM/YYYY.
 */
export function formatDateBR(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Formata uma data e hora no padrão brasileiro DD/MM/YYYY HH:mm.
 */
export function formatDateTimeBR(date: Date): string {
  const datePart = formatDateBR(date);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${datePart} ${hours}:${minutes}`;
}

/**
 * Calcula a idade em anos completos a partir da data de nascimento.
 */
export function calculateAge(birthDate: Date, referenceDate: Date = new Date()): number {
  let age = referenceDate.getFullYear() - birthDate.getFullYear();
  const monthDiff = referenceDate.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && referenceDate.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

/**
 * Verifica se uma data já expirou em relação a uma data de referência.
 */
export function isExpired(expirationDate: Date, referenceDate: Date = new Date()): boolean {
  return expirationDate.getTime() < referenceDate.getTime();
}

/**
 * Retorna o turno (plantão) com base na hora do dia.
 * Manhã: 07:00-12:59, Tarde: 13:00-18:59, Noite: 19:00-06:59.
 */
export function getShift(hour: number): Shift {
  if (hour >= 7 && hour < 13) {
    return Shift.MORNING;
  }
  if (hour >= 13 && hour < 19) {
    return Shift.AFTERNOON;
  }
  return Shift.NIGHT;
}
