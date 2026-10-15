/**
 * How a visitor reaches a human.
 *
 * The number lives in the environment rather than the source because it is
 * deployment data, not product data: a fork, a staging build and the live site
 * all want different numbers, and a hard-coded one sends a staging tester's
 * question to the real support phone.
 */

/** Digits only, in full international form, exactly as wa.me expects. */
const RAW_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || '';

/** Strips the punctuation people naturally write a phone number with. */
export const WHATSAPP_NUMBER = RAW_NUMBER.replace(/[^0-9]/g, '');

export const SUPPORT_WHATSAPP_ENABLED = WHATSAPP_NUMBER.length >= 8;

/**
 * The same number, written the way a person reads it.
 *
 * Derived rather than configured separately. A second environment variable
 * holding the display form is a second thing to forget: the contact page would
 * keep printing the old number long after the WhatsApp button had moved to a
 * new one, and nobody would notice until a customer dialled it.
 *
 * Only Nigerian mobile numbers get real grouping, because that is the format
 * this deployment serves and a generic international grouper is a library's
 * job, not a config file's. Anything else is printed as a plain +digits, which
 * is correct everywhere and merely plainer.
 */
export const SUPPORT_PHONE_DISPLAY = formatPhone(WHATSAPP_NUMBER);

function formatPhone(digits: string): string {
  if (!digits) return '';
  const ng = /^234(\d{3})(\d{3})(\d{4})$/.exec(digits);
  if (ng) return `+234 ${ng[1]} ${ng[2]} ${ng[3]}`;
  return `+${digits}`;
}

/** A `tel:` href for the same number, so the display form stays readable. */
export const SUPPORT_PHONE_HREF = WHATSAPP_NUMBER ? `tel:+${WHATSAPP_NUMBER}` : '';

const DEFAULT_GREETING = 'Hi Nexus — I have a question about';

/**
 * A wa.me link, prefilled with where the visitor was standing.
 *
 * The page title and path go in the message because the first thing support
 * otherwise has to ask is "which page were you on?", and the visitor usually
 * cannot say.
 */
export function whatsappLink(context?: string): string {
  const where = context || (typeof document !== 'undefined' ? document.title : '');
  const text = where ? `${DEFAULT_GREETING} ${where}.` : 'Hi Nexus — I have a question.';
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}
