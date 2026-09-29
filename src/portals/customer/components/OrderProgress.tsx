import { Check, Clock, X, Truck } from 'lucide-react';
import { cn } from '../../../utils/cn';
import type { ProgressStep } from '../orderProgress';

const DOT = {
  done: 'bg-[#27C93F] text-black border-[#27C93F]',
  active: 'bg-[#FFBD2E] text-black border-[#FFBD2E]',
  failed: 'bg-[#FF5F56] text-white border-[#FF5F56]',
  cancelled: 'bg-white/5 text-white/30 border-white/15',
  pending: 'bg-white/5 text-white/30 border-white/15',
} as const;

function StepIcon({ state }: { state: ProgressStep['state'] }) {
  if (state === 'done') return <Check size={13} aria-hidden="true" />;
  if (state === 'failed') return <X size={13} aria-hidden="true" />;
  if (state === 'active') return <Clock size={13} aria-hidden="true" />;
  return <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />;
}

export function OrderProgress({ steps }: { steps: ProgressStep[] }) {
  return (
    <ol className="space-y-0">
      {steps.map((step, i) => {
        const last = i === steps.length - 1;
        return (
          <li key={step.label} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  'flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border',
                  DOT[step.state]
                )}
              >
                <StepIcon state={step.state} />
              </span>
              {!last && (
                <span
                  className={cn(
                    'w-px flex-1 min-h-[28px]',
                    step.state === 'done' ? 'bg-[#27C93F]/40' : 'bg-white/10'
                  )}
                  aria-hidden="true"
                />
              )}
            </div>

            <div className={cn('pb-6', last && 'pb-0')}>
              <p
                className={cn(
                  'text-sm font-semibold',
                  step.state === 'pending' || step.state === 'cancelled' ? 'text-white/40' : 'text-white'
                )}
              >
                {step.label}
                <span className="sr-only">
                  {' — '}
                  {step.state === 'done'
                    ? 'completed'
                    : step.state === 'active'
                      ? 'in progress'
                      : step.state === 'failed'
                        ? 'failed'
                        : 'not started'}
                </span>
              </p>
              {step.detail && <p className="mt-0.5 text-xs text-white/50">{step.detail}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Carrier and tracking number, shown only when a shipment actually exists. */
export function TrackingDetails({
  carrier,
  trackingNumber,
}: {
  carrier: string | null;
  trackingNumber: string | null;
}) {
  if (!trackingNumber && !carrier) return null;

  return (
    <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
      <Truck size={16} className="mt-0.5 flex-shrink-0 text-[#27C93F]" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/50">
          {carrier || 'Carrier'}
        </p>
        {trackingNumber && (
          <p className="mt-1 break-all font-mono text-sm text-white">{trackingNumber}</p>
        )}
      </div>
    </div>
  );
}
