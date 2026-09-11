import { LandingPage } from './pages/LandingPage';
import { InvitePage } from './pages/InvitePage';
import { NotFoundPage } from './pages/NotFoundPage';

/**
 * Minimal dependency-free router. Two real routes:
 *   /               → public landing page
 *   /invite/<token> → personalized guest view with the RSVP form
 * Anything else shows the 404 page.
 */
type Route =
  | { kind: 'landing' }
  | { kind: 'invite'; token: string }
  | { kind: 'notfound' };

function parseRoute(path: string): Route {
  const invite = path.match(/^\/invite\/([^/]+)\/?$/);
  if (invite) return { kind: 'invite', token: decodeURIComponent(invite[1]) };
  if (path === '/' || path === '') return { kind: 'landing' };
  return { kind: 'notfound' };
}

export function App() {
  const route = parseRoute(window.location.pathname);

  if (route.kind === 'invite') return <InvitePage token={route.token} />;
  if (route.kind === 'landing') return <LandingPage />;
  return <NotFoundPage />;
}
