import { NotFoundView } from '../components/Feedback';

/** Fallback for any URL that is neither "/" nor "/invite/<token>". */
export function NotFoundPage() {
  return <NotFoundView />;
}
