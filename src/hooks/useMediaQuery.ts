import { useCallback, useSyncExternalStore } from 'react';

/**
 * Subscribes to a CSS media query from React.
 *
 * `useSyncExternalStore` rather than `useState` + an effect: the first render
 * already reports the correct match, so a component that mounts something
 * expensive behind a query never mounts it once and then throws it away on the
 * next tick. That matters here because the caller is the hero, where the
 * difference between "matched on first render" and "matched one frame later"
 * is a 2.1MB video fetch starting on a phone.
 *
 * The server snapshot is `false`. There is no viewport to measure during a
 * non-browser render, and false is the safe answer for every current caller:
 * it withholds the conditional extra rather than asserting it.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}
