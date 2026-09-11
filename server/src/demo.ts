import type { GuestRow } from 'shared';
import type { SheetsStore } from './sheets.js';
import { toResponse } from './sheets.js';
import type { PhotoStore, PhotoStream } from './drive.js';

/**
 * Demo mode: built-in sample data so the site runs with zero Google setup.
 * Activated when GOOGLE_SPREADSHEET_ID is not set (see index.ts).
 *
 * Everything lives in memory and is reset on restart — this mode exists for
 * previews, contributors and screenshots, not for real weddings.
 */

/** Two sample guests whose links work out of the box: /invite/demo and /invite/demo-solo */
const DEMO_GUESTS: GuestRow[] = [
  {
    token: 'demo',
    name: 'María García',
    allowsPlusOne: true,
    plusOneName: 'Carlos García',
    displayName: 'María',
    plusOneDisplayName: 'Carlos',
    status: 'invited',
  },
  {
    token: 'demo-solo',
    name: 'John Smith',
    allowsPlusOne: false,
    plusOneName: '',
    displayName: 'John',
    plusOneDisplayName: '',
    status: 'invited',
  },
];

/** TEMPORARY (local preview): the wedding is over, so the post-wedding message shows. */
function demoWeddingDate(): string {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return date.toISOString().slice(0, 10);
}

export function createDemoSheetsStore(): SheetsStore {
  const settings = new Map<string, string>([
    ['couple_name_groom', 'Alex'],
    ['couple_name_bride', 'Sam'],
    ['wedding_date', demoWeddingDate()],
    ['wedding_time', '17:00'],
    ['wedding_timezone', 'Europe/Madrid'],
    ['venue_name', 'The Rose Garden'],
    ['venue_address', '1 Garden Lane, Demo City'],
    ['dress_code', 'Semi-formal'],
    ['gift_registry_url', 'https://example.com/gift-registry'],
    // TEMPORARY (local preview): a past strict deadline closes the RSVP window.
    ['rsvp_deadline', '2026-08-01'],
    ['rsvp_deadline_strict', 'TRUE'],
    ['site_language', 'en'],
  ]);
  const guests = new Map(DEMO_GUESTS.map((guest) => [guest.token, { ...guest }]));
  const responses: string[][] = [];

  return {
    readSettings: async () => settings,

    findGuestByToken: async (token) => guests.get(token) ?? null,

    findResponseByToken: async (token) => {
      // Rows are stored in append order, so the last match is the newest answer.
      for (let i = responses.length - 1; i >= 0; i--) {
        if ((responses[i][1] ?? '').trim() === token) return toResponse(responses[i]);
      }
      return null;
    },

    appendResponse: async (values) => {
      responses.push(values);
    },

    markGuestResponded: async (token) => {
      const guest = guests.get(token);
      if (guest) guest.status = 'responded';
    },
  };
}

/** Placeholder photos served straight from the SPA's static files. */
export function createDemoPhotoStore(): PhotoStore {
  return {
    listPhotos: async () => ({
      hero: '/images/demo/hero.svg',
      photos: ['/images/demo/1.svg', '/images/demo/2.svg', '/images/demo/3.svg'],
    }),
    streamPhoto: async (_id): Promise<PhotoStream | null> => null,
  };
}
