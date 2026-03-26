import { useCallback } from 'react';
import { announceMessage } from '@/components/accessibility/LiveRegion';

export function useAnnounce() {
  const announce = useCallback(
    (message: string, priority: 'polite' | 'assertive' = 'polite') => {
      announceMessage(message, priority);
    },
    [],
  );

  return { announce };
}
