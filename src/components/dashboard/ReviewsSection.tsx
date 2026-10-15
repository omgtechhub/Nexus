import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, Loader2, MessageSquare, Star, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  useStoreReviewsQuery,
  useReplyToReviewMutation,
  useDeleteReviewReplyMutation,
} from '../../hooks/useReviews';
import type { StoreReview } from '../../api/reviews';
import { StarRating } from '../../marketplace/components/StarRating';
import { cn } from '../../utils/cn';

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
 * What this store's buyers said, and the one lever the merchant has: a public
 * reply.
 *
 * There is deliberately no control here that changes a rating, edits a review
 * or hides one. A seller who can suppress its own one-star reviews makes every
 * rating on the marketplace worthless, so the only moderation path is a
 * platform-admin action on the review's status — which is why the backend
 * exposes no merchant route for it either.
 */
export function ReviewsSection() {
  const [rating, setRating] = useState<number | undefined>(undefined);
  const [unanswered, setUnanswered] = useState(false);
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error, refetch } = useStoreReviewsQuery({
    page,
    limit: 10,
    rating,
    unanswered: unanswered || undefined,
  });

  const reviews = data?.reviews ?? [];
  const summary = data?.summary;
  const pagination = data?.pagination;

  if (isError) {
    return (
      <div className="stat-card p-6 text-center">
        <p className="text-sm text-secondary">
          {(error as any)?.message || 'Could not load your reviews.'}
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className={cn(
            'mt-3 rounded-lg border border-[var(--ink)]/15 px-3 py-1.5 text-xs font-semibold text-primary',
            focusRing
          )}
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryTile
          label="Average rating"
          value={summary && summary.count > 0 ? summary.average.toFixed(1) : '—'}
          hint={
            summary && summary.count > 0 ? (
              <StarRating value={summary.average} size="sm" />
            ) : (
              <span className="text-xs text-muted">No reviews yet</span>
            )
          }
        />
        <SummaryTile
          label="Total reviews"
          value={summary ? String(summary.count) : '—'}
          hint={<span className="text-xs text-muted">From verified buyers only</span>}
        />
        <SummaryTile
          label="Awaiting reply"
          value={summary ? String(summary.awaitingReply) : '—'}
          hint={<span className="text-xs text-muted">Reviews you have not answered</span>}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <FilterChip active={rating === undefined && !unanswered} onClick={() => { setRating(undefined); setUnanswered(false); setPage(1); }}>
          All
        </FilterChip>
        <FilterChip active={unanswered} onClick={() => { setUnanswered(u => !u); setPage(1); }}>
          Awaiting reply
        </FilterChip>
        {[5, 4, 3, 2, 1].map(star => (
          <FilterChip
            key={star}
            active={rating === star}
            onClick={() => { setRating(r => (r === star ? undefined : star)); setPage(1); }}
          >
            <span className="inline-flex items-center gap-1">
              {star}
              <Star size={11} fill="currentColor" aria-hidden="true" />
            </span>
          </FilterChip>
        ))}
      </div>

      {isLoading ? (
        <ul className="space-y-3" aria-busy="true">
          {[0, 1, 2].map(i => (
            <li key={i} className="stat-card space-y-2 p-4">
              <div className="h-3 w-32 animate-pulse rounded bg-[var(--ink)]/[0.08]" />
              <div className="h-3 w-full animate-pulse rounded bg-[var(--ink)]/[0.05]" />
            </li>
          ))}
        </ul>
      ) : reviews.length === 0 ? (
        <div className="stat-card p-10 text-center">
          <MessageSquare size={22} className="mx-auto mb-2 text-decorative" aria-hidden="true" />
          <p className="text-sm font-medium text-primary">
            {rating || unanswered ? 'Nothing matches that filter.' : 'No reviews yet.'}
          </p>
          <p className="mt-1 text-xs text-muted">
            {rating || unanswered
              ? 'Clear the filter to see every review.'
              : 'Reviews appear here once a buyer receives an order and rates the product.'}
          </p>
        </div>
      ) : (
        <>
          <ul className="space-y-3">
            {reviews.map(review => (
              <li key={review.id}>
                <MerchantReviewCard review={review} />
              </li>
            ))}
          </ul>

          {pagination && pagination.pages > 1 && (
            <nav aria-label="Review pages" className="flex items-center justify-between gap-3">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className={cn(
                  'rounded-lg border border-[var(--ink)]/15 px-3 py-1.5 text-xs font-semibold text-secondary',
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
                  'rounded-lg border border-[var(--ink)]/15 px-3 py-1.5 text-xs font-semibold text-secondary',
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
  );
}

function SummaryTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: React.ReactNode;
}) {
  return (
    <div className="stat-card p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold text-primary">{value}</p>
      <div className="mt-1.5">{hint}</div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
        active
          ? 'border-[#FFBD2E]/50 bg-[#FFBD2E]/15 text-primary'
          : 'border-[var(--ink)]/15 text-secondary hover:bg-[var(--ink)]/5 hover:text-primary',
        focusRing
      )}
    >
      {children}
    </button>
  );
}

function MerchantReviewCard({ review }: { review: StoreReview }) {
  const [replying, setReplying] = useState(false);
  const [draft, setDraft] = useState(review.merchantReply ?? '');
  const replyMut = useReplyToReviewMutation();
  const deleteReplyMut = useDeleteReviewReplyMutation();

  const submitReply = (e: React.FormEvent) => {
    e.preventDefault();
    const reply = draft.trim();
    if (!reply) return;

    replyMut.mutate(
      { id: review.id, reply },
      {
        onSuccess: () => {
          toast.success('Your reply is live on the product page.');
          setReplying(false);
        },
        onError: (err: any) => toast.error(err?.message || 'Could not post your reply.'),
      }
    );
  };

  return (
    <article className="stat-card space-y-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StarRating value={review.rating} size="sm" label={`${review.rating} out of 5`} />
            {review.title && <span className="text-sm font-semibold text-primary">{review.title}</span>}
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
            <span className="font-medium text-secondary">{review.author.name}</span>
            <span aria-hidden="true">·</span>
            <time dateTime={review.createdAt}>{formatDate(review.createdAt)}</time>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1 font-medium text-[var(--brand-green-ink)]">
              <BadgeCheck size={13} aria-hidden="true" />
              Verified purchase
            </span>
          </p>
        </div>

        <Link
          to={`/products/browse?q=${encodeURIComponent(review.product.title)}`}
          className={cn(
            'max-w-[12rem] truncate rounded text-xs font-medium text-[var(--brand-yellow-ink)] underline',
            focusRing
          )}
        >
          {review.product.title}
        </Link>
      </div>

      <p className="whitespace-pre-line text-sm leading-relaxed text-secondary">{review.body}</p>

      {review.merchantReply && !replying && (
        <div className="rounded-xl border-l-2 border-[var(--brand-yellow-ink)] bg-[var(--ink)]/[0.04] p-3">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-semibold text-primary">Your reply</p>
            <div className="flex flex-shrink-0 gap-1">
              <button
                type="button"
                onClick={() => { setDraft(review.merchantReply ?? ''); setReplying(true); }}
                className={cn('rounded px-2 py-0.5 text-xs font-semibold text-secondary hover:text-primary', focusRing)}
              >
                Edit
              </button>
              <button
                type="button"
                disabled={deleteReplyMut.isPending}
                onClick={() =>
                  deleteReplyMut.mutate(review.id, {
                    onSuccess: () => toast.success('Reply withdrawn.'),
                    onError: (err: any) => toast.error(err?.message || 'Could not withdraw the reply.'),
                  })
                }
                aria-label="Withdraw reply"
                className={cn('rounded p-1 text-muted hover:text-[var(--brand-red-ink)] disabled:opacity-50', focusRing)}
              >
                <Trash2 size={13} aria-hidden="true" />
              </button>
            </div>
          </div>
          <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-secondary">
            {review.merchantReply}
          </p>
        </div>
      )}

      {replying ? (
        <form onSubmit={submitReply} className="space-y-2">
          <label htmlFor={`reply-${review.id}`} className="sr-only">
            Your public reply
          </label>
          <textarea
            id={`reply-${review.id}`}
            value={draft}
            rows={3}
            maxLength={2000}
            onChange={e => setDraft(e.target.value)}
            placeholder="Answer this shopper. Your reply is public on the product page."
            className="form-input resize-none text-sm"
            disabled={replyMut.isPending}
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={replyMut.isPending || !draft.trim()}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg bg-[#FFBD2E] px-3 py-2 text-xs font-bold text-slate-950',
                'hover:bg-[#ffc954] disabled:cursor-not-allowed disabled:opacity-60',
                focusRing
              )}
            >
              {replyMut.isPending && <Loader2 size={12} className="animate-spin" aria-hidden="true" />}
              Post reply
            </button>
            <button
              type="button"
              onClick={() => setReplying(false)}
              disabled={replyMut.isPending}
              className={cn(
                'rounded-lg border border-[var(--ink)]/15 px-3 py-2 text-xs font-semibold text-secondary',
                'hover:bg-[var(--ink)]/5 hover:text-primary disabled:opacity-60',
                focusRing
              )}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        !review.merchantReply && (
          <button
            type="button"
            onClick={() => { setDraft(''); setReplying(true); }}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg border border-[var(--ink)]/15 px-3 py-1.5',
              'text-xs font-semibold text-secondary transition-colors hover:bg-[var(--ink)]/5 hover:text-primary',
              focusRing
            )}
          >
            <MessageSquare size={13} aria-hidden="true" />
            Reply publicly
          </button>
        )
      )}
    </article>
  );
}
