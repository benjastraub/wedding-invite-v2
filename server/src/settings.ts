import type { Language, SiteSettings } from 'shared';

/**
 * Fallbacks used when the `settings` tab is missing or a value is empty.
 * Update these if you want different placeholder content while setting up.
 */
export const DEFAULT_SETTINGS: SiteSettings = {
  language: 'en',
  couple: { groom: 'Groom', bride: 'Bride' },
  wedding: {
    date: '',
    time: '',
    rsvpDeadline: '',
    rsvpDeadlineStrict: false,
    endDate: '',
    endTime: '',
    timezone: '',
  },
  venue: { name: '', address: '', mapsUrl: '' },
  dressCode: '',
  giftRegistryUrl: '',
  contactEmail: '',
  contactWhatsApp: '',
};

/** Values accepted as "yes" in boolean settings (same set as `allows_plus_one`). */
const TRUTHY_VALUES = new Set(['true', 'yes', '1', 'si', 'sí']);

function parseBoolean(value: string): boolean {
  return TRUTHY_VALUES.has(value.trim().toLowerCase());
}

/**
 * Converts the raw `settings` tab (key/value rows) into SiteSettings.
 * Unknown or missing keys fall back to defaults — no redeploy needed to
 * change any of these values.
 */
export function buildSettings(values: Map<string, string>): SiteSettings {
  const get = (key: string): string => values.get(key)?.trim() ?? '';

  const rawLanguage = get('site_language').toLowerCase();
  const language: Language = rawLanguage === 'es' || rawLanguage === 'spanish' ? 'es' : 'en';

  return {
    language,
    couple: {
      groom: get('couple_name_groom') || DEFAULT_SETTINGS.couple.groom,
      bride: get('couple_name_bride') || DEFAULT_SETTINGS.couple.bride,
    },
    wedding: {
      date: get('wedding_date'),
      time: get('wedding_time'),
      rsvpDeadline: get('rsvp_deadline'),
      rsvpDeadlineStrict: parseBoolean(get('rsvp_deadline_strict')),
      endDate: get('wedding_end_date'),
      endTime: get('wedding_end_time'),
      timezone: get('wedding_timezone'),
    },
    venue: {
      name: get('venue_name'),
      address: get('venue_address'),
      mapsUrl: get('venue_maps_url'),
    },
    dressCode: get('dress_code'),
    giftRegistryUrl: get('gift_registry_url'),
    contactEmail: get('contact_email'),
    contactWhatsApp: get('contact_whatsapp'),
  };
}
