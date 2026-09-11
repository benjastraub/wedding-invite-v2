import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import type { Language } from 'shared';
import { en, type MessageKey } from './en';
import { es } from './es';

interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  /** Translates a message key, optionally interpolating {placeholders}. */
  t: (key: MessageKey, params?: Record<string, string>) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

const DICTIONARIES: Record<Language, Record<MessageKey, string>> = { en, es };

/**
 * Site language provider. The language is a SITE SETTING (from the sheet's
 * settings tab) — visitors never get a toggle. Pages call `setLanguage` after
 * fetching settings from the API.
 */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
  }, []);

  const t = useCallback(
    (key: MessageKey, params?: Record<string, string>) => {
      const template = DICTIONARIES[language][key] ?? en[key];
      if (!params) return template;
      return template.replace(/\{(\w+)\}/g, (_, name: string) => params[name] ?? '');
    },
    [language],
  );

  return <LanguageContext.Provider value={{ language, setLanguage, t }}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const value = useContext(LanguageContext);
  if (!value) throw new Error('useLanguage must be used inside <LanguageProvider>');
  return value;
}
