import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Clock, FlaskConical, Loader2 } from 'lucide-react';
import { useVerifyPaymentQuery } from '../../hooks/usePayments';
import { clearPaymentReference, readPaymentReference } from '../paymentReturn';

/**
 * Where the payment gateway returns the customer.
 *
 * The one job here is to not lie. The page claims an order is paid only when
 * the server, having asked the provider, says so — the previous flow parked the
 * reference in sessionStorage, never verified it, and showed "Order Confirmed"
 * to anyone who found their way back to the page.
 *
 * `useVerifyPaymentQuery` polls while the provider still reports the charge as
 * pending, so a slow settlement resolves on screen instead of stranding the
 * customer on a maybe.
 */

const PAID = ['SUCCESS', 'PAID'];
const FAILED = ['FAILED', 'CANCELLED', 'ABANDONED'];

export function CheckoutCompletePage() {
  const [searchParams] = useSearchParams();
  const reference = readPaymentReference(searchParams);
  const orderHint = searchParams.get('order');

  const { data, isLoading, isError, error } = useVerifyPaymentQuery(reference || '', Boolean(reference));

  const paymentStatus = data?.data?.paymentStatus?.toUpperCase();
  /**
   * Whether this verdict came from a real gateway.
   *
   * The sandbox provider reports a success it never obtained, which is exactly
   * what used to reach this page as "Payment confirmed" — so a simulated
   * result gets its own wording and is never dressed up as a charge.
   */
  const simulated = data?.data?.simulated === true;
  const unpaid = searchParams.get('unpaid') === '1';
  const settled = Boolean(paymentStatus && (PAID.includes(paymentStatus) || FAILED.includes(paymentStatus)));

  // Keep the reference until the outcome is settled: a reload mid-verification
  // must still be able to ask again.
  useEffect(() => {
    if (settled) clearPaymentReference();
  }, [settled]);

  const orderNumber = data?.data?.orderNumber || orderHint;

  let state:
    | 'no-reference'
    | 'unpaid'
    | 'checking'
    | 'paid'
    | 'simulated'
    | 'failed'
    | 'pending'
    | 'error' = 'checking';
  if (unpaid) state = 'unpaid';
  else if (!reference) state = 'no-reference';
  else if (isError) state = 'error';
  else if (isLoading) state = 'checking';
  else if (paymentStatus && PAID.includes(paymentStatus)) state = simulated ? 'simulated' : 'paid';
  else if (paymentStatus && FAILED.includes(paymentStatus)) state = 'failed';
  else state = 'pending';

  const shell = 'mx-auto max-w-xl px-4 py-16 text-center sm:py-20';

  if (state === 'unpaid') {
    return (
      <div className={shell}>
        <AlertTriangle size={30} className="mx-auto text-[var(--brand-yellow-ink)]" aria-hidden="true" />
        <h1 className="mt-4 text-2xl font-extrabold text-primary">Your order is saved, but unpaid</h1>
        <p className="mt-2 text-sm text-secondary">
          No payment was taken and nothing has been charged — the merchant could not start a
          payment. Keep the order number below; the merchant can send you a payment link.
        </p>
        {orderHint && (
          <p className="mt-4 inline-block rounded-xl border border-[var(--ink)]/10 bg-[var(--ink)]/[0.04] px-4 py-2 text-sm">
            <span className="text-muted">Unpaid order </span>
            <span className="font-bold text-primary">{orderHint}</span>
          </p>
        )}
        <Actions orderNumber={orderHint} />
      </div>
    );
  }

  if (state === 'no-reference') {
    return (
      <div className={shell}>
        <AlertTriangle size={30} className="mx-auto text-[var(--brand-yellow-ink)]" aria-hidden="true" />
        <h1 className="mt-4 text-2xl font-extrabold text-primary">No payment to confirm</h1>
        <p className="mt-2 text-sm text-secondary">
          {orderNumber
            ? `Order ${orderNumber} was created but no payment reference came back. It is saved as unpaid.`
            : 'This page confirms a payment after you return from the provider.'}
        </p>
        <Actions orderNumber={orderNumber} />
      </div>
    );
  }

  if (state === 'checking' || state === 'pending') {
    return (
      <div className={shell} aria-live="polite" aria-busy="true">
        {state === 'checking' ? (
          <Loader2 size={30} className="mx-auto animate-spin text-[var(--brand-yellow-ink)]" aria-hidden="true" />
        ) : (
          <Clock size={30} className="mx-auto text-[var(--brand-yellow-ink)]" aria-hidden="true" />
        )}
        <h1 className="mt-4 text-2xl font-extrabold text-primary">
          {state === 'checking' ? 'Confirming your payment…' : 'Payment is still pending'}
        </h1>
        <p className="mt-2 text-sm text-secondary">
          We are checking the reference with the payment provider. This page updates on its own —
          there is no need to pay again.
        </p>
        {orderNumber && (
          <p className="mt-3 text-xs text-muted">
            Order <span className="font-semibold text-strong">{orderNumber}</span>
          </p>
        )}
        <Actions orderNumber={orderNumber} />
      </div>
    );
  }

  if (state === 'simulated') {
    return (
      <div className={shell} aria-live="polite">
        <FlaskConical size={34} className="mx-auto text-[var(--brand-yellow-ink)]" aria-hidden="true" />
        <h1 className="mt-4 text-2xl font-extrabold text-primary sm:text-3xl">
          Simulated payment recorded
        </h1>
        <p className="mt-2 text-sm text-secondary">
          This merchant is running in sandbox mode, so <strong className="text-primary">no money
          moved and no card was charged</strong>. The order has been marked paid so the rest
          of the flow can be tested.
        </p>
        <p className="mx-auto mt-4 max-w-md rounded-xl border border-[#FFBD2E]/30 bg-[#FFBD2E]/5 px-4 py-3 text-xs text-secondary">
          To take real payments, set a live provider key and clear
          <code className="mx-1 rounded bg-[var(--ink)]/10 px-1.5 py-0.5 text-[11px]">PAYMENTS_SANDBOX</code>
          on the server.
        </p>
        {orderNumber && (
          <p className="mt-4 inline-block rounded-xl border border-[var(--ink)]/10 bg-[var(--ink)]/[0.04] px-4 py-2 text-sm">
            <span className="text-muted">Order </span>
            <span className="font-bold text-primary">{orderNumber}</span>
          </p>
        )}
        <Actions orderNumber={orderNumber} />
      </div>
    );
  }

  if (state === 'paid') {
    return (
      <div className={shell} aria-live="polite">
        <CheckCircle2 size={34} className="mx-auto text-[var(--brand-green-ink)]" aria-hidden="true" />
        <h1 className="mt-4 text-2xl font-extrabold text-primary sm:text-3xl">Payment confirmed</h1>
        <p className="mt-2 text-sm text-secondary">
          The merchant has been notified and will begin preparing your order.
        </p>
        {orderNumber && (
          <p className="mt-4 inline-block rounded-xl border border-[var(--ink)]/10 bg-[var(--ink)]/[0.04] px-4 py-2 text-sm">
            <span className="text-muted">Order </span>
            <span className="font-bold text-primary">{orderNumber}</span>
          </p>
        )}
        <Actions orderNumber={orderNumber} />
      </div>
    );
  }

  return (
    <div className={shell} role="alert">
      <AlertTriangle size={30} className="mx-auto text-[var(--brand-red-ink)]" aria-hidden="true" />
      <h1 className="mt-4 text-2xl font-extrabold text-primary">Payment was not completed</h1>
      <p className="mt-2 text-sm text-secondary">
        {state === 'error'
          ? (error as Error)?.message || 'The payment could not be verified.'
          : 'The provider reported the payment as unsuccessful. Your order is saved as unpaid and nothing has been charged.'}
      </p>
      {orderNumber && (
        <p className="mt-3 text-xs text-muted">
          Order <span className="font-semibold text-strong">{orderNumber}</span>
        </p>
      )}
      <Actions orderNumber={orderNumber} />
    </div>
  );
}

function Actions({ orderNumber }: { orderNumber?: string | null }) {
  return (
    <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
      <Link
        to="/account/orders"
        className="flex h-11 items-center rounded-xl bg-gradient-to-r from-[#FF5F56] via-[#FFBD2E] to-[#27C93F] px-5 text-sm font-bold text-white transition-[filter] hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFBD2E] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-base)]"
      >
        Your orders
      </Link>
      <Link
        to={orderNumber ? `/track?order=${encodeURIComponent(orderNumber)}` : '/track'}
        className="flex h-11 items-center rounded-xl border border-[var(--ink)]/15 bg-[var(--ink)]/5 px-5 text-sm font-semibold text-primary transition-colors hover:bg-[var(--ink)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFBD2E]"
      >
        Track this order
      </Link>
      <Link
        to="/products"
        className="flex h-11 items-center rounded-xl px-4 text-sm font-semibold text-body transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFBD2E]"
      >
        Keep shopping
      </Link>
    </div>
  );
}
