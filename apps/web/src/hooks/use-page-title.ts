import { useEffect } from 'react';

const BASE_TITLE = 'StarMed';

/**
 * Sets `document.title` reactively and optionally restores the previous title.
 *
 * @example
 * usePageTitle('Pacientes');          // "StarMed — Pacientes"
 * usePageTitle('Maria Silva', true);  // "StarMed — Maria Silva"
 */
export function usePageTitle(subtitle?: string, restoreOnUnmount = false) {
  useEffect(() => {
    const previous = document.title;
    document.title = subtitle ? `${BASE_TITLE} — ${subtitle}` : BASE_TITLE;

    return () => {
      if (restoreOnUnmount) {
        document.title = previous;
      }
    };
  }, [subtitle, restoreOnUnmount]);
}
