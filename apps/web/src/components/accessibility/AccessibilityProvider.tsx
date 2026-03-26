import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

type FontSize = 'normal' | 'large' | 'extra-large';

interface AccessibilityContextValue {
  highContrast: boolean;
  reducedMotion: boolean;
  fontSize: FontSize;
  toggleHighContrast: () => void;
  toggleReducedMotion: () => void;
  setFontSize: (size: FontSize) => void;
}

const STORAGE_KEY = 'voxpep-accessibility';

interface StoredPreferences {
  highContrast: boolean;
  reducedMotion: boolean;
  fontSize: FontSize;
}

function loadPreferences(): StoredPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<StoredPreferences>;
      return {
        highContrast: parsed.highContrast === true,
        reducedMotion: parsed.reducedMotion === true,
        fontSize: (['normal', 'large', 'extra-large'] as const).includes(
          parsed.fontSize as FontSize,
        )
          ? (parsed.fontSize as FontSize)
          : 'normal',
      };
    }
  } catch {
    // ignore parse errors
  }
  return { highContrast: false, reducedMotion: false, fontSize: 'normal' };
}

function savePreferences(prefs: StoredPreferences) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // storage full — ignore
  }
}

const AccessibilityContext = createContext<AccessibilityContextValue | null>(null);

const FONT_SIZE_MAP: Record<FontSize, string> = {
  normal: '16px',
  large: '18px',
  'extra-large': '20px',
};

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [highContrast, setHighContrast] = useState(() => loadPreferences().highContrast);
  const [reducedMotion, setReducedMotion] = useState(() => loadPreferences().reducedMotion);
  const [fontSize, setFontSizeState] = useState<FontSize>(() => loadPreferences().fontSize);

  // Apply to <html> element
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('high-contrast', highContrast);
    root.classList.toggle('reduce-motion', reducedMotion);
    root.style.fontSize = FONT_SIZE_MAP[fontSize];

    savePreferences({ highContrast, reducedMotion, fontSize });
  }, [highContrast, reducedMotion, fontSize]);

  const toggleHighContrast = useCallback(() => setHighContrast((v) => !v), []);
  const toggleReducedMotion = useCallback(() => setReducedMotion((v) => !v), []);
  const setFontSize = useCallback((size: FontSize) => setFontSizeState(size), []);

  const value = useMemo<AccessibilityContextValue>(
    () => ({
      highContrast,
      reducedMotion,
      fontSize,
      toggleHighContrast,
      toggleReducedMotion,
      setFontSize,
    }),
    [highContrast, reducedMotion, fontSize, toggleHighContrast, toggleReducedMotion, setFontSize],
  );

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility(): AccessibilityContextValue {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return ctx;
}
