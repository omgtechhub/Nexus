/**
 * Shown while a lazily-loaded route chunk is in flight.
 *
 * Matches `AuthLoading` in the portal guards so a cold navigation into a portal
 * does not visibly change spinner between fetching the chunk and checking the
 * session — to the user it reads as one wait, not two.
 *
 * Full-height with the app background, so there is no flash of white and no
 * layout shift when the real route mounts.
 */
export function RouteFallback() {
  return (
    <div
      className="min-h-screen bg-[var(--surface-base)] flex items-center justify-center"
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">Loading…</span>
      <div
        className="w-8 h-8 rounded-full border-2 border-[var(--ink)]/15 border-t-[#FFBD2E] animate-spin"
        aria-hidden="true"
      />
    </div>
  );
}
