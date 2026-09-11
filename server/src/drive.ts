import { Readable } from 'node:stream';
import { auth, drive } from '@googleapis/drive';

/**
 * Google Drive access for the site photos.
 *
 * The couple uploads their photos into a single Drive folder and shares the
 * FOLDER with the service account email as VIEWER. The site then lists and
 * streams those files. Photos are never made public: the browser never talks
 * to Drive directly — the server proxies the bytes through `/api/photos/:id`.
 *
 * Authentication mirrors `sheets.ts` (ADC: key file locally, metadata server
 * on Cloud Run). No IAM role is needed — sharing the folder is enough.
 * Scope: `drive.readonly` (the site only ever reads the folder).
 */

const SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];

/** How long the photo list is cached (the list changes rarely). */
const LIST_TTL_MS = 5 * 60_000;

/** Files whose name starts with "hero." are the hero image. */
const HERO_PATTERN = /^hero\./i;

export interface PhotoInfo {
  id: string;
  name: string;
  mimeType: string;
  /** ETag material: Drive file checksum, modified time or the id as last resort. */
  modifiedTime?: string;
  md5Checksum?: string;
}

export interface PhotoStream {
  info: PhotoInfo;
  contentType: string;
  body: Readable;
}

export interface PhotoStore {
  /** Ready-to-use image URLs: the hero (or null) and the gallery photos. */
  listPhotos(): Promise<{ hero: string | null; photos: string[] }>;
  /** Streams the bytes for a `/api/photos/<id>` URL, or null when unknown. */
  streamPhoto(id: string): Promise<PhotoStream | null>;
}

/** Strong validator for If-None-Match, based on Drive file metadata. */
export function photoEtag(info: PhotoInfo): string {
  return `W/"${info.md5Checksum ?? info.modifiedTime ?? info.id}"`;
}

/** Photo store with no photos — used when no Drive folder is configured. */
export function createEmptyPhotoStore(): PhotoStore {
  return {
    listPhotos: async () => ({ hero: null, photos: [] }),
    streamPhoto: async () => null,
  };
}

export function createDrivePhotoStore(folderId: string): PhotoStore {
  const client = drive({
    version: 'v3',
    auth: new auth.GoogleAuth({ scopes: SCOPES }),
  });

  let cache: { at: number; files: PhotoInfo[] } | null = null;

  async function loadFiles(): Promise<PhotoInfo[]> {
    if (cache && Date.now() - cache.at < LIST_TTL_MS) return cache.files;
    const escaped = folderId.replace(/'/g, "\\'");
    const res = await client.files.list({
      q: `'${escaped}' in parents and mimeType contains 'image/' and trashed = false`,
      fields: 'files(id, name, mimeType, modifiedTime, md5Checksum)',
      pageSize: 1000,
    });
    const files = (res.data.files ?? [])
      .map((f) => ({
        id: f.id ?? '',
        name: f.name ?? '',
        mimeType: f.mimeType ?? 'image/jpeg',
        modifiedTime: f.modifiedTime ?? undefined,
        md5Checksum: f.md5Checksum ?? undefined,
      }))
      .filter((f) => f.id !== '' && f.name !== '')
      // Natural sort so "photo 10" comes after "photo 2".
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
    cache = { at: Date.now(), files };
    return files;
  }

  function toUrl(id: string): string {
    return `/api/photos/${encodeURIComponent(id)}`;
  }

  return {
    async listPhotos() {
      const files = await loadFiles();
      const hero = files.find((f) => HERO_PATTERN.test(f.name)) ?? null;
      return {
        hero: hero ? toUrl(hero.id) : null,
        photos: files.filter((f) => !HERO_PATTERN.test(f.name)).map((f) => toUrl(f.id)),
      };
    },

    async streamPhoto(id) {
      // Only files inside the configured folder can ever be streamed.
      const files = await loadFiles();
      const info = files.find((f) => f.id === id);
      if (!info) return null;
      const res = await client.files.get({ fileId: id, alt: 'media' }, { responseType: 'stream' });
      const body = res.data as unknown as Readable;
      return {
        info,
        contentType: res.headers['content-type'] ?? info.mimeType,
        body,
      };
    },
  };
}
