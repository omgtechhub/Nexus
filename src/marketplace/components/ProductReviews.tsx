import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, Loader2, MessageSquare, PencilLine, Store, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useApp } from '../../context/AppContext';
import {
  useProductReviewsQuery,
  useReviewEligibilityQuery,
  useCreateReviewMutation,
  useUpdateReviewMutation,
  useDeleteReviewMutation,
} from '../../hooks/useReviews';
import type { ListReviewsParams, ProductReview } from '../../api/reviews';
import { StarRating, StarRatingInput } from './StarRating';
import { cn } from '../../utils/cn';

const SORT_LABELS: Record<NonNullable<ListReviewsParams['sort']>, string> = {
  recent: 'Most recent',
  helpful: 'Most helpful',
  highest: 'Highest rated',
  lowest: 'Lowest rated',
};

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFBD2E] ' +
  'focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-base)]';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Ratings and comments for one product.
 *
 * Every number on this panel is computed from rows that exist. There is no
 * placeholder average, no sample review and no "4.8 from 2,000 shoppers"
 * standing in while the catalogue is young: a product with no reviews says it
 * has none, which is the only honest thing it can say and the thing a shopper
 * can actually act on.
 *
 * Who may write is never decided here. The component asks the server whether
 * this shopper has a delivered order for this product and renders whatever it
 * is told, so the form cannot be summoned by editing client state.
 */
export function ProductReviews({ productId }: { productId: string }) {
  const { isAuthenticated, accountType } = useApp();
  const [sort, setSort] = useState<NonNullable<ListReviewsParams['sort']>>('recent');
  const [starFilter, setStarFilter] = useState<number | undefined>(undefined);
  const [page, setPage] = useState(1);

  const params: ListReviewsParams = { sort, rating: starFilter, page, limit: 5 };
  const { data, isLoading } = useProductReviewsQuery(productId, params);

  // Only a signed-in customer can review, so only they are asked. A merchant
  // or admin browsing the marketplace gets the read-only view.
  const isShopper = isAuthenticated && accountType === 'CUSTOMER';
  const { data: eligibility } = useReviewEligibilityQuery(productId, isShopper);

  const summary = data?.summary;
  const reviews = data?.reviews ?? [];
  const pagination = data?.pagination;

  return (
    <section aria-labelledby="reviews-heading" className="space-y-6 border-t border-[var(--ink)]/10 pt-8">
      <h2 id="reviews-heading" className="text-xl font-bold text-primary">
        Ratings &amp; reviews
      </h2>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
        <RatingSummaryPanel
          summary={summary}
          isLoading={isLoading}
          activeFilter={starFilter}
          onFilter={star => {
            setStarFilter(current => (current === star ? undefined : star));
            setPage(1);
          }}
        />

        <div className="space-y-5">
          <ReviewComposer productId={productId} eligibility={eligibility} isShopper={isShopper} />

          {summary && summary.count > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-muted">
                {starFilter
                  ? `${pagination?.total ?? 0} ${starFilter}-star review${
                      (pagination?.total ?? 0) === 1 ? '' : 's'
                    }`
                  : `${summary.count} review${summary.count === 1 ? '' : 's'}`}
              </p>
              <label className="flex items-center gap-2 text-xs text-muted">
                Sort
                <select
                  value={sort}
                  onChange={e => {
                    setSort(e.target.value as NonNullable<ListReviewsParams['sort']>);
                    setPage(1);
                  }}
                  className={cn(
                    'rounded-lg border border-[var(--ink)]/15 bg-[var(--surface-base)] px-2 py-1.5 text-xs font-medium text-primary',
                    focusRing
                  )}
                >
                  {Object.entries(SORT_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          {isLoading ? (
            <ul className="space-y-4" aria-busy="true">
              {[0, 1, 2].map(i => (
                <li key={i} className="space-y-2 rounded-2xl border border-[var(--ink)]/10 p-4">
                  <div className="h-3 w-28 animate-pulse rounded bg-[var(--ink)]/[0.08]" />
                  <div className="h-3 w-full animate-pulse rounded bg-[var(--ink)]/[0.05]" />
                  <div className="h-3 w-2/3 animate-pulse rounded bg-[var(--ink)]/[0.05]" />
                </li>
              ))}
            </ul>
          ) : reviews.length === 0 ? (
            <EmptyReviews filtered={Boolean(starFilter)} onClear={() => setStarFilter(undefined)} />
          ) : (
            <>
              <ul className="space-y-4">
                {reviews.map(review => (
                  <li key={review.id}>
                    <ReviewCard review={review} productId={productId} />
                  </li>
                ))}
              </ul>

              {pagination && pagination.pages > 1 && (
                <nav
                  aria-label="Review pages"
                  className="flex items-center justify-between gap-3 pt-1"
                >
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    className={cn(
                      'rounded-lg border border-[var(--ink)]/15 px-3 py-1.5 text-xs font-semibold text-secondary transition-colors',
                      'hover:bg-[var(--ink)]/5 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40',
                      focusRing
                    )}
                  >
                    Previous
                  </button>
                  <span className="text-xs text-muted">
                    Page {pagination.page} of {pagination.pages}
                  </span>
                  <button
                    type="button"
                    disabled={page >= pagination.pages}
                    onClick={() => setPage(p => p + 1)}
                    className={cn(
                      'rounded-lg border border-[var(--ink)]/15 px-3 py-1.5 text-xs font-semibold text-secondary transition-colors',
                      'hover:bg-[var(--ink)]/5 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40',
                      focusRing
                    )}
                  >
                    Next
                  </button>
                </nav>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

function RatingSummaryPanel({
  summary,
  isLoading,
  activeFilter,
  onFilter,
}: {
  summary?: { average: number; count: number; distribution: Record<string, number> };
  isLoading: boolean;
  activeFilter?: number;
  onFilter: (star: number) => void;
}) {
  if (isLoading) {
    return <div className="h-56 animate-pulse rounded-2xl bg-[var(--ink)]/[0.04]" aria-busy="true" />;
  }

  // The honest zero state. Showing "0.0" beside five grey stars reads as a bad
  // product rather than as a new one.
  if (!summary || summary.count === 0) {
    return (
      <div className="rounded-2xl border border-[var(--ink)]/10 bg-[var(--ink)]/[0.03] p-5">
        <p className="text-sm font-semibold text-primary">No reviews yet</p>
        <p className="mt-1.5 text-xs leading-relaxed text-secondary">
          This product has not been rated. Reviews here come only from shoppers who bought it
          and had it delivered.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border border-[var(--ink)]/10 bg-[var(--ink)]/[0.03] p-5">
      <div className="flex items-baseline gap-2">
        <span className="text-4xl font-black text-primary">{summary.average.toFixed(1)}</span>
        <span className="text-sm text-muted">out of 5</span>
      </div>

      <StarRating
        value={summary.average}
        size="lg"
        label={`Average rating ${summary.average.toFixed(1)} out of 5, from ${summary.count} verified ${
          summary.count === 1 ? 'review' : 'reviews'
        }`}
      />

      <p className="text-xs text-muted">
        {summary.count} verified {summary.count === 1 ? 'review' : 'reviews'}
      </p>

      <ul className="space-y-1.5 border-t border-[var(--ink)]/10 pt-4">
        {[5, 4, 3, 2, 1].map(star => {
          const count = summary.distribution[String(star)] ?? 0;
          const percent = summary.count ? (count / summary.count) * 100 : 0;
          const isActive = activeFilter === star;
          return (
            <li key={star}>
              <button
                type="button"
                onClick={() => onFilter(star)}
                aria-pressed={isActive}
                disabled={count === 0}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg px-1.5 py-1 text-left transition-colors',
                  count > 0 && 'hover:bg-[var(--ink)]/5',
                  count === 0 && 'cursor-not-allowed opacity-50',
                  isActive && 'bg-[var(--ink)]/[0.07]',
                  focusRing
                )}
              >
                <span className="w-7 flex-shrink-0 text-xs font-medium text-secondary">
                  {star}
                  <span className="sr-only"> star</span>
                  <span aria-hidden="true">★</span>
                </span>
                <span
                  className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--ink)]/10"
                  aria-hidden="true"
                >
                  <span
                    className="block h-full rounded-full bg-[var(--brand-yellow-ink)]"
                    style={{ width: `${percent}%` }}
                  />
                </span>
                <span className="w-6 flex-shrink-0 text-right text-xs tabular-nums text-muted">
                  {count}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function EmptyReviews({ filtered, onClear }: { filtered: boolean; onClear: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--ink)]/15 p-8 text-center">
      <MessageSquare size={22} className="mx-auto mb-2 text-decorative" aria-hidden="true" />
      {filtered ? (
        <>
          <p className="text-sm text-secondary">No reviews with that rating.</p>
          <button
            type="button"
            onClick={onClear}
            className={cn('mt-2 rounded text-xs font-semibold text-[var(--brand-yellow-ink)] underline', focusRing)}
          >
            Show all reviews
          </button>
        </>
      ) : (
        <p className="text-sm text-secondary">
          Be the first to review this product once your order arrives.
        </p>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function ReviewCard({ review, productId }: { review: ProductReview; productId: string }) {
  const [editing, setEditing] = useState(false);
  const deleteMut = useDeleteReviewMutation(productId);

  if (editing) {
    return (
      <ReviewForm
        productId={productId}
        mode="edit"
        reviewId={review.id}
        initial={{ rating: review.rating, title: review.title ?? '', body: review.body }}
        onDone={() => setEditing(false)}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <article className="rounded-2xl border border-[var(--ink)]/10 bg-[var(--surface-base)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StarRating value={review.rating} size="sm" label={`${review.rating} out of 5`} />
            {review.title && (
              <span className="text-sm font-semibold text-primary">{review.title}</span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
            <span className="font-medium text-secondary">{review.author.name}</span>
            <span aria-hidden="true">·</span>
            <time dateTime={review.createdAt}>{formatDate(review.createdAt)}</time>
            {review.verifiedPurchase && (
              <>
                <span aria-hidden="true">·</span>
                {/* Backed by the order item the review is keyed to, not by a
                    flag someone set. */}
                <span className="inline-flex items-center gap-1 font-medium text-[var(--brand-green-ink)]">
                  <BadgeCheck size={13} aria-hidden="true" />
                  Verified purchase
                </span>
              </>
            )}
          </div>
        </div>

        {review.isMine && (
          <div className="flex flex-shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => setEditing(true)}
              aria-label="Edit your review"
              className={cn(
                'rounded-lg p-1.5 text-muted transition-colors hover:bg-[var(--ink)]/10 hover:text-primary',
                focusRing
              )}
            >
              <PencilLine size={14} aria-hidden="true" />
            </button>
            <button
              type="button"
              disabled={deleteMut.isPending}
              onClick={() =>
                deleteMut.mutate(review.id, {
                  onSuccess: () => toast.success('Your review was removed.'),
                  onError: (err: any) => toast.error(err?.message || 'Could not remove your review.'),
                })
              }
              aria-label="Delete your review"
              className={cn(
                'rounded-lg p-1.5 text-muted transition-colors hover:bg-[#FF5F56]/15 hover:text-[var(--brand-red-ink)] disabled:opacity-50',
                focusRing
              )}
            >
              <Trash2 size={14} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-secondary">{review.body}</p>

      {review.merchantReply && (
        <div className="mt-3 rounded-xl border-l-2 border-[var(--brand-yellow-ink)] bg-[var(--ink)]/[0.04] p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-primary">
            <Store size={12} aria-hidden="true" />
            Response from the seller
            {review.merchantRepliedAt && (
              <time dateTime={review.merchantRepliedAt} className="font-normal text-muted">
                · {formatDate(review.merchantRepliedAt)}
              </time>
            )}
          </p>
          <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-secondary">
            {review.merchantReply}
          </p>
        </div>
      )}
    </article>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * The write surface, or the reason there isn't one.
 *
 * Each branch below is a distinct state the shopper can be in, and each says
 * what it would take to move to the next one. "Only verified buyers can
 * review" with no explanation is the kind of message that reads as a bug.
 */
function ReviewComposer({
  productId,
  eligibility,
  isShopper,
}: {
  productId: string;
  eligibility?: {
    canReview: boolean;
    reason: string | null;
    review: (ProductReview & { body: string; title: string | null }) | null;
  };
  isShopper: boolean;
}) {
  const [open, setOpen] = useState(false);

  if (!isShopper) {
    return (
      <p className="rounded-2xl border border-[var(--ink)]/10 bg-[var(--ink)]/[0.03] p-4 text-xs leading-relaxed text-secondary">
        Reviews come only from shoppers who bought this product and had it delivered.{' '}
        <Link
          to="/account/login"
          className={cn('rounded font-semibold text-[var(--brand-yellow-ink)] underline', focusRing)}
        >
          Sign in
        </Link>{' '}
        to leave yours.
      </p>
    );
  }

  // Still loading, or the request failed. Either way, say nothing rather than
  // guess at eligibility.
  if (!eligibility) return null;

  if (eligibility.review) {
    return (
      <p className="rounded-2xl border border-[var(--brand-green-ink)]/25 bg-[#27C93F]/[0.07] p-4 text-xs text-secondary">
        You reviewed this product. Your review is in the list below — use the pencil to change it.
      </p>
    );
  }

  if (!eligibility.canReview) {
    return (
      <p className="rounded-2xl border border-[var(--ink)]/10 bg-[var(--ink)]/[0.03] p-4 text-xs leading-relaxed text-secondary">
        {eligibility.reason === 'NOT_DELIVERED'
          ? 'You have ordered this product. You can review it once the order is marked delivered.'
          : 'Only shoppers who bought this product and had it delivered can review it.'}
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'w-full rounded-2xl border border-dashed border-[var(--brand-yellow-ink)]/40 bg-[#FFBD2E]/[0.06] p-4',
          'text-sm font-semibold text-primary transition-colors hover:bg-[#FFBD2E]/[0.12]',
          focusRing
        )}
      >
        Write a review
        <span className="mt-0.5 block text-xs font-normal text-secondary">
          You bought this and it was delivered — tell other shoppers how it went.
        </span>
      </button>
    );
  }

  return (
    <ReviewForm
      productId={productId}
      mode="create"
      onDone={() => setOpen(false)}
      onCancel={() => setOpen(false)}
    />
  );
}

/* -------------------------------------------------------------------------- */

function ReviewForm({
  productId,
  mode,
  reviewId,
  initial,
  onDone,
  onCancel,
}: {
  productId: string;
  mode: 'create' | 'edit';
  reviewId?: string;
  initial?: { rating: number; title: string; body: string };
  onDone: () => void;
  onCancel: () => void;
}) {
  const [rating, setRating] = useState(initial?.rating ?? 0);
  const [title, setTitle] = useState(initial?.title ?? '');
  const [body, setBody] = useState(initial?.body ?? '');
  const [error, setError] = useState('');

  const createMut = useCreateReviewMutation(productId);
  const updateMut = useUpdateReviewMutation(productId);
  const pending = createMut.isPending || updateMut.isPending;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();

    if (rating < 1) {
      setError('Choose a star rating.');
      return;
    }
    if (body.trim().length < 10) {
      setError('Tell other shoppers a little more — at least 10 characters.');
      return;
    }
    setError('');

    const input = { rating, title: title.trim() || undefined, body: body.trim() };
    const onError = (err: any) =>
      setError(err?.message || 'Your review could not be saved. Try again.');

    if (mode === 'edit' && reviewId) {
      updateMut.mutate(
        { id: reviewId, input },
        {
          onSuccess: () => {
            toast.success('Your review was updated.');
            onDone();
          },
          onError,
        }
      );
    } else {
      createMut.mutate(input, {
        onSuccess: () => {
          toast.success('Thanks — your review is live.');
          onDone();
        },
        onError,
      });
    }
  };

  return (
    <form
      onSubmit={submit}
      noValidate
      className="space-y-4 rounded-2xl border border-[var(--ink)]/15 bg-[var(--surface-base)] p-4"
    >
      <div>
        <span id="review-rating-label" className="mb-1.5 block text-sm font-semibold text-primary">
          Your rating
        </span>
        <StarRatingInput
          value={rating}
          onChange={setRating}
          disabled={pending}
          labelledBy="review-rating-label"
        />
      </div>

      <div>
        <label htmlFor="review-title" className="mb-1.5 block text-sm font-medium text-body">
          Headline <span className="font-normal text-muted">(optional)</span>
        </label>
        <input
          id="review-title"
          value={title}
          maxLength={120}
          onChange={e => setTitle(e.target.value)}
          placeholder="Sums up your experience in a few words"
          className="form-input text-sm"
          disabled={pending}
        />
      </div>

      <div>
        <label htmlFor="review-body" className="mb-1.5 block text-sm font-medium text-body">
          Your review
        </label>
        <textarea
          id="review-body"
          value={body}
          rows={4}
          maxLength={4000}
          onChange={e => setBody(e.target.value)}
          placeholder="What was the quality like? Did it match the description? Would you buy it again?"
          className="form-input resize-none text-sm"
          aria-describedby="review-body-hint"
          disabled={pending}
        />
        <p id="review-body-hint" className="mt-1 text-xs text-muted">
          {body.trim().length < 10
            ? `At least 10 characters (${body.trim().length}/10).`
            : `${body.length}/4000 characters.`}
        </p>
      </div>

      {/* Announced the moment it appears, so a failure is not silent for a
          screen-reader user who has already moved past the field. */}
      <p role="alert" className={cn('text-xs font-medium text-[var(--brand-red-ink)]', !error && 'sr-only')}>
        {error}
      </p>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className={cn(
            'inline-flex items-center gap-2 rounded-xl bg-[#FFBD2E] px-4 py-2.5 text-sm font-bold text-slate-950',
            'transition-colors hover:bg-[#ffc954] disabled:cursor-not-allowed disabled:opacity-60',
            focusRing
          )}
        >
          {pending && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
          {mode === 'edit' ? 'Save changes' : 'Post review'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className={cn(
            'rounded-xl border border-[var(--ink)]/15 px-4 py-2.5 text-sm font-semibold text-secondary',
            'transition-colors hover:bg-[var(--ink)]/5 hover:text-primary disabled:opacity-60',
            focusRing
          )}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
