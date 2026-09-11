import { describe, expect, it } from 'vitest';
import type { SiteSettings } from 'shared';
import { deadlinePassed, evaluateRsvpWindow, weddingHasEnded } from 'shared';

/** Settings with the wedding on 2026-09-12 17:00 Europe/Madrid unless overridden. */
function wedding(overrides: Partial<SiteSettings['wedding']> = {}): SiteSettings['wedding'] {
  return {
    date: '2026-09-12',
    time: '17:00',
    rsvpDeadline: '',
    rsvpDeadlineStrict: false,
    endDate: '',
    endTime: '',
    timezone: 'Europe/Madrid',
    ...overrides,
  };
}

/** Madrid is UTC+2 in September, so 17:00 wall clock = 15:00Z. */
const MADRID_START_UTC = Date.parse('2026-09-12T15:00:00Z');

describe('evaluateRsvpWindow', () => {
  it('is open when no dates are configured (fail open)', () => {
    expect(evaluateRsvpWindow(wedding({ date: '', time: '' }), MADRID_START_UTC)).toEqual({
      open: true,
      reason: null,
    });
  });

  it('is open while the wedding is still ahead', () => {
    expect(evaluateRsvpWindow(wedding(), MADRID_START_UTC - 1000).open).toBe(true);
  });

  it('closes once the wedding ends (explicit end date and time)', () => {
    const end = Date.parse('2026-09-13T00:00:00Z'); // 02:00 Madrid
    expect(evaluateRsvpWindow(wedding({ endDate: '2026-09-13', endTime: '02:00' }), end)).toEqual({
      open: false,
      reason: 'wedding_ended',
    });
  });

  it('defaults the end to start + 10 hours', () => {
    expect(weddingHasEnded(wedding(), MADRID_START_UTC + 9 * 60 * 60 * 1000)).toBe(false);
    expect(weddingHasEnded(wedding(), MADRID_START_UTC + 11 * 60 * 60 * 1000)).toBe(true);
  });

  it('rolls an end time on/before the start into the next day', () => {
    // 02:00 on the wedding day is before 17:00, so it means 02:00 the next day.
    const end = wedding({ endTime: '02:00' });
    expect(weddingHasEnded(end, Date.parse('2026-09-12T23:00:00Z'))).toBe(false);
    expect(weddingHasEnded(end, Date.parse('2026-09-13T01:00:00Z'))).toBe(true);
  });

  it('treats an unparseable date as open', () => {
    expect(evaluateRsvpWindow(wedding({ date: '2026-02-30' }), Date.now()).open).toBe(true);
  });

  describe('strict deadline', () => {
    const strict = { rsvpDeadline: '2026-08-01', rsvpDeadlineStrict: true };

    it('stays open through the whole deadline day (venue timezone)', () => {
      // 23:00 on Aug 1 in Madrid is 21:00Z.
      expect(deadlinePassed(wedding(strict), Date.parse('2026-08-01T20:59:00Z'))).toBe(false);
    });

    it('closes at midnight in the venue timezone', () => {
      // 00:30 on Aug 2 in Madrid is 22:30Z on Aug 1.
      expect(deadlinePassed(wedding(strict), Date.parse('2026-08-01T22:30:00Z'))).toBe(true);
      expect(evaluateRsvpWindow(wedding(strict), Date.parse('2026-08-01T22:30:00Z'))).toEqual({
        open: false,
        reason: 'deadline',
      });
    });

    it('compares UTC days when no timezone is set', () => {
      const noZone = { ...strict, timezone: '' };
      expect(deadlinePassed(wedding(noZone), Date.parse('2026-08-01T23:30:00Z'))).toBe(false);
      expect(deadlinePassed(wedding(noZone), Date.parse('2026-08-02T00:30:00Z'))).toBe(true);
    });

    it('ignores an unparseable deadline', () => {
      expect(deadlinePassed(wedding({ rsvpDeadline: 'soon', rsvpDeadlineStrict: true }))).toBe(false);
    });
  });

  it('ignores the deadline when it is not strict', () => {
    const deadline = { rsvpDeadline: '2020-01-01', rsvpDeadlineStrict: false };
    expect(evaluateRsvpWindow(wedding(deadline), Date.parse('2026-09-01T00:00:00Z')).open).toBe(true);
  });

  it('reports the wedding end when both the end and a strict deadline passed', () => {
    const past = {
      rsvpDeadline: '2020-01-01',
      rsvpDeadlineStrict: true,
      date: '2020-06-01',
      time: '17:00',
    };
    expect(evaluateRsvpWindow(wedding(past), Date.parse('2026-09-01T00:00:00Z'))).toEqual({
      open: false,
      reason: 'wedding_ended',
    });
  });
});
