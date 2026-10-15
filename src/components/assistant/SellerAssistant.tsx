import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle, Keyboard, Loader2, Mic, Send, Sparkles, Volume2, VolumeX,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getVoiceStatusApi,
  sendEnrolSampleApi,
  sendVoiceCommandApi,
  type VoiceCommandResult,
} from '../../api/nexusIq';
import {
  useIqConversationsQuery,
  useIqConversationQuery,
  useCreateConversationMutation,
  useSendIqMessageMutation,
} from '../../hooks/useNexusIq';
import { canRecord, speak, stopSpeaking } from '../../utils/voiceCapture';
import {
  EnrolmentWizard,
  VoiceControls,
  useHandsFree,
  useHoldToTalk,
  focusRing,
} from '../voice/VoiceShared';
import { cn } from '../../utils/cn';
import { ModeTabs, PanelHeader, panelShell } from './dockShell';

/**
 * The merchant's half of Nexus IQ, as a dock panel.
 *
 * This is the same assistant as the one on the Nexus IQ page, reached without
 * leaving whatever the merchant was doing — which is the whole point: the
 * questions it answers ("how many are out of stock?", "what sold yesterday?")
 * come up while packing an order or editing a product, and making someone
 * navigate away to ask is how a feature goes unused.
 *
 * It deliberately carries the chat and the voice surface only. Insights are a
 * page-sized thing with their own refresh, dismissal and evidence, and
 * squeezing them into a 24rem column would make them worse in both places —
 * the dock links across to the full section instead.
 *
 * Threads are shared with that page, not duplicated. Both read and write the
 * same conversations through the same React Query keys, so a question asked
 * here is in the history there, already answered.
 */
export function SellerAssistantPanel({ onClose }: { onClose: () => void }) {
  const micSupported = canRecord();
  const [mode, setMode] = useState<'chat' | 'talk'>('chat');

  // One thread for the dock: a merchant reaching for a floating button wants
  // to ask a question, not manage a conversation list. The full page is where
  // threads are browsed, renamed by their first question and deleted.
  const { data: conversations = [] } = useIqConversationsQuery();
  const [activeId, setActiveId] = useState<string | null>(null);
  const { data: conversation, isLoading } = useIqConversationQuery(activeId);
  const createConversation = useCreateConversationMutation();
  const sendMessage = useSendIqMessageMutation();

  const [draft, setDraft] = useState('');
  const [muted, setMuted] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // Continue the most recent thread rather than opening an empty pane or
  // creating a new conversation on every open — the latter would leave a
  // trail of empty threads on the page that shares this history.
  useEffect(() => {
    if (!activeId && conversations.length > 0) setActiveId(conversations[0].id);
  }, [conversations, activeId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [conversation?.messages.length, sendMessage.isPending, mode]);

  /** Resolves to a thread id, making one only if there is nothing to continue. */
  const ensureConversation = useCallback(async (): Promise<string | null> => {
    if (activeId) return activeId;
    try {
      const created = await createConversation.mutateAsync();
      setActiveId(created.id);
      return created.id;
    } catch (err: any) {
      toast.error(err?.message || 'Could not start a conversation');
      return null;
    }
  }, [activeId, createConversation]);

  const handleSend = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const content = draft.trim();
      if (!content || sendMessage.isPending) return;

      const conversationId = await ensureConversation();
      if (!conversationId) return;

      setDraft('');
      sendMessage.mutate(
        { conversationId, content },
        {
          onError: (err: any) => {
            toast.error(err?.message || 'Could not send that message');
            setDraft(content);
          },
        }
      );
    },
    [draft, sendMessage, ensureConversation]
  );

  return (
    <div role="dialog" aria-modal="false" aria-label="Nexus IQ" className={panelShell}>
      <PanelHeader
        title="Nexus IQ"
        subtitle="Ask about your store"
        icon={<Sparkles size={16} className="text-[var(--brand-yellow-ink)]" />}
        onClose={() => {
          stopSpeaking();
          onClose();
        }}
        actions={
          mode === 'talk' ? (
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
          ) : null
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

      {mode === 'chat' ? (
        <>
          <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
            {isLoading && activeId ? (
              <div className="h-24 animate-pulse rounded-xl bg-[var(--ink)]/[0.04]" aria-busy="true" />
            ) : !conversation || conversation.messages.length === 0 ? (
              <div className="rounded-xl border border-[var(--ink)]/10 bg-[var(--ink)]/[0.03] p-4">
                <p className="text-xs font-semibold text-primary">Try asking</p>
                <ul className="mt-2 space-y-1.5 text-xs text-secondary">
                  <li>&ldquo;How many products are out of stock?&rdquo;</li>
                  <li>&ldquo;Which orders are still unfulfilled?&rdquo;</li>
                  <li>&ldquo;What sold best this month?&rdquo;</li>
                  <li>&ldquo;How is revenue trending?&rdquo;</li>
                </ul>
              </div>
            ) : (
              conversation.messages.map(m => (
                <div key={m.id} className={cn('flex', m.role === 'USER' ? 'justify-end' : 'justify-start')}>
                  <div
                    className={cn(
                      'max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm leading-relaxed',
                      m.role === 'USER'
                        ? 'bg-[#FFBD2E] text-slate-950'
                        : 'border border-[var(--ink)]/10 bg-[var(--ink)]/5 text-strong'
                    )}
                  >
                    {m.content}
                  </div>
                </div>
              ))
            )}

            {(sendMessage.isPending || createConversation.isPending) && (
              <p className="inline-flex items-center gap-2 rounded-2xl border border-[var(--ink)]/10 bg-[var(--ink)]/5 px-3.5 py-2 text-xs text-muted">
                <Loader2 size={13} className="animate-spin" aria-hidden="true" />
                Looking that up&hellip;
              </p>
            )}

            <div ref={endRef} />
          </div>

          <form onSubmit={handleSend} className="flex flex-shrink-0 gap-2 border-t border-[var(--ink)]/10 p-3">
            <label htmlFor="iq-dock-message" className="sr-only">
              Ask Nexus IQ about your store
            </label>
            <input
              id="iq-dock-message"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              placeholder="Ask about stock, orders or revenue…"
              disabled={sendMessage.isPending}
              className={cn(
                'min-w-0 flex-1 rounded-xl border border-[var(--ink)]/10 bg-[var(--ink)]/5 px-3 py-2.5 text-sm',
                'text-primary placeholder:text-muted focus:border-[#FFBD2E]/50 focus:outline-none disabled:opacity-50'
              )}
            />
            <button
              type="submit"
              disabled={!draft.trim() || sendMessage.isPending}
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
        </>
      ) : (
        <SellerVoiceTab
          muted={muted}
          ensureConversation={ensureConversation}
          onBackToChat={() => setMode('chat')}
        />
      )}
    </div>
  );
}

/**
 * The spoken surface, scoped to the dock.
 *
 * A spoken command is answered into the same conversation the Chat tab is
 * showing, so switching tabs mid-question does not lose the answer — the
 * server writes both turns to the thread and the chat view picks them up on
 * the next read.
 */
function SellerVoiceTab({
  muted,
  ensureConversation,
  onBackToChat,
}: {
  muted: boolean;
  ensureConversation: () => Promise<string | null>;
  onBackToChat: () => void;
}) {
  const queryClient = useQueryClient();
  const [enrolling, setEnrolling] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<VoiceCommandResult | null>(null);
  const [failure, setFailure] = useState('');

  const { data: status, isLoading } = useQuery({
    queryKey: ['iq', 'voice', 'status'],
    queryFn: getVoiceStatusApi,
  });

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

      const conversationId = (await ensureConversation()) ?? undefined;

      setBusy(true);
      setFailure('');
      let spoken: Promise<void> | null = null;
      try {
        const answer = await sendVoiceCommandApi(wav, conversationId);
        setResult(answer);
        if (!muted) spoken = speak(answer.answer);
        // The turn was written server-side, so the chat view is now stale.
        await queryClient.invalidateQueries({ queryKey: ['iq', 'conversations'] });
      } catch (err: any) {
        setResult(null);
        setFailure(err?.message || 'That command could not be handled.');
        if (err?.spoken && !muted) spoken = speak(err.spoken);
      } finally {
        setBusy(false);
      }

      if (spoken) await spoken;
    },
    [ensureConversation, muted, queryClient]
  );

  const { recording, error, begin, end } = useHoldToTalk(handleClip);
  const listening = useHandsFree(handleClip);

  const needsEnrolment = !isLoading && (!status?.enrolled || enrolling);

  return (
    <>
      <div className="flex-1 overflow-y-auto p-4" aria-live="polite">
        {isLoading ? (
          <div className="h-40 animate-pulse rounded-xl bg-[var(--ink)]/[0.04]" aria-busy="true" />
        ) : needsEnrolment ? (
          <EnrolmentWizard
            sendSample={sendEnrolSampleApi}
            title="Register your voice"
            blurb="Four short recordings, so the console answers you and not whoever else is in the room. Read the last two from a little further away."
            onDone={async () => {
              setEnrolling(false);
              await queryClient.invalidateQueries({ queryKey: ['iq', 'voice', 'status'] });
            }}
            // Without a profile there is nothing to go back to on this tab, so
            // cancelling returns to typing rather than to an empty pane.
            onCancel={status?.enrolled ? () => setEnrolling(false) : onBackToChat}
          />
        ) : (
          <div className="space-y-3">
            {status && !status.engine.available && (
              <p className="flex items-start gap-2 rounded-xl border border-[#FFBD2E]/30 bg-[#FFBD2E]/5 p-3 text-xs leading-relaxed text-secondary">
                <AlertTriangle size={14} className="mt-0.5 flex-shrink-0 text-[var(--brand-yellow-ink)]" aria-hidden="true" />
                <span>
                  Voice matching is not set up on the server, so commands are answered without
                  checking the voice.
                </span>
              </p>
            )}

            {!result && !failure && (
              <div className="rounded-xl border border-[var(--ink)]/10 bg-[var(--ink)]/[0.03] p-4">
                <p className="text-xs font-semibold text-primary">Try saying</p>
                <ul className="mt-2 space-y-1.5 text-xs text-secondary">
                  <li>&ldquo;What is running low on stock?&rdquo;</li>
                  <li>&ldquo;How many orders are waiting to ship?&rdquo;</li>
                  <li>&ldquo;What did we take this week?&rdquo;</li>
                </ul>
              </div>
            )}

            {result && (
              <div className="space-y-2">
                <p className="flex justify-end">
                  <span className="max-w-[85%] rounded-2xl bg-[#FFBD2E] px-3.5 py-2 text-sm leading-relaxed text-slate-950">
                    {result.transcript}
                  </span>
                </p>
                <p className="max-w-[90%] whitespace-pre-line rounded-2xl border border-[var(--ink)]/10 bg-[var(--ink)]/[0.04] px-3.5 py-2 text-sm leading-relaxed text-primary">
                  {result.answer}
                </p>
                <p className="text-[11px] text-muted">
                  {result.verification.undetermined
                    ? `Voice not checked: ${result.verification.undetermined}`
                    : `Voice matched at ${result.verification.similarity.toFixed(2)} against ${result.verification.threshold.toFixed(2)}.`}
                </p>
              </div>
            )}

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
          </div>
        )}
      </div>

      {!needsEnrolment && !isLoading && (
        <footer className="flex-shrink-0 space-y-2 border-t border-[var(--ink)]/10 p-3">
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
          <button
            type="button"
            onClick={() => setEnrolling(true)}
            className={cn('rounded px-2 py-1 text-[11px] font-semibold text-secondary hover:text-primary', focusRing)}
          >
            Re-record voice
          </button>
        </footer>
      )}
    </>
  );
}
