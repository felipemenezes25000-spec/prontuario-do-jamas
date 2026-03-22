/**
 * Formata um número de prontuário com zero-padding de 8 dígitos.
 * @param mrn Número do prontuário
 * @returns Prontuário formatado (ex: "00012345")
 */
export function formatMRN(mrn: number): string {
  return String(mrn).padStart(8, '0');
}

/**
 * Formata um valor monetário em Real brasileiro (BRL).
 * @param value Valor numérico
 * @returns String formatada (ex: "R$ 1.234,56")
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Formata um sinal vital com sua unidade.
 * @param value Valor numérico
 * @param unit Unidade de medida
 * @returns String formatada (ex: "120 mmHg")
 */
export function formatVitalSign(value: number, unit: string): string {
  return `${value} ${unit}`;
}
