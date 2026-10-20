import { PLATFORM_CURRENCY } from '../../utils/money';

/** Shared formatting for the platform console. */

export function money(amount: number, currency = PLATFORM_CURRENCY): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    // An unrecognised currency code must not take the console down.
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function shortDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function titleCase(value: string): string {
  return value.replace(/_/g, ' ').toLowerCase().replace(/^./, c => c.toUpperCase());
}

/** Badge colour for the statuses the admin endpoints return. */
export function statusTone(status: string): 'success' | 'warning' | 'error' | 'info' | 'default' {
  switch (status.toUpperCase()) {
    case 'ACTIVE':
    case 'PAID':
    case 'SUCCESS':
      return 'success';
    case 'TRIALING':
    case 'OPEN':
    case 'PAUSED':
    case 'PENDING':
      return 'warning';
    case 'PAST_DUE':
    case 'CANCELLED':
    case 'SUSPENDED':
    case 'EXPIRED':
    case 'FAILED':
    case 'VOID':
    case 'UNCOLLECTIBLE':
      return 'error';
    default:
      return 'default';
  }
}
