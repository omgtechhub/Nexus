import { apiClient, BASE_URL } from './client';
import type { VoiceStatus, EnrolProgress, EnrolResult, VoiceVerification } from './nexusIq';

/**
 * The shopping assistant's API.
 *
 * Enrolment mirrors the seller console's — same endpoints, same shapes, a
 * different portal — so the two consoles cannot drift apart in what a voice
 * registration means.
 */

export interface ShopProduct {
  id: string;
  title: string;
  slug: string;
  description: string;
  price: number;
  comparePrice: number | null;
  sku: string;
  category: string;
  image: string | null;
  inStock: boolean;
  availableStock: number;
  rating: { average: number; count: number };
  merchant: { id: string; name: string; handle: string };
  variants: { id: string; title: string; sku: string; price: number; inventoryQuantity: number }[];
}

export type CartAction =
  | { type: 'ADD'; product: ShopProduct; variantId: string; quantity: number }
  | { type: 'REMOVE'; productId: string }
  | { type: 'CLEAR' }
  /** `SUMMARY` asks the shopper for a yes; `GO` is the yes. Only `GO` moves. */
  | { type: 'CHECKOUT'; merchantId: string; confirmToken: string; stage: 'SUMMARY' | 'GO' };

export type ShopIntent =
  | 'SEARCH'
  | 'ADD_TO_CART'
  | 'REVIEW_CART'
  | 'REMOVE_FROM_CART'
  | 'CLEAR_CART'
  | 'CHECKOUT'
  | 'CONFIRM'
  | 'CANCEL'
  | 'HELP'
  | 'UNKNOWN';

/**
 * One turn of the assistant, spoken or typed.
 *
 * `verification` is present only on a spoken turn: there is no voice to check
 * when the shopper typed, and reporting a match that never happened would be
 * a lie the panel then renders as reassurance.
 */
export interface ShopTurn {
  transcript: string;
  reply: string;
  intent: ShopIntent;
  results?: ShopProduct[];
  action?: CartAction;
  verification?: VoiceVerification;
}

/** The cart lines the assistant is told about, so it can talk about them. */
export interface SpokenCartLine {
  productId: string;
  variantId: string;
  title: string;
  quantity: number;
  price: number;
  merchantId?: string;
  displayName?: string;
}

export async function getShopVoiceStatusApi(): Promise<VoiceStatus> {
  const res = await apiClient<{ success: boolean; data: VoiceStatus }>('/shop/voice/status');
  return res.data;
}

export async function sendShopEnrolSampleApi(
  wav: Blob,
  condition: string,
  finish: boolean
): Promise<EnrolProgress | EnrolResult> {
  const form = new FormData();
  form.append('audio', wav, 'sample.wav');
  form.append('condition', condition);
  form.append('finish', finish ? 'true' : 'false');

  const response = await fetch(`${BASE_URL}/shop/voice/enrol`, {
    method: 'POST',
    body: form,
    credentials: 'include',
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body?.success) {
    throw new Error(body?.error || 'That recording could not be used.');
  }
  return body.data;
}

export async function deleteShopVoiceProfileApi(): Promise<void> {
  await apiClient('/shop/voice/enrol', { method: 'DELETE' });
}

/**
 * Send one spoken command, along with what is currently in the bag.
 *
 * The cart travels with the request because it lives in the browser: the
 * assistant has to be told what the shopper can see in order to answer "what
 * is in my bag" or price a checkout against it.
 */
export async function sendShopCommandApi(
  wav: Blob,
  cart: SpokenCartLine[],
  currency: string
): Promise<ShopTurn> {
  const form = new FormData();
  form.append('audio', wav, 'command.wav');
  form.append('cart', JSON.stringify(cart));
  form.append('currency', currency);

  const response = await fetch(`${BASE_URL}/shop/voice/command`, {
    method: 'POST',
    body: form,
    credentials: 'include',
  });
  const body = await response.json().catch(() => ({}));

  if (!response.ok || !body?.success) {
    const error: any = new Error(body?.error || 'That command could not be handled.');
    error.spoken = body?.data?.spoken;
    error.verification = body?.data?.verification;
    throw error;
  }
  return body.data;
}

/**
 * Ask the assistant in writing.
 *
 * Same turn logic as a spoken command — the server parses and plans the
 * identical way — so a typed "add two of the first one" behaves exactly like
 * the spoken one, including the rule that only a confirmed checkout turn
 * moves the shopper to payment.
 */
export async function sendShopMessageApi(
  message: string,
  cart: SpokenCartLine[],
  currency: string
): Promise<ShopTurn> {
  const res = await apiClient<{ success: boolean; data: ShopTurn }>('/shop/assistant/message', {
    method: 'POST',
    body: JSON.stringify({ message, cart, currency }),
  });
  return res.data;
}
