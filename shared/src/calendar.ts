/**
 * Generates a standards-compliant .ics (iCalendar) file for the wedding
 * event. Pure function — no DOM or Node APIs — so it runs identically in
 * the browser, on the server, and in unit tests.
 *
 * Rules:
 * - Returns `null` when the start date/time is missing or invalid.
 * - End instant: explicit `endDate`/`endTime` when both parse, otherwise
 *   start + 10 hours. An end time on/before the start (e.g. "02:00" on the
 *   wedding day) is rolled 24h forward — the party runs into the next day.
 * - Timezone: when `timezone` is a valid IANA name, both instants are
 *   converted to UTC (DST-safe) and emitted with a `Z` suffix. Otherwise
 *   floating local times are emitted, which calendar apps show in the
 *   viewer's own timezone.
 */

export interface IcsEventInput {
  /** ISO date the event starts, e.g. "2026-09-12". */
  startDate: string;
  /** 24h start time, e.g. "17:00". */
  startTime: string;
  /** ISO date the event ends; defaults to `startDate`. */
  endDate: string;
  /** 24h end time; defaults to start + 10 hours. */
  endTime: string;
  /** IANA timezone, e.g. "Europe/Madrid"; empty = floating local times. */
  timezone: string;
  summary: string;
  location: string;
  /** Optional notes shown with the event (e.g. venue + maps link). */
  description?: string;
}

const FALLBACK_DURATION_HOURS = 10;
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

/** Parses "YYYY-MM-DD" + "H:MM" into ms (treated as wall-clock UTC). */
function parseWallTime(date: string, time: string): number | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim());
  const timeMatch = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!dateMatch || !timeMatch) return null;

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  if (hour > 23 || minute > 59) return null;

  const ms = Date.UTC(year, month - 1, day, hour, minute);
  // Date.UTC rolls impossible dates over (e.g. 2026-02-31 → Mar 3) — reject.
  const d = new Date(ms);
  if (
    d.getUTCFullYear() !== year ||
    d.getUTCMonth() !== month - 1 ||
    d.getUTCDate() !== day ||
    d.getUTCHours() !== hour ||
    d.getUTCMinutes() !== minute
  ) {
    return null;
  }
  return ms;
}

/** Offset (ms) between UTC and `timeZone` at `utcMs`. Throws on invalid zones. */
function timezoneOffsetMs(utcMs: number, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts: Record<string, string> = {};
  for (const part of dtf.formatToParts(new Date(utcMs))) parts[part.type] = part.value;
  const wallAsUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second),
  );
  return wallAsUtc - utcMs;
}

/** Converts a wall-clock instant (ms, as-if-UTC) to true UTC ms in `timeZone`. */
function wallToUtcMs(wallMs: number, timeZone: string): number {
  return wallMs - timezoneOffsetMs(wallMs, timeZone);
}

function formatUtc(ms: number): string {
  const d = new Date(ms);
  return (
    `${d.getUTCFullYear()}${pad2(d.getUTCMonth() + 1)}${pad2(d.getUTCDate())}` +
    `T${pad2(d.getUTCHours())}${pad2(d.getUTCMinutes())}00Z`
  );
}

function formatFloating(ms: number): string {
  const d = new Date(ms);
  return (
    `${d.getUTCFullYear()}${pad2(d.getUTCMonth() + 1)}${pad2(d.getUTCDate())}` +
    `T${pad2(d.getUTCHours())}${pad2(d.getUTCMinutes())}00`
  );
}

/** Escapes an iCal text value and folds it to ≤75 octets per line. */
function escapeAndFold(field: string, value: string): string[] {
  const escaped = value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');

  const MAX = 75;
  const lines: string[] = [];
  let current = `${field}:${escaped}`;
  while (current.length > MAX) {
    let cut = MAX;
    // Prefer breaking just before a space so words/URLs stay intact; the
    // space moves to the continuation line and survives unfolding.
    const space = current.lastIndexOf(' ', MAX - 1);
    if (space > 0) cut = space;
    lines.push(current.slice(0, cut));
    current = ` ${current.slice(cut)}`;
  }
  lines.push(current);
  return lines;
}

/** Wall-clock end instant (ms, as-if-UTC) for an event starting at `startMs`. */
function eventEndWallMs(
  startMs: number,
  endDate: string,
  endTime: string,
  startDate: string,
): number {
  let endMs: number | null = null;
  if (endTime.trim()) {
    endMs = parseWallTime(endDate.trim() || startDate, endTime);
  }
  if (endMs === null) return startMs + FALLBACK_DURATION_HOURS * HOUR_MS;
  // End on/before the start (e.g. 02:00 on the wedding day) means next day.
  return endMs <= startMs ? endMs + DAY_MS : endMs;
}

/**
 * Builds the full .ics file content, or null when the start is unusable.
 */
export function buildIcsEvent(input: IcsEventInput): string | null {
  const startMs = parseWallTime(input.startDate, input.startTime);
  if (startMs === null) return null;

  const endMs = eventEndWallMs(startMs, input.endDate, input.endTime, input.startDate);

  const timezone = input.timezone.trim();
  let startStamp: string;
  let endStamp: string;
  if (timezone) {
    try {
      startStamp = formatUtc(wallToUtcMs(startMs, timezone));
      endStamp = formatUtc(wallToUtcMs(endMs, timezone));
    } catch {
      startStamp = formatFloating(startMs);
      endStamp = formatFloating(endMs);
    }
  } else {
    startStamp = formatFloating(startMs);
    endStamp = formatFloating(endMs);
  }

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Wedding Invite//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:wedding-${input.startDate.replace(/-/g, '')}@wedding-invite`,
    `DTSTAMP:${formatUtc(Date.now())}`,
    `DTSTART:${startStamp}`,
    `DTEND:${endStamp}`,
    ...escapeAndFold('SUMMARY', input.summary),
  ];
  if (input.location) lines.push(...escapeAndFold('LOCATION', input.location));
  if (input.description) lines.push(...escapeAndFold('DESCRIPTION', input.description));
  lines.push('END:VEVENT', 'END:VCALENDAR');

  return lines.join('\r\n') + '\r\n';
}

/** The `wedding` slice of `SiteSettings`, as stored in the sheet. */
export interface WeddingSchedule {
  /** ISO date, e.g. "2026-09-12". */
  date: string;
  /** 24h time, e.g. "17:00"; empty = midnight. */
  time: string;
  /** ISO date the event ends; empty = same day as `date`. */
  endDate: string;
  /** 24h end time; empty = start + 10 hours (a full day when `time` is empty). */
  endTime: string;
  /** IANA timezone, e.g. "Europe/Madrid"; empty = UTC-based comparison. */
  timezone: string;
}

/**
 * Start and end instants of the wedding as true UTC milliseconds, or null
 * when the date is unusable.
 *
 * Uses the same end rule as the `.ics` event (explicit end, else start + 10h,
 * rolling a too-early end time into the next day). A date without a start
 * time covers that whole day. When `timezone` is empty or invalid the values
 * are treated as UTC so the server and every browser agree on the instant.
 */
export function weddingInstants(wedding: WeddingSchedule): { startMs: number; endMs: number } | null {
  const hasStartTime = Boolean(wedding.time.trim());
  const startWallMs = parseWallTime(wedding.date, hasStartTime ? wedding.time : '00:00');
  if (startWallMs === null) return null;

  const endWallMs = hasStartTime
    ? eventEndWallMs(startWallMs, wedding.endDate, wedding.endTime, wedding.date)
    : startWallMs + DAY_MS - 1;

  const timezone = wedding.timezone.trim();
  if (timezone) {
    try {
      return {
        startMs: wallToUtcMs(startWallMs, timezone),
        endMs: wallToUtcMs(endWallMs, timezone),
      };
    } catch {
      // Invalid timezone — fall back to the UTC-based comparison below.
    }
  }
  return { startMs: startWallMs, endMs: endWallMs };
}
