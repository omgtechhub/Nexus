import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { emailService } from '../services/email/email.service.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

/**
 * The public contact form.
 *
 * The form on `/contact` used to set a flag and render "Message sent — we will
 * get back to you within 24 hours." It sent nothing, anywhere, ever. That is
 * the same defect the DSAR form had: the page does not merely fail to act, it
 * *asserts* that something happened, so the person stops trying to reach us
 * and waits for a reply that cannot come.
 *
 * So this endpoint reports the truth. If the message is not accepted by the
 * mail server, the caller gets a 502 and the page says to email directly.
 */
const contactSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  email: z.string().trim().email('A valid email address is required').max(254),
  // Matches the select on the contact page.
  category: z.enum(['listing', 'order', 'payouts', 'account', 'press', 'other']).default('other'),
  message: z.string().trim().min(10, 'Tell us a little more — at least 10 characters.').max(4000),
}).strict();

const CATEGORY_LABELS: Record<string, string> = {
  listing: 'Listing a product',
  order: 'An order',
  payouts: 'Payouts',
  account: 'My account',
  press: 'Press',
  other: 'Something else',
};

export async function submitContactMessage(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = contactSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: parsed.error.issues[0]?.message || 'Please check the form and try again.',
      });
      return;
    }

    const { name, email, category, message } = parsed.data;

    if (!config.email.supportTo) {
      // No destination configured is a deployment fault, not the sender's, and
      // it must never present as a delivered message.
      logger.error({ msg: 'Contact form has no destination: set SUPPORT_EMAIL or SMTP_USER.' });
      res.status(503).json({
        success: false,
        error: 'Our contact form is not available right now. Please email us directly.',
      });
      return;
    }

    const delivered = await emailService.sendContactMessage({
      to: config.email.supportTo,
      fromName: name,
      fromEmail: email,
      categoryLabel: CATEGORY_LABELS[category] ?? CATEGORY_LABELS.other,
      message,
    });

    if (!delivered) {
      logger.error({ msg: 'Contact message was not accepted by the mail transport', category });
      res.status(502).json({
        success: false,
        error: 'We could not send that just now. Please email us directly and we will pick it up.',
      });
      return;
    }

    logger.info({ msg: 'Contact message delivered', category });
    res.status(202).json({ success: true });
  } catch (err) {
    next(err);
  }
}
