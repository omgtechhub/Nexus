import { apiClient } from './client';
import { User, Store } from '../types';

export interface AuthSessionResponse {
  user: User;
  store: Store | null;
  membership: {
    id: string;
    role: 'owner' | 'admin' | 'staff' | 'viewer';
  } | null;
  accountType?: 'CUSTOMER' | 'SELLER' | 'ADMIN';
}

export async function registerApi(name: string, email: string, password: string, storeName?: string, userType?: 'CUSTOMER' | 'SELLER') {
  const res = await apiClient<{ success: boolean; data: AuthSessionResponse }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password, storeName, userType }),
  });
  return res.data;
}

export async function loginApi(email: string, password: string) {
  const res = await apiClient<{ success: boolean; data: AuthSessionResponse }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return res.data;
}

/**
 * Exchange a provider token for a Nexus session.
 * Only the token travels — the server asks the provider who it belongs to.
 */
export async function oauthApi(
  provider: 'google' | 'github',
  tokens: { idToken?: string; accessToken?: string },
  userType?: 'CUSTOMER' | 'SELLER'
) {
  const res = await apiClient<{ success: boolean; data: AuthSessionResponse }>('/auth/oauth', {
    method: 'POST',
    body: JSON.stringify({ provider, ...tokens, userType }),
  });
  return res.data;
}

export async function getMeApi() {
  const res = await apiClient<{ success: boolean; data: AuthSessionResponse }>('/auth/me', {
    method: 'GET',
  });
  return res.data;
}

export async function logoutApi() {
  const res = await apiClient<{ success: boolean; message: string }>('/auth/logout', {
    method: 'POST',
  });
  return res;
}
