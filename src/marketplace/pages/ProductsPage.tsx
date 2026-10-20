import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, PackageSearch, X } from 'lucide-react';
import { useMarketplaceCategoriesQuery, useMarketplaceProductsQuery } from '../../hooks/useMarketplace';
import { ProductGrid, ProductGridSkeleton } from '../components/ProductCard';

/**
 * Browse and search, for anyone.
 *
 * The URL is the single source of truth for every filter, so a filtered view
 * can be shared, bookmarked and stepped through with the browser's own back
 * button — and the header's search field reads the same `q` back out.
 */

const SORTS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'title_asc', label: 'Name: A to Z' },
];

export function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const q = searchParams.get('q') || '';
  const category = searchParams.get('category') || 'all';
  const sort = searchParams.get('sort') || 'newest';
  const merchantId = searchParams.get('merchantId') || '';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);

  const params = useMemo(
    () => ({ q: q || undefined, category, merchantId: merchantId || undefined, sort, page, limit: 24 }),
    [q, category, merchantId, sort, page]
  );

  const { data, isLoading, isFetching, isError, error, refetch } = useMarketplaceProductsQuery(params);
  const categoriesQuery = useMarketplaceCategoriesQuery();

  const products = data?.products ?? [];
  const pagination = data?.pagination;
  const categories = categoriesQuery.data?.categories ?? [];

  /** Any filter change resets to page 1; keeping the old page shows an empty grid. */
  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === '' || value === 'all') next.delete(key);
      else next.set(key, value);
    }
    if (!('page' in changes)) next.delete('page');
    setSearchParams(next);
    // No scrolling here: <ScrollRestoration /> takes every search change to the
    // top, so the filter controls and the header's category links behave the
    // same way instead of only this one path being handled.
  };

  const displayName = products[0]?.merchant?.name;
  const heading = q
    ? `Results for “${q}”`
    : merchantId
      ? displayName || 'Merchant catalogue'
      : category !== 'all'
        ? category
        : 'All products';

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <nav aria-label="Breadcrumb" className="text-xs text-muted">
        <Link to="/products" className="rounded hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFBD2E]">
          Shop
        </Link>
        <span aria-hidden="true" className="px-1.5">/</span>
        <span className="text-strong">{heading}</span>
      </nav>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-primary sm:text-3xl">{heading}</h1>
          <p className="mt-1 text-sm text-secondary" aria-live="polite">
            {isLoading
              ? 'Loading products…'
              : pagination
                ? `${pagination.total} product${pagination.total === 1 ? '' : 's'}`
                : ''}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="sort" className="text-xs font-medium text-muted">
            Sort by
          </label>
          <select
            id="sort"
            value={sort}
            onChange={e => update({ sort: e.target.value })}
            className="h-10 rounded-xl border border-[var(--ink)]/10 bg-[var(--ink)]/5 px-3 text-xs text-primary focus:border-[#FFBD2E] focus:outline-none"
          >
            {SORTS.map(option => (
              <option key={option.value} value={option.value} className="bg-slate-900">
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* Active filters, each individually clearable. */}
      {(q || category !== 'all' || merchantId) && (
        <ul className="flex flex-wrap items-center gap-2">
          {q && (
            <li>
              <button
                type="button"
                onClick={() => update({ q: null })}
                className="flex items-center gap-1.5 rounded-full border border-[var(--ink)]/15 bg-[var(--ink)]/5 px-3 py-1.5 text-xs font-medium text-strong transition-colors hover:bg-[var(--ink)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFBD2E]"
              >
                Search: {q}
                <X size={12} aria-hidden="true" />
                <span className="sr-only">Clear search</span>
              </button>
            </li>
          )}
          {merchantId && (
            <li>
              <button
                type="button"
                onClick={() => update({ merchantId: null })}
                className="flex items-center gap-1.5 rounded-full border border-[var(--ink)]/15 bg-[var(--ink)]/5 px-3 py-1.5 text-xs font-medium text-strong transition-colors hover:bg-[var(--ink)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFBD2E]"
              >
                Seller: {displayName || 'selected'}
                <X size={12} aria-hidden="true" />
                <span className="sr-only">Show every seller</span>
              </button>
            </li>
          )}
          {category !== 'all' && (
            <li>
              <button
                type="button"
                onClick={() => update({ category: null })}
                className="flex items-center gap-1.5 rounded-full border border-[var(--ink)]/15 bg-[var(--ink)]/5 px-3 py-1.5 text-xs font-medium text-strong transition-colors hover:bg-[var(--ink)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFBD2E]"
              >
                {category}
                <X size={12} aria-hidden="true" />
                <span className="sr-only">Clear category</span>
              </button>
            </li>
          )}
        </ul>
      )}

      <div className="grid gap-8 lg:grid-cols-[200px_1fr]">
        <aside aria-labelledby="filter-category" className="hidden lg:block">
          <h2 id="filter-category" className="mb-3 text-xs font-bold uppercase tracking-wider text-primary">
            Category
          </h2>
          <ul className="space-y-1">
            <li>
              <button
                type="button"
                onClick={() => update({ category: null })}
                aria-current={category === 'all' ? 'true' : undefined}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFBD2E] ${
                  category === 'all' ? 'bg-[var(--ink)]/10 font-semibold text-primary' : 'text-body hover:bg-[var(--ink)]/5 hover:text-primary'
                }`}
              >
                All
              </button>
            </li>
            {categories.map(entry => (
              <li key={entry.name}>
                <button
                  type="button"
                  onClick={() => update({ category: entry.name })}
                  aria-current={category === entry.name ? 'true' : undefined}
                  className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFBD2E] ${
                    category === entry.name
                      ? 'bg-[var(--ink)]/10 font-semibold text-primary'
                      : 'text-body hover:bg-[var(--ink)]/5 hover:text-primary'
                  }`}
                >
                  <span className="truncate">{entry.name}</span>
                  <span className="text-xs text-decorative">{entry.productCount}</span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <div className="space-y-6">
          {isError ? (
            <div role="alert" className="rounded-2xl border border-[#FF5F56]/30 bg-[#FF5F56]/5 px-5 py-10 text-center">
              <p className="text-sm font-semibold text-primary">Products could not be loaded.</p>
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
          ) : isLoading ? (
            <div aria-busy="true">
              <ProductGridSkeleton count={8} />
            </div>
          ) : (
            <div className={isFetching ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
              <ProductGrid
                products={products}
                empty={
                  <div className="rounded-2xl border border-[var(--ink)]/10 bg-[var(--ink)]/[0.03] px-6 py-14 text-center">
                    <PackageSearch size={28} className="mx-auto text-decorative" aria-hidden="true" />
                    <p className="mt-3 text-sm font-semibold text-primary">Nothing matched that.</p>
                    <p className="mt-1 text-xs text-secondary">
                      Try a different search term or clear the filters.
                    </p>
                    <button
                      type="button"
                      onClick={() => update({ q: null, category: null, merchantId: null })}
                      className="mt-4 rounded-xl bg-[var(--ink)]/10 px-4 py-2 text-xs font-bold text-primary transition-colors hover:bg-[var(--ink)]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFBD2E]"
                    >
                      Clear filters
                    </button>
                  </div>
                }
              />
            </div>
          )}

          {pagination && pagination.pages > 1 && (
            <nav aria-label="Pagination" className="flex items-center justify-between gap-3 border-t border-[var(--ink)]/10 pt-5">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => update({ page: String(page - 1) })}
                className="flex items-center gap-1.5 rounded-xl border border-[var(--ink)]/10 bg-[var(--ink)]/5 px-4 py-2 text-xs font-bold text-primary transition-colors hover:bg-[var(--ink)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFBD2E] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={14} aria-hidden="true" />
                Previous
              </button>
              <span className="text-xs text-muted">
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                type="button"
                disabled={page >= pagination.pages}
                onClick={() => update({ page: String(page + 1) })}
                className="flex items-center gap-1.5 rounded-xl border border-[var(--ink)]/10 bg-[var(--ink)]/5 px-4 py-2 text-xs font-bold text-primary transition-colors hover:bg-[var(--ink)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFBD2E] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <ChevronRight size={14} aria-hidden="true" />
              </button>
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
