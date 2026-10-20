import { apiClient } from './client';

export interface ContactMessage {
  name: string;
  email: string;
  category: 'listing' | 'order' | 'payouts' | 'account' | 'press' | 'other';
  message: string;
}

/**
 * Sends a message from the public contact form.
 *
 * Throws on anything other than acceptance, so the page can only claim the
 * message was received when the server says it actually went out.
 */
export async function sendContactMessageApi(payload: ContactMessage): Promise<void> {
  await apiClient<{ success: boolean }>('/contact', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
