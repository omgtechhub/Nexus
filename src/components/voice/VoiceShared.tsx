import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Loader2, Mic, MicOff, Square } from 'lucide-react';
import toast from 'react-hot-toast';
import { ContinuousListener, VoiceRecorder, stopSpeaking, type Recording } from '../../utils/voiceCapture';
import { cn } from '../../utils/cn';
import type { EnrolProgress, EnrolResult } from '../../api/nexusIq';

/**
 * The parts the seller console and the shopping assistant share.
 *
 * They are one implementation rather than two because of the single most
 * fragile property of speaker verification: enrolment has to hear exactly what
 * a live command hears. Two copies of a hold-to-talk control drift — one gains
 * a trim, the other a different sample rate — and the profile stops matching
 * the voice it was built from. Jarvis measured a 0.13 similarity drop from
 * precisely that mismatch, which is enough to lock someone out of their own
 * assistant.
 */

export const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFBD2E] ' +
  'focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-base)]';

/**
 * The phrases a person reads during enrolment.
 *
 * Four different sentences, the last two from further away. A profile built
 * from one phrase at one distance is extremely self-consistent, which drives
 * the measured threshold up near its ceiling — and then the first real
 * question asked from across the room scores below it and is refused.
 */
export const ENROLMENT_STEPS = [
  { phrase: 'Nexus, show me what you have today.', condition: 'close' },
  { phrase: 'I am registering my voice so you know it is me.', condition: 'close' },
  { phrase: 'Find me something good and add it to my bag.', condition: 'far' },
  { phrase: 'That is everything, thank you very much.', condition: 'far' },
];

/**
 * What a captured clip is handed to.
 *
 * It may be async, and hands-free mode relies on that: the microphone stays
 * shut for as long as the returned promise is pending, which is how the
 * assistant avoids hearing its own spoken reply and answering itself.
 */
export type ClipHandler = (wav: Blob, seconds: number, peak: number) => void | Promise<void>;

/**
 * Hold-to-talk, with the recorder owned by a ref.
 *
 * A ref rather than state because the microphone is not render state: a
 * re-render mid-recording must not construct a second recorder and leave the
 * first one holding the device open.
 */
export function useHoldToTalk(onClip: ClipHandler) {
  const recorder = useRef<VoiceRecorder | null>(null);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState('');

  const begin = useCallback(async () => {
    if (recorder.current?.isRecording) return;
    setError('');
    stopSpeaking();
    try {
      recorder.current = new VoiceRecorder();
      await recorder.current.start();
      setRecording(true);
    } catch (err: any) {
      setError(err?.message || 'The microphone could not be opened.');
      recorder.current = null;
    }
  }, []);

  const end = useCallback(async () => {
    const active = recorder.current;
    if (!active?.isRecording) return;
    setRecording(false);
    // Dropped before the handler runs, not after. `onClip` is awaited and can
    // take as long as the answer takes to be read out; holding the slot for
    // that whole time would let a second press install a recorder that this
    // call then nulls out from under it, leaking the microphone.
    recorder.current = null;
    try {
      const { wav, seconds, peak } = await active.stop();
      await onClip(wav, seconds, peak);
    } catch (err: any) {
      setError(err?.message || 'That recording failed.');
    }
  }, [onClip]);

  // Release the device if the surface unmounts mid-recording.
  useEffect(() => () => recorder.current?.cancel(), []);

  return { recording, error, begin, end };
}

/**
 * The press-and-hold control.
 *
 * Pointer events so a tablet works, and keyboard handlers as well: without
 * them hold-to-talk is unreachable for anyone not using a pointer, which would
 * make the whole feature keyboard-inaccessible.
 */
export function TalkButton({
  recording,
  busy,
  label,
  onStart,
  onStop,
  tone = 'primary',
  disabled = false,
  className,
}: {
  recording: boolean;
  busy: boolean;
  label: string;
  onStart: () => void;
  onStop: () => void;
  /** 'secondary' when something else on the row is the main action. */
  tone?: 'primary' | 'secondary';
  /** Unavailable for a reason other than work in progress — the label stays put. */
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      disabled={busy || disabled}
      onPointerDown={e => {
        e.preventDefault();
        onStart();
      }}
      onPointerUp={e => {
        e.preventDefault();
        onStop();
      }}
      onPointerLeave={() => recording && onStop()}
      onKeyDown={e => {
        if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
          e.preventDefault();
          onStart();
        }
      }}
      onKeyUp={e => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          onStop();
        }
      }}
      aria-pressed={recording}
      className={cn(
        'inline-flex h-12 items-center justify-center gap-2 rounded-xl px-5 text-sm transition-colors',
        recording
          ? 'bg-[#FF5F56] font-bold text-white'
          : tone === 'secondary'
            ? 'border border-[var(--ink)]/15 font-semibold text-secondary hover:bg-[var(--ink)]/5 hover:text-primary disabled:opacity-50'
            : 'bg-[#FFBD2E] font-bold text-slate-950 hover:bg-[#ffc954] disabled:opacity-60',
        focusRing,
        className
      )}
    >
      {busy ? (
        <Loader2 size={16} className="animate-spin" aria-hidden="true" />
      ) : recording ? (
        <Square size={14} fill="currentColor" aria-hidden="true" />
      ) : (
        <Mic size={16} aria-hidden="true" />
      )}
      {busy ? 'Working…' : recording ? 'Release to send' : label}
    </button>
  );
}

/* ------------------------------------------------------------- hands-free */

/**
 * Listening mode: switched on once, then left alone.
 *
 * Holding a button down to ask a question is fine for one question and wrong
 * for a conversation — it occupies a hand, it cannot be used while reading the
 * screen, and it makes a follow-up cost as much as the first question. This
 * hook opens the microphone once and lets `ContinuousListener` decide where
 * one utterance ends and the next begins.
 *
 * The handler is held in a ref so a re-render — of which there are many, since
 * every answer is state — never tears down a live microphone and asks for
 * permission again mid-sentence.
 */
export function useHandsFree(onClip: ClipHandler) {
  const listener = useRef<ContinuousListener | null>(null);
  const handler = useRef(onClip);
  const [live, setLive] = useState(false);
  const [level, setLevel] = useState(0);
  const [hearing, setHearing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    handler.current = onClip;
  }, [onClip]);

  const stop = useCallback(() => {
    listener.current?.stop();
    listener.current = null;
    setLive(false);
    setLevel(0);
    setHearing(false);
    stopSpeaking();
  }, []);

  const start = useCallback(async () => {
    if (listener.current) return;
    setError('');
    stopSpeaking();

    const active = new ContinuousListener({
      onUtterance: (clip: Recording) => handler.current(clip.wav, clip.seconds, clip.peak),
      onLevel: (value, speaking) => {
        setLevel(value);
        setHearing(speaking);
      },
      onError: message => setError(message),
    });

    try {
      await active.start();
      listener.current = active;
      setLive(true);
    } catch (err: any) {
      active.stop();
      setError(err?.message || 'The microphone could not be opened.');
    }
  }, []);

  // Never leave the device open behind a closed panel: the browser's recording
  // indicator would stay lit with nothing listening to it.
  useEffect(() => () => listener.current?.stop(), []);

  return { live, level, hearing, error, start, stop };
}

/**
 * The listening switch, with press-and-hold kept alongside it.
 *
 * Listening is the primary control because it is what someone wants almost
 * every time. Hold-to-speak stays as the second option rather than being
 * removed: in a room with other people talking, sending exactly one clip on
 * purpose is more reliable than any silence detector, and that is a real
 * situation rather than a hypothetical one.
 */
export function VoiceControls({
  live,
  hearing,
  level,
  busy,
  holdRecording,
  holdLabel,
  onLiveStart,
  onLiveStop,
  onHoldStart,
  onHoldStop,
  className,
}: {
  live: boolean;
  hearing: boolean;
  level: number;
  busy: boolean;
  holdRecording: boolean;
  holdLabel: string;
  onLiveStart: () => void;
  onLiveStop: () => void;
  onHoldStart: () => void;
  onHoldStop: () => void;
  className?: string;
}) {
  const status = busy
    ? 'Working on that…'
    : live
      ? hearing
        ? 'Heard you — it sends when you pause.'
        : 'Listening. Speak whenever you are ready.'
      : holdRecording
        ? 'Recording — release to send.'
        : 'Switch listening on and talk freely, or hold to send one question.';

  return (
    <div className={cn('space-y-2.5', className)}>
      {/* Capped rather than full-bleed: on the seller console this row is a
          thousand pixels wide, and a CTA that long reads as a banner. */}
      <div className="flex max-w-xl flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={live ? onLiveStop : onLiveStart}
          disabled={holdRecording}
          aria-pressed={live}
          className={cn(
            'inline-flex h-12 flex-1 basis-44 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold transition-colors',
            'disabled:opacity-60',
            live
              ? 'bg-[#27C93F] text-slate-950 hover:bg-[#35d94d]'
              : 'bg-[#FFBD2E] text-slate-950 hover:bg-[#ffc954]',
            focusRing
          )}
        >
          {live ? (
            <>
              {/* A live indicator rather than a spinner: it says the
                  microphone is open, which is the thing worth knowing. */}
              <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
                <span className="absolute inset-0 animate-ping rounded-full bg-slate-950/50 motion-reduce:animate-none" />
                <span className="relative h-2.5 w-2.5 rounded-full bg-slate-950" />
              </span>
              Stop listening
            </>
          ) : (
            <>
              <Mic size={16} aria-hidden="true" />
              Start listening
            </>
          )}
        </button>

        {/* Disabled rather than busy while listening: two open microphones
            would fight over the device, but the label should still say what
            the button is for. */}
        <TalkButton
          recording={holdRecording}
          busy={busy}
          label={holdLabel}
          onStart={onHoldStart}
          onStop={onHoldStop}
          tone="secondary"
          disabled={live}
          className="flex-none"
        />
      </div>

      {/* The level meter only exists while the microphone is open, and it is
          the honest answer to "is it hearing me?" — a question no amount of
          reassuring copy settles. */}
      {live && (
        <div
          className="h-1.5 max-w-xl overflow-hidden rounded-full bg-[var(--ink)]/10"
          role="presentation"
        >
          <div
            className={cn(
              'h-full rounded-full transition-[width] duration-100 ease-out',
              hearing ? 'bg-[#27C93F]' : 'bg-[var(--ink)]/25'
            )}
            style={{ width: `${Math.max(2, Math.round(level * 100))}%` }}
          />
        </div>
      )}

      <p className="text-xs text-muted" role="status" aria-live="polite">
        {status}
      </p>

      {live && (
        <p className="flex items-center gap-1.5 text-[11px] text-muted">
          <MicOff size={11} aria-hidden="true" />
          The microphone is released the moment you stop listening.
        </p>
      )}
    </div>
  );
}

export interface EnrolmentWizardProps {
  /** Portal-specific uploader. Everything else about enrolment is identical. */
  sendSample: (wav: Blob, condition: string, finish: boolean) => Promise<EnrolProgress | EnrolResult>;
  title: string;
  blurb: string;
  onDone: () => void;
  onCancel?: () => void;
}

export function EnrolmentWizard({
  sendSample,
  title,
  blurb,
  onDone,
  onCancel,
}: EnrolmentWizardProps) {
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<EnrolResult | null>(null);

  const current = ENROLMENT_STEPS[step];
  const isLast = step === ENROLMENT_STEPS.length - 1;

  const handleClip = useCallback(
    async (wav: Blob, seconds: number, peak: number) => {
      if (seconds < 1) {
        toast.error('Too short — hold the button while you read the whole line.');
        return;
      }
      if (peak < 0.02) {
        toast.error('Nothing was picked up. Check the microphone is not muted.');
        return;
      }

      setBusy(true);
      try {
        const data = await sendSample(wav, current.condition, isLast);
        if (isLast && 'threshold' in data) setResult(data);
        else setStep(s => s + 1);
      } catch (err: any) {
        toast.error(err?.message || 'That recording could not be used.');
      } finally {
        setBusy(false);
      }
    },
    [current.condition, isLast, sendSample]
  );

  const { recording, error, begin, end } = useHoldToTalk(handleClip);

  if (result) {
    return (
      <div className="space-y-3 rounded-2xl border border-[var(--ink)]/10 bg-[var(--surface-base)] p-5">
        <p className="flex items-center gap-2 text-sm font-bold text-primary">
          <Check size={16} className="text-[var(--brand-green-ink)]" aria-hidden="true" />
          Voice registered
        </p>
        <dl className="grid grid-cols-3 gap-3 text-xs">
          <div>
            <dt className="text-muted">Samples</dt>
            <dd className="mt-0.5 font-semibold text-strong">{result.samples}</dd>
          </div>
          <div>
            <dt className="text-muted">Threshold</dt>
            <dd className="mt-0.5 font-semibold text-strong">{result.threshold.toFixed(2)}</dd>
          </div>
          <div>
            <dt className="text-muted">Consistency</dt>
            <dd className="mt-0.5 font-semibold text-strong">{result.consistency.toFixed(2)}</dd>
          </div>
        </dl>
        <p className="text-xs leading-relaxed text-muted">
          The threshold was measured from your own recordings rather than set to a fixed number, by
          scoring each one against a profile built from the others.
        </p>
        <button
          type="button"
          onClick={onDone}
          className={cn(
            'rounded-xl bg-[#FFBD2E] px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-[#ffc954]',
            focusRing
          )}
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border border-[var(--ink)]/10 bg-[var(--surface-base)] p-5">
      <div>
        <h3 className="text-sm font-bold text-primary">{title}</h3>
        <p className="mt-1 text-xs leading-relaxed text-secondary">{blurb}</p>
      </div>

      <ol className="flex gap-1.5" aria-label="Enrolment progress">
        {ENROLMENT_STEPS.map((_, i) => (
          <li
            key={i}
            aria-current={i === step ? 'step' : undefined}
            className={cn(
              'h-1.5 flex-1 rounded-full',
              i < step
                ? 'bg-[var(--brand-green-ink)]'
                : i === step
                  ? 'bg-[#FFBD2E]'
                  : 'bg-[var(--ink)]/15'
            )}
          />
        ))}
      </ol>

      <div className="rounded-xl border border-[var(--ink)]/10 bg-[var(--ink)]/[0.03] p-4">
        <p className="text-xs text-muted">
          Step {step + 1} of {ENROLMENT_STEPS.length}
          {current.condition === 'far' && ' · sit back a little'}
        </p>
        <p className="mt-1.5 text-base font-semibold leading-snug text-primary">“{current.phrase}”</p>
      </div>

      <p
        role="alert"
        className={cn('text-xs font-medium text-[var(--brand-red-ink)]', !error && 'sr-only')}
      >
        {error}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <TalkButton
          recording={recording}
          busy={busy}
          label="Hold to record"
          onStart={begin}
          onStop={end}
        />
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className={cn(
              'rounded-xl border border-[var(--ink)]/15 px-4 py-2.5 text-sm font-semibold text-secondary hover:bg-[var(--ink)]/5',
              focusRing
            )}
          >
            Cancel
          </button>
        )}
      </div>

      <p className="text-xs leading-relaxed text-muted">
        Your recordings become a numeric voice signature on the Nexus server and are then
        discarded. The audio is not stored and never leaves your infrastructure.
      </p>
    </div>
  );
}
