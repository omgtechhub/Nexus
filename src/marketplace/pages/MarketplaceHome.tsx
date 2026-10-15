import { Link } from 'react-router-dom';
import { ArrowRight, PackageSearch, ShieldCheck, Tag, TrendingUp } from 'lucide-react';
import { useMarketplaceHomeQuery } from '../../hooks/useMarketplace';
import { ProductGrid, ProductGridSkeleton } from '../components/ProductCard';
import type { MarketplaceProduct } from '../../api/marketplace';

/**
 * The Nexus homepage: a shop, reachable signed out.
 *
 * Every section is backed by a query. There is no `featured` flag in the
 * schema, so nothing here is presented as hand-picked — the sections are
 * recency, merchant-set compare prices, and summed order quantities. A section
 * with nothing behind it is not rendered rather than filled with placeholders.
 */

function Section({
  title,
  description,
  icon,
  to,
  children,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  to: string;
  children: React.ReactNode;
}) {
  const id = `section-${title.toLowerCase().replace(/[^a-z]+/g, '-')}`;

  return (
    <section aria-labelledby={id} className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id={id} className="flex items-center gap-2 text-xl font-bold text-primary sm:text-2xl">
            <span className="text-[var(--brand-yellow-ink)]" aria-hidden="true">{icon}</span>
            {title}
          </h2>
          <p className="mt-1 text-sm text-secondary">{description}</p>
        </div>
        <Link
          to={to}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-semibold text-[var(--brand-yellow-ink)] transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFBD2E]"
        >
          See all
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>
      {children}
    </section>
  );
}

export function MarketplaceHome() {
  const { data, isLoading, isError, error, refetch } = useMarketplaceHomeQuery();

  const newArrivals: MarketplaceProduct[] = data?.newArrivals ?? [];
  const deals: MarketplaceProduct[] = data?.deals ?? [];
  const bestsellers: MarketplaceProduct[] = data?.bestsellers ?? [];
  const categories = data?.categories ?? [];

  const nothingForSale =
    !isLoading && !isError && !newArrivals.length && !deals.length && !bestsellers.length;

  return (
    <div className="mx-auto max-w-7xl space-y-14 px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      {/* Hero. The claims are limited to what the platform actually does:
          products from many stores, one account, server-verified checkout. */}
      <section className="relative overflow-hidden rounded-3xl border border-[var(--ink)]/10 bg-gradient-to-br from-[var(--ink)]/[0.06] via-[var(--ink)]/[0.02] to-transparent px-6 py-12 sm:px-12 sm:py-16">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[#FFBD2E]/10 blur-[110px]"
        />
        <div className="relative max-w-2xl space-y-5">
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--ink)]/15 bg-[var(--ink)]/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-[var(--brand-yellow-ink)]">
            <ShieldCheck size={13} aria-hidden="true" />
            One account, every seller on Nexus
          </span>
          <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-primary sm:text-5xl">
            Shop every seller in one place.
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-secondary sm:text-base">
            Browse the full Nexus catalogue, add to your bag without an account, and
            check out with prices and stock confirmed server-side at checkout.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Link
              to="/products/browse"
              className="flex h-12 items-center gap-2 rounded-xl bg-gradient-to-r from-[#FF5F56] via-[#FFBD2E] to-[#27C93F] px-6 text-sm font-bold text-white shadow-lg shadow-red-900/30 transition-[filter] hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFBD2E] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-base)]"
            >
              Shop now
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link
              to="/track"
              className="flex h-12 items-center rounded-xl border border-[var(--ink)]/15 bg-[var(--ink)]/5 px-5 text-sm font-semibold text-primary transition-colors hover:bg-[var(--ink)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFBD2E]"
            >
              Track an order
            </Link>
          </div>
        </div>
      </section>

      {isError && (
        <div
          role="alert"
          className="rounded-2xl border border-[#FF5F56]/30 bg-[#FF5F56]/5 px-5 py-6 text-center"
        >
          <p className="text-sm font-semibold text-primary">The catalogue could not be loaded.</p>
          <p className="mt-1 text-xs text-secondary">
            {(error as Error)?.message || 'Please try again in a moment.'}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-4 rounded-xl bg-[var(--ink)]/10 px-4 py-2 text-xs font-bold text-primary transition-colors hover:bg-[var(--ink)]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFBD2E]"
          >
            Try again
          </button>
        </div>
      )}

      {isLoading && (
        <section aria-busy="true" className="space-y-5">
          <div className="h-6 w-48 animate-pulse rounded bg-[var(--ink)]/[0.06]" />
          <ProductGridSkeleton />
        </section>
      )}

      {nothingForSale && (
        <div className="rounded-2xl border border-[var(--ink)]/10 bg-[var(--ink)]/[0.03] px-6 py-12 text-center">
          <PackageSearch size={28} className="mx-auto text-decorative" aria-hidden="true" />
          <p className="mt-3 text-sm font-semibold text-primary">No products are published yet.</p>
          <p className="mt-1 text-xs text-secondary">
            As soon as a Nexus store publishes a product it appears here.
          </p>
        </div>
      )}

      {categories.length > 0 && (
        <section aria-labelledby="section-categories" className="space-y-5">
          <h2 id="section-categories" className="text-xl font-bold text-primary sm:text-2xl">
            Shop by category
          </h2>
          <ul className="flex flex-wrap gap-2.5">
            {categories.map(category => (
              <li key={category.name}>
                <Link
                  to={`/products/browse?category=${encodeURIComponent(category.name)}`}
                  className="flex items-center gap-2 rounded-xl border border-[var(--ink)]/10 bg-[var(--ink)]/[0.04] px-4 py-2.5 text-sm font-medium text-strong transition-colors hover:border-[#FFBD2E]/50 hover:bg-[#FFBD2E]/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFBD2E]"
                >
                  {category.name}
                  <span className="text-xs text-muted">{category.productCount}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {deals.length > 0 && (
        <Section
          title="Deals"
          description="Products a seller has priced below its own compare-at price."
          icon={<Tag size={18} />}
          to="/products/browse?sort=price_asc"
        >
          <ProductGrid products={deals} />
        </Section>
      )}

      {bestsellers.length > 0 && (
        <Section
          title="Bestsellers"
          description="Ranked by units actually ordered across Nexus."
          icon={<TrendingUp size={18} />}
          to="/products/browse"
        >
          <ProductGrid products={bestsellers} />
        </Section>
      )}

      {newArrivals.length > 0 && (
        <Section
          title="New arrivals"
          description="The most recently published products on the platform."
          icon={<PackageSearch size={18} />}
          to="/products/browse?sort=newest"
        >
          <ProductGrid products={newArrivals} />
        </Section>
      )}
    </div>
  );
}
