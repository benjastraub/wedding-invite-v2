/** Language of the site. A site-wide setting, never chosen by visitors. */
export type Language = 'en' | 'es';

/** RSVP answer. */
export type Attendance = 'yes' | 'no';

/** Lifecycle of a guest row in the sheet. */
export type GuestStatus = 'invited' | 'responded';

/**
 * Site-wide configuration. Most values come from the `settings` tab of the
 * Google Sheet at runtime; the server fills in fallback defaults.
 */
export interface SiteSettings {
  language: Language;
  couple: {
    groom: string;
    bride: string;
  };
  wedding: {
    /** ISO date, e.g. "2026-09-12" */
    date: string;
    /** 24h time, e.g. "17:00" */
    time: string;
    /** ISO date after which the form closes (informative only). */
    rsvpDeadline: string;
    /** ISO date the event ends, e.g. "2026-09-13"; empty = same day as `date`. */
    endDate: string;
    /** 24h end time, e.g. "02:00"; empty = start + 10 hours (calendar .ics only). */
    endTime: string;
    /** IANA timezone, e.g. "Europe/Madrid"; used by the "Add to calendar" .ics. */
    timezone: string;
  };
  venue: {
    name: string;
    address: string;
    mapsUrl: string;
  };
  dressCode: string;
  giftRegistryUrl: string;
  /** Optional contact email shown to guests who already responded. */
  contactEmail: string;
  /** Optional WhatsApp link (https://wa.me/…) shown to guests who already responded. */
  contactWhatsApp: string;
}

/** One row of the `guests` tab. */
export interface GuestRow {
  token: string;
  /** Full name — used for management and stored with responses. */
  name: string;
  allowsPlusOne: boolean;
  plusOneName: string;
  /** Name shown in the greeting; falls back to `name` when the sheet cell is empty. */
  displayName: string;
  /** +1 name shown in the greeting; falls back to `plusOneName` when the sheet cell is empty. */
  plusOneDisplayName: string;
  status: GuestStatus;
}

/** One saved RSVP from the `responses` tab — what a guest answered. */
export interface GuestResponse {
  /** ISO timestamp of the saved response. */
  timestamp: string;
  attending: Attendance;
  /** "yes"/"no" — whether a +1 guest is actually bringing their +1. */
  bringingPlusOne?: 'yes' | 'no';
  plusOneName?: string;
  dietaryGuest?: string;
  dietaryPlusOne?: string;
  songRequest?: string;
  comments?: string;
}

/** Payload of GET /api/guest/:token */
export interface GuestViewResponse {
  settings: SiteSettings;
  guest: GuestRow;
  /** Saved answers for guests who already responded; otherwise null. */
  response: GuestResponse | null;
}

/** Payload of POST /api/guest/:token/rsvp */
export interface RsvpPayload {
  attending: Attendance;
  /** "yes"/"no" — whether a +1 guest is actually bringing their +1. */
  bringingPlusOne?: 'yes' | 'no';
  plusOneName?: string;
  dietaryGuest?: string;
  dietaryPlusOne?: string;
  songRequest?: string;
  comments?: string;
}

/** Tokens are URL-safe and case-sensitive: letters, digits, `_` and `-`. */
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

export function isValidToken(token: string): boolean {
  return TOKEN_PATTERN.test(token);
}
