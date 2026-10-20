import { PLATFORM_CURRENCY } from '../../utils/money';
import type { TrackedShipment } from '../../api/account';
import type { OrderStatus, PaymentStatus, FulfillmentStatus } from '../../types';

export type StepState = 'done' | 'active' | 'pending' | 'failed' | 'cancelled';

export interface ProgressStep {
  label: string;
  /** What actually happened, or null when there is nothing to report yet. */
  detail: string | null;
  state: StepState;
}

interface ProgressInput {
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
  createdAt: string;
  tracking?: TrackedShipment | null;
}

const PAID: PaymentStatus[] = ['PAID', 'SUCCESS'];
const REFUNDED: PaymentStatus[] = ['REFUNDED', 'PARTIALLY_REFUNDED'];

function formatDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Builds the order progress strictly from what the order and its shipment say.
 * A step is only "done" when the data says so — nothing here is assumed, and a
 * step with no information stays pending rather than inventing a date.
 */
export function deriveOrderProgress(order: ProgressInput): ProgressStep[] {
  const cancelled = order.status === 'CANCELLED';
  const refunded = order.status === 'REFUNDED' || REFUNDED.includes(order.paymentStatus);
  const paid = PAID.includes(order.paymentStatus);
  const paymentFailed = order.paymentStatus === 'FAILED';
  const shipment = order.tracking ?? null;

  const placed: ProgressStep = {
    label: 'Order placed',
    detail: formatDate(order.createdAt),
    state: 'done',
  };

  const payment: ProgressStep = {
    label: refunded ? 'Payment refunded' : 'Payment',
    detail: refunded
      ? 'Refunded to the original payment method'
      : paid
        ? 'Confirmed'
        : paymentFailed
          ? 'The payment did not go through'
          : 'Awaiting payment',
    state: refunded ? 'done' : paid ? 'done' : paymentFailed ? 'failed' : 'active',
  };

  const preparing: ProgressStep = {
    label: 'Preparing your order',
    detail: order.status === 'PROCESSING' ? 'Being packed' : null,
    state: cancelled
      ? 'cancelled'
      : order.status === 'FULFILLED' || shipment?.shippedAt
        ? 'done'
        : order.status === 'PROCESSING'
          ? 'active'
          : 'pending',
  };

  // Carrier details only appear once a shipment exists; there is no placeholder
  // tracking number, because an invented one is worse than none.
  const shippedDetail = shipment?.shippedAt
    ? [shipment.carrier, formatDate(shipment.shippedAt)].filter(Boolean).join(' · ')
    : null;

  const shipped: ProgressStep = {
    label: 'Shipped',
    detail: shippedDetail,
    state: cancelled
      ? 'cancelled'
      : shipment?.deliveredAt
        ? 'done'
        : shipment?.shippedAt
          ? 'active'
          : 'pending',
  };

  const delivered: ProgressStep = {
    label: 'Delivered',
    detail: formatDate(shipment?.deliveredAt),
    state: cancelled ? 'cancelled' : shipment?.deliveredAt ? 'done' : 'pending',
  };

  if (cancelled) {
    return [
      placed,
      payment,
      { label: 'Cancelled', detail: 'This order was cancelled', state: 'failed' },
    ];
  }

  return [placed, payment, preparing, shipped, delivered];
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  PROCESSING: 'Processing',
  FULFILLED: 'Fulfilled',
  CANCELLED: 'Cancelled',
  REFUNDED: 'Refunded',
  SUCCESS: 'Paid',
  PAID: 'Paid',
  FAILED: 'Failed',
  PARTIALLY_REFUNDED: 'Partially refunded',
  UNFULFILLED: 'Not yet shipped',
  PARTIAL: 'Partially shipped',
};

export function statusLabel(value: string): string {
  return STATUS_LABELS[value] ?? value.replace(/_/g, ' ').toLowerCase();
}

export function statusVariant(status: OrderStatus): 'success' | 'warning' | 'error' | 'info' | 'default' {
  switch (status) {
    case 'FULFILLED':
      return 'success';
    case 'PROCESSING':
      return 'warning';
    case 'CONFIRMED':
      return 'info';
    case 'CANCELLED':
    case 'REFUNDED':
      return 'error';
    default:
      return 'default';
  }
}

export function formatMoney(amount: number, currency = PLATFORM_CURRENCY): string {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount);
  } catch {
    // An unknown currency code must not take the page down.
    return `${currency} ${amount.toFixed(2)}`;
  }
}
