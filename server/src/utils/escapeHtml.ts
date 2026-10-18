/**
 * Escape a value for interpolation into an HTML email body.
 *
 * Outbound email templates are built with template literals, and several of
 * the values in them are supplied by users: the display name on an account,
 * a store's name. A team invitation is the case that matters — the inviter
 * chooses `user.name` and the *recipient is someone else*, so markup in that
 * field let an attacker put arbitrary links and text inside a genuine,
 * Nexus-branded, correctly-sent email. That is a phishing primitive, not a
 * cosmetic bug, and the fact that the sink is an email client rather than a
 * browser only narrows it from scripting to content forgery.
 *
 * Applied to interpolated *values* only. The surrounding markup in the
 * templates is ours and stays as it is.
 */
export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Escape a URL we generated for use in an `href`.
 *
 * These are built by `frontendUrl()` from configuration plus a hex token, so
 * they are not attacker-controlled today. Escaping is here so that a later
 * template that interpolates a user-supplied link cannot break out of the
 * attribute, and the relative/absolute check keeps a `javascript:` URL out of
 * an anchor if one ever reaches this point.
 */
export function escapeUrl(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (!/^https?:\/\//i.test(raw) && !raw.startsWith('/')) return '#';
  return escapeHtml(raw);
}
