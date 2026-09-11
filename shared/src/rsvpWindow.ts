/**
 * Whether guests may still send an RSVP.
 *
 * Shared by the server (authoritative — it rejects closed submissions) and the
 * client (display only — it swaps the form for a notice), so both agree.
 *
 * Rules:
 * - The window fails **open**: a missing or unparseable date never closes it.
 * - The wedding ending closes the window for good (whatever the deadline says).
 * - `rsvpDeadlineStrict` makes `rsvpDeadline` binding: the deadline day itself
 *   is inclusive, and it ends at midnight in the venue timezone (UTC when the
 *   timezone is empty or invalid).
 * - Without `rsvpDeadlineStrict` the deadline stays informational — guests can
 *   still answer after it.
 */

import type { SiteSettings } from './types.js';
import { weddingInstants, type WeddingSchedule } from './calendar.js';

export type RsvpClosedReason = 'deadline' | 'wedding_ended';

export interface RsvpWindow {
  /** True while guests may still send an RSVP. */
  open: boolean;
  /** Why the window is closed; null while it is open. */
  reason: RsvpClosedReason | null;
}

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Calendar day (YYYY-MM-DD) of `nowMs` in `timezone`; UTC when unset/invalid. */
function calendarDay(nowMs: number, timezone: string): string {
  const tz = timezone.trim();
  if (tz) {
    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).formatToParts(new Date(nowMs));
      const value = (type: string): string => parts.find((p) => p.type === type)?.value ?? '';
      return `${value('year')}-${value('month')}-${value('day')}`;
    } catch {
      // Invalid timezone — fall back to the UTC day below.
    }
  }
  return new Date(nowMs).toISOString().slice(0, 10);
}

/** True once the wedding has ended (see `weddingInstants` for the end rule). */
export function weddingHasEnded(wedding: WeddingSchedule, nowMs: number = Date.now()): boolean {
  const instants = weddingInstants(wedding);
  return instants !== null && nowMs >= instants.endMs;
}

/** True when a strict deadline is set and its (inclusive) day is over. */
export function deadlinePassed(
  wedding: SiteSettings['wedding'],
  nowMs: number = Date.now(),
): boolean {
  if (!wedding.rsvpDeadlineStrict) return false;
  const deadline = wedding.rsvpDeadline.trim();
  if (!ISO_DATE_PATTERN.test(deadline)) return false;
  return calendarDay(nowMs, wedding.timezone) > deadline;
}

/** Current state of the RSVP window. */
export function evaluateRsvpWindow(
  wedding: SiteSettings['wedding'],
  nowMs: number = Date.now(),
): RsvpWindow {
  if (weddingHasEnded(wedding, nowMs)) return { open: false, reason: 'wedding_ended' };
  if (deadlinePassed(wedding, nowMs)) return { open: false, reason: 'deadline' };
  return { open: true, reason: null };
}
