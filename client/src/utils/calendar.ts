import { buildIcsEvent } from 'shared';
import type { SiteSettings } from 'shared';

/**
 * Builds the wedding event's .ics file and returns a blob URL for it, or
 * null when the settings lack a usable start date/time.
 */
export function makeCalendarUrl(
  settings: SiteSettings,
  summary: string,
  description: string,
): string | null {
  const { wedding, venue } = settings;
  const ics = buildIcsEvent({
    startDate: wedding.date,
    startTime: wedding.time,
    endDate: wedding.endDate,
    endTime: wedding.endTime,
    timezone: wedding.timezone,
    summary,
    location: [venue.name, venue.address].filter(Boolean).join(', '),
    description,
  });
  if (!ics) return null;

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  return URL.createObjectURL(blob);
}
