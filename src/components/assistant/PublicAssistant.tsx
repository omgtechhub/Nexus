import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Keyboard, Loader2, Mic, Send, Sparkles, Volume2, VolumeX } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getPublicAssistantStatusApi,
  sendPublicMessageApi,
  sendPublicVoiceApi,
  type PublicTurn,
} from '../../api/publicAssistant';
import { canRecord, speak, stopSpeaking } from '../../utils/voiceCapture';
import { VoiceControls, useHandsFree, useHoldToTalk, focusRing } from '../voice/VoiceShared';
import { formatPrice } from '../../marketplace/productHelpers';
import { cn } from '../../utils/cn';
import { ModeTabs, PanelHeader, panelShell } from './dockShell';

/**
 * Nexus IQ for a visitor who has not signed in.
 *
 * The landing page, pricing and contact are read by people deciding whether
 * Nexus is for them, and the single most useful thing an assistant can do
 * there is answer the question in front of it. So this panel asks for nothing:
 * no account, no enrolment, no four recordings. Type, or press Talk and speak
 * in whatever voice you have.
 *
 * That is only safe because of what it can reach. The public endpoint answers
 * from the published plans and the public catalogue and touches no account at
 * all, so there is nothing here a voice check would be protecting. On the
 * shop, customer and seller pages the opposite is true — an answer there is
 * *about* somebody's bag, orders or revenue — which is why those keep the
 * sign-in wall and the registered voice. The dock decides which of the two a
 * page gets; this component is the open half and deliberately knows nothing
 * about accounts.
 */

interface Entry {
  id: string;
  role: 'you' | 'iq';
  text: string;
  turn?: PublicTurn;
}

let entrySeq = 0;
const nextId = () => `p${++entrySeq}`;

const OPENERS = [
  'How do I list my products on Nexus?',
  'What do the seller plans cost?',
  'How does delivery work?',
  'What can Nexus IQ do?',
];

export function PublicAssistantPanel({ onClose }: { onClose: () => void }) {
  const micSupported = canRecord();
  // Chat first, always. Someone who pressed a button to ask a question should
  // not land on a microphone they then have to decline.
  const [mode, setMode] = useState<'chat' | 'talk'>('chat');
  const [muted, setMuted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState('');
  const [thread, setThread] = useState<Entry[]>([]);
  const [failure, setFailure] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  // Only consulted for the Talk tab, so a browser with no microphone never
  // pays for the request.
  const { data: status } = useQuery({
    queryKey: ['assistant', 'public', 'status'],
    queryFn: getPublicAssistantStatusApi,
    enabled: micSupported,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [thread.length, busy]);

  const record = useCallback((turn: PublicTurn) => {
    setThread(t => [
      ...t,
      { id: nextId(), role: 'you', text: turn.transcript },
      { id: nextId(), role: 'iq', text: turn.reply, turn },
    ]);
  }, []);

  const ask = useCallback(
    async (message: string) => {
      if (!message.trim() || busy) return;
      setBusy(true);
      setFailure('');
      try {
        const turn = await sendPublicMessageApi(message.trim());
        record(turn);
        // A typed question is usually asked somewhere speaking out loud was
        // not an option, so it is only read back once the visitor has moved
        // to the spoken side themselves.
        if (!muted && mode === 'talk') await speak(turn.reply);
      } catch (err: any) {
        setFailure(err?.message || 'That question could not be sent.');
      } finally {
        setBusy(false);
      }
    },
    [busy, muted, mode, record]
  );

  const handleTyped = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const message = draft.trim();
      if (!message || busy) return;
      setDraft('');
      void ask(message).catch(() => setDraft(message));
    },
    [draft, busy, ask]
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
      // Held rather than awaited inside the try: the controls should free up
      // as soon as the reply is on screen, but a live microphone has to stay
      // shut until the assistant has finished speaking or it answers itself.
      let spoken: Promise<void> | null = null;
      try {
        const turn = await sendPublicVoiceApi(wav);
        record(turn);
        if (!muted) spoken = speak(turn.reply);
      } catch (err: any) {
        setFailure(err?.message || 'That question could not be handled.');
        if (err?.spoken && !muted) spoken = speak(err.spoken);
      } finally {
        setBusy(false);
      }

      if (spoken) await spoken;
    },
    [muted, record]
  );

  const { recording, error, begin, end } = useHoldToTalk(handleClip);
  const listening = useHandsFree(handleClip);

  const closePanel = useCallback(() => {
    stopSpeaking();
    listening.stop();
    onClose();
  }, [listening, onClose]);

  const talking = mode === 'talk';

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Nexus IQ"
      className={panelShell}
    >
      <PanelHeader
        title="Nexus IQ"
        subtitle="Ask about Nexus — no account needed"
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
            className={cn(
              'rounded-lg p-2 text-muted hover:bg-[var(--ink)]/10 hover:text-primary',
              focusRing
            )}
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
        <div className="space-y-3">
          {thread.length === 0 && (
            <div className="space-y-3">
              <div className="rounded-xl border border-[var(--ink)]/10 bg-[var(--ink)]/[0.03] p-4">
                <p className="text-xs font-semibold text-primary">
                  {talking ? 'Try saying' : 'Try asking'}
                </p>
                {/* Buttons in chat, plain text when talking: a tappable
                    suggestion is a shortcut while typing and a misleading
                    affordance when the point is to say it out loud. */}
                {talking ? (
                  <ul className="mt-2 space-y-1.5 text-xs text-secondary">
                    {OPENERS.map(q => (
                      <li key={q}>&ldquo;{q}&rdquo;</li>
                    ))}
                  </ul>
                ) : (
                  <ul className="mt-2 space-y-1.5">
                    {OPENERS.map(q => (
                      <li key={q}>
                        <button
                          type="button"
                          onClick={() => void ask(q)}
                          disabled={busy}
                          className={cn(
                            'w-full rounded-lg px-2 py-1.5 text-left text-xs text-secondary',
                            'transition-colors hover:bg-[var(--ink)]/[0.06] hover:text-primary',
                            'disabled:opacity-50',
                            focusRing
                          )}
                        >
                          {q}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {talking && status && (
                <p className="text-[11px] leading-relaxed text-muted">
                  Out here any voice works — nothing to register, nothing to set up. On your
                  own shop, order and seller pages Nexus IQ answers only to your registered
                  voice, so no one else can spend your money or read your figures.
                </p>
              )}
            </div>
          )}

          {thread.map(entry => (
            <ThreadEntry key={entry.id} entry={entry} onClose={closePanel} />
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
      </div>

      <footer className="flex-shrink-0 space-y-2 border-t border-[var(--ink)]/10 p-3">
        {talking ? (
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
            <p className="text-[11px] text-muted">
              Any voice. Recordings are transcribed and discarded — never stored.
            </p>
          </>
        ) : (
          <>
            <form onSubmit={handleTyped} className="flex gap-2">
              <label htmlFor="iq-public-message" className="sr-only">
                Ask Nexus IQ about Nexus
              </label>
              <input
                id="iq-public-message"
                value={draft}
                onChange={e => setDraft(e.target.value)}
                placeholder="How do I list my products?"
                maxLength={400}
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
            <p className="text-[11px] text-muted">
              No sign-in needed. For your own orders or sales figures, sign in first.
            </p>
          </>
        )}
      </footer>
    </div>
  );
}

function ThreadEntry({ entry, onClose }: { entry: Entry; onClose: () => void }) {
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

      {/* Products are shown without an add-to-bag button on purpose: the bag
          belongs to a signed-in shopper, and a button that cannot work is
          worse than the link that can. */}
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
                <p className="truncate text-xs font-semibold text-strong">{p.title}</p>
                <p className="truncate text-[11px] text-muted">{p.store.name}</p>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="text-xs font-bold text-primary">{formatPrice(p.price)}</span>
                  {!p.inStock && (
                    <span className="text-[11px] text-[var(--brand-red-ink)]">Out of stock</span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {turn?.links && turn.links.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {turn.links.map(link => (
            <Link
              key={link.to}
              to={link.to}
              onClick={onClose}
              className={cn(
                'inline-flex h-8 items-center rounded-lg border border-[var(--ink)]/15 px-3',
                'text-[11px] font-semibold text-primary transition-colors hover:bg-[var(--ink)]/[0.06]',
                focusRing
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
