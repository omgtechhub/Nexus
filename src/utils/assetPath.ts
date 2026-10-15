/**
 * Resolve an asset path for wherever this app is actually deployed.
 *
 * Pass-through for anything already absolute: a merchant's uploaded image is
 * served by the API on its own origin, and must not be rewritten.
 *
 * App-relative paths are prefixed with Vite's `BASE_URL` — the same value the
 * built asset URLs and the router basename come from. This used to sniff
 * `window.location.pathname` for a '/nexus' prefix, which was a second,
 * independent guess at the deployment root: it only ever recognised one
 * hard-coded sub-path, and it disagreed with the router the moment `VITE_BASE`
 * was anything else.
 */
export function getAssetUrl(path: string | undefined | null): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }

  const base = import.meta.env.BASE_URL.replace(/\/+$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (!base || cleanPath.startsWith(`${base}/`)) return cleanPath;
  return `${base}${cleanPath}`;
}
