import { Star } from 'lucide-react';
import { cn } from '../../utils/cn';

const SIZES = { sm: 12, md: 16, lg: 20 } as const;

interface StarRatingProps {
  /** 0-5. Fractional values render as a partially filled star. */
  value: number;
  size?: keyof typeof SIZES;
  className?: string;
  /** Overrides the generated label, e.g. to fold in the review count. */
  label?: string;
}

/**
 * A read-only star rating.
 *
 * The partial fill is a clipped overlay rather than a rounded value, so 4.3
 * and 4.7 do not both render as four and a half stars. The whole run is one
 * `img` to assistive technology with the number in its label: five separate
 * icons would be read out as five meaningless graphics.
 */
export function StarRating({ value, size = 'md', className, label }: StarRatingProps) {
  const px = SIZES[size];
  const clamped = Math.max(0, Math.min(5, value));

  return (
    <span
      role="img"
      aria-label={label ?? `Rated ${clamped.toFixed(1)} out of 5`}
      className={cn('relative inline-flex flex-shrink-0 align-middle', className)}
      style={{ width: px * 5 + 8 }}
    >
      {/* Empty track */}
      <span className="flex gap-0.5" aria-hidden="true">
        {[0, 1, 2, 3, 4].map(i => (
          <Star key={i} size={px} className="text-[var(--ink)]/20" fill="currentColor" />
        ))}
      </span>

      {/* Filled overlay, clipped to the exact fraction */}
      <span
        className="absolute inset-y-0 left-0 overflow-hidden"
        style={{ width: `${(clamped / 5) * 100}%` }}
        aria-hidden="true"
      >
        <span className="flex gap-0.5">
          {[0, 1, 2, 3, 4].map(i => (
            <Star
              key={i}
              size={px}
              className="flex-shrink-0 text-[var(--brand-yellow-ink)]"
              fill="currentColor"
            />
          ))}
        </span>
      </span>
    </span>
  );
}

interface StarRatingInputProps {
  value: number;
  onChange: (rating: number) => void;
  disabled?: boolean;
  /** Ties the group to a visible label for assistive technology. */
  labelledBy?: string;
}

/**
 * The star picker used when writing a review.
 *
 * Radio inputs rather than buttons: a rating is one choice out of five, which
 * is exactly what a radio group is. That also gets arrow-key navigation and
 * the "2 of 5" announcement from the browser instead of hand-rolled key
 * handling, and it submits with the form.
 */
export function StarRatingInput({ value, onChange, disabled, labelledBy }: StarRatingInputProps) {
  return (
    <span role="radiogroup" aria-labelledby={labelledBy} className="inline-flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <label
          key={star}
          className={cn(
            'cursor-pointer rounded p-0.5 transition-transform',
            !disabled && 'hover:scale-110',
            disabled && 'cursor-not-allowed opacity-60',
            // The ring follows the native input's focus, since the input
            // itself is visually hidden.
            'focus-within:outline-none focus-within:ring-2 focus-within:ring-[#FFBD2E] focus-within:ring-offset-1 focus-within:ring-offset-[var(--surface-base)]'
          )}
        >
          <input
            type="radio"
            name="review-rating"
            value={star}
            checked={value === star}
            disabled={disabled}
            onChange={() => onChange(star)}
            className="sr-only"
          />
          <Star
            size={26}
            aria-hidden="true"
            fill={star <= value ? 'currentColor' : 'none'}
            className={cn(
              'transition-colors',
              star <= value ? 'text-[var(--brand-yellow-ink)]' : 'text-[var(--ink)]/25'
            )}
          />
          <span className="sr-only">
            {star} star{star === 1 ? '' : 's'}
          </span>
        </label>
      ))}
    </span>
  );
}
