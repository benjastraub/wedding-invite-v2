import { useEffect, useState } from 'react';

/**
 * Site images come from the server: `GET /api/photos` returns
 * `{ hero, photos }` with ready-to-use URLs.
 *
 *  - Production: the server lists the couple's Google Drive folder and
 *    streams the files through `/api/photos/<id>` (photos stay private).
 *  - Demo mode: static placeholder images under `/images/demo/`.
 *
 * The gallery is optional — any failure just leaves the defaults in place.
 */

interface PhotosPayload {
  hero: string | null;
  photos: string[];
}

const EMPTY: PhotosPayload = { hero: null, photos: [] };

/** Fetches the photo list once and exposes what the server returned. */
export function useSiteImages(): { hero: string | null; photos: string[] } {
  const [state, setState] = useState<PhotosPayload>(EMPTY);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/photos')
      .then((res) => (res.ok ? (res.json() as Promise<PhotosPayload>) : EMPTY))
      .then(({ hero, photos }) => {
        if (!cancelled) setState({ hero, photos: photos ?? [] });
      })
      .catch(() => {
        // Photos are a nice-to-have — never fail the page over them.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
