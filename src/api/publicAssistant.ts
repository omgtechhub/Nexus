import { apiClient, BASE_URL } from './client';
import type { ShopProduct } from './shopVoice';

/**
 * Nexus IQ on the public pages.
 *
 * No session, no enrolment, no verification — and nothing in the responses
 * that belongs to an account. The server answers from the published plans and
 * the public catalogue, which is why this is the one assistant surface a
 * signed-out visitor can use.
 */

export type ConciergeTopic =
  | 'WHAT_IS_NEXUS'
  | 'SELL_ON_NEXUS'
  | 'PRICING'
  | 'FEES'
  | 'PAYMENTS'
  | 'PAYOUTS'
  | 'DELIVERY'
  | 'TRACK_ORDER'
  | 'MY_ACCOUNT_DATA'
  | 'BUYING'
  | 'CATALOGUE'
  | 'CATEGORIES'
  | 'PRODUCT_SEARCH'
  | 'NEXUS_IQ'
  | 'VOICE'
  | 'ACCOUNTS'
  | 'CONTACT'
  | 'HELP'
  | 'UNKNOWN';

/** Somewhere in the app an answer points at. */
export interface ConciergeLink {
  label: string;
  to: string;
}

export interface PublicTurn {
  transcript: string;
  /** True when the question arrived as audio, so the panel knows to speak. */
  spoken: boolean;
  topic: ConciergeTopic;
  reply: string;
  links: ConciergeLink[];
  results?: ShopProduct[];
}

export interface PublicAssistantStatus {
  typing: boolean;
  voice: {
    /** Always false out here, and the panel says so rather than implying one. */
    verified: boolean;
    transcriber: { engine: string; model: string; local: boolean };
  };
}

export async function getPublicAssistantStatusApi(): Promise<PublicAssistantStatus> {
  const res = await apiClient<{ success: boolean; data: PublicAssistantStatus }>(
    '/assistant/status'
  );
  return res.data;
}

export async function sendPublicMessageApi(message: string): Promise<PublicTurn> {
  const res = await apiClient<{ success: boolean; data: PublicTurn }>('/assistant/message', {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
  return res.data;
}

/**
 * Send one recorded question.
 *
 * `fetch` directly rather than through `apiClient`, because the body is
 * multipart: setting a JSON content type on FormData stops the browser writing
 * the boundary and the upload arrives unparseable.
 */
export async function sendPublicVoiceApi(wav: Blob): Promise<PublicTurn> {
  const form = new FormData();
  form.append('audio', wav, 'question.wav');

  const response = await fetch(`${BASE_URL}/assistant/voice`, {
    method: 'POST',
    body: form,
    credentials: 'include',
  });
  const body = await response.json().catch(() => ({}));

  if (!response.ok || !body?.success) {
    const error: any = new Error(body?.error || 'That question could not be handled.');
    // A clip nothing could be made out of carries a line to say back, so the
    // panel can answer out loud rather than only turning a box red.
    error.spoken = body?.data?.spoken;
    throw error;
  }
  return body.data;
}
