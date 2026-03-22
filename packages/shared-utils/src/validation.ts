/**
 * Valida um CPF brasileiro usando o algoritmo oficial.
 */
export function isValidCPF(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return false;

  // Rejeita CPFs com todos os dígitos iguais
  if (/^(\d)\1{10}$/.test(digits)) return false;

  // Validação do primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += Number(digits[i]!) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  if (remainder !== Number(digits[9]!)) return false;

  // Validação do segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += Number(digits[i]!) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  if (remainder !== Number(digits[10]!)) return false;

  return true;
}

/**
 * Valida um CNPJ brasileiro usando o algoritmo oficial.
 */
export function isValidCNPJ(cnpj: string): boolean {
  const digits = cnpj.replace(/\D/g, '');
  if (digits.length !== 14) return false;

  if (/^(\d)\1{13}$/.test(digits)) return false;

  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += Number(digits[i]!) * weights1[i]!;
  }
  let remainder = sum % 11;
  const firstDigit = remainder < 2 ? 0 : 11 - remainder;
  if (Number(digits[12]) !== firstDigit) return false;

  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += Number(digits[i]!) * weights2[i]!;
  }
  remainder = sum % 11;
  const secondDigit = remainder < 2 ? 0 : 11 - remainder;
  if (Number(digits[13]) !== secondDigit) return false;

  return true;
}

/**
 * Valida um registro CRM (Conselho Regional de Medicina).
 * Formato: 4-6 dígitos + UF (ex: 123456/SP).
 */
export function isValidCRM(crm: string): boolean {
  return /^\d{4,6}\/[A-Z]{2}$/.test(crm.trim().toUpperCase());
}

/**
 * Valida um registro COREN (Conselho Regional de Enfermagem).
 * Formato: categoria + dígitos + UF (ex: COREN-SP 123456).
 */
export function isValidCOREN(coren: string): boolean {
  return /^(COREN-?)?[A-Z]{2}\s?\d{4,8}$/i.test(coren.trim());
}

/**
 * Valida um Cartão Nacional de Saúde (CNS).
 * 15 dígitos, começando com 1, 2, 7, 8 ou 9.
 */
export function isValidCNS(cns: string): boolean {
  const digits = cns.replace(/\D/g, '');
  if (digits.length !== 15) return false;

  const firstDigit = digits[0]!;
  if (!['1', '2', '7', '8', '9'].includes(firstDigit)) return false;

  // CNS definitivo (começa com 1 ou 2)
  if (firstDigit === '1' || firstDigit === '2') {
    let sum = 0;
    for (let i = 0; i < 15; i++) {
      sum += Number(digits[i]!) * (15 - i);
    }
    return sum % 11 === 0;
  }

  // CNS provisório (começa com 7, 8 ou 9)
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    sum += Number(digits[i]!) * (15 - i);
  }
  return sum % 11 === 0;
}

/**
 * Valida um endereço de e-mail.
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Valida um telefone brasileiro (fixo ou celular, com ou sem DDI).
 */
export function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  // 10 dígitos (fixo) ou 11 dígitos (celular) com DDD
  // 12-13 dígitos com DDI (55)
  return /^(55)?\d{10,11}$/.test(digits);
}
