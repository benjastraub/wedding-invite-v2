import type { GuestResponse, RsvpPayload } from 'shared';

export const MAX_LENGTHS = {
  plusOneName: 100,
  dietary: 300,
  song: 200,
  comments: 1000,
} as const;

/**
 * Turns arbitrary user input into a clean, trimmed, length-limited string.
 * Returns undefined when there is nothing left worth saving.
 */
export function sanitizeText(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const cleaned = value
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
  return cleaned.length > 0 ? cleaned : undefined;
}

type RsvpResult =
  | { ok: true; data: RsvpPayload }
  | { ok: false; error: string };

/**
 * Validates and sanitizes an RSVP request body. Never trusts the client.
 */
export function validateRsvp(body: unknown): RsvpResult {
  if (typeof body !== 'object' || body === null) {
    return { ok: false, error: 'invalid_payload' };
  }
  const b = body as Record<string, unknown>;

  if (b.attending !== 'yes' && b.attending !== 'no') {
    return { ok: false, error: 'invalid_attending' };
  }

  if (b.bringingPlusOne !== undefined && b.bringingPlusOne !== 'yes' && b.bringingPlusOne !== 'no') {
    return { ok: false, error: 'invalid_bringing_plus_one' };
  }
  if (b.bringingPlusOne === 'yes' && b.attending !== 'yes') {
    return { ok: false, error: 'invalid_bringing_plus_one' };
  }

  const data: RsvpPayload = { attending: b.attending };
  if (b.bringingPlusOne === 'yes' || b.bringingPlusOne === 'no') {
    data.bringingPlusOne = b.bringingPlusOne;
  }

  const plusOneName = sanitizeText(b.plusOneName, MAX_LENGTHS.plusOneName);
  if (plusOneName) data.plusOneName = plusOneName;

  // The couple needs to know who is coming: require a name when a +1 is joining.
  if (b.bringingPlusOne === 'yes' && !plusOneName) {
    return { ok: false, error: 'plus_one_name_required' };
  }

  const dietaryGuest = sanitizeText(b.dietaryGuest, MAX_LENGTHS.dietary);
  if (dietaryGuest) data.dietaryGuest = dietaryGuest;

  const dietaryPlusOne = sanitizeText(b.dietaryPlusOne, MAX_LENGTHS.dietary);
  if (dietaryPlusOne) data.dietaryPlusOne = dietaryPlusOne;

  const songRequest = sanitizeText(b.songRequest, MAX_LENGTHS.song);
  if (songRequest) data.songRequest = songRequest;

  const comments = sanitizeText(b.comments, MAX_LENGTHS.comments);
  if (comments) data.comments = comments;

  return { ok: true, data };
}

/**
 * How far back an identical response counts as a duplicate. Double submits
 * (double-click, double-Enter) arrive within milliseconds; this window also
 * covers slow Sheets writes followed by an immediate retry.
 */
export const DUPLICATE_WINDOW_MS = 30_000;

/**
 * True when `nextValues` (a row about to be appended to the `responses` tab)
 * is the same answer as the guest's latest saved response and that response
 * is younger than `windowMs`. Used to make the RSVP POST idempotent.
 *
 * Row layout: 0 timestamp | 1 token | 2 guest_name | 3 attending
 * | 4 plus_one_name | 5 dietary_guest | 6 dietary_plus_one
 * | 7 song_request | 8 comments | 9 bringing_plus_one
 * (token and guest_name are skipped — the token is already the lookup key).
 */
export function isRecentDuplicate(
  previous: GuestResponse,
  nextValues: string[],
  nowMs: number,
  windowMs: number = DUPLICATE_WINDOW_MS,
): boolean {
  const previousAt = Date.parse(previous.timestamp);
  if (Number.isNaN(previousAt)) return false;
  if (nowMs - previousAt > windowMs || nowMs < previousAt) return false;

  const pick = (index: number) => (nextValues[index] ?? '').trim();
  return (
    previous.attending === pick(3) &&
    (previous.plusOneName ?? '') === pick(4) &&
    (previous.dietaryGuest ?? '') === pick(5) &&
    (previous.dietaryPlusOne ?? '') === pick(6) &&
    (previous.songRequest ?? '') === pick(7) &&
    (previous.comments ?? '') === pick(8) &&
    (previous.bringingPlusOne ?? '') === pick(9)
  );
}
