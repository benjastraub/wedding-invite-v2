#!/usr/bin/env node
/**
 * Initializes an existing Google Sheet with everything the site needs: the
 * three tabs (`settings`, `guests`, `responses`), their header rows, the
 * settings template and two example guest rows.
 *
 * You create the sheet yourself in Google Sheets (so you own it), share it
 * with the service account email as EDITOR, then run this as YOURSELF:
 *
 *   gcloud auth application-default login
 *   npm run sheet:setup
 *
 * Safe to re-run: it renames/reuses tabs when they already exist and only
 * writes a tab's template when that tab is still empty, so your data is
 * never overwritten.
 */
import { loadDotEnv, getSheets, requireSpreadsheetId, warnIfServiceAccountCredentials } from './lib.mjs';

loadDotEnv();
warnIfServiceAccountCredentials();

const spreadsheetId = requireSpreadsheetId();
const sheets = getSheets();

// key | value | description (human instructions live in column C)
const SETTINGS_HEADER = ['key', 'value', 'description — how to fill it'];
const SETTINGS_ROWS = [
  ['couple_name_groom', '', 'Groom name, e.g. "Liam"'],
  ['couple_name_bride', '', 'Bride name, e.g. "Emma"'],
  ['wedding_date', '', 'ISO date YYYY-MM-DD, e.g. "2026-09-12"'],
  ['wedding_time', '', '24h time HH:MM, e.g. "17:00" (venue local time)'],
  ['wedding_timezone', '', 'IANA timezone for the "Add to calendar" .ics, e.g. "Europe/Madrid" (venue local)'],
  ['wedding_end_date', '', 'Optional ISO date the event ends, e.g. "2026-09-13" (only used with wedding_end_time)'],
  ['wedding_end_time', '', 'Optional 24h end time HH:MM, e.g. "02:00" (venue local time). Empty = start + 10 hours'],
  ['venue_name', '', 'e.g. "Hacienda Los Rosales"'],
  ['venue_address', '', 'e.g. "Calle Flores 123, Ciudad"'],
  ['venue_maps_url', '', 'Optional Google Maps link — shows an "Open in Google Maps" button'],
  ['dress_code', '', 'e.g. "Semi-formal"'],
  ['gift_registry_url', '', 'External link to the wedding gift list'],
  ['contact_email', '', 'Optional email shown to guests who already responded'],
  ['contact_whatsapp', '', 'Optional WhatsApp link shown to guests who already responded, e.g. "https://wa.me/15551234567"'],
  ['site_language', 'en', 'Site-wide language: "en" or "es". Visitors cannot change it.'],
  ['rsvp_deadline', '', 'Optional ISO date, e.g. "2026-08-01"'],
  ['rsvp_deadline_strict', '', 'Set to TRUE to block RSVP submissions after rsvp_deadline. Empty/FALSE = the deadline is shown to guests but not enforced'],
];

// token | name | allows_plus_one | plus_one_name | status | notes | display_name | plus_one_display_name
const GUESTS_HEADER = [
  'token',
  'name',
  'allows_plus_one',
  'plus_one_name',
  'status',
  'notes',
  'display_name',
  'plus_one_display_name',
];
const GUESTS_SAMPLE = [
  ['', 'Ana & Tom', 'FALSE', '', 'invited', 'Example row — edit or delete', '', ''],
  [
    '',
    'María García',
    'TRUE',
    'Carlos García',
    'invited',
    'Example row — edit or delete',
    'María',
    'Carlos',
  ],
];

// Written automatically by the site — never edit by hand.
const RESPONSES_HEADER = [
  'timestamp',
  'token',
  'guest_name',
  'attending',
  'plus_one_name',
  'dietary_guest',
  'dietary_plus_one',
  'song_request',
  'comments',
  'bringing_plus_one',
];

// 1. Ensure the three tabs exist. Rename the first (default) tab to
//    "settings" and add "guests" and "responses" if they are missing.
const meta = await sheets.spreadsheets.get({
  spreadsheetId,
  fields: 'sheets.properties',
});
const tabs = meta.data.sheets?.map((sheet) => sheet.properties) ?? [];
const titles = new Set(tabs.map((tab) => tab.title));

const requests = [];
if (!titles.has('settings') && tabs.length > 0) {
  requests.push({
    updateSheetProperties: {
      properties: { sheetId: tabs[0].sheetId, title: 'settings' },
      fields: 'title',
    },
  });
}
for (const title of ['guests', 'responses']) {
  if (!titles.has(title)) {
    requests.push({ addSheet: { properties: { title } } });
  }
}
if (requests.length > 0) {
  await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests } });
}

// 2. Populate each tab only if it is still empty, so re-running never
//    clobbers settings values, guest rows or saved responses.
const templates = {
  settings: [SETTINGS_HEADER, ...SETTINGS_ROWS],
  guests: [GUESTS_HEADER, ...GUESTS_SAMPLE],
  responses: [RESPONSES_HEADER],
};

for (const [tab, values] of Object.entries(templates)) {
  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${tab}!A1:1`,
  });
  if (existing.data.values?.[0]?.length) {
    console.log(`  ${tab} tab already has data — left untouched.`);
    continue;
  }
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${tab}!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values },
  });
  console.log(`  ${tab} tab initialized.`);
}

console.log(`Sheet ready ✔  https://docs.google.com/spreadsheets/d/${spreadsheetId}`);
console.log('');
console.log('Next steps:');
console.log('  1. Fill the settings values and edit the guests list.');
console.log('  2. Generate guest tokens:     npm run sheet:tokens');
console.log('  3. Export personalized links: npm run links:export');
