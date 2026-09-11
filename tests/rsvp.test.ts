import { describe, expect, it } from 'vitest';
import type { GuestResponse } from 'shared';
import { isRecentDuplicate, MAX_LENGTHS, sanitizeText, validateRsvp } from '../server/src/rsvp';

describe('validateRsvp', () => {
  it('accepts a minimal "yes" payload', () => {
    const result = validateRsvp({ attending: 'yes' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.attending).toBe('yes');
      expect(result.data.plusOneName).toBeUndefined();
      expect(result.data.songRequest).toBeUndefined();
    }
  });

  it('accepts a full payload and keeps sanitized optional fields', () => {
    const result = validateRsvp({
      attending: 'yes',
      plusOneName: '  Maria ',
      dietaryGuest: 'No nuts',
      dietaryPlusOne: 'Vegan',
      songRequest: 'Dancing Queen',
      comments: 'So happy for you!',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.plusOneName).toBe('Maria');
      expect(result.data.dietaryGuest).toBe('No nuts');
      expect(result.data.songRequest).toBe('Dancing Queen');
    }
  });

  it('rejects missing or invalid attending values', () => {
    expect(validateRsvp({})).toEqual({ ok: false, error: 'invalid_attending' });
    expect(validateRsvp({ attending: 'maybe' })).toEqual({ ok: false, error: 'invalid_attending' });
    expect(validateRsvp('yes')).toEqual({ ok: false, error: 'invalid_payload' });
    expect(validateRsvp(null)).toEqual({ ok: false, error: 'invalid_payload' });
  });

  it('accepts bringingPlusOne as yes or no', () => {
    expect(validateRsvp({ attending: 'yes', bringingPlusOne: 'yes', plusOneName: 'Maria' })).toEqual({
      ok: true,
      data: { attending: 'yes', bringingPlusOne: 'yes', plusOneName: 'Maria' },
    });
    expect(validateRsvp({ attending: 'yes', bringingPlusOne: 'no' })).toEqual({
      ok: true,
      data: { attending: 'yes', bringingPlusOne: 'no' },
    });
  });

  it('requires a plusOneName when bringingPlusOne is yes', () => {
    expect(validateRsvp({ attending: 'yes', bringingPlusOne: 'yes' })).toEqual({
      ok: false,
      error: 'plus_one_name_required',
    });
    expect(validateRsvp({ attending: 'yes', bringingPlusOne: 'yes', plusOneName: '   ' })).toEqual({
      ok: false,
      error: 'plus_one_name_required',
    });
    const ok = validateRsvp({ attending: 'yes', bringingPlusOne: 'yes', plusOneName: '  Maria ' });
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.data.plusOneName).toBe('Maria');
  });

  it('rejects bringingPlusOne yes when not attending', () => {
    expect(validateRsvp({ attending: 'no', bringingPlusOne: 'yes', plusOneName: 'Maria' })).toEqual({
      ok: false,
      error: 'invalid_bringing_plus_one',
    });
  });

  it('omits bringingPlusOne when absent and rejects invalid values', () => {
    const absent = validateRsvp({ attending: 'yes' });
    expect(absent.ok).toBe(true);
    if (absent.ok) expect(absent.data.bringingPlusOne).toBeUndefined();

    expect(validateRsvp({ attending: 'yes', bringingPlusOne: 'maybe' })).toEqual({
      ok: false,
      error: 'invalid_bringing_plus_one',
    });
    expect(validateRsvp({ attending: 'yes', bringingPlusOne: 1 })).toEqual({
      ok: false,
      error: 'invalid_bringing_plus_one',
    });
  });

  it('drops empty/whitespace-only optional fields', () => {
    const result = validateRsvp({ attending: 'no', comments: '   ' });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.comments).toBeUndefined();
  });

  it('ignores unknown extra fields', () => {
    const result = validateRsvp({ attending: 'yes', surprise: 'field' });
    expect(result.ok).toBe(true);
    if (result.ok) expect('surprise' in result.data).toBe(false);
  });
});

describe('sanitizeText', () => {
  it('trims and collapses whitespace', () => {
    expect(sanitizeText('  hello   world  ', 100)).toBe('hello world');
  });

  it('strips control characters', () => {
    expect(sanitizeText('a\u0000b\u001Fc', 10)).toBe('a b c');
  });

  it('truncates to the maximum length', () => {
    expect(sanitizeText('x'.repeat(100), 10)).toBe('x'.repeat(10));
  });

  it('returns undefined for non-strings and empty results', () => {
    expect(sanitizeText(42, 10)).toBeUndefined();
    expect(sanitizeText(undefined, 10)).toBeUndefined();
    expect(sanitizeText('   ', 10)).toBeUndefined();
  });

  it('MAX_LENGTHS bounds every optional RSVP field', () => {
    expect(MAX_LENGTHS.comments).toBeGreaterThanOrEqual(100);
  });
});

describe('isRecentDuplicate', () => {
  const NOW = Date.parse('2026-09-01T12:00:00.000Z');

  // The row about to be appended to the `responses` tab (columns A–J).
  const values = [
    '2026-09-01T12:00:00.000Z', // timestamp (ignored)
    'some-token', // token (ignored — lookup key)
    'María García', // guest_name (ignored)
    'yes', // attending
    'Maria', // plus_one_name
    '', // dietary_guest
    '', // dietary_plus_one
    'Dancing Queen', // song_request
    '', // comments
    '', // bringing_plus_one
  ];

  function previous(overrides: Partial<GuestResponse> = {}): GuestResponse {
    return {
      timestamp: new Date(NOW - 1000).toISOString(),
      attending: 'yes',
      plusOneName: 'Maria',
      songRequest: 'Dancing Queen',
      ...overrides,
    };
  }

  it('matches an identical response inside the window', () => {
    expect(isRecentDuplicate(previous(), values, NOW)).toBe(true);
  });

  it('rejects an identical response outside the window', () => {
    expect(isRecentDuplicate(previous(), values, NOW + 31_000)).toBe(false);
  });

  it('rejects content that differs from the latest response', () => {
    expect(isRecentDuplicate(previous({ attending: 'no' }), values, NOW)).toBe(false);
    expect(isRecentDuplicate(previous({ songRequest: 'Another one' }), values, NOW)).toBe(false);
  });

  it('rejects when a previously empty field now has a value', () => {
    const changed = [...values];
    changed[8] = 'New comment'; // comments
    expect(isRecentDuplicate(previous({ comments: undefined }), changed, NOW)).toBe(false);
  });

  it('treats an unparseable timestamp as not a duplicate', () => {
    expect(isRecentDuplicate(previous({ timestamp: 'not-a-date' }), values, NOW)).toBe(false);
  });
});
