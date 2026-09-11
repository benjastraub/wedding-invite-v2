import type { Language } from 'shared';

const LOCALES: Record<Language, string> = {
  en: 'en-US',
  es: 'es-ES',
};

/** "Saturday, September 12, 2026" style, localized to the site language. */
export function formatDate(isoDate: string, language: Language): string {
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString(LOCALES[language], {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/** "17:00" → "5:00 PM" (localized). Returns the raw string if unparseable. */
export function formatTime(time: string, language: Language): string {
  if (!time) return '';
  const date = new Date(`2000-01-01T${time}`);
  if (Number.isNaN(date.getTime())) return time;
  return date.toLocaleTimeString(LOCALES[language], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Countdown target from the sheet's date/time settings, or null if invalid. */
export function countdownTarget(date: string, time: string): Date | null {
  const iso = `${date || ''}${time ? `T${time}` : 'T00:00'}`;
  const target = new Date(iso);
  return Number.isNaN(target.getTime()) ? null : target;
}
