import { registerApi, loginApi, oauthApi, getMeApi, logoutApi } from '../api/auth';
import type { AuthSessionResponse } from '../api/auth';
import { ApiError } from '../api/client';
import { User, Store } from '../types';

export type AccountType = 'CUSTOMER' | 'SELLER' | 'ADMIN';

export interface AuthResult {
  success: boolean;
  user?: User;
  store?: Store | null;
  accountType?: AccountType;
  error?: string;
}

/**
 * Turn any thrown value into a message worth showing a human.
 *
 * SECURITY: this must never invent a successful session. An earlier version
 * caught auth failures — including a correct 401 from the server — and returned
 * a fabricated `role: 'owner'` user, so a wrong password landed the visitor in
 * the seller dashboard with no server session behind it. Failures fail.
 */
function toAuthError(err: unknown, fallback: string): AuthResult {
  if (err instanceof ApiError) {
    return { success: false, error: err.message || fallback };
  }

  const message = err instanceof Error ? err.message : '';
  const isNetworkFailure =
    message.includes('Failed to fetch') ||
    message.includes('NetworkError') ||
    message.includes('Load failed');

  if (isNetworkFailure) {
    return {
      success: false,
      error: 'Cannot reach the Nexus server. Check your connection and try again.',
    };
  }

  return { success: false, error: message || fallback };
}

function toResult(data: AuthSessionResponse): AuthResult {
  return {
    success: true,
    user: data.user,
    store: data.store ?? null,
    accountType: data.accountType,
  };
}

export const AuthService = {
  async register(
    name: string,
    email: string,
    password: string,
    storeName?: string,
    userType?: 'CUSTOMER' | 'SELLER'
  ): Promise<AuthResult> {
    try {
      return toResult(await registerApi(name, email, password, storeName, userType));
    } catch (err) {
      return toAuthError(err, 'Registration failed. Please try again.');
    }
  },

  async login(email: string, password: string): Promise<AuthResult> {
    try {
      return toResult(await loginApi(email, password));
    } catch (err) {
      return toAuthError(err, 'Login failed. Please check your credentials.');
    }
  },

  /**
   * Exchange a provider-issued token for a Nexus session.
   * The token is the proof of identity — the server verifies it with the
   * provider, so no profile fields are sent or trusted from here.
   */
  async loginOAuth(
    provider: 'google' | 'github',
    tokens: { idToken?: string; accessToken?: string },
    userType?: 'CUSTOMER' | 'SELLER'
  ): Promise<AuthResult> {
    if (!tokens.idToken && !tokens.accessToken) {
      return { success: false, error: 'Sign-in was cancelled before it completed.' };
    }
    try {
      return toResult(await oauthApi(provider, tokens, userType));
    } catch (err) {
      return toAuthError(err, `${provider} sign-in failed. Please try again.`);
    }
  },

  async fetchCurrentSession(): Promise<AuthSessionResponse | null> {
    try {
      return await getMeApi();
    } catch {
      return null;
    }
  },

  async logoutSession(): Promise<void> {
    try {
      await logoutApi();
    } catch {
      // A failed logout call still clears local state; nothing to surface.
    }
  },
};
