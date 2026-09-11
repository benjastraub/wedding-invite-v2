import { describe, expect, it } from 'vitest';
import { en } from '../client/src/i18n/en';
import { es } from '../client/src/i18n/es';

describe('i18n dictionaries', () => {
  it('English and Spanish expose exactly the same keys', () => {
    const enKeys = Object.keys(en).sort();
    const esKeys = Object.keys(es).sort();
    expect(esKeys).toEqual(enKeys);
  });

  it('every translation is a non-empty string', () => {
    for (const [key, value] of Object.entries(en)) {
      expect(value, `en.${key}`).toBeTypeOf('string');
      expect(value.trim().length, `en.${key}`).toBeGreaterThan(0);
    }
    for (const [key, value] of Object.entries(es)) {
      expect(value, `es.${key}`).toBeTypeOf('string');
      expect(value.trim().length, `es.${key}`).toBeGreaterThan(0);
    }
  });

  it('placeholder tokens are identical across languages', () => {
    const placeholders = (text: string): string[] => text.match(/\{\w+\}/g) ?? [];
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      expect(placeholders(es[key])).toEqual(placeholders(en[key]));
    }
  });
});
