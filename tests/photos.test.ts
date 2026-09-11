import { Readable } from 'node:stream';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { afterEach, describe, expect, it } from 'vitest';
import type { Express } from 'express';
import { createApp } from '../server/src/app';
import type { SheetsStore } from '../server/src/sheets';
import type { PhotoInfo, PhotoStore } from '../server/src/drive';

/** Store that is never actually queried — only the photo routes are tested. */
function makeUnusedStore(): SheetsStore {
  return {
    readSettings: async () => {
      throw new Error('sheets store must not be used by the photo tests');
    },
    findGuestByToken: async () => null,
    findResponseByToken: async () => null,
    appendResponse: async () => {},
    markGuestResponded: async () => {},
  };
}

const HERO: PhotoInfo = {
  id: 'hero-id',
  name: 'hero.png',
  mimeType: 'image/png',
  md5Checksum: 'deadbeef',
};

function makePhotoStore(): PhotoStore {
  return {
    listPhotos: async () => ({
      hero: '/api/photos/hero-id',
      photos: ['/api/photos/photo-1', '/api/photos/photo-2'],
    }),
    streamPhoto: async (id) => {
      if (id !== 'hero-id') return null;
      return {
        info: HERO,
        contentType: 'image/png',
        body: Readable.from(Buffer.from('fake-png-bytes')),
      };
    },
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

let server: { baseUrl: string; close: () => Promise<void> } | null = null;

afterEach(async () => {
  await server?.close();
  server = null;
});

describe('GET /api/photos', () => {
  it('returns hero and gallery URLs when a photo store is wired', async () => {
    server = await startServer(createApp(makeUnusedStore(), makePhotoStore()));
    const res = await fetch(`${server.baseUrl}/api/photos`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      hero: '/api/photos/hero-id',
      photos: ['/api/photos/photo-1', '/api/photos/photo-2'],
    });
  });

  it('returns an empty gallery without a photo store', async () => {
    server = await startServer(createApp(makeUnusedStore()));
    const res = await fetch(`${server.baseUrl}/api/photos`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ hero: null, photos: [] });
  });

  it('returns an empty gallery when the store fails (photos never break the page)', async () => {
    const broken: PhotoStore = {
      listPhotos: async () => {
        throw new Error('drive down');
      },
      streamPhoto: async () => null,
    };
    const error = console.error;
    console.error = () => {};
    try {
      server = await startServer(createApp(makeUnusedStore(), broken));
      const res = await fetch(`${server.baseUrl}/api/photos`);
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ hero: null, photos: [] });
    } finally {
      console.error = error;
    }
  });
});

describe('GET /api/photos/:id', () => {
  it('streams a known photo with its content type and an ETag', async () => {
    server = await startServer(createApp(makeUnusedStore(), makePhotoStore()));
    const res = await fetch(`${server.baseUrl}/api/photos/hero-id`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/png');
    expect(res.headers.get('etag')).toContain('deadbeef');
    expect(await res.text()).toBe('fake-png-bytes');
  });

  it('answers 304 when the ETag is revalidated', async () => {
    server = await startServer(createApp(makeUnusedStore(), makePhotoStore()));
    const first = await fetch(`${server.baseUrl}/api/photos/hero-id`);
    const etag = first.headers.get('etag');
    expect(etag).toBeTruthy();

    const second = await fetch(`${server.baseUrl}/api/photos/hero-id`, {
      headers: { 'if-none-match': etag as string },
    });
    expect(second.status).toBe(304);
    expect(await second.text()).toBe('');
  });

  it('404s for photos that are not in the folder', async () => {
    server = await startServer(createApp(makeUnusedStore(), makePhotoStore()));
    const res = await fetch(`${server.baseUrl}/api/photos/other-file`);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'not_found' });
  });

  it('404s without a photo store', async () => {
    server = await startServer(createApp(makeUnusedStore()));
    const res = await fetch(`${server.baseUrl}/api/photos/hero-id`);
    expect(res.status).toBe(404);
  });
});
