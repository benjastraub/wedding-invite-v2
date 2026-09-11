#!/usr/bin/env node
/**
 * Exports the personalized invitation link for every guest, so you can paste
 * them into WhatsApp messages, emails or a mail merge.
 * Prints a table and writes guest-links.csv (name, token, link).
 */
import fs from 'node:fs';
import { loadDotEnv, getSheets, requireSpreadsheetId } from './lib.mjs';

loadDotEnv();
const spreadsheetId = requireSpreadsheetId();

const baseUrl = (process.env.BASE_URL ?? 'https://YOUR-SERVICE-URL.a.run.app').replace(/\/+$/, '');

const sheets = getSheets();
const res = await sheets.spreadsheets.values.get({
  spreadsheetId,
  range: 'guests!A2:F',
});
const rows = res.data.values ?? [];

const entries = rows
  .filter((row) => (row[0] ?? '').trim())
  .map((row) => ({
    name: (row[1] ?? '').trim(),
    token: (row[0] ?? '').trim(),
  }));

if (entries.length === 0) {
  console.log('No guests with tokens found. Run: npm run sheet:tokens');
  process.exit(0);
}

const csvEscape = (value) => `"${String(value).replace(/"/g, '""')}"`;

console.log('Personalized links (set BASE_URL in .env to your Cloud Run URL):\n');
for (const { name, token } of entries) {
  console.log(`  ${(name || '(no name)').padEnd(24)} ${baseUrl}/invite/${token}`);
}

const csv = ['name,token,link', ...entries.map((e) => `${csvEscape(e.name)},${csvEscape(e.token)},${csvEscape(`${baseUrl}/invite/${e.token}`)}`)].join('\n');
fs.writeFileSync('guest-links.csv', `${csv}\n`);
console.log(`\nWrote ${entries.length} link(s) to guest-links.csv ✔`);
