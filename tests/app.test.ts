import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { afterEach, describe, expect, it } from 'vitest';
import type { Express } from 'express';
import type { Attendance, GuestResponse, GuestRow } from 'shared';
import { createApp } from '../server/src/app';
import type { SheetsStore } from '../server/src/sheets';

const KNOWN: GuestRow = {
  token: 'known-token',
  name: 'María García',
  allowsPlusOne: true,
  plusOneName: 'Carlos',
  displayName: 'María',
  plusOneDisplayName: 'Carlos',
  status: 'invited',
};

const NO_PLUS_ONE: GuestRow = {
  ...KNOWN,
  token: 'solo-token',
  allowsPlusOne: false,
  plusOneName: '',
  plusOneDisplayName: '',
};

/** Maps an appended `responses` row back into a GuestResponse, like the real store's reader. */
function toSavedResponse(values: string[]): GuestResponse {
  const response: GuestResponse = {
    timestamp: (values[0] ?? '').trim(),
    attending: (values[3] ?? '').trim() as Attendance,
  };
  const plusOneName = (values[4] ?? '').trim();
  if (plusOneName) response.plusOneName = plusOneName;
  const dietaryGuest = (values[5] ?? '').trim();
  if (dietaryGuest) response.dietaryGuest = dietaryGuest;
  const dietaryPlusOne = (values[6] ?? '').trim();
  if (dietaryPlusOne) response.dietaryPlusOne = dietaryPlusOne;
  const songRequest = (values[7] ?? '').trim();
  if (songRequest) response.songRequest = songRequest;
  const comments = (values[8] ?? '').trim();
  if (comments) response.comments = comments;
  const bringingPlusOne = (values[9] ?? '').trim().toLowerCase();
  if (bringingPlusOne === 'yes' || bringingPlusOne === 'no') {
    response.bringingPlusOne = bringingPlusOne;
  }
  return response;
}

function makeStore(overrides: Partial<SheetsStore> = {}): SheetsStore {  return {
    readSettings: async () =>
      new Map<string, string>([
        ['site_language', 'es'],
        ['couple_name_groom', 'Liam'],
        ['couple_name_bride', 'Emma'],
        ['wedding_date', '2026-09-12'],
        ['wedding_time', '17:00'],
        ['wedding_end_date', '2026-09-13'],
        ['wedding_end_time', '02:00'],
        ['wedding_timezone', 'Europe/Madrid'],
      ]),
    findGuestByToken: async (token) =>
      token === KNOWN.token ? KNOWN : token === NO_PLUS_ONE.token ? NO_PLUS_ONE : null,
    findResponseByToken: async () => null,
    appendResponse: async () => {},
    markGuestResponded: async () => {},
    ...overrides,
  };
}

async function startServer(app: Express): Promise<{ baseUrl: string; close: () => Promise<void> }> {
  const server: Server = app.listen(0);
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const { port } = server.address() as AddressInfo;
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve()))),
  };
}

let closeFn: (() => Promise<void>) | null = null;
afterEach(async () => {
  if (closeFn) {
    await closeFn();
    closeFn = null;
  }
});

describe('API routes (mock sheet store)', () => {
  it('GET /api/health returns ok', async () => {
    const { baseUrl, close } = await startServer(createApp(makeStore()));
    closeFn = close;
    const res = await fetch(`${baseUrl}/api/health`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok' });
  });

  it('GET /api/settings merges sheet values with defaults', async () => {
    const { baseUrl, close } = await startServer(createApp(makeStore()));
    closeFn = close;
    const res = await fetch(`${baseUrl}/api/settings`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      language: string;
      couple: { groom: string };
      wedding: { date: string; time: string; endDate: string; endTime: string; timezone: string; rsvpDeadline: string };
    };
    expect(body.language).toBe('es');
    expect(body.couple.groom).toBe('Liam');
    expect(body.wedding.date).toBe('2026-09-12');
    expect(body.wedding.time).toBe('17:00');
    expect(body.wedding.endDate).toBe('2026-09-13');
    expect(body.wedding.endTime).toBe('02:00');
    expect(body.wedding.timezone).toBe('Europe/Madrid');
    expect(body.wedding.rsvpDeadline).toBe('');
  });

  it('GET /api/guest/:token returns 404 for unknown tokens', async () => {
    const { baseUrl, close } = await startServer(createApp(makeStore()));
    closeFn = close;
    const res = await fetch(`${baseUrl}/api/guest/unknown-token`);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'not_found' });
  });

  it('GET /api/guest/:token rejects malformed tokens with 404 (no enumeration)', async () => {
    const { baseUrl, close } = await startServer(createApp(makeStore()));
    closeFn = close;
    const res = await fetch(`${baseUrl}/api/guest/not%20a%20token`);
    expect(res.status).toBe(404);
  });

  it('GET /api/guest/:token returns the guest and settings', async () => {
    const { baseUrl, close } = await startServer(createApp(makeStore()));
    closeFn = close;
    const res = await fetch(`${baseUrl}/api/guest/known-token`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { guest: GuestRow; response: unknown };
    expect(body.guest.name).toBe('María García');
    expect(body.guest.displayName).toBe('María');
    expect(body.guest.plusOneDisplayName).toBe('Carlos');
    expect(body.guest.allowsPlusOne).toBe(true);
    expect(body.response).toBeNull(); // invited guests have no saved response
  });

  it('GET /api/guest/:token returns the saved response for responded guests', async () => {
    const RESPONDED: GuestRow = { ...KNOWN, token: 'done-token', status: 'responded' };
    const savedResponse = {
      timestamp: '2026-08-01T10:00:00.000Z',
      attending: 'yes' as const,
      plusOneName: 'Carlos',
      dietaryGuest: 'No nuts',
      songRequest: 'Dancing Queen',
    };
    const store = makeStore({
      findGuestByToken: async (token) => (token === RESPONDED.token ? RESPONDED : null),
      findResponseByToken: async (token) => (token === RESPONDED.token ? savedResponse : null),
    });
    const { baseUrl, close } = await startServer(createApp(store));
    closeFn = close;
    const res = await fetch(`${baseUrl}/api/guest/done-token`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { guest: GuestRow; response: typeof savedResponse | null };
    expect(body.guest.status).toBe('responded');
    expect(body.response).toEqual(savedResponse);
  });

  it('POST rsvp appends a sanitized row and marks the guest responded', async () => {
    const appended: string[][] = [];
    let marked: string | null = null;
    const store = makeStore({
      appendResponse: async (values) => {
        appended.push(values);
      },
      markGuestResponded: async (token) => {
        marked = token;
      },
    });
    const { baseUrl, close } = await startServer(createApp(store));
    closeFn = close;

    const res = await fetch(`${baseUrl}/api/guest/known-token/rsvp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        attending: 'yes',
        bringingPlusOne: 'yes',
        plusOneName: '  Carlos  ',
        dietaryGuest: 'No nuts',
        dietaryPlusOne: 'Vegan',
        songRequest: 'Dancing Queen',
        comments: 'We are so happy!',
      }),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, attending: 'yes' });
    expect(marked).toBe('known-token');

    const [
      timestamp,
      token,
      guestName,
      attending,
      plusOne,
      dietGuest,
      dietPlusOne,
      song,
      comments,
      bringingPlusOne,
    ] = appended[0];
    expect(Date.parse(timestamp)).not.toBeNaN();
    expect(token).toBe('known-token');
    expect(guestName).toBe('María García');
    expect(attending).toBe('yes');
    expect(plusOne).toBe('Carlos');
    expect(dietGuest).toBe('No nuts');
    expect(dietPlusOne).toBe('Vegan');
    expect(song).toBe('Dancing Queen');
    expect(comments).toBe('We are so happy!');
    expect(bringingPlusOne).toBe('yes');
  });

  it('POST rsvp rejects bringing a +1 without a name', async () => {
    const { baseUrl, close } = await startServer(createApp(makeStore()));
    closeFn = close;
    const res = await fetch(`${baseUrl}/api/guest/known-token/rsvp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ attending: 'yes', bringingPlusOne: 'yes', plusOneName: '   ' }),
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'plus_one_name_required' });
  });

  it('POST rsvp ignores +1 fields for guests without a +1', async () => {
    const appended: string[][] = [];
    const { baseUrl, close } = await startServer(
      createApp(
        makeStore({
          appendResponse: async (values) => {
            appended.push(values);
          },
        }),
      ),
    );
    closeFn = close;
    const res = await fetch(`${baseUrl}/api/guest/solo-token/rsvp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        attending: 'yes',
        plusOneName: 'Sneaky',
        dietaryPlusOne: 'Vegan',
        bringingPlusOne: 'yes',
      }),
    });
    expect(res.status).toBe(200);
    expect(appended[0][4]).toBe(''); // plus_one_name
    expect(appended[0][6]).toBe(''); // dietary_plus_one
    expect(appended[0][9]).toBe(''); // bringing_plus_one
  });

  it('POST rsvp returns 404 for unknown tokens and 400 for invalid bodies', async () => {
    const { baseUrl, close } = await startServer(createApp(makeStore()));
    closeFn = close;

    const unknown = await fetch(`${baseUrl}/api/guest/unknown-token/rsvp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ attending: 'yes' }),
    });
    expect(unknown.status).toBe(404);

    const invalid = await fetch(`${baseUrl}/api/guest/known-token/rsvp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ attending: 'maybe' }),
    });
    expect(invalid.status).toBe(400);
    expect(await invalid.json()).toEqual({ error: 'invalid_attending' });

    const badJson = await fetch(`${baseUrl}/api/guest/known-token/rsvp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{not json',
    });
    expect(badJson.status).toBe(400);
  });

  it('unknown /api paths return JSON 404', async () => {
    const { baseUrl, close } = await startServer(createApp(makeStore()));
    closeFn = close;
    const res = await fetch(`${baseUrl}/api/nope`);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'not_found' });
  });

  it('POST rsvp ignores an identical duplicate arriving within the window', async () => {
    const appended: string[][] = [];
    let previousSeen: GuestResponse | null = null;
    const store = makeStore({
      appendResponse: async (values) => {
        appended.push(values);
        // Mirror the real store: after appending, the latest response is the
        // one just written.
        previousSeen = toSavedResponse(values);
      },
      findResponseByToken: async () => previousSeen,
    });
    const { baseUrl, close } = await startServer(createApp(store));
    closeFn = close;

    const payload = { attending: 'yes', songRequest: 'Dancing Queen' };
    const post = () =>
      fetch(`${baseUrl}/api/guest/known-token/rsvp`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });

    const first = await post();
    const second = await post();

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(await first.json()).toEqual({ ok: true, attending: 'yes' });
    expect(await second.json()).toEqual({ ok: true, attending: 'yes' });
    expect(appended).toHaveLength(1);
  });

  it('POST rsvp appends again when the new payload differs from the latest response', async () => {
    const appended: string[][] = [];
    let previousSeen: GuestResponse | null = {
      timestamp: new Date(Date.now() - 1000).toISOString(),
      attending: 'no',
    };
    const store = makeStore({
      appendResponse: async (values) => {
        appended.push(values);
        previousSeen = toSavedResponse(values);
      },
      findResponseByToken: async () => previousSeen,
    });
    const { baseUrl, close } = await startServer(createApp(store));
    closeFn = close;

    const yes = await fetch(`${baseUrl}/api/guest/known-token/rsvp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ attending: 'yes' }),
    });
    expect(yes.status).toBe(200);

    const no = await fetch(`${baseUrl}/api/guest/known-token/rsvp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ attending: 'no' }),
    });
    expect(no.status).toBe(200);
    expect(appended).toHaveLength(2);
  });
});
