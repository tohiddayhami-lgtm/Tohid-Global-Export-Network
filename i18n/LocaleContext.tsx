import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { en, type MessageKey } from './en.ts';
import { fa } from './fa.ts';

const STORAGE_KEY = 'tgn-locale';

export type Locale = 'en' | 'fa';

function readInitialLocale(): Locale {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s === 'fa' || s === 'en') return s;
  } catch {
    /* ignore */
  }
  if (typeof navigator !== 'undefined' && /^fa/i.test(navigator.language)) return 'fa';
  return 'en';
}

function format(template: string, vars: Record<string, string | number>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k: string) => String(vars[k] ?? ''));
}

type LocaleContextValue = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() =>
    typeof window !== 'undefined' ? readInitialLocale() : 'en'
  );

  useEffect(() => {
    document.documentElement.lang = locale === 'fa' ? 'fa' : 'en';
    document.documentElement.dir = locale === 'fa' ? 'rtl' : 'ltr';
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      /* ignore */
    }
  }, [locale]);

  const setLocale = useCallback((l: Locale) => setLocaleState(l), []);

  const table = locale === 'fa' ? fa : en;

  const t = useCallback(
    (key: MessageKey, vars?: Record<string, string | number>) => {
      const raw = table[key];
      return vars ? format(raw, vars) : raw;
    },
    [table]
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider');
  return ctx;
}

export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { locale, setLocale, t } = useLocale();
  return (
    <div
      className={`inline-flex items-center gap-1 rounded-full border border-border bg-white/80 p-0.5 text-[11px] font-medium text-ink ${className}`}
      role="group"
      aria-label={t('language')}
    >
      <button
        type="button"
        onClick={() => setLocale('en')}
        className={`rounded-full px-2 py-1 transition-colors touch-manipulation ${
          locale === 'en' ? 'bg-ink text-white' : 'hover:bg-hover text-ink-soft'
        }`}
      >
        {t('langEnglish')}
      </button>
      <button
        type="button"
        onClick={() => setLocale('fa')}
        className={`rounded-full px-2 py-1 transition-colors touch-manipulation ${
          locale === 'fa' ? 'bg-ink text-white' : 'hover:bg-hover text-ink-soft'
        }`}
      >
        {t('langPersian')}
      </button>
    </div>
  );
}
