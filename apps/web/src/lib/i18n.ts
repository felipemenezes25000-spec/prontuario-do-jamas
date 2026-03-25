/**
 * i18n — Internationalization stub for VoxPEP Portal
 *
 * This is a minimal stub for future full i18n integration (react-i18next / next-intl).
 * Supports pt-BR (default), en, and es.
 */

import { useState, useCallback } from 'react';

// ============================================================================
// Types
// ============================================================================

export type Locale = 'pt-BR' | 'en' | 'es';

export type TranslationKey =
  | 'nav.scheduling'
  | 'nav.results'
  | 'nav.messages'
  | 'nav.prescriptions'
  | 'nav.payments'
  | 'nav.profile'
  | 'nav.checkin'
  | 'nav.education'
  | 'nav.surveys'
  | 'common.loading'
  | 'common.error'
  | 'common.save'
  | 'common.cancel'
  | 'common.confirm'
  | 'common.search'
  | 'common.back'
  | 'common.logout'
  | 'common.welcome'
  | 'common.date'
  | 'common.time'
  | 'common.status'
  | 'portal.title'
  | 'portal.subtitle'
  | 'portal.appointment.book'
  | 'portal.appointment.upcoming'
  | 'portal.appointment.past'
  | 'portal.result.view'
  | 'portal.result.download'
  | 'portal.message.new'
  | 'portal.message.inbox'
  | 'portal.payment.pending'
  | 'portal.payment.history'
  | 'portal.prescription.renew'
  | 'portal.checkin.start'
  | 'portal.checkin.complete'
  | 'portal.survey.answer';

// ============================================================================
// Dictionary
// ============================================================================

type Dictionary = Record<TranslationKey, string>;

const dictionaries: Record<Locale, Dictionary> = {
  'pt-BR': {
    'nav.scheduling': 'Agendamento',
    'nav.results': 'Resultados',
    'nav.messages': 'Mensagens',
    'nav.prescriptions': 'Prescrições',
    'nav.payments': 'Pagamentos',
    'nav.profile': 'Meu Perfil',
    'nav.checkin': 'Check-in',
    'nav.education': 'Educação em Saúde',
    'nav.surveys': 'Pesquisas',
    'common.loading': 'Carregando...',
    'common.error': 'Ocorreu um erro. Tente novamente.',
    'common.save': 'Salvar',
    'common.cancel': 'Cancelar',
    'common.confirm': 'Confirmar',
    'common.search': 'Buscar',
    'common.back': 'Voltar',
    'common.logout': 'Sair',
    'common.welcome': 'Bem-vindo(a)',
    'common.date': 'Data',
    'common.time': 'Horário',
    'common.status': 'Status',
    'portal.title': 'Portal do Paciente',
    'portal.subtitle': 'Acesse suas informações de saúde com segurança.',
    'portal.appointment.book': 'Agendar Consulta',
    'portal.appointment.upcoming': 'Próximas Consultas',
    'portal.appointment.past': 'Consultas Anteriores',
    'portal.result.view': 'Ver Resultado',
    'portal.result.download': 'Baixar Resultado',
    'portal.message.new': 'Nova Mensagem',
    'portal.message.inbox': 'Caixa de Entrada',
    'portal.payment.pending': 'Pagamentos Pendentes',
    'portal.payment.history': 'Histórico de Pagamentos',
    'portal.prescription.renew': 'Renovar Receita',
    'portal.checkin.start': 'Iniciar Check-in',
    'portal.checkin.complete': 'Check-in Concluído',
    'portal.survey.answer': 'Responder Pesquisa',
  },
  en: {
    'nav.scheduling': 'Scheduling',
    'nav.results': 'Results',
    'nav.messages': 'Messages',
    'nav.prescriptions': 'Prescriptions',
    'nav.payments': 'Payments',
    'nav.profile': 'My Profile',
    'nav.checkin': 'Check-in',
    'nav.education': 'Health Education',
    'nav.surveys': 'Surveys',
    'common.loading': 'Loading...',
    'common.error': 'An error occurred. Please try again.',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.confirm': 'Confirm',
    'common.search': 'Search',
    'common.back': 'Back',
    'common.logout': 'Log out',
    'common.welcome': 'Welcome',
    'common.date': 'Date',
    'common.time': 'Time',
    'common.status': 'Status',
    'portal.title': 'Patient Portal',
    'portal.subtitle': 'Access your health information securely.',
    'portal.appointment.book': 'Book Appointment',
    'portal.appointment.upcoming': 'Upcoming Appointments',
    'portal.appointment.past': 'Past Appointments',
    'portal.result.view': 'View Result',
    'portal.result.download': 'Download Result',
    'portal.message.new': 'New Message',
    'portal.message.inbox': 'Inbox',
    'portal.payment.pending': 'Pending Payments',
    'portal.payment.history': 'Payment History',
    'portal.prescription.renew': 'Renew Prescription',
    'portal.checkin.start': 'Start Check-in',
    'portal.checkin.complete': 'Check-in Complete',
    'portal.survey.answer': 'Answer Survey',
  },
  es: {
    'nav.scheduling': 'Agenda',
    'nav.results': 'Resultados',
    'nav.messages': 'Mensajes',
    'nav.prescriptions': 'Recetas',
    'nav.payments': 'Pagos',
    'nav.profile': 'Mi Perfil',
    'nav.checkin': 'Check-in',
    'nav.education': 'Educación en Salud',
    'nav.surveys': 'Encuestas',
    'common.loading': 'Cargando...',
    'common.error': 'Ocurrió un error. Intente nuevamente.',
    'common.save': 'Guardar',
    'common.cancel': 'Cancelar',
    'common.confirm': 'Confirmar',
    'common.search': 'Buscar',
    'common.back': 'Volver',
    'common.logout': 'Salir',
    'common.welcome': 'Bienvenido(a)',
    'common.date': 'Fecha',
    'common.time': 'Hora',
    'common.status': 'Estado',
    'portal.title': 'Portal del Paciente',
    'portal.subtitle': 'Acceda a su información de salud de forma segura.',
    'portal.appointment.book': 'Agendar Cita',
    'portal.appointment.upcoming': 'Próximas Citas',
    'portal.appointment.past': 'Citas Anteriores',
    'portal.result.view': 'Ver Resultado',
    'portal.result.download': 'Descargar Resultado',
    'portal.message.new': 'Nuevo Mensaje',
    'portal.message.inbox': 'Bandeja de Entrada',
    'portal.payment.pending': 'Pagos Pendientes',
    'portal.payment.history': 'Historial de Pagos',
    'portal.prescription.renew': 'Renovar Receta',
    'portal.checkin.start': 'Iniciar Check-in',
    'portal.checkin.complete': 'Check-in Completado',
    'portal.survey.answer': 'Responder Encuesta',
  },
};

// ============================================================================
// Storage key for locale persistence
// ============================================================================

const LOCALE_KEY = 'voxpep_locale';

function getInitialLocale(): Locale {
  if (typeof window === 'undefined') return 'pt-BR';
  const stored = localStorage.getItem(LOCALE_KEY) as Locale | null;
  if (stored && stored in dictionaries) return stored;
  const browserLang = navigator.language;
  if (browserLang.startsWith('en')) return 'en';
  if (browserLang.startsWith('es')) return 'es';
  return 'pt-BR';
}

// ============================================================================
// Module-level locale state (simple singleton, not Context-based)
// ============================================================================

let _locale: Locale = 'pt-BR';
const _listeners: Array<() => void> = [];

function setLocaleGlobal(locale: Locale) {
  _locale = locale;
  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCALE_KEY, locale);
  }
  _listeners.forEach((fn) => fn());
}

// ============================================================================
// useTranslation hook
// ============================================================================

export function useTranslation() {
  const [locale, setLocaleState] = useState<Locale>(() => {
    _locale = getInitialLocale();
    return _locale;
  });

  // Subscribe to global locale changes
  const forceUpdate = useCallback(() => {
    setLocaleState(_locale);
  }, []);

  // Register listener on mount (simplified, no cleanup — acceptable for stub)
  if (!_listeners.includes(forceUpdate)) {
    _listeners.push(forceUpdate);
  }

  const t = useCallback(
    (key: TranslationKey, fallback?: string): string => {
      return dictionaries[locale]?.[key] ?? fallback ?? key;
    },
    [locale],
  );

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleGlobal(newLocale);
  }, []);

  return { locale, t, setLocale, availableLocales: ['pt-BR', 'en', 'es'] as Locale[] };
}

// ============================================================================
// Standalone translate function (outside React, for non-hook contexts)
// ============================================================================

export function translate(key: TranslationKey, locale: Locale = 'pt-BR'): string {
  return dictionaries[locale]?.[key] ?? key;
}
