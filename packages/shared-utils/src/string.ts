/**
 * Converte uma string para slug (URL-friendly).
 */
export function slugify(text: string): string {
  return removeAccents(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Capitaliza a primeira letra de cada palavra.
 */
export function capitalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/(^|\s)\S/g, (char) => char.toUpperCase());
}

/**
 * Mascara um CPF exibindo apenas os dois últimos dígitos: ***.***. ***-XX.
 */
export function maskCPF(cpf: string): string {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) {
    return cpf;
  }
  return `***.***. ***-${digits.slice(9, 11)}`;
}

/**
 * Mascara um telefone exibindo apenas os dois últimos dígitos.
 */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) {
    return phone;
  }
  const last2 = digits.slice(-2);
  const masked = '*'.repeat(digits.length - 2) + last2;
  return masked;
}

/**
 * Formata um CNPJ: XX.XXX.XXX/XXXX-XX.
 */
export function formatCNPJ(cnpj: string): string {
  const digits = cnpj.replace(/\D/g, '');
  if (digits.length !== 14) {
    return cnpj;
  }
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}

/**
 * Remove acentos e diacríticos de uma string.
 */
export function removeAccents(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Trunca uma string no comprimento máximo, adicionando reticências.
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength - 3) + '...';
}
