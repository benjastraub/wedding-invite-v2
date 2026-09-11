import fs from 'node:fs';
import path from 'node:path';
import { auth, sheets } from '@googleapis/sheets';

/**
 * Shared helpers for the maintenance scripts. These scripts run with YOUR
 * Google account (gcloud auth application-default login), not the service
 * account, so that you own the files they create/edit.
 */

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

/** Minimal .env loader (same behavior as server/src/env.ts). */
export function loadDotEnv() {
  const candidates = [path.resolve('.env'), path.resolve('..', '.env')];
  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!match) continue;
      const [, key, rawValue] = match;
      if (process.env[key] !== undefined) continue;
      process.env[key] = rawValue.trim().replace(/^["']|["']$/g, '');
    }
  }
}

export function getSheets() {
  const authClient = new auth.GoogleAuth({ scopes: SCOPES });
  return sheets({ version: 'v4', auth: authClient });
}

export function requireSpreadsheetId() {
  const id = process.env.GOOGLE_SPREADSHEET_ID;
  if (!id) {
    console.error('GOOGLE_SPREADSHEET_ID is not set. Put it in .env at the repo root.');
    process.exit(1);
  }
  return id;
}

/** Warns when the script would run as the service account instead of you. */
export function warnIfServiceAccountCredentials() {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.warn(
      'GOOGLE_APPLICATION_CREDENTIALS is set — this script will run as the service account.\n' +
        'Maintenance scripts usually should run as YOUR Google account (unset it in .env\n' +
        'and run: gcloud auth application-default login).',
    );
  }
}
