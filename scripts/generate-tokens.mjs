#!/usr/bin/env node
/**
 * Fills the `token` column of the guests tab with random unguessable tokens
 * for every guest that does not have one yet. Tokens are the only thing that
 * personalizes a guest link, so never share a link with someone else.
 */
import { randomBytes } from 'node:crypto';
import { loadDotEnv, getSheets, requireSpreadsheetId } from './lib.mjs';

loadDotEnv();
const spreadsheetId = requireSpreadsheetId();
const sheets = getSheets();

const res = await sheets.spreadsheets.values.get({
  spreadsheetId,
  range: 'guests!A2:F',
});
const rows = res.data.values ?? [];

let generated = 0;
const tokens = rows.map((row) => {
  const existing = (row[0] ?? '').trim();
  if (existing) return existing;
  generated += 1;
  return randomBytes(8).toString('base64url'); // ~11 URL-safe chars
});

if (generated > 0) {
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `guests!A2:A${rows.length + 1}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: tokens.map((token) => [token]) },
  });
}

console.log(`Guests in sheet: ${rows.length}`);
console.log(`Tokens generated: ${generated}`);
console.log('Next: npm run links:export');
