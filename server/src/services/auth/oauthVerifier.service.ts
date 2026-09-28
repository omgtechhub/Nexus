import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';

/**
 * Identity proven by an OAuth provider — never by the client.
 *
 * SECURITY: the previous implementation trusted an `email` field posted by the
 * browser, which allowed any unauthenticated caller to obtain a session for any
 * account (including PLATFORM_OWNER) simply by naming its email address.
 * Every field below must originate from the provider, verified against a token
 * the caller could only hold by completing a real sign-in.
 */
export interface VerifiedOAuthProfile {
  provider: 'google' | 'github';
  providerAccountId: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
  picture: string | null;
}

export class OAuthVerificationError extends Error {
  status: number;

  constructor(message: string, status = 401) {
    super(message);
    this.name = 'OAuthVerificationError';
    this.status = status;
  }
}

const GOOGLE_TOKENINFO_URL = 'https://oauth2.googleapis.com/tokeninfo';
const GOOGLE_USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';
const GITHUB_USER_URL = 'https://api.github.com/user';
const GITHUB_EMAILS_URL = 'https://api.github.com/user/emails';

const FETCH_TIMEOUT_MS = 8000;

async function fetchJson(url: string, init?: RequestInit): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    if (!res.ok) {
      return { __httpError: res.status };
    }
    return await res.json();
  } catch (err) {
    logger.warn({ err, url }, 'OAuth provider request failed');
    return { __networkError: true };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Verify a Google ID token (preferred) or access token.
 *
 * Both are checked against Google's tokeninfo endpoint, which confirms the
 * token's signature, expiry AND audience. The audience check is what stops a
 * token minted for some *other* application being replayed against Nexus.
 */
async function verifyGoogle(token: string, tokenKind: 'id' | 'access'): Promise<VerifiedOAuthProfile> {
  const expectedAudience = config.google.clientId;
  if (!expectedAudience) {
    throw new OAuthVerificationError(
      'Google sign-in is not configured on this server. Set GOOGLE_CLIENT_ID.',
      503
    );
  }

  const param = tokenKind === 'id' ? 'id_token' : 'access_token';
  const info = await fetchJson(`${GOOGLE_TOKENINFO_URL}?${param}=${encodeURIComponent(token)}`);

  if (info.__networkError) {
    throw new OAuthVerificationError('Could not reach Google to verify your sign-in. Please try again.', 503);
  }
  if (info.__httpError || info.error || info.error_description) {
    throw new OAuthVerificationError('Google rejected this sign-in token.', 401);
  }

  // `aud` is present on id_token responses; access tokens report `aud` too, and
  // older responses use `azp`. Accept a match on either, reject anything else.
  const audience: string | undefined = info.aud || info.azp;
  if (audience !== expectedAudience) {
    logger.warn(
      { audience, expectedAudience },
      'Rejected Google OAuth token issued for a different client application'
    );
    throw new OAuthVerificationError('This sign-in token was not issued for Nexus.', 401);
  }

  if (info.exp && Number(info.exp) * 1000 < Date.now()) {
    throw new OAuthVerificationError('This sign-in token has expired. Please sign in again.', 401);
  }

  let email: string | undefined = info.email;
  let emailVerified = info.email_verified === true || info.email_verified === 'true';
  let name: string | null = info.name || null;
  let picture: string | null = info.picture || null;
  const providerAccountId: string | undefined = info.sub || info.user_id;

  // tokeninfo omits profile fields for plain access tokens — fetch them.
  if (tokenKind === 'access' && (!email || !name)) {
    const profile = await fetchJson(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!profile.__httpError && !profile.__networkError) {
      email = email || profile.email;
      emailVerified = emailVerified || profile.email_verified === true;
      name = name || profile.name || null;
      picture = picture || profile.picture || null;
    }
  }

  if (!email) {
    throw new OAuthVerificationError('Google did not return an email address for this account.', 401);
  }
  if (!emailVerified) {
    throw new OAuthVerificationError(
      'Your Google email address is not verified. Verify it with Google before signing in.',
      403
    );
  }
  if (!providerAccountId) {
    throw new OAuthVerificationError('Google did not return a stable account identifier.', 401);
  }

  return {
    provider: 'google',
    providerAccountId,
    email: email.toLowerCase().trim(),
    emailVerified: true,
    name,
    picture,
  };
}

/**
 * Verify a GitHub access token by calling the API as that user.
 *
 * GitHub has no audience claim, so possession of a token that resolves to a
 * user is the proof. The primary *verified* email is required — GitHub allows
 * unverified addresses on an account and those must not grant a session.
 */
async function verifyGitHub(token: string): Promise<VerifiedOAuthProfile> {
  if (!config.github.clientId) {
    throw new OAuthVerificationError(
      'GitHub sign-in is not configured on this server. Set GITHUB_CLIENT_ID.',
      503
    );
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'nexus-commerce',
  };

  const user = await fetchJson(GITHUB_USER_URL, { headers });
  if (user.__networkError) {
    throw new OAuthVerificationError('Could not reach GitHub to verify your sign-in. Please try again.', 503);
  }
  if (user.__httpError || !user.id) {
    throw new OAuthVerificationError('GitHub rejected this sign-in token.', 401);
  }

  const emails = await fetchJson(GITHUB_EMAILS_URL, { headers });
  let email: string | undefined;
  if (Array.isArray(emails)) {
    const primary = emails.find((e: any) => e.primary && e.verified);
    email = primary?.email || emails.find((e: any) => e.verified)?.email;
  }
  if (!email && user.email) {
    // Only usable if the account itself reports it; still treated as unverified below.
    email = undefined;
  }

  if (!email) {
    throw new OAuthVerificationError(
      'No verified email address is available on your GitHub account. Verify one with GitHub, and grant the "user:email" scope.',
      403
    );
  }

  return {
    provider: 'github',
    providerAccountId: String(user.id),
    email: email.toLowerCase().trim(),
    emailVerified: true,
    name: user.name || user.login || null,
    picture: user.avatar_url || null,
  };
}

/**
 * Resolve a caller-supplied provider token into a provider-verified identity.
 * Throws OAuthVerificationError for anything that is not positively verified.
 */
export async function verifyOAuthToken(params: {
  provider: string;
  idToken?: unknown;
  accessToken?: unknown;
}): Promise<VerifiedOAuthProfile> {
  const provider = String(params.provider || '').toLowerCase();
  const idToken = typeof params.idToken === 'string' ? params.idToken.trim() : '';
  const accessToken = typeof params.accessToken === 'string' ? params.accessToken.trim() : '';

  if (!idToken && !accessToken) {
    throw new OAuthVerificationError(
      'A provider token is required to sign in. Complete the provider sign-in flow and send its idToken or accessToken.',
      400
    );
  }

  if (provider === 'google') {
    return idToken ? verifyGoogle(idToken, 'id') : verifyGoogle(accessToken, 'access');
  }
  if (provider === 'github') {
    return verifyGitHub(accessToken || idToken);
  }

  throw new OAuthVerificationError(`Unsupported OAuth provider "${params.provider}".`, 400);
}
