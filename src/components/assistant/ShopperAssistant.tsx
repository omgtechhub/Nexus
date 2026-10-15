import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle, Keyboard, Loader2, Mic, Send, Sparkles, Trash2, Volume2, VolumeX,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getShopVoiceStatusApi,
  sendShopEnrolSampleApi,
  deleteShopVoiceProfileApi,
  sendShopCommandApi,
  sendShopMessageApi,
  type ShopTurn,
  type SpokenCartLine,
} from '../../api/shopVoice';
import { useCart } from '../../context/CartContext';
import { canRecord, speak, stopSpeaking } from '../../utils/voiceCapture';
import {
  EnrolmentWizard,
  VoiceControls,
  useHandsFree,
  useHoldToTalk,
  focusRing,
} from '../voice/VoiceShared';
import { StarRating } from '../../marketplace/components/StarRating';
import { formatPrice } from '../../marketplace/productHelpers';
import { cn } from '../../utils/cn';
import { ModeTabs, PanelHeader, panelShell } from './dockShell';

/**
 * The shopper's half of Nexus IQ.
 *
 * It searches the catalogue, fills the bag and walks the shopper to payment.
 * What it will not do is pay: a checkout turn ends by handing the browser to
 * the normal checkout page, where the shopper enters their delivery details
 * and authorises the payment with the gateway themselves. That boundary is
 * deliberate and is not a limitation to be engineered away — an assistant that
 * can complete a payment unprompted is one misheard word away from buying
 * something nobody asked for.
 *
 * The cart lives in the browser, so the assistant proposes and this component
 * applies. Every action below goes through the same `useCart` functions the
 * buttons on the page use, which means a spoken "add two" and a clicked "add
 * to bag" cannot diverge.
 *
 * Typing and speaking share one thread rather than one tab each. The server
 * runs the same parse-and-plan path either way, so "find me a wool jumper"
 * spoken and "add two of the first one" typed is a single coherent
 * conversation — which is what a person doing it would expect, and what two
 * separate histories would quietly break.
 */

interface Entry {
  id: string;
  role: 'you' | 'iq';
  text: string;
  turn?: ShopTurn;
}

let entrySeq = 0;
const nextId = () => `e${++entrySeq}`;

function bagLabel(count: number) {
  return count > 0 ? `${count} line${count === 1 ? '' : 's'} in your bag` : 'Your bag is empty';
}

export function ShopperAssistantPanel({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { items, addToCart, removeFromCart, clearCart, setCartOpen } = useCart();

  const micSupported = canRecord();
  // Chat, even where a microphone exists. Opening on Talk puts a four-recording
  // enrolment wizard in front of someone who pressed a button to ask a
  // question, and voice is the thing they opt into, not the toll for entry.
  const [mode, setMode] = useState<'chat' | 'talk'>('chat');
  const [enrolling, setEnrolling] = useState(false);
  const [muted, setMuted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState('');
  const [thread, setThread] = useState<Entry[]>([]);
  const [failure, setFailure] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  // Voice status is only consulted for the Talk tab, so a browser with no
  // microphone never pays for the request.
  const { data: status, isLoading } = useQuery({
    queryKey: ['shop', 'voice', 'status'],
    queryFn: getShopVoiceStatusApi,
    enabled: micSupported,
  });

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [thread.length, busy]);

  /** The bag, in the shape the assistant is told about. */
  const spokenCart: SpokenCartLine[] = items.map(i => ({
    productId: i.productId,
    variantId: i.variantId,
    title: i.title,
    quantity: i.quantity,
    price: i.price,
    storeId: i.storeId,
    storeName: i.storeName,
  }));

  /**
   * Apply what the assistant proposed.
   *
   * A checkout action navigates rather than ordering: the checkout page is
   * where delivery details are collected and where the gateway takes over, and
   * routing a spoken purchase through it means there is exactly one checkout
   * in the product rather than a second, voice-shaped one that would have to
   * be kept in step with it.
   */
  const applyAction = useCallback(
    (result: ShopTurn) => {
      const action = result.action;
      if (!action) return;

      if (action.type === 'ADD') {
        const p = action.product;
        addToCart({
          variantId: action.variantId,
          productId: p.id,
          title: p.title,
          price: p.price,
          sku: p.sku,
          image: p.image || '',
          quantity: action.quantity,
          maxStock: p.availableStock,
          storeId: p.store.id,
          storeName: p.store.name,
          productSlug: p.slug,
        });
        return;
      }

      if (action.type === 'REMOVE') {
        const line = items.find(i => i.productId === action.productId);
        if (line) removeFromCart(line.variantId);
        return;
      }

      if (action.type === 'CLEAR') {
        clearCart();
        return;
      }

      if (action.type === 'CHECKOUT') {
        // Only a confirmed turn leaves the page. The read-back is a question,
        // and navigating on it would skip the confirmation entirely — so this
        // reads the stage the turn declares rather than inferring it from the
        // intent, which is no longer a reliable proxy now that a "yes" can
        // also produce a read-back.
        if (action.stage === 'GO') {
          onClose();
          navigate(`/checkout?store=${encodeURIComponent(action.storeId)}`);
        } else {
          setCartOpen(false);
        }
      }
    },
    [addToCart, removeFromCart, clearCart, items, navigate, onClose, setCartOpen]
  );

  /** One turn, whichever input produced it. */
  const record = useCallback(
    (result: ShopTurn) => {
      setThread(t => [
        ...t,
        { id: nextId(), role: 'you', text: result.transcript },
        { id: nextId(), role: 'iq', text: result.reply, turn: result },
      ]);
      applyAction(result);
    },
    [applyAction]
  );

  const handleClip = useCallback(
    async (wav: Blob, seconds: number, peak: number) => {
      if (seconds < 1) {
        toast.error('That was too short to make out — say a little more.');
        return;
      }
      if (peak < 0.02) {
        toast.error('Nothing was picked up. Check the microphone is not muted.');
        return;
      }

      setBusy(true);
      setFailure('');
      // Held rather than awaited here: the controls should free up as soon as
      // the reply is on screen, but a live microphone has to stay shut until
      // the assistant has finished speaking or it will answer itself.
      let spoken: Promise<void> | null = null;
      try {
        const result = await sendShopCommandApi(wav, spokenCart, 'USD');
        record(result);
        if (!muted) spoken = speak(result.reply);
      } catch (err: any) {
        setFailure(err?.message || 'That command could not be handled.');
        if (err?.spoken && !muted) spoken = speak(err.spoken);
      } finally {
        setBusy(false);
      }

      if (spoken) await spoken;
    },
    [spokenCart, muted, record]
  );

  const handleTyped = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const message = draft.trim();
      if (!message || busy) return;

      setDraft('');
      setBusy(true);
      setFailure('');
      try {
        const result = await sendShopMessageApi(message, spokenCart, 'USD');
        record(result);
        // A typed question is usually asked somewhere speaking out loud was
        // not an option, so the answer is only read back if the shopper had
        // already been using the spoken side.
        if (!muted && mode === 'talk') await speak(result.reply);
      } catch (err: any) {
        setFailure(err?.message || 'That message could not be sent.');
        setDraft(message);
      } finally {
        setBusy(false);
      }
    },
    [draft, busy, spokenCart, record, muted, mode]
  );

  const { recording, error, begin, end } = useHoldToTalk(handleClip);
  const listening = useHandsFree(handleClip);

  const closePanel = useCallback(() => {
    stopSpeaking();
    listening.stop();
    onClose();
  }, [listening, onClose]);

  const needsEnrolment = micSupported && !isLoading && (!status?.enrolled || enrolling);
  const talking = mode === 'talk';

  return (
    <div role="dialog" aria-modal="false" aria-label="Nexus IQ shopping assistant" className={panelShell}>
      <PanelHeader
        title="Nexus IQ"
        subtitle="Your shopping assistant"
        icon={<Sparkles size={16} className="text-[var(--brand-yellow-ink)]" />}
        onClose={closePanel}
        actions={
          <button
            type="button"
            onClick={() => {
              setMuted(m => !m);
              stopSpeaking();
            }}
            aria-pressed={muted}
            aria-label={muted ? 'Turn spoken replies on' : 'Turn spoken replies off'}
            className={cn('rounded-lg p-2 text-muted hover:bg-[var(--ink)]/10 hover:text-primary', focusRing)}
          >
            {muted ? <VolumeX size={15} aria-hidden="true" /> : <Volume2 size={15} aria-hidden="true" />}
          </button>
        }
      />

      <ModeTabs
        value={mode}
        onChange={setMode}
        tabs={[
          { id: 'chat', label: 'Chat', icon: <Keyboard size={13} aria-hidden="true" /> },
          {
            id: 'talk',
            label: 'Talk',
            icon: <Mic size={13} aria-hidden="true" />,
            disabled: !micSupported,
            title: micSupported
              ? undefined
              : 'This browser is not offering a microphone. Open the site over https, then reload.',
          },
        ]}
      />

      <div className="flex-1 overflow-y-auto p-4" aria-live="polite">
        {talking && needsEnrolment ? (
          isLoading ? (
            <div className="h-40 animate-pulse rounded-xl bg-[var(--ink)]/[0.04]" aria-busy="true" />
          ) : (
            <EnrolmentWizard
              sendSample={sendShopEnrolSampleApi}
              title="Register your voice"
              blurb="Four short recordings, so the assistant answers you and not whoever else is in the room. Read the last two from a little further away."
              onDone={async () => {
                setEnrolling(false);
                await queryClient.invalidateQueries({ queryKey: ['shop', 'voice', 'status'] });
              }}
              // Cancelling drops back to typing rather than to a dead panel:
              // registering a voice is the price of the Talk tab, not of the
              // assistant.
              onCancel={status?.enrolled ? () => setEnrolling(false) : () => setMode('chat')}
            />
          )
        ) : (
          <div className="space-y-3">
            {talking && status && !status.engine.available && (
              <p className="flex items-start gap-2 rounded-xl border border-[#FFBD2E]/30 bg-[#FFBD2E]/5 p-3 text-xs leading-relaxed text-secondary">
                <AlertTriangle size={14} className="mt-0.5 flex-shrink-0 text-[var(--brand-yellow-ink)]" aria-hidden="true" />
                <span>
                  Voice matching is not set up on the server, so commands are answered without
                  checking the voice.
                </span>
              </p>
            )}

            {thread.length === 0 && (
              <div className="rounded-xl border border-[var(--ink)]/10 bg-[var(--ink)]/[0.03] p-4">
                <p className="text-xs font-semibold text-primary">
                  {talking ? 'Try saying' : 'Try asking'}
                </p>
                <ul className="mt-2 space-y-1.5 text-xs text-secondary">
                  <li>&ldquo;Find me a wool jumper under a hundred&rdquo;</li>
                  <li>&ldquo;Add two of the first one&rdquo;</li>
                  <li>&ldquo;What is in my bag?&rdquo;</li>
                  <li>&ldquo;Check out&rdquo;</li>
                </ul>
              </div>
            )}

            {thread.map(entry => (
              <ThreadEntry key={entry.id} entry={entry} />
            ))}

            {busy && (
              <p className="inline-flex items-center gap-2 rounded-2xl border border-[var(--ink)]/10 bg-[var(--ink)]/5 px-3.5 py-2 text-xs text-muted">
                <Loader2 size={13} className="animate-spin" aria-hidden="true" />
                Looking that up&hellip;
              </p>
            )}

            <p
              role="alert"
              className={cn(
                'text-xs font-medium text-[var(--brand-red-ink)]',
                !error && !failure && !listening.error && 'sr-only'
              )}
            >
              {error || failure || listening.error}
            </p>

            <div ref={endRef} />
          </div>
        )}
      </div>

      <footer className="flex-shrink-0 space-y-2 border-t border-[var(--ink)]/10 p-3">
        {talking ? (
          !needsEnrolment &&
          !isLoading && (
            <>
              <VoiceControls
                live={listening.live}
                hearing={listening.hearing}
                level={listening.level}
                busy={busy}
                holdRecording={recording}
                holdLabel="Hold to speak"
                onLiveStart={listening.start}
                onLiveStop={listening.stop}
                onHoldStart={begin}
                onHoldStop={end}
              />
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] text-muted">{bagLabel(items.length)}</p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setEnrolling(true)}
                    className={cn('rounded px-2 py-1 text-[11px] font-semibold text-secondary hover:text-primary', focusRing)}
                  >
                    Re-record voice
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await deleteShopVoiceProfileApi();
                      await queryClient.invalidateQueries({ queryKey: ['shop', 'voice', 'status'] });
                      toast.success('Voice registration removed.');
                    }}
                    aria-label="Remove voice registration"
                    className={cn('rounded p-1.5 text-muted hover:text-[var(--brand-red-ink)]', focusRing)}
                  >
                    <Trash2 size={13} aria-hidden="true" />
                  </button>
                </div>
              </div>
            </>
          )
        ) : (
          <>
            <form onSubmit={handleTyped} className="flex gap-2">
              <label htmlFor="iq-shop-message" className="sr-only">
                Ask Nexus IQ about products or your bag
              </label>
              <input
                id="iq-shop-message"
                value={draft}
                onChange={e => setDraft(e.target.value)}
                placeholder="Find me a wool jumper…"
                maxLength={500}
                disabled={busy}
                className={cn(
                  'min-w-0 flex-1 rounded-xl border border-[var(--ink)]/10 bg-[var(--ink)]/5 px-3 py-2.5 text-sm',
                  'text-primary placeholder:text-muted focus:border-[#FFBD2E]/50 focus:outline-none disabled:opacity-50'
                )}
              />
              <button
                type="submit"
                disabled={!draft.trim() || busy}
                aria-label="Send"
                className={cn(
                  'inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl',
                  'bg-[#FFBD2E] text-slate-950 transition-opacity hover:opacity-90 disabled:opacity-40',
                  focusRing
                )}
              >
                <Send size={15} aria-hidden="true" />
              </button>
            </form>
            <p className="text-[11px] text-muted">{bagLabel(items.length)}</p>
          </>
        )}
      </footer>
    </div>
  );
}

function ThreadEntry({ entry }: { entry: Entry }) {
  if (entry.role === 'you') {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] rounded-2xl bg-[#FFBD2E] px-3.5 py-2 text-sm leading-relaxed text-slate-950">
          {entry.text}
        </p>
      </div>
    );
  }

  const turn = entry.turn;

  return (
    <div className="space-y-2">
      <p className="max-w-[90%] whitespace-pre-line rounded-2xl border border-[var(--ink)]/10 bg-[var(--ink)]/[0.04] px-3.5 py-2 text-sm leading-relaxed text-primary">
        {entry.text}
      </p>

      {turn?.results && turn.results.length > 0 && (
        <ul className="space-y-2">
          {turn.results.map((p, index) => (
            <li key={p.id} className="flex gap-3 rounded-xl border border-[var(--ink)]/10 p-2.5">
              <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[var(--ink)]/[0.05] text-xs font-bold text-muted">
                {p.image ? (
                  <img src={p.image} alt="" loading="lazy" className="h-full w-full object-cover" />
                ) : (
                  index + 1
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-strong">
                  {index + 1}. {p.title}
                </p>
                <p className="truncate text-[11px] text-muted">{p.store.name}</p>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="text-xs font-bold text-primary">{formatPrice(p.price)}</span>
                  {p.rating.count > 0 && <StarRating value={p.rating.average} size="sm" />}
                  {!p.inStock && (
                    <span className="text-[11px] text-[var(--brand-red-ink)]">Out of stock</span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {turn?.action?.type === 'CHECKOUT' && turn.action.stage === 'SUMMARY' && (
        <p className="rounded-xl border border-[#FFBD2E]/30 bg-[#FFBD2E]/5 p-3 text-xs leading-relaxed text-secondary">
          Say or type <strong className="text-primary">yes</strong> to go to payment. You enter your
          delivery details and authorise the payment yourself — the assistant never pays for you.
        </p>
      )}

      {/* Only a spoken turn carries a verification, and only a spoken turn
          should claim one. */}
      {turn?.verification && (
        <p className="text-[11px] text-muted">
          {turn.verification.undetermined
            ? `Voice not checked: ${turn.verification.undetermined}`
            : `Voice matched at ${turn.verification.similarity.toFixed(2)} against ${turn.verification.threshold.toFixed(2)}.`}
        </p>
      )}
    </div>
  );
}
