import { logger } from '../../utils/logger.js';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface IEmailProvider {
  sendEmail(options: EmailOptions): Promise<boolean>;
}

export class ConsoleEmailProvider implements IEmailProvider {
  async sendEmail(options: EmailOptions): Promise<boolean> {
    logger.info({
      msg: '📧 [TRANSACTIONAL EMAIL SENT]',
      to: options.to,
      subject: options.subject,
      preview: options.text ? options.text.substring(0, 150) + '...' : 'HTML Content Delivered',
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
          `<tr><td style="padding: 8px; border-bottom: 1px solid #eee;">${i.productTitle} (x${i.quantity})</td><td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${(
            i.price * i.quantity
          ).toFixed(2)}</td></tr>`
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
        <h3 style="text-align: right; color: #0f172a; margin-top: 16px;">Order Total: $${order.total.toFixed(2)} ${order.currency}</h3>
        <p style="color: #64748b; font-size: 12px; margin-top: 24px;">Nexus Commerce Transactional Engine</p>
      </div>
    `;

    return this.provider.sendEmail({
      to: order.customerEmail,
      subject: `Order Confirmation #${order.orderNumber}`,
      html,
      text: `Hi ${order.customerName}, thank you for your order #${order.orderNumber}. Total: $${order.total.toFixed(2)}.`,
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
        <p>We have successfully processed your payment of <strong>$${order.total.toFixed(2)} ${order.currency}</strong> for order <strong>${order.orderNumber}</strong>.</p>
        <p>Transaction Reference: <code>${order.paymentReference}</code></p>
        <p style="color: #64748b; font-size: 12px; margin-top: 24px;">Nexus Commerce Payment Engine</p>
      </div>
    `;

    return this.provider.sendEmail({
      to: order.customerEmail,
      subject: `Payment Receipt for Order #${order.orderNumber}`,
      html,
      text: `Hi ${order.customerName}, your payment of $${order.total.toFixed(2)} for Order #${order.orderNumber} was confirmed. Ref: ${order.paymentReference}`,
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
      subject: `Order #${order.orderNumber} Shipped via ${order.carrier}`,
      html,
      text: `Hi ${order.customerName}, order #${order.orderNumber} has shipped via ${order.carrier}. Tracking: ${order.trackingNumber}`,
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
}

export const emailService = new EmailService();
