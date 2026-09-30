import { useState, useRef, useEffect } from 'react';
import {
  Sparkles, RefreshCw, X, AlertTriangle, AlertCircle, Info, Send,
  MessageSquare, Plus, Trash2, ChevronDown, Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';
import {
  useIqInsightsQuery,
  useRefreshInsightsMutation,
  useDismissInsightMutation,
  useIqConversationsQuery,
  useIqConversationQuery,
  useCreateConversationMutation,
  useDeleteConversationMutation,
  useSendIqMessageMutation,
  useIqUsageQuery,
} from '../../hooks/useNexusIq';
import type { AiInsight, InsightSeverity } from '../../api/nexusIq';

const SEVERITY: Record<InsightSeverity, { icon: typeof Info; ring: string; text: string }> = {
  CRITICAL: { icon: AlertTriangle, ring: 'border-[#FF5F56]/30 bg-[#FF5F56]/5', text: 'text-[#FF5F56]' },
  WARNING: { icon: AlertCircle, ring: 'border-[#FFBD2E]/30 bg-[#FFBD2E]/5', text: 'text-[#FFBD2E]' },
  INFO: { icon: Info, ring: 'border-white/10 bg-white/[0.02]', text: 'text-muted' },
};

export function NexusIqSection() {
  const [tab, setTab] = useState<'insights' | 'chat'>('insights');

  return (
    <div className="space-y-5">
      <ProviderNotice />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1.5" role="tablist" aria-label="Nexus IQ">
          {(['insights', 'chat'] as const).map(key => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={cn(
                'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFBD2E]',
                tab === key
                  ? 'bg-[#FFBD2E] font-semibold text-slate-950'
                  : 'border border-white/10 bg-white/5 text-secondary hover:text-white'
              )}
            >
              {key === 'insights' ? 'Insights' : 'Ask Nexus IQ'}
            </button>
          ))}
        </div>
        <UsageMeter />
      </div>

      {tab === 'insights' ? <InsightsFeed /> : <ChatPanel />}
    </div>
  );
}

/**
 * Says plainly when no language model is configured. Without this the feed reads
 * as model output, which it is not.
 */
function ProviderNotice() {
  const { data } = useIqInsightsQuery();
  if (!data || data.meta.isLive) return null;

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-[#FFBD2E]/25 bg-[#FFBD2E]/5 p-4">
      <Sparkles size={16} className="mt-0.5 flex-shrink-0 text-[#FFBD2E]" aria-hidden="true" />
      <div className="text-sm">
        <p className="font-semibold text-white">Running without a language model</p>
        <p className="mt-1 leading-relaxed text-secondary">
          Insights below are computed directly from your store's data and each one shows the
          figures behind it. Answers in Ask Nexus IQ are looked up from those same figures
          rather than written by a model.
        </p>
      </div>
    </div>
  );
}

function UsageMeter() {
  const { data: usage } = useIqUsageQuery();
  if (!usage) return null;

  if (usage.tokensAllowed === null) {
    return (
      <p className="text-xs text-muted">
        {usage.tokensUsed.toLocaleString()} tokens used · unlimited on {usage.planName}
      </p>
    );
  }

  const pct = Math.min(100, Math.round((usage.tokensUsed / usage.tokensAllowed) * 100));

  return (
    <div className="min-w-[200px]">
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-muted">
          {usage.tokensUsed.toLocaleString()} / {usage.tokensAllowed.toLocaleString()} tokens
        </span>
        {usage.exceeded && <span className="font-semibold text-[#FF5F56]">Limit reached</span>}
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-white/10"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Nexus IQ token usage this month"
      >
        <div
          className={cn('h-full rounded-full', usage.exceeded ? 'bg-[#FF5F56]' : 'bg-[#27C93F]')}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function InsightsFeed() {
  const { data, isLoading, isError, error, refetch } = useIqInsightsQuery();
  const refresh = useRefreshInsightsMutation();
  const dismiss = useDismissInsightMutation();

  const handleRefresh = () => {
    refresh.mutate(undefined, {
      onSuccess: result =>
        toast.success(
          result.insights.length === 0
            ? 'Nothing needs your attention'
            : `${result.insights.length} insight${result.insights.length === 1 ? '' : 's'}`
        ),
      onError: (err: any) => toast.error(err?.message || 'Could not refresh insights'),
    });
  };

  if (isLoading) return <Loading label="Loading insights…" />;
  if (isError) {
    return (
      <ErrorBox message={(error as Error)?.message || 'Could not load insights.'} onRetry={refetch} />
    );
  }

  const insights = data?.insights ?? [];

  return (
    <>
      <div className="flex justify-end">
        <Button
          variant="secondary"
          size="sm"
          icon={<RefreshCw size={14} className={refresh.isPending ? 'animate-spin' : undefined} aria-hidden="true" />}
          onClick={handleRefresh}
          loading={refresh.isPending}
        >
          Refresh insights
        </Button>
      </div>

      {insights.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-6 py-14 text-center">
          <Sparkles size={20} className="mx-auto mb-3 text-muted" aria-hidden="true" />
          <p className="text-sm text-secondary">
            Nothing needs your attention right now.
          </p>
          <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-muted">
            Nexus IQ raises something here when stock runs out, orders wait too long, or sales
            move. Refresh after a busy day to check again.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {insights.map(insight => (
            <InsightCard
              key={insight.id}
              insight={insight}
              onDismiss={() =>
                dismiss.mutate(insight.id, {
                  onSuccess: () => toast.success('Dismissed'),
                  onError: (err: any) => toast.error(err?.message || 'Could not dismiss'),
                })
              }
            />
          ))}
        </ul>
      )}
    </>
  );
}

function InsightCard({ insight, onDismiss }: { insight: AiInsight; onDismiss: () => void }) {
  const [showEvidence, setShowEvidence] = useState(false);
  const tone = SEVERITY[insight.severity];
  const Icon = tone.icon;
  const entries = Object.entries(insight.evidence ?? {});

  return (
    <li className={cn('rounded-2xl border p-4 sm:p-5', tone.ring)}>
      <div className="flex items-start gap-3">
        <Icon size={16} className={cn('mt-0.5 flex-shrink-0', tone.text)} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-white">{insight.title}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-secondary">{insight.body}</p>

          {entries.length > 0 && (
            <div className="mt-3">
              <button aria-label="Expand"
                type="button"
                onClick={() => setShowEvidence(v => !v)}
                aria-expanded={showEvidence}
                className="inline-flex items-center gap-1 rounded text-xs font-medium text-muted transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFBD2E]"
              >
                <ChevronDown
                  size={12}
                  className={cn('transition-transform', showEvidence && 'rotate-180')}
                  aria-hidden="true"
                />
                {showEvidence ? 'Hide' : 'Show'} the figures behind this
              </button>

              {showEvidence && (
                <dl className="mt-2 space-y-1 rounded-xl border border-white/10 bg-black/20 p-3 text-xs">
                  {entries.map(([key, value]) => (
                    <div key={key} className="flex justify-between gap-4">
                      <dt className="text-muted">{humanise(key)}</dt>
                      <dd className="text-right font-mono text-strong">{format(value)}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onDismiss}
          aria-label={`Dismiss: ${insight.title}`}
          className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-white/5 hover:text-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFBD2E]"
        >
          <X size={14} aria-hidden="true" />
        </button>
      </div>
    </li>
  );
}

function ChatPanel() {
  const { data: conversations = [] } = useIqConversationsQuery();
  const [activeId, setActiveId] = useState<string | null>(null);
  const { data: conversation, isLoading } = useIqConversationQuery(activeId);
  const createConversation = useCreateConversationMutation();
  const deleteConversation = useDeleteConversationMutation();
  const sendMessage = useSendIqMessageMutation();
  const [draft, setDraft] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  // Open the most recent thread rather than an empty pane.
  useEffect(() => {
    if (!activeId && conversations.length > 0) setActiveId(conversations[0].id);
  }, [conversations, activeId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation?.messages.length, sendMessage.isPending]);

  const startConversation = () => {
    createConversation.mutate(undefined, {
      onSuccess: created => setActiveId(created.id),
      onError: (err: any) => toast.error(err?.message || 'Could not start a conversation'),
    });
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const content = draft.trim();
    if (!content || !activeId) return;
    setDraft('');
    sendMessage.mutate(
      { conversationId: activeId, content },
      {
        onError: (err: any) => {
          toast.error(err?.message || 'Could not send that message');
          setDraft(content);
        },
      }
    );
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
      <aside className="space-y-2">
        <Button
          variant="secondary"
          size="sm"
          fullWidth
          icon={<Plus size={14} aria-hidden="true" />}
          onClick={startConversation}
          loading={createConversation.isPending}
        >
          New conversation
        </Button>

        <ul className="space-y-1">
          {conversations.map(c => (
            <li key={c.id} className="group relative">
              <button
                type="button"
                onClick={() => setActiveId(c.id)}
                className={cn(
                  'w-full rounded-lg px-3 py-2 pr-8 text-left text-xs transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFBD2E]',
                  activeId === c.id
                    ? 'bg-white/10 font-medium text-white'
                    : 'text-muted hover:bg-white/5 hover:text-white'
                )}
              >
                <span className="line-clamp-2">{c.title}</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  deleteConversation.mutate(c.id, {
                    onSuccess: () => {
                      if (activeId === c.id) setActiveId(null);
                      toast.success('Conversation deleted');
                    },
                  })
                }
                aria-label={`Delete conversation: ${c.title}`}
                className="absolute right-1.5 top-1.5 inline-flex h-6 w-6 items-center justify-center rounded text-muted opacity-0 transition-opacity hover:text-[#FF5F56] focus-visible:opacity-100 group-hover:opacity-100"
              >
                <Trash2 size={12} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className="flex min-h-[420px] flex-col rounded-2xl border border-white/10 bg-white/[0.02]">
        {!activeId ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 py-14 text-center">
            <MessageSquare size={20} className="mb-3 text-muted" aria-hidden="true" />
            <p className="text-sm text-secondary">Ask about your store</p>
            <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-muted">
              Start a conversation to ask about stock, orders, revenue or your best sellers.
            </p>
            <div className="mt-5">
              <Button variant="primary" size="sm" onClick={startConversation}>
                New conversation
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5" aria-live="polite">
              {isLoading ? (
                <Loading label="Loading conversation…" />
              ) : conversation?.messages.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted">
                  Ask something like “how many products are out of stock?”
                </p>
              ) : (
                conversation?.messages.map(m => (
                  <div
                    key={m.id}
                    className={cn('flex', m.role === 'USER' ? 'justify-end' : 'justify-start')}
                  >
                    <div
                      className={cn(
                        'max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                        m.role === 'USER'
                          ? 'bg-[#FFBD2E] text-slate-950'
                          : 'border border-white/10 bg-white/5 text-strong'
                      )}
                    >
                      {m.content}
                    </div>
                  </div>
                ))
              )}
              {sendMessage.isPending && (
                <div className="flex justify-start">
                  <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-muted">
                    <Loader2 size={13} className="animate-spin" aria-hidden="true" />
                    Looking that up…
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>

            <form onSubmit={handleSend} className="flex gap-2 border-t border-white/10 p-3">
              <label htmlFor="iq-message" className="sr-only">
                Ask Nexus IQ about your store
              </label>
              <input
                id="iq-message"
                value={draft}
                onChange={e => setDraft(e.target.value)}
                placeholder="Ask about stock, orders or revenue…"
                disabled={sendMessage.isPending}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-muted focus:border-[#FFBD2E]/50 focus:outline-none disabled:opacity-50"
              />
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={!draft.trim() || sendMessage.isPending}
                icon={<Send size={14} aria-hidden="true" />}
              >
                <span className="sr-only sm:not-sr-only">Send</span>
              </Button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}

function Loading({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-14 text-muted" role="status">
      <Loader2 size={18} className="animate-spin" aria-hidden="true" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

function ErrorBox({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-2xl border border-[#FF5F56]/30 bg-[#FF5F56]/5 p-6 text-center" role="alert">
      <AlertTriangle size={20} className="mx-auto mb-3 text-[#FF5F56]" aria-hidden="true" />
      <p className="text-sm text-strong">{message}</p>
      <div className="mt-4">
        <Button variant="secondary" size="sm" onClick={onRetry}>Try again</Button>
      </div>
    </div>
  );
}

function humanise(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, c => c.toUpperCase())
    .trim();
}

function format(value: unknown): string {
  if (Array.isArray(value)) return value.join(', ') || '—';
  if (value === null || value === undefined) return '—';
  return String(value);
}
