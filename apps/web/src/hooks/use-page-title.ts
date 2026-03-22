import { useEffect } from 'react';

const BASE_TITLE = 'VoxPEP';

/**
 * Sets `document.title` reactively.
 *
 * @example
 * usePageTitle('Pacientes');          // "VoxPEP — Pacientes"
 * usePageTitle('Maria Silva', true);  // "VoxPEP — Maria Silva"  (restored on unmount)
 */
export function usePageTitle(subtitle?: string, restoreOnUnmount = false) {
  useEffect(() => {
    const previous = document.title;
    document.title = subtitle ? `${BASE_TITLE} \u2014 ${subtitle}` : BASE_TITLE;

    return () => {
      if (restoreOnUnmount) {
        document.title = previous;
      }
    };
  }, [subtitle, restoreOnUnmount]);
}
