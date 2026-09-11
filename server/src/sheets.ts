import { auth, sheets } from '@googleapis/sheets';
import type { Attendance, GuestResponse, GuestRow, GuestStatus } from 'shared';
import { isValidToken } from 'shared';

/**
 * Google Sheets access for the site.
 *
 * Authentication (dual mode, same code path — Google's default ADC resolution):
 *  - Local dev: `GOOGLE_APPLICATION_CREDENTIALS` env → service account JSON key.
 *  - Cloud Run: the service runs AS the service account → automatic credentials
 *    from the metadata server, no key file anywhere in production.
 *
 * IMPORTANT: the service account does not need any IAM role on the GCP project.
 * Access to the spreadsheet is granted by sharing the sheet with the service
 * account email as EDITOR.
 */

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

const SETTINGS_TTL_MS = 30_000; // settings change rarely
const GUESTS_TTL_MS = 15_000; // guests list changes rarely
const RESPONSES_TTL_MS = 15_000; // responses change rarely

export interface SheetsStore {
  /** Raw key/value rows from the `settings` tab. */
  readSettings(): Promise<Map<string, string>>;
  /** Finds a guest by token in the `guests` tab. */
  findGuestByToken(token: string): Promise<GuestRow | null>;
  /** Finds a guest's latest saved RSVP in the `responses` tab. */
  findResponseByToken(token: string): Promise<GuestResponse | null>;
  /** Appends one row to the `responses` tab. */
  appendResponse(values: string[]): Promise<void>;
  /** Marks the guest's `status` cell as "responded". */
  markGuestResponded(token: string): Promise<void>;
}

export function createSheetsStore(spreadsheetId: string): SheetsStore {
  const client = sheets({
    version: 'v4',
    auth: new auth.GoogleAuth({ scopes: SCOPES }),
  });

  let settingsCache: { at: number; map: Map<string, string> } | null = null;
  let guestsCache: { at: number; rows: string[][] } | null = null;
  let responsesCache: { at: number; rows: string[][] } | null = null;

  async function readTab(range: string): Promise<string[][]> {
    const res = await client.spreadsheets.values.get({ spreadsheetId, range });
    return res.data.values ?? [];
  }

  async function readSettings(): Promise<Map<string, string>> {
    if (settingsCache && Date.now() - settingsCache.at < SETTINGS_TTL_MS) {
      return settingsCache.map;
    }
    let rows: string[][] = [];
    try {
      // Columns A (key) and B (value); C holds human-readable instructions.
      rows = await readTab('settings!A2:B');
    } catch (err) {
      // The settings tab may not exist yet — fall back to defaults rather than
      // taking the whole site down.
      console.warn('[sheets] could not read the settings tab:', err);
    }
    const map = new Map<string, string>();
    for (const [key, value] of rows) {
      if (key && typeof value === 'string') {
        map.set(key.trim(), value.trim());
      }
    }
    settingsCache = { at: Date.now(), map };
    return map;
  }

  async function loadGuests(): Promise<string[][]> {
    if (guestsCache && Date.now() - guestsCache.at < GUESTS_TTL_MS) {
      return guestsCache.rows;
    }
    const rows = await readTab('guests!A2:H');
    guestsCache = { at: Date.now(), rows };
    return rows;
  }

  async function findGuestByToken(token: string): Promise<GuestRow | null> {
    if (!isValidToken(token)) return null;
    const rows = await loadGuests();
    const row = rows.find((r) => (r[0] ?? '').trim() === token);
    return row ? toGuest(row) : null;
  }

  async function loadResponses(): Promise<string[][]> {
    if (responsesCache && Date.now() - responsesCache.at < RESPONSES_TTL_MS) {
      return responsesCache.rows;
    }
    const rows = await readTab('responses!A2:J');
    responsesCache = { at: Date.now(), rows };
    return rows;
  }

  async function findResponseByToken(token: string): Promise<GuestResponse | null> {
    if (!isValidToken(token)) return null;
    const rows = await loadResponses();
    // Rows are stored in append order, so the last match is the newest answer.
    for (let i = rows.length - 1; i >= 0; i--) {
      const row = rows[i];
      if ((row[1] ?? '').trim() === token) return toResponse(row);
    }
    return null;
  }

  async function appendResponse(values: string[]): Promise<void> {
    await client.spreadsheets.values.append({
      spreadsheetId,
      range: 'responses!A:J',
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [values] },
    });
    responsesCache = null; // new row — drop the cache
  }

  async function markGuestResponded(token: string): Promise<void> {
    const rows = await loadGuests();
    const index = rows.findIndex((r) => (r[0] ?? '').trim() === token);
    if (index < 0) return;
    const rowNumber = index + 2; // row 1 = headers
    await client.spreadsheets.values.update({
      spreadsheetId,
      range: `guests!E${rowNumber}:E${rowNumber}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [['responded']] },
    });
    guestsCache = null; // status changed — drop the cache
  }

  return { readSettings, findGuestByToken, findResponseByToken, appendResponse, markGuestResponded };
}

export function toResponse(row: string[]): GuestResponse {
  const attending: Attendance = (row[3] ?? '').trim().toLowerCase() === 'no' ? 'no' : 'yes';
  const response: GuestResponse = {
    timestamp: (row[0] ?? '').trim(),
    attending,
  };
  const plusOneName = (row[4] ?? '').trim();
  if (plusOneName) response.plusOneName = plusOneName;
  const dietaryGuest = (row[5] ?? '').trim();
  if (dietaryGuest) response.dietaryGuest = dietaryGuest;
  const dietaryPlusOne = (row[6] ?? '').trim();
  if (dietaryPlusOne) response.dietaryPlusOne = dietaryPlusOne;
  const songRequest = (row[7] ?? '').trim();
  if (songRequest) response.songRequest = songRequest;
  const comments = (row[8] ?? '').trim();
  if (comments) response.comments = comments;
  const bringingPlusOne = (row[9] ?? '').trim().toLowerCase();
  if (bringingPlusOne === 'yes' || bringingPlusOne === 'no') {
    response.bringingPlusOne = bringingPlusOne;
  }
  return response;
}

/**
 * Columns of the `guests` tab:
 *   A token | B name | C allows_plus_one | D plus_one_name | E status
 *   F notes | G display_name | H plus_one_display_name
 * Display names are optional in the sheet; when empty they fall back to the
 * full names, so old sheets keep working as before.
 */
function toGuest(row: string[]): GuestRow {
  const rawPlusOne = (row[2] ?? '').trim().toLowerCase();
  const rawStatus = (row[4] ?? '').trim().toLowerCase();
  const status: GuestStatus = rawStatus === 'responded' ? 'responded' : 'invited';
  const name = (row[1] ?? '').trim();
  const plusOneName = (row[3] ?? '').trim();
  return {
    token: (row[0] ?? '').trim(),
    name,
    allowsPlusOne: ['true', 'yes', '1', 'si', 'sí'].includes(rawPlusOne),
    plusOneName,
    displayName: (row[6] ?? '').trim() || name,
    plusOneDisplayName: (row[7] ?? '').trim() || plusOneName,
    status,
  };
}
