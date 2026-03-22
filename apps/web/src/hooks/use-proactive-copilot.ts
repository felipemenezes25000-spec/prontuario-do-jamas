import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useDebouncedValue } from '@/hooks/use-debounced-value';

interface ProactiveSuggestion {
  text: string;
  field: string;
  reason: string;
}

interface ProactiveCopilotResponse {
  suggestions: ProactiveSuggestion[];
}

export function useProactiveCopilot(
  text: string,
  encounterId: string,
  field: string,
) {
  const [debouncedText] = useDebouncedValue(text, 3000);

  return useQuery<ProactiveCopilotResponse>({
    queryKey: ['copilot', 'proactive', encounterId, field, debouncedText],
    queryFn: () =>
      api
        .post<ProactiveCopilotResponse>('/ai/copilot/proactive', {
          encounterId,
          currentText: debouncedText,
          field,
        })
        .then((r) => r.data),
    enabled:
      !!debouncedText && debouncedText.length > 30 && !!encounterId,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}
