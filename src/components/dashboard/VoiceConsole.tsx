import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Check, Trash2, Volume2, VolumeX } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getVoiceStatusApi,
  sendEnrolSampleApi,
  deleteVoiceProfileApi,
  sendVoiceCommandApi,
  type VoiceCommandResult,
} from '../../api/nexusIq';
import { canRecord, speak, stopSpeaking } from '../../utils/voiceCapture';
import {
  EnrolmentWizard,
  VoiceControls,
  useHandsFree,
  useHoldToTalk,
  focusRing,
} from '../voice/VoiceShared';
import { cn } from '../../utils/cn';

export function VoiceConsole({ conversationId }: { conversationId?: string }) {
  const queryClient = useQueryClient();
  const { data: status, isLoading } = useQuery({
    queryKey: ['iq', 'voice', 'status'],
    queryFn: getVoiceStatusApi,
  });

  const [enrolling, setEnrolling] = useState(false);
  const supported = canRecord();

  if (isLoading) {
    return <div className="stat-card h-32 animate-pulse" aria-busy="true" />;
  }

  if (!supported) {
    return (
      <div className="stat-card flex items-start gap-3 p-4">
        <AlertTriangle size={16} className="mt-0.5 flex-shrink-0 text-[var(--brand-yellow-ink)]" aria-hidden="true" />
        <p className="text-xs leading-relaxed text-secondary">
          This browser cannot reach a microphone, so voice is unavailable. Nexus IQ still answers
          typed questions below.
        </p>
      </div>
    );
  }

  const engineDown = status && !status.engine.available;

  return (
    <div className="space-y-3">
      {engineDown && (
        <div className="stat-card flex items-start gap-3 p-4">
          <AlertTriangle size={16} className="mt-0.5 flex-shrink-0 text-[var(--brand-yellow-ink)]" aria-hidden="true" />
          <div className="text-xs leading-relaxed text-secondary">
            <p className="font-semibold text-primary">Voice recognition is not set up on the server.</p>
            <p className="mt-1">{status!.engine.unavailableReason}</p>
            {/* Said plainly: without the model there is no gate, and a merchant
                who enrolled a voice should know it is not being checked. */}
            <p className="mt-1">Until then, spoken commands are answered without checking the voice.</p>
          </div>
        </div>
      )}

      {status?.enrolled && !enrolling ? (
        <CommandPanel
          conversationId={conversationId}
          profile={status.profile}
          onReenrol={() => setEnrolling(true)}
          onForget={async () => {
            await deleteVoiceProfileApi();
            await queryClient.invalidateQueries({ queryKey: ['iq', 'voice', 'status'] });
            toast.success('Voice registration removed.');
          }}
        />
      ) : (
        <EnrolmentWizard
          sendSample={sendEnrolSampleApi}
          title="Register your voice"
          blurb="Four short recordings, so Nexus IQ answers you and not whoever else is in the room. Record the last two from where you normally sit."
          onDone={async () => {
            setEnrolling(false);
            await queryClient.invalidateQueries({ queryKey: ['iq', 'voice', 'status'] });
          }}
          onCancel={status?.enrolled ? () => setEnrolling(false) : undefined}
        />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function CommandPanel({
  conversationId,
  profile,
  onReenrol,
  onForget,
}: {
  conversationId?: string;
  profile: { threshold: number; sampleCount: number; isNeural: boolean; lastVerifiedAt: string | null } | null;
  onReenrol: () => void;
  onForget: () => Promise<void>;
}) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [turn, setTurn] = useState<VoiceCommandResult | null>(null);
  const [refused, setRefused] = useState<string>('');
  const [muted, setMuted] = useState(false);

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
      setRefused('');
      // Held rather than awaited inside the block below: the button should be
      // usable again as soon as the answer is on screen, but a live microphone
      // must stay shut until the reply has finished being read out.
      let spoken: Promise<void> | null = null;
      try {
        const result = await sendVoiceCommandApi(wav, conversationId);
        setTurn(result);
        if (!muted) spoken = speak(result.answer);
        // The spoken turn lands in the same thread as the typed one, so the
        // transcript below has to be refetched.
        await queryClient.invalidateQueries({ queryKey: ['iq'] });
      } catch (err: any) {
        setTurn(null);
        setRefused(err?.message || 'That command could not be handled.');
        if (err?.spoken && !muted) spoken = speak(err.spoken);
      } finally {
        setBusy(false);
      }

      if (spoken) await spoken;
    },
    [conversationId, muted, queryClient]
  );

  const { recording, error, begin, end } = useHoldToTalk(handleClip);
  const listening = useHandsFree(handleClip);

  return (
    <div className="stat-card space-y-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold text-primary">
            Ask Nexus IQ
            <span className="inline-flex items-center gap-1 rounded-full bg-[#27C93F]/15 px-2 py-0.5 text-[11px] font-medium text-[var(--brand-green-ink)]">
              <Check size={10} aria-hidden="true" />
              Voice registered
            </span>
          </h3>
          <p className="mt-1 text-xs text-secondary">
            Ask about your sales, margins or prices — and keep asking.
          </p>
        </div>

        <div className="flex items-center gap-1">
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
          <button
            type="button"
            onClick={onReenrol}
            className={cn('rounded-lg px-2 py-1.5 text-xs font-semibold text-secondary hover:text-primary', focusRing)}
          >
            Re-record
          </button>
          <button
            type="button"
            onClick={onForget}
            aria-label="Remove voice registration"
            className={cn('rounded-lg p-2 text-muted hover:text-[var(--brand-red-ink)]', focusRing)}
          >
            <Trash2 size={14} aria-hidden="true" />
          </button>
        </div>
      </div>

      <p
        role="alert"
        className={cn(
          'text-xs font-medium text-[var(--brand-red-ink)]',
          !error && !refused && !listening.error && 'sr-only'
        )}
      >
        {error || refused || listening.error}
      </p>

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

      {turn && (
        <div className="space-y-2 rounded-xl border border-[var(--ink)]/10 bg-[var(--ink)]/[0.03] p-4">
          <p className="text-xs text-muted">
            You said: <span className="text-secondary">“{turn.transcript}”</span>
          </p>
          <p className="whitespace-pre-line text-sm leading-relaxed text-primary">{turn.answer}</p>
          <p className="text-[11px] text-muted">
            {turn.verification.undetermined
              ? `Voice not checked: ${turn.verification.undetermined}`
              : `Voice matched at ${turn.verification.similarity.toFixed(2)} against a threshold of ${turn.verification.threshold.toFixed(2)}.`}
          </p>
        </div>
      )}

      {profile && !profile.isNeural && (
        <p className="text-[11px] leading-relaxed text-muted">
          This profile was built by a fallback engine rather than the speaker model, so voice
          matching is weaker than usual.
        </p>
      )}

      {/* The honest framing, kept in front of the merchant rather than in a
          doc: this decides whether IQ answers, not what it is allowed to see. */}
      <p className="text-[11px] leading-relaxed text-muted">
        Voice matching decides whether Nexus IQ replies. It is not a security check — your
        sign-in is what protects your merchant&apos;s data.
      </p>
    </div>
  );
}
