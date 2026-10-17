import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertTriangle, Lock, ShieldCheck, Store } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCart } from '../../context/CartContext';
import { useApp } from '../../context/AppContext';
import { useAccountAddressesQuery, useAccountProfileQuery } from '../../hooks/useAccount';
import { useCheckoutMutation } from '../../hooks/useStorefront';
import { initializePaymentApi } from '../../api/payments';
import { useCartValidation, lineProblem } from '../useCartValidation';
import { formatPrice } from '../productHelpers';
import { getAssetUrl } from '../../utils/assetPath';
import { PAYMENT_REFERENCE_KEY, checkoutReturnUrl } from '../paymentReturn';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

/**
 * Checkout for one store's lines.
 *
 * Reached only as a signed-in customer — the route is guarded, and the guard
 * carries the intended destination into the sign-in page so the shopper comes
 * back here rather than to their dashboard.
 *
 * Nothing on this page decides what anything costs. The form is posted to
 * `POST /storefront/:store/checkout`, which re-reads every price and stock
 * level inside a transaction and builds the order from its own figures; the
 * totals shown here are the server's own validation response, labelled as
 * estimates until it answers. Payment is then initialised server-side and the
 * customer is handed to the gateway — no state here can mark an order paid.
 */

const COUNTRIES = [
  'Nigeria', 'Ghana', 'Kenya', 'South Africa', 'Egypt',
  'United States', 'Canada', 'United Kingdom', 'Ireland',
  'Germany', 'France', 'Spain', 'Italy', 'Netherlands', 'Belgium',
  'Sweden', 'Norway', 'Denmark', 'Poland', 'Portugal',
  'United Arab Emirates', 'Saudi Arabia', 'India', 'Singapore',
  'Australia', 'New Zealand', 'Japan', 'Brazil', 'Mexico',
];

const checkoutSchema = z.object({
  customerName: z.string().min(2, 'Enter the name for this order'),
  customerEmail: z.string().email('Enter a valid email address'),
  customerPhone: z.string().optional(),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  address1: z.string().min(1, 'Street address is required'),
  address2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State or province is required'),
  zip: z.string().min(1, 'Postal code is required'),
  country: z.string().min(1, 'Select a country'),
  discountCode: z.string().optional(),
});

type CheckoutForm = z.infer<typeof checkoutSchema>;

export function CheckoutPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedStore = searchParams.get('store');

  const { user } = useApp();
  const { groups, clearStore } = useCart();
  const profileQuery = useAccountProfileQuery();
  const addressesQuery = useAccountAddressesQuery();

  // Default to the only group when the link carries no store, so a bag with a
  // single merchant checks out in one click.
  const group = useMemo(() => {
    if (requestedStore) return groups.find(g => g.storeId === requestedStore);
    return groups.length === 1 ? groups[0] : undefined;
  }, [groups, requestedStore]);

  const groupForValidation = useMemo(() => (group ? [group] : []), [group]);
  const { validations, isValidating } = useCartValidation(groupForValidation);
  const validation = validations[0];
  const serverTotals = validation?.result;
  const blocked = serverTotals?.isValid === false;

  const checkoutMut = useCheckoutMutation(group?.storeId || '');
  const [isPaying, setIsPaying] = useState(false);

  const profile = profileQuery.data;
  const defaultAddress =
    addressesQuery.data?.find(a => a.isDefault) || addressesQuery.data?.[0];

  const form = useForm<CheckoutForm>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      firstName: '',
      lastName: '',
      address1: '',
      address2: '',
      city: '',
      state: '',
      zip: '',
      country: 'Nigeria',
      discountCode: '',
    },
  });

  // Prefill from the account once it arrives, without clobbering anything the
  // customer has already typed.
  useEffect(() => {
    const name = profile?.name || user?.name || '';
    const email = profile?.email || user?.email || '';
    const current = form.getValues();

    form.reset(
      {
        ...current,
        customerName: current.customerName || name,
        customerEmail: current.customerEmail || email,
        firstName: current.firstName || defaultAddress?.firstName || name.split(' ')[0] || '',
        lastName:
          current.lastName || defaultAddress?.lastName || name.split(' ').slice(1).join(' ') || '',
        address1: current.address1 || defaultAddress?.address1 || '',
        address2: current.address2 || defaultAddress?.address2 || '',
        city: current.city || defaultAddress?.city || '',
        state: current.state || defaultAddress?.state || '',
        zip: current.zip || defaultAddress?.zip || '',
        country: defaultAddress?.country || current.country,
      },
      { keepDirtyValues: true }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, defaultAddress?.id, user?.name, user?.email]);

  if (!group) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <h1 className="text-xl font-bold text-primary">There is nothing to check out.</h1>
        <p className="mt-2 text-sm text-secondary">
          {groups.length > 1
            ? 'Your bag holds items from several stores — pick one from the bag to check out.'
            : 'Your bag is empty.'}
        </p>
        <Link
          to={groups.length ? '/cart' : '/products'}
          className="mt-6 inline-flex h-11 items-center rounded-xl bg-[var(--ink)]/10 px-5 text-sm font-bold text-primary transition-colors hover:bg-[var(--ink)]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFBD2E]"
        >
          {groups.length ? 'Back to your bag' : 'Start shopping'}
        </Link>
      </div>
    );
  }

  const onSubmit = async (values: CheckoutForm) => {
    setIsPaying(true);
    try {
      const res = await checkoutMut.mutateAsync({
        items: group.items.map(i => ({ variantId: i.variantId, quantity: i.quantity })),
        customer: {
          email: values.customerEmail,
          name: values.customerName,
          phone: values.customerPhone || undefined,
        },
        shippingAddress: {
          firstName: values.firstName,
          lastName: values.lastName,
          address1: values.address1,
          address2: values.address2 || undefined,
          city: values.city,
          state: values.state,
          zip: values.zip,
          country: values.country,
          phone: values.customerPhone || undefined,
        },
        discountCode: values.discountCode || undefined,
      });

      if (!res.success || !res.order) {
        throw new Error(res.message || 'The order could not be created.');
      }

      // The order now owns these lines and the stock has been decremented, so
      // they leave the bag. Other stores' lines stay.
      clearStore(group.storeId);

      // The order exists and is unpaid. The gateway decides otherwise, so the
      // customer is handed to it rather than shown a confirmation here.
      let init;
      try {
        init = await initializePaymentApi({
          orderId: res.order.id,
          provider: 'PAYSTACK',
          callbackUrl: checkoutReturnUrl(),
          // Proves this caller placed the order; see InitializePaymentParams.
          customerEmail: values.customerEmail,
        });
      } catch (payErr: any) {
        /**
         * The order exists and is unpaid, and it stays that way. 503 means no
         * gateway is configured, 502 that it could not be reached — neither is
         * a payment, and neither may be reported as one.
         */
        const status = payErr?.status;
        toast.error(
          status === 503
            ? 'Payments are not set up for this seller yet, so nothing was charged. Your order is saved as unpaid.'
            : 'The payment provider could not be reached, so nothing was charged. Your order is saved as unpaid.'
        );
        navigate(
          `/checkout/complete?order=${encodeURIComponent(res.order.orderNumber)}&unpaid=1`,
          { replace: true }
        );
        return;
      }

      if (init.success && init.data?.authorizationUrl) {
        try {
          // The return leg verifies this reference server-side. Gateways also
          // append it to the callback URL; this is the fallback for the ones
          // that do not.
          sessionStorage.setItem(PAYMENT_REFERENCE_KEY, init.data.reference);
        } catch {
          // Blocked storage must not stop the customer paying.
        }
        window.location.href = init.data.authorizationUrl;
        return;
      }

      // Initialisation reported success but handed back no URL to send the
      // customer to. Nothing was charged.
      toast.error('The payment provider did not return a payment page. Your order is saved as unpaid.');
      navigate(
        `/checkout/complete?order=${encodeURIComponent(res.order.orderNumber)}&unpaid=1`,
        { replace: true }
      );
    } catch (err: any) {
      toast.error(err?.message || 'Checkout failed. Please check the items in your bag.');
    } finally {
      setIsPaying(false);
    }
  };

  const busy = isPaying || checkoutMut.isPending;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <nav aria-label="Breadcrumb" className="mb-6 text-xs text-muted">
        <Link to="/cart" className="rounded hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFBD2E]">
          Your bag
        </Link>
        <span aria-hidden="true" className="px-1.5">/</span>
        <span className="text-strong">Checkout</span>
      </nav>

      <h1 className="text-2xl font-extrabold tracking-tight text-primary sm:text-3xl">Checkout</h1>
      <p className="mt-1 flex items-center gap-1.5 text-sm text-secondary">
        <Store size={13} className="text-[var(--brand-yellow-ink)]" aria-hidden="true" />
        Ordering from {group.storeName}
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8" noValidate>
          <fieldset className="space-y-4" disabled={busy}>
            <legend className="mb-1 text-sm font-bold text-primary">Contact</legend>
            <Input
              label="Full name"
              type="text"
              autoComplete="name"
              error={form.formState.errors.customerName?.message}
              {...form.register('customerName')}
            />
            <Input
              label="Email address"
              type="email"
              autoComplete="email"
              error={form.formState.errors.customerEmail?.message}
              {...form.register('customerEmail')}
            />
            <Input
              label="Phone number (optional)"
              type="tel"
              autoComplete="tel"
              error={form.formState.errors.customerPhone?.message}
              {...form.register('customerPhone')}
            />
          </fieldset>

          <fieldset className="space-y-4" disabled={busy}>
            <legend className="mb-1 text-sm font-bold text-primary">Delivery address</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="First name"
                type="text"
                autoComplete="given-name"
                error={form.formState.errors.firstName?.message}
                {...form.register('firstName')}
              />
              <Input
                label="Last name"
                type="text"
                autoComplete="family-name"
                error={form.formState.errors.lastName?.message}
                {...form.register('lastName')}
              />
            </div>
            <Input
              label="Street address"
              type="text"
              autoComplete="address-line1"
              error={form.formState.errors.address1?.message}
              {...form.register('address1')}
            />
            <Input
              label="Apartment, suite, unit (optional)"
              type="text"
              autoComplete="address-line2"
              error={form.formState.errors.address2?.message}
              {...form.register('address2')}
            />
            <div className="grid gap-4 sm:grid-cols-3">
              <Input
                label="City"
                type="text"
                autoComplete="address-level2"
                error={form.formState.errors.city?.message}
                {...form.register('city')}
              />
              <Input
                label="State / province"
                type="text"
                autoComplete="address-level1"
                error={form.formState.errors.state?.message}
                {...form.register('state')}
              />
              <Input
                label="Postal code"
                type="text"
                autoComplete="postal-code"
                error={form.formState.errors.zip?.message}
                {...form.register('zip')}
              />
            </div>
            <div>
              <label htmlFor="country" className="mb-1.5 block text-sm font-medium text-strong">
                Country
              </label>
              <select
                id="country"
                autoComplete="country-name"
                className="h-11 w-full rounded-xl border border-[var(--ink)]/10 bg-[var(--ink)]/5 px-3 text-sm text-primary focus:border-[#FFBD2E] focus:outline-none"
                {...form.register('country')}
              >
                {COUNTRIES.map(country => (
                  <option key={country} value={country} className="bg-slate-900">
                    {country}
                  </option>
                ))}
              </select>
              {form.formState.errors.country?.message && (
                <p className="mt-1.5 text-xs text-[var(--brand-red-ink)]">
                  {form.formState.errors.country.message}
                </p>
              )}
            </div>
          </fieldset>

          <fieldset className="space-y-4" disabled={busy}>
            <legend className="mb-1 text-sm font-bold text-primary">Discount code</legend>
            <Input
              label="Code (optional)"
              type="text"
              placeholder="Enter a code from this seller"
              error={form.formState.errors.discountCode?.message}
              {...form.register('discountCode')}
            />
            <p className="text-xs text-muted">
              The store&apos;s server applies the discount — the total below updates once the
              order is created.
            </p>
          </fieldset>

          {blocked && (
            <p role="alert" className="flex items-start gap-2 rounded-xl border border-[#FF5F56]/30 bg-[#FF5F56]/5 px-4 py-3 text-xs font-semibold text-[var(--brand-red-ink)]">
              <AlertTriangle size={14} className="mt-px flex-shrink-0" aria-hidden="true" />
              Some items are no longer available in the quantity you chose.{' '}
              <Link to="/cart" className="underline">
                Adjust your bag
              </Link>{' '}
              to continue.
            </p>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={busy}
            disabled={blocked || isValidating}
            icon={<Lock size={16} aria-hidden="true" />}
            className="rounded-xl"
          >
            {busy ? 'Taking you to payment…' : 'Place order and pay'}
          </Button>

          <p className="flex items-start gap-2 text-xs text-muted">
            <ShieldCheck size={14} className="mt-px flex-shrink-0 text-[var(--brand-green-ink)]" aria-hidden="true" />
            You will be redirected to the payment provider. Your order is only marked paid
            after the provider confirms it to our server.
          </p>
        </form>

        <aside aria-labelledby="order-summary" className="lg:sticky lg:top-24 lg:self-start">
          <div className="space-y-4 rounded-2xl border border-[var(--ink)]/10 bg-[var(--ink)]/[0.03] p-5">
            <h2 id="order-summary" className="text-sm font-bold text-primary">
              Order summary
            </h2>

            <ul className="space-y-3">
              {group.items.map(item => {
                const problem = lineProblem(validation, item.variantId);
                return (
                  <li key={item.variantId} className="flex gap-3">
                    <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg border border-[var(--ink)]/10 bg-[var(--ink)]/[0.04]">
                      {item.image ? (
                        <img src={getAssetUrl(item.image)} alt="" loading="lazy" className="h-full w-full object-cover" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-sm font-black text-decorative">
                          {item.title.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-strong">{item.title}</p>
                      <p className="text-[11px] text-muted">
                        {item.variantTitle ? `${item.variantTitle} · ` : ''}Qty {item.quantity}
                      </p>
                      {problem && (
                        <p className="text-[11px] font-medium text-[var(--brand-yellow-ink)]">{problem}</p>
                      )}
                    </div>
                    <span className="text-xs font-bold text-primary">
                      {formatPrice(item.price * item.quantity)}
                    </span>
                  </li>
                );
              })}
            </ul>

            <dl className="space-y-1.5 border-t border-[var(--ink)]/10 pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-secondary">Subtotal</dt>
                <dd className="font-semibold text-primary">
                  {formatPrice(serverTotals?.subtotal ?? group.subtotal)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-secondary">Tax</dt>
                <dd className="text-strong">
                  {serverTotals ? formatPrice(serverTotals.taxEstimate) : '—'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-secondary">Delivery</dt>
                <dd className="text-strong">
                  {serverTotals
                    ? serverTotals.shippingEstimate === 0
                      ? 'Free'
                      : formatPrice(serverTotals.shippingEstimate)
                    : '—'}
                </dd>
              </div>
              <div className="flex justify-between border-t border-[var(--ink)]/10 pt-2 text-base">
                <dt className="font-bold text-primary">Total</dt>
                <dd className="font-bold text-primary">
                  {serverTotals ? formatPrice(serverTotals.totalEstimate) : '—'}
                </dd>
              </div>
            </dl>

            <p className="text-[11px] leading-relaxed text-muted" aria-live="polite">
              {isValidating
                ? 'Confirming prices and stock with the store…'
                : serverTotals
                  ? 'Confirmed against the store’s own records. A discount code is applied when the order is created.'
                  : 'The store confirms the final total when your order is created.'}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
