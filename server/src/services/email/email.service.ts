import { logger } from '../../utils/logger.js';
import { config } from '../../config/index.js';
import { escapeHtml, escapeUrl } from '../../utils/escapeHtml.js';
import { defaultCurrencyCode } from '../../config/currency.js';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface IEmailProvider {
  sendEmail(options: EmailOptions): Promise<boolean>;
}

/**
 * Money, in the currency the order was actually priced in.
 *
 * Every figure in these templates was prefixed with a hardcoded `$` — so a
 * customer paying ₦42,000 through Paystack received a receipt for "$42000.00".
 * On an email there is no locale to read, so the currency code is always
 * shown alongside the symbol rather than relied upon to be recognised.
 */
const CURRENCY_SYMBOLS: Record<string, string> = {
  NGN: '₦',
  USD: '$',
  GHS: '₵',
  KES: 'KSh',
  ZAR: 'R',
  GBP: '£',
  EUR: '€',
};

export function formatMoney(amount: number, currency?: string): string {
  const code = (currency || defaultCurrencyCode()).toUpperCase();
  const symbol = CURRENCY_SYMBOLS[code] || '';
  const figure = amount.toFixed(2);
  return symbol ? `${symbol}${figure} ${code}` : `${figure} ${code}`;
}

/**
 * Development and test delivery: write the message where the developer can
 * read it.
 *
 * The full body is printed **only** outside production. It carries password
 * reset links and email verification tokens, and in production those would go
 * straight into whatever aggregates stdout — a credential store nobody meant
 * to create. `selectEmailProvider` also refuses to pick this provider in
 * production, so the guard here is the second line rather than the only one.
 */
export class ConsoleEmailProvider implements IEmailProvider {
  readonly name = 'console';

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (config.isProd) {
      logger.warn({
        msg: 'Email NOT sent: no SMTP transport is configured on this install',
        to: options.to,
        subject: options.subject,
      });
      return false;
    }

    logger.info({
      msg: '[EMAIL - console provider, nothing was delivered]',
      to: options.to,
      subject: options.subject,
    });
    console.log(`\n======================================================`);
    console.log(`📧 TRANSACTIONAL EMAIL OUTBOX`);
    console.log(`TO: ${options.to}`);
    console.log(`SUBJECT: ${options.subject}`);
    console.log(`------------------------------------------------------`);
    console.log(options.text || options.html);
    console.log(`======================================================\n`);
    return true;
  }
}

export class EmailService {
  private provider: IEmailProvider;

  constructor(provider?: IEmailProvider) {
    this.provider = provider || new ConsoleEmailProvider();
  }

  /** Swap the transport at runtime, from the startup selection below. */
  setProvider(provider: IEmailProvider): void {
    this.provider = provider;
  }

  get providerName(): string {
    return (this.provider as any).name || 'unknown';
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    return this.provider.sendEmail(options);
  }

  async sendOrderConfirmation(order: {
    orderNumber: string;
    customerEmail: string;
    customerName: string;
    total: number;
    currency: string;
    items: Array<{ productTitle: string; quantity: number; price: number }>;
  }): Promise<boolean> {
    const itemRows = order.items
      .map(
        (i) =>
          `<tr><td style="padding: 8px; border-bottom: 1px solid #eee;">${i.productTitle} (x${i.quantity})</td><td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${formatMoney(
            i.price * i.quantity,
            order.currency
          )}</td></tr>`
      )
      .join('');

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #2563eb;">Order Confirmation — ${order.orderNumber}</h2>
        <p>Hi ${order.customerName},</p>
        <p>Thank you for shopping with us! Your order has been placed successfully.</p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
          <thead>
            <tr style="background: #f8fafc;">
              <th style="padding: 8px; text-align: left;">Item</th>
              <th style="padding: 8px; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>${itemRows}</tbody>
        </table>
        <h3 style="text-align: right; color: #0f172a; margin-top: 16px;">Order Total: ${formatMoney(order.total, order.currency)}</h3>
        <p style="color: #64748b; font-size: 12px; margin-top: 24px;">Nexus Commerce Transactional Engine</p>
      </div>
    `;

    return this.provider.sendEmail({
      to: order.customerEmail,
      subject: `Order Confirmation ${order.orderNumber}`,
      html,
      text: `Hi ${order.customerName}, thank you for your order ${order.orderNumber}. Total: ${formatMoney(order.total, order.currency)}.`,
    });
  }

  async sendPaymentReceipt(order: {
    orderNumber: string;
    customerEmail: string;
    customerName: string;
    total: number;
    currency: string;
    paymentReference: string;
  }): Promise<boolean> {
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #16a34a;">Payment Received — ${order.orderNumber}</h2>
        <p>Hi ${order.customerName},</p>
        <p>We have successfully processed your payment of <strong>${formatMoney(order.total, order.currency)}</strong> for order <strong>${order.orderNumber}</strong>.</p>
        <p>Transaction Reference: <code>${order.paymentReference}</code></p>
        <p style="color: #64748b; font-size: 12px; margin-top: 24px;">Nexus Commerce Payment Engine</p>
      </div>
    `;

    return this.provider.sendEmail({
      to: order.customerEmail,
      subject: `Payment Receipt for Order ${order.orderNumber}`,
      html,
      text: `Hi ${order.customerName}, your payment of ${formatMoney(order.total, order.currency)} for Order ${order.orderNumber} was confirmed. Ref: ${order.paymentReference}`,
    });
  }

  async sendShippingUpdate(order: {
    orderNumber: string;
    customerEmail: string;
    customerName: string;
    carrier: string;
    trackingNumber: string;
  }): Promise<boolean> {
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #2563eb;">Your Order Has Shipped! 🚚 — ${order.orderNumber}</h2>
        <p>Hi ${order.customerName},</p>
        <p>Great news! Order <strong>${order.orderNumber}</strong> is on its way.</p>
        <p><strong>Carrier:</strong> ${order.carrier}</p>
        <p><strong>Tracking Number:</strong> <code>${order.trackingNumber}</code></p>
        <p style="color: #64748b; font-size: 12px; margin-top: 24px;">Nexus Commerce Fulfillment</p>
      </div>
    `;

    return this.provider.sendEmail({
      to: order.customerEmail,
      subject: `Order ${order.orderNumber} Shipped via ${order.carrier}`,
      html,
      text: `Hi ${order.customerName}, order ${order.orderNumber} has shipped via ${order.carrier}. Tracking: ${order.trackingNumber}`,
    });
  }

  /**
   * The parcel arrived.
   *
   * The last thing that happens to an order, and the point at which the buyer
   * may review what they bought — so this is also the mail that invites them
   * to, rather than leaving the review prompt somewhere they will never see.
   */
  async sendDeliveryConfirmation(order: {
    orderNumber: string;
    customerEmail: string;
    customerName: string;
    carrier?: string | null;
    trackingNumber?: string | null;
  }): Promise<boolean> {
    const carrierLine = order.carrier
      ? `<p><strong>Delivered by:</strong> ${order.carrier}${
          order.trackingNumber ? ` (${order.trackingNumber})` : ''
        }</p>`
      : '';

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #16a34a;">Delivered — ${order.orderNumber}</h2>
        <p>Hi ${order.customerName},</p>
        <p>Order <strong>${order.orderNumber}</strong> has been delivered. We hope everything arrived as you expected.</p>
        ${carrierLine}
        <p>Now that it has arrived you can leave a review on what you bought — it is the single most useful thing you can do for the next shopper.</p>
        <p style="color: #64748b; font-size: 12px; margin-top: 24px;">Nexus Commerce Fulfillment</p>
      </div>
    `;

    return this.provider.sendEmail({
      to: order.customerEmail,
      subject: `Order ${order.orderNumber} delivered`,
      html,
      text: `Hi ${order.customerName}, order ${order.orderNumber} has been delivered. You can now review what you bought.`,
    });
  }

  async sendLowStockAlert(
    merchantEmail: string,
    productTitle: string,
    sku: string,
    currentStock: number,
    threshold: number
  ): Promise<boolean> {
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ea580c; border-radius: 8px;">
        <h2 style="color: #dc2626;">⚠️ Low Stock Alert</h2>
        <p>Item <strong>${productTitle}</strong> (SKU: <code>${sku}</code>) is low on stock.</p>
        <p>Current Quantity: <strong style="color: #dc2626;">${currentStock}</strong> (Threshold: ${threshold})</p>
        <p>Please restock soon to avoid stockouts.</p>
        <p style="color: #64748b; font-size: 12px; margin-top: 24px;">Nexus Inventory Automation</p>
      </div>
    `;

    return this.provider.sendEmail({
      to: merchantEmail,
      subject: `[Low Stock Alert] ${productTitle} (${currentStock} left)`,
      html,
      text: `Low stock alert: ${productTitle} (SKU: ${sku}) has ${currentStock} units remaining (threshold: ${threshold}).`,
    });
  }

  /** Password reset link. The raw token appears only here and in the user's inbox. */
  async sendPasswordReset(params: {
    to: string;
    name: string;
    resetUrl: string;
    expiresInMinutes: number;
  }): Promise<boolean> {
    const text = [
      `Hi ${params.name},`,
      '',
      'We received a request to reset your Nexus Commerce password.',
      `Use this link within ${params.expiresInMinutes} minutes:`,
      params.resetUrl,
      '',
      'If you did not request this, you can ignore this email — your password will not change.',
    ].join('\n');

    return this.sendEmail({
      to: params.to,
      subject: 'Reset your Nexus Commerce password',
      text,
      html: `
        <div style="font-family: -apple-system, Segoe UI, sans-serif; max-width: 560px; margin: 0 auto;">
          <h1 style="font-size: 20px; margin-bottom: 8px;">Reset your password</h1>
          <p style="color: #444; line-height: 1.6;">Hi ${escapeHtml(params.name)}, we received a request to reset your Nexus Commerce password.</p>
          <p style="margin: 24px 0;">
            <a href="${escapeUrl(params.resetUrl)}" style="background: #FFBD2E; color: #000; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: 600;">Choose a new password</a>
          </p>
          <p style="color: #777; font-size: 13px;">This link expires in ${params.expiresInMinutes} minutes. If you did not request it, ignore this email and your password will stay the same.</p>
        </div>`,
    });
  }

  async sendEmailVerification(params: {
    to: string;
    name: string;
    verifyUrl: string;
  }): Promise<boolean> {
    const text = [
      `Hi ${params.name},`,
      '',
      'Confirm your email address to finish setting up your Nexus Commerce account:',
      params.verifyUrl,
    ].join('\n');

    return this.sendEmail({
      to: params.to,
      subject: 'Confirm your email address',
      text,
      html: `
        <div style="font-family: -apple-system, Segoe UI, sans-serif; max-width: 560px; margin: 0 auto;">
          <h1 style="font-size: 20px; margin-bottom: 8px;">Confirm your email</h1>
          <p style="color: #444; line-height: 1.6;">Hi ${escapeHtml(params.name)}, confirm your email address to finish setting up your Nexus Commerce account.</p>
          <p style="margin: 24px 0;">
            <a href="${escapeUrl(params.verifyUrl)}" style="background: #27C93F; color: #000; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: 600;">Confirm email address</a>
          </p>
        </div>`,
    });
  }

  /**
   * A merchant writing to one of their own customers.
   *
   * Subject and body are written by a merchant and land in a shopper's inbox,
   * so both are escaped: a seller account is not a trusted author of HTML.
   * The merchant's name is stated in the body rather than forged into the From
   * header -- the message genuinely comes from Nexus, on their behalf.
   */
  async sendMerchantMessage(params: {
    to: string;
    customerName: string;
    merchantName: string;
    subject: string;
    body: string;
  }): Promise<boolean> {
    const text = [
      `Hi ${params.customerName},`,
      ``,
      params.body,
      ``,
      `-- ${params.merchantName}, via Nexus`,
    ].join('\n');

    return this.sendEmail({
      to: params.to,
      subject: params.subject,
      text,
      html: `
        <div style="font-family: -apple-system, Segoe UI, sans-serif; max-width: 560px; margin: 0 auto;">
          <p style="color: #222;">Hi ${escapeHtml(params.customerName)},</p>
          <div style="white-space: pre-wrap; line-height: 1.6; color: #222;">${escapeHtml(params.body)}</div>
          <p style="color: #666; font-size: 12px; margin-top: 24px;">
            Sent by ${escapeHtml(params.merchantName)} through Nexus.
          </p>
        </div>`,
    });
  }

  /**
   * A message from the public contact form.
   *
   * Every value here was typed by an anonymous stranger and lands in a mailbox
   * a colleague reads, so all four are escaped. The sender's own address goes
   * in the body rather than the From header -- forging a From we do not
   * control is what gets a domain's mail marked as spam, and Gmail rewrites it
   * anyway.
   */
  async sendContactMessage(params: {
    to: string;
    fromName: string;
    fromEmail: string;
    categoryLabel: string;
    message: string;
  }): Promise<boolean> {
    const text = [
      `New message from the Nexus contact form.`,
      ``,
      `About:   ${params.categoryLabel}`,
      `Name:    ${params.fromName}`,
      `Email:   ${params.fromEmail}`,
      ``,
      params.message,
    ].join('\n');

    return this.sendEmail({
      to: params.to,
      subject: `Contact form — ${params.categoryLabel} — ${params.fromName}`,
      text,
      html: `
        <div style="font-family: -apple-system, Segoe UI, sans-serif; max-width: 560px; margin: 0 auto;">
          <h1 style="font-size: 18px; margin-bottom: 4px;">New contact form message</h1>
          <p style="color: #666; font-size: 13px; margin-top: 0;">About: ${escapeHtml(params.categoryLabel)}</p>
          <table style="font-size: 14px; color: #222; border-collapse: collapse; margin: 16px 0;">
            <tr><td style="padding: 2px 12px 2px 0; color: #666;">Name</td><td>${escapeHtml(params.fromName)}</td></tr>
            <tr><td style="padding: 2px 12px 2px 0; color: #666;">Email</td><td>${escapeHtml(params.fromEmail)}</td></tr>
          </table>
          <div style="white-space: pre-wrap; line-height: 1.6; color: #222; border-left: 3px solid #FFBD2E; padding-left: 12px;">${escapeHtml(params.message)}</div>
        </div>`,
    });
  }
}

export const emailService = new EmailService();
