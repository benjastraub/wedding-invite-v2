import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import { evaluateRsvpWindow, isValidToken } from 'shared';
import { buildSettings } from './settings.js';
import { isRecentDuplicate, validateRsvp } from './rsvp.js';
import type { SheetsStore } from './sheets.js';
import type { PhotoStore } from './drive.js';
import { photoEtag } from './drive.js';

/**
 * Builds the Express app. Exported separately from the entry point so it can
 * be unit-tested without opening a port.
 *
 * Routes:
 *   GET  /api/health             — Cloud Run health check
 *   GET  /api/settings           — site-wide settings (landing page)
 *   GET  /api/guest/:token       — personalized invite data (404 if unknown)
 *   POST /api/guest/:token/rsvp  — save a guest response (404 if unknown,
 *                                  403 once the RSVP window has closed)
 *   GET  /api/photos             — hero + gallery photo URLs (from Drive or demo)
 *   GET  /api/photos/:id         — streams one photo's bytes (304 on revalidation)
 *
 * In production the app also serves the built client SPA (client/dist),
 * including deep links like /invite/<token>.
 */
export function createApp(store: SheetsStore, photoStore: PhotoStore | null = null): Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '64kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/api/settings', async (_req, res) => {
    try {
      const values = await store.readSettings();
      res.json(buildSettings(values));
    } catch (err) {
      console.error('[settings] failed:', err);
      res.status(500).json({ error: 'sheets_unavailable' });
    }
  });

  app.get('/api/guest/:token', async (req, res) => {
    const token = req.params.token;
    if (!isValidToken(token)) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    try {
      const guest = await store.findGuestByToken(token);
      if (!guest) {
        res.status(404).json({ error: 'not_found' });
        return;
      }
      const settings = buildSettings(await store.readSettings());
      const response = guest.status === 'responded' ? await store.findResponseByToken(token) : null;
      res.json({ settings, guest, response });
    } catch (err) {
      console.error('[guest] failed:', err);
      res.status(500).json({ error: 'sheets_unavailable' });
    }
  });

  app.post('/api/guest/:token/rsvp', async (req, res) => {
    const token = req.params.token;
    if (!isValidToken(token)) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    const validated = validateRsvp(req.body);
    if (!validated.ok) {
      res.status(400).json({ error: validated.error });
      return;
    }
    try {
      const guest = await store.findGuestByToken(token);
      if (!guest) {
        res.status(404).json({ error: 'not_found' });
        return;
      }
      // The RSVP window is authoritative here: a strict deadline and the end
      // of the wedding both close it, whatever the client shows.
      const settings = buildSettings(await store.readSettings());
      if (!evaluateRsvpWindow(settings.wedding).open) {
        res.status(403).json({ error: 'rsvp_closed' });
        return;
      }
      const data = validated.data;
      const plusOneName = guest.allowsPlusOne ? data.plusOneName ?? '' : '';
      const dietaryPlusOne = guest.allowsPlusOne ? data.dietaryPlusOne ?? '' : '';
      const bringingPlusOne =
        guest.allowsPlusOne && data.attending === 'yes' ? data.bringingPlusOne ?? '' : '';

      const values = [
        new Date().toISOString(), // timestamp
        token, // token
        guest.name, // guest_name
        data.attending, // attending
        plusOneName, // plus_one_name
        data.dietaryGuest ?? '', // dietary_guest
        dietaryPlusOne, // dietary_plus_one
        data.songRequest ?? '', // song_request
        data.comments ?? '', // comments
        bringingPlusOne, // bringing_plus_one
      ];

      // Idempotency: a double-click or double-Enter can POST twice within
      // milliseconds. If the guest's latest saved response is identical and
      // recent, treat this POST as a duplicate instead of appending a second
      // row. Real changes (or anything older than the window) still append.
      const previous = await store.findResponseByToken(token);
      if (previous && isRecentDuplicate(previous, values, Date.now())) {
        res.json({ ok: true, attending: data.attending });
        return;
      }

      await store.appendResponse(values);
      await store.markGuestResponded(token);
      res.json({ ok: true, attending: data.attending });
    } catch (err) {
      console.error('[rsvp] failed:', err);
      res.status(500).json({ error: 'sheets_unavailable' });
    }
  });

  app.get('/api/photos', async (_req, res) => {
    if (!photoStore) {
      res.json({ hero: null, photos: [] });
      return;
    }
    try {
      res.json(await photoStore.listPhotos());
    } catch (err) {
      // Photos are optional — a Drive hiccup must never break the page.
      console.error('[photos] failed:', err);
      res.json({ hero: null, photos: [] });
    }
  });

  app.get('/api/photos/:id', async (req, res) => {
    if (!photoStore) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    try {
      const photo = await photoStore.streamPhoto(req.params.id);
      if (!photo) {
        res.status(404).json({ error: 'not_found' });
        return;
      }
      const etag = photoEtag(photo.info);
      res.setHeader('Content-Type', photo.contentType);
      res.setHeader('Cache-Control', 'private, max-age=3600');
      res.setHeader('ETag', etag);
      if (req.headers['if-none-match'] === etag) {
        res.status(304).end();
        return;
      }
      res.status(200);
      photo.body.on('error', (err) => {
        console.error('[photos] stream failed:', err);
        res.destroy();
      });
      photo.body.pipe(res);
    } catch (err) {
      console.error('[photos] failed:', err);
      res.status(500).json({ error: 'drive_unavailable' });
    }
  });

  // ---------- Static SPA (production only) ----------
  const clientDist = fileURLToPath(new URL('../../client/dist', import.meta.url));
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    // SPA fallback: any non-API GET serves index.html so /invite/<token> deep
    // links work. (Works on both Express 4 and 5.)
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.method !== 'GET' || req.path.startsWith('/api')) {
        next();
        return;
      }
      res.sendFile('index.html', { root: clientDist });
    });
  }

  // ---------- API 404 ----------
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'not_found' });
  });

  // ---------- JSON parse errors ----------
  app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (typeof err === 'object' && err !== null && 'type' in err && err.type === 'entity.parse.failed') {
      res.status(400).json({ error: 'invalid_json' });
      return;
    }
    next(err);
  });

  return app;
}
