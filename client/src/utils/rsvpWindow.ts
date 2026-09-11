import { useEffect, useState } from 'react';
import { evaluateRsvpWindow, type RsvpWindow, type SiteSettings } from 'shared';

/** How often a page that stays open re-checks the window (deadline midnight, wedding end). */
const RECHECK_INTERVAL_MS = 60_000;

const OPEN_WINDOW: RsvpWindow = { open: true, reason: null };

/**
 * Live view of the RSVP window, shared with the server's own check in the
 * RSVP route. Re-evaluated on a timer, so a page left open flips from the
 * form to the closed notice without a reload. Returns an open window while
 * the settings are still loading (and for `null`).
 */
export function useRsvpWindow(wedding: SiteSettings['wedding'] | null): RsvpWindow {
  const [rsvpWindow, setRsvpWindow] = useState<RsvpWindow>(OPEN_WINDOW);

  useEffect(() => {
    if (!wedding) {
      setRsvpWindow(OPEN_WINDOW);
      return;
    }
    const update = () => setRsvpWindow(evaluateRsvpWindow(wedding));
    update();
    const id = setInterval(update, RECHECK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [wedding]);

  return rsvpWindow;
}
