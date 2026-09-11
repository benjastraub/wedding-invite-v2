import fs from 'node:fs';
import path from 'node:path';

/**
 * Tiny dependency-free .env loader for local development only.
 * It never overrides variables that are already present in the real
 * environment, so production values (Cloud Run) always win.
 *
 * Looks for `.env` in the current directory, then one level up
 * (covers running from the repo root or from the server/ workspace).
 */
export function loadEnvFile(): void {
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
