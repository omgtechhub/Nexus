export function getAssetUrl(path: string | undefined | null): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const isNexusSubpath = typeof window !== 'undefined' && window.location.pathname.startsWith('/nexus');
  if (isNexusSubpath && !cleanPath.startsWith('/nexus/')) {
    return `/nexus${cleanPath}`;
  }
  return cleanPath;
}
