import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { afterEach, describe, expect, it } from 'vitest';
import type { Express } from 'express';
import { createApp } from '../server/src/app';
import { createDemoPhotoStore, createDemoSheetsStore } from '../server/src/demo';

async function startServer(app: Express): Promise<{ baseUrl: string; close: () => Promise<void> }> {
  const server: Server = app.listen(0);
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const { port } = server.address() as AddressInfo;
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve()))),
  };
}

let server: { baseUrl: string; close: () => Promise<void> } | null = null;

afterEach(async () => {
  await server?.close();
  server = null;
});

function startDemoServer(): Promise<{ baseUrl: string; close: () => Promise<void> }> {
  const app = createApp(createDemoSheetsStore(), createDemoPhotoStore());
  return startServer(app);
}

describe('demo mode API', () => {
  it('serves built-in settings', async () => {
    server = await startDemoServer();
    const res = await fetch(`${server.baseUrl}/api/settings`);
    expect(res.status).toBe(200);
    const settings = (await res.json()) as {
      language: string;
      couple: { groom: string; bride: string };
      venue: { name: string };
    };
    expect(settings.language).toBe('en');
    expect(settings.couple).toEqual({ groom: 'Alex', bride: 'Sam' });
    expect(settings.venue.name).toBe('The Rose Garden');
  });

  it('knows the sample guests', async () => {
    server = await startDemoServer();
    const res = await fetch(`${server.baseUrl}/api/guest/demo`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      guest: { token: string; allowsPlusOne: boolean; status: string };
      response: unknown;
    };
    expect(body.guest.token).toBe('demo');
    expect(body.guest.allowsPlusOne).toBe(true);
    expect(body.guest.status).toBe('invited');
    expect(body.response).toBeNull();
  });

  it('404s for unknown tokens', async () => {
    server = await startDemoServer();
    const res = await fetch(`${server.baseUrl}/api/guest/nobody`);
    expect(res.status).toBe(404);
  });

  it('accepts an RSVP and stores it in memory', async () => {
    server = await startDemoServer();
    const post = await fetch(`${server.baseUrl}/api/guest/demo/rsvp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        attending: 'yes',
        bringingPlusOne: 'yes',
        plusOneName: 'Carlos',
        dietaryGuest: 'Vegetarian',
        songRequest: 'Dancing Queen',
      }),
    });
    expect(post.status).toBe(200);
    expect(await post.json()).toEqual({ ok: true, attending: 'yes' });

    const view = await fetch(`${server.baseUrl}/api/guest/demo`);
    const body = (await view.json()) as {
      guest: { status: string };
      response: { attending: string; plusOneName: string; songRequest: string } | null;
    };
    expect(body.guest.status).toBe('responded');
    expect(body.response).not.toBeNull();
    expect(body.response?.attending).toBe('yes');
    expect(body.response?.plusOneName).toBe('Carlos');
    expect(body.response?.songRequest).toBe('Dancing Queen');
  });

  it('serves the placeholder photo list', async () => {
    server = await startDemoServer();
    const res = await fetch(`${server.baseUrl}/api/photos`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      hero: '/images/demo/hero.svg',
      photos: ['/images/demo/1.svg', '/images/demo/2.svg', '/images/demo/3.svg'],
    });
  });

  it('does not stream photos (they are static files in demo mode)', async () => {
    server = await startDemoServer();
    const res = await fetch(`${server.baseUrl}/api/photos/anything`);
    expect(res.status).toBe(404);
  });
});
