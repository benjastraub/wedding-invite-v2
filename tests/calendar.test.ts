import { describe, expect, it } from 'vitest';
import { buildIcsEvent } from '../shared/src/calendar';

const BASE = {
  startDate: '2026-09-12',
  startTime: '17:00',
  endDate: '',
  endTime: '',
  timezone: '',
  summary: 'Emma & Liam — Wedding',
  location: 'Hacienda Los Rosales',
};

describe('buildIcsEvent', () => {
  it('returns null when the start date is missing', () => {
    expect(buildIcsEvent({ ...BASE, startDate: '' })).toBeNull();
  });

  it('returns null for an impossible start date', () => {
    expect(buildIcsEvent({ ...BASE, startDate: '2026-02-31' })).toBeNull();
  });

  it('emits UTC stamps when a timezone is set (Madrid summer, DST-aware)', () => {
    const ics = buildIcsEvent({ ...BASE, timezone: 'Europe/Madrid' });
    expect(ics).toContain('DTSTART:20260912T150000Z\r\n');
    expect(ics).toContain('DTEND:20260913T010000Z\r\n'); // start + 10h, still CEST
  });

  it('uses the explicit next-day end when provided', () => {
    const ics = buildIcsEvent({
      ...BASE,
      endDate: '2026-09-13',
      endTime: '02:00',
      timezone: 'Europe/Madrid',
    });
    expect(ics).toContain('DTSTART:20260912T150000Z\r\n');
    expect(ics).toContain('DTEND:20260913T000000Z\r\n');
  });

  it('rolls a same-day early end time into the next day', () => {
    const ics = buildIcsEvent({
      ...BASE,
      endTime: '02:00',
      timezone: 'Europe/Madrid',
    });
    expect(ics).toContain('DTEND:20260913T000000Z\r\n');
  });

  it('falls back to floating local times without a timezone', () => {
    const ics = buildIcsEvent({ ...BASE });
    expect(ics).toContain('DTSTART:20260912T170000\r\n');
    expect(ics).toContain('DTEND:20260913T030000\r\n'); // 17:00 + 10h rolls past midnight
  });

  it('falls back to floating local times for an invalid timezone', () => {
    const ics = buildIcsEvent({ ...BASE, timezone: 'Not/AZone' });
    expect(ics).toContain('DTSTART:20260912T170000\r\n');
  });

  it('escapes commas in the location', () => {
    const ics = buildIcsEvent({ ...BASE, location: 'Calle Flores 123, Ciudad' });
    expect(ics).toContain('LOCATION:Calle Flores 123\\, Ciudad');
  });

  it('omits LOCATION when empty', () => {
    const ics = buildIcsEvent({ ...BASE, location: '' });
    expect(ics).not.toContain('LOCATION');
  });

  it('includes venue notes and the maps link in the description', () => {
    const ics = buildIcsEvent({
      ...BASE,
      description:
        'Altos del Paico\nCam. Paico Alto S/N\n\nAbrir en Google Maps: https://maps.app.goo.gl/6DZQoatkNjYYb9gA8',
    });
    expect(ics).toContain('DESCRIPTION:');
    expect(ics).toContain('Altos del Paico');
    expect(ics).toContain('https://maps.app.goo.gl/6DZQoatkNjYYb9gA8');
    expect(ics).toContain('\\n'); // literal newlines are escaped
  });

  it('omits DESCRIPTION when not provided', () => {
    const ics = buildIcsEvent({ ...BASE });
    expect(ics).not.toContain('DESCRIPTION');
  });

  it('includes a stable UID and a full VCALENDAR envelope', () => {
    const ics = buildIcsEvent({ ...BASE });
    expect(ics).toContain('BEGIN:VCALENDAR\r\nVERSION:2.0');
    expect(ics).toContain('UID:wedding-20260912@wedding-invite');
    expect(ics).toMatch(/DTSTAMP:\d{8}T\d{6}Z/);
    expect(ics).toContain('SUMMARY:Emma & Liam — Wedding');
    expect(ics!.trimEnd().endsWith('END:VCALENDAR')).toBe(true);
  });
});
