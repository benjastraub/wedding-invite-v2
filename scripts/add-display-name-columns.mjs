#!/usr/bin/env node
/**
 * Adds the optional `display_name` and `plus_one_display_name` headers to an
 * existing `guests` tab (created before those columns existed). New columns
 * are appended after the last existing header, so no existing data moves.
 *
 * Safe to run repeatedly — only writes headers that are still missing.
 */
import { loadDotEnv, getSheets, requireSpreadsheetId } from './lib.mjs';

loadDotEnv();
const spreadsheetId = requireSpreadsheetId();
const sheets = getSheets();

const DISPLAY_HEADERS = ['display_name', 'plus_one_display_name'];

const res = await sheets.spreadsheets.values.get({
  spreadsheetId,
  range: 'guests!A1:1',
});
const header = res.data.values?.[0] ?? [];
if (header.length === 0) {
  console.error('The guests tab has no header row — add the standard headers first.');
  process.exit(1);
}

const existing = new Set(header.map((h) => String(h).trim().toLowerCase()));
const missing = DISPLAY_HEADERS.filter((h) => !existing.has(h));
if (missing.length === 0) {
  console.log('Guests tab already has display_name and plus_one_display_name headers ✔');
  process.exit(0);
}

const startColumn = header.length + 1;
const endColumn = startColumn + missing.length - 1;
const toColumnLetter = (n) => {
  let letter = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    n = Math.floor((n - 1) / 26);
  }
  return letter;
};

const range = `guests!${toColumnLetter(startColumn)}1:${toColumnLetter(endColumn)}1`;
await sheets.spreadsheets.values.update({
  spreadsheetId,
  range,
  valueInputOption: 'USER_ENTERED',
  requestBody: { values: [missing] },
});

console.log(`Added missing headers ${missing.join(', ')} to ${range} ✔`);
console.log('The site falls back to name / plus_one_name wherever these cells are empty.');
