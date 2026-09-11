# Contributing

Thanks for your interest in contributing! This project is intentionally small:
a React SPA, a tiny Express API and Google Sheets as the database. Pull
requests that keep it that way are very welcome.

## Getting started (no Google account needed)

```bash
npm install
npm run dev:server   # Express API on :8080 — demo mode with sample data
npm run dev:client   # Vite dev server on :5173, proxies /api to :8080
```

Open <http://localhost:5173>. Without any configuration the server runs in
**demo mode**: built-in sample data and placeholder photos, everything kept
in memory. Try the sample guest links:

- `/invite/demo` — a guest with a +1
- `/invite/demo-solo` — a guest without a +1

To use real data, follow the README setup (Google Sheet + optionally a Drive
photos folder).

## Quality gates

```bash
npm run typecheck   # all workspaces (builds shared first)
npm test            # vitest unit tests
npm run build       # production build of shared + server + client
```

Run all three before opening a pull request.

## Project structure

| Path | What lives there |
|---|---|
| `client/` | React + Vite SPA, styled-components, i18n dictionaries |
| `server/` | Express API, Google Sheets/Drive access, demo mode |
| `shared/` | Types shared between client and server |
| `scripts/` | Maintenance scripts (sheet creation, tokens, links export) |
| `tests/` | Vitest suites for the API and pure logic |

## Conventions

- **TypeScript everywhere**, strict mode. `npm run typecheck` must pass.
- **Minimal dependencies.** The runtime image ships only `react`,
  `react-dom`, `styled-components`, `express`, `@googleapis/sheets` and
  `@googleapis/drive`. Think twice before adding another package.
- **i18n**: English (`client/src/i18n/en.ts`) is the source of truth. The
  dictionaries are keyed by the same type, so the build fails if keys drift.
- **No secrets in the repo.** `.env`, service account keys and generated
  guest links are gitignored.
- Comments explain *why*, not *what*.

## Where to look for common changes

- Colors, fonts, spacing → `client/src/theme.ts`
- All texts → `client/src/i18n/en.ts` (+ `es.ts`)
- Wedding content (names, date, venue) → the `settings` tab of the sheet,
  not code
- API routes → `server/src/app.ts`; storage access → `server/src/sheets.ts`
  and `server/src/drive.ts`
- Tests → `tests/`; new behavior should come with tests

## Opening a pull request

1. Fork the repo and create a branch.
2. Make the change, keep commits small and focused.
3. Run `npm run typecheck`, `npm test` and `npm run build`.
4. Open the PR with a short description of what changed and why.
