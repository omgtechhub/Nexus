import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  AlertTriangle,
  Check,
  Info,
  RefreshCw,
  ShieldAlert,
  Trash2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getAdminVoiceStatusApi,
  sendAdminEnrolSampleApi,
  deleteAdminVoiceProfileApi,
  sendAdminCommandApi,
  getPolicyReportApi,
  type AdminTurn,
  type PolicyFinding,
  type PolicySeverity,
} from '../../../api/adminVoice';
import { canRecord, speak, stopSpeaking } from '../../../utils/voiceCapture';
import {
  EnrolmentWizard,
  VoiceControls,
  useHandsFree,
  useHoldToTalk,
  focusRing,
} from '../../../components/voice/VoiceShared';
import { cn } from '../../../utils/cn';

/**
 * Platform monitoring, spoken and written.
 *
 * The same report either way: the voice path and the panel below it both read
 * `runPolicyScan`, so what the assistant says out loud and what an
 * administrator can see on screen cannot disagree. Every finding carries the
 * evidence it was computed from, because the action it invites — suspending a
 * merchant — needs to be checkable before it is taken.
 *
 * Nothing here enforces. The console reads findings; acting on one is a
 * deliberate decision made elsewhere.
 */
export function AdminMonitor() {
  const queryClient = useQueryClient();
  const [enrolling, setEnrolling] = useState(false);
  const [muted, setMuted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [turn, setTurn] = useState<AdminTurn | null>(null);
  const [failure, setFailure] = useState('');
  const [hours, setHours] = useState(24);

  const { data: voice, isLoading: voiceLoading } = useQuery({
    queryKey: ['admin', 'voice', 'status'],
    queryFn: getAdminVoiceStatusApi,
  });

  const {
    data: scan,
    isLoading: scanLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['admin', 'policy', hours],
    queryFn: () => getPolicyReportApi(hours),
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

      setBusy(true);
      setFailure('');
      // Held rather than awaited below: the controls free up once the briefing
      // is on screen, but a live microphone stays shut until it has finished
      // being read out, or the console would hear itself.
      let spoken: Promise<void> | null = null;
      try {
        const result = await sendAdminCommandApi(wav);
        setTurn(result);
        if (!muted) spoken = speak(result.reply);
        // The spoken scan is fresher than the panel's, so refresh it rather
        // than leaving two different answers on one screen.
        await queryClient.invalidateQueries({ queryKey: ['admin', 'policy'] });
      } catch (err: any) {
        setTurn(null);
        setFailure(err?.message || 'That command could not be handled.');
        if (err?.spoken && !muted) spoken = speak(err.spoken);
      } finally {
        setBusy(false);
      }

      if (spoken) await spoken;
    },
    [muted, queryClient]
  );

  const { recording, error, begin, end } = useHoldToTalk(handleClip);
  const listening = useHandsFree(handleClip);

  const report = scan?.report;
  const activity = scan?.activity;
  const needsEnrolment = !voiceLoading && (!voice?.enrolled || enrolling);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-bold text-primary">Monitoring</h1>
        <p className="mt-1 text-sm text-secondary">
          Policy checks across every store, order, product and review on the platform.
        </p>
      </header>

      {/* ---- activity ---- */}
      <section aria-labelledby="activity-heading" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="activity-heading" className="flex items-center gap-2 text-sm font-bold text-primary">
            <Activity size={15} className="text-[var(--brand-yellow-ink)]" aria-hidden="true" />
            Activity
          </h2>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-xs text-muted">
              Window
              <select
                value={hours}
                onChange={e => setHours(Number(e.target.value))}
                className={cn(
                  'rounded-lg border border-[var(--ink)]/15 bg-[var(--surface-base)] px-2 py-1.5 text-xs font-medium text-primary',
                  focusRing
                )}
              >
                <option value={24}>24 hours</option>
                <option value={168}>7 days</option>
                <option value={720}>30 days</option>
              </select>
            </label>
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg border border-[var(--ink)]/15 px-3 py-1.5 text-xs font-semibold text-secondary',
                'hover:bg-[var(--ink)]/5 hover:text-primary disabled:opacity-50',
                focusRing
              )}
            >
              <RefreshCw size={12} className={cn(isFetching && 'animate-spin')} aria-hidden="true" />
              Rescan
            </button>
          </div>
        </div>

        {scanLoading ? (
          <div className="h-24 animate-pulse rounded-2xl bg-[var(--ink)]/[0.04]" aria-busy="true" />
        ) : activity ? (
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Tile label="Orders" value={activity.orders} />
            <Tile label="Paid" value={activity.paidOrders} />
            <Tile label="Revenue" value={activity.revenue} />
            <Tile label="New customers" value={activity.newCustomers} />
            <Tile label="New stores" value={activity.newStores} />
            <Tile label="Refunds" value={activity.refunds} />
          </dl>
        ) : null}
      </section>

      {/* ---- voice ---- */}
      <section
        aria-labelledby="voice-heading"
        className="rounded-2xl border border-[var(--line)] bg-[var(--surface-base)] p-5"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 id="voice-heading" className="text-sm font-bold text-primary">
            Ask for a briefing
          </h2>
          {voice?.enrolled && !needsEnrolment && (
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
                onClick={() => setEnrolling(true)}
                className={cn('rounded-lg px-2 py-1.5 text-xs font-semibold text-secondary hover:text-primary', focusRing)}
              >
                Re-record
              </button>
              <button
                type="button"
                onClick={async () => {
                  await deleteAdminVoiceProfileApi();
                  await queryClient.invalidateQueries({ queryKey: ['admin', 'voice', 'status'] });
                  toast.success('Voice registration removed.');
                }}
                aria-label="Remove voice registration"
                className={cn('rounded-lg p-2 text-muted hover:text-[var(--brand-red-ink)]', focusRing)}
              >
                <Trash2 size={14} aria-hidden="true" />
              </button>
            </div>
          )}
        </div>

        <div className="mt-4">
          {!canRecord() ? (
            <p className="text-xs leading-relaxed text-secondary">
              This browser cannot reach a microphone. The written report below is unaffected.
            </p>
          ) : voiceLoading ? (
            <div className="h-28 animate-pulse rounded-xl bg-[var(--ink)]/[0.04]" aria-busy="true" />
          ) : needsEnrolment ? (
            <EnrolmentWizard
              sendSample={sendAdminEnrolSampleApi}
              title="Register your voice"
              blurb="Four short recordings, so the briefing is read back only to you. This report names merchants and quotes their revenue."
              onDone={async () => {
                setEnrolling(false);
                await queryClient.invalidateQueries({ queryKey: ['admin', 'voice', 'status'] });
              }}
              onCancel={voice?.enrolled ? () => setEnrolling(false) : undefined}
            />
          ) : (
            <div className="space-y-3">
              {voice && !voice.engine.available && (
                <p className="flex items-start gap-2 rounded-xl border border-[#FFBD2E]/30 bg-[#FFBD2E]/5 p-3 text-xs leading-relaxed text-secondary">
                  <AlertTriangle size={14} className="mt-0.5 flex-shrink-0 text-[var(--brand-yellow-ink)]" aria-hidden="true" />
                  <span>
                    Voice matching is not set up on the server, so spoken briefings are given
                    without checking the voice.
                  </span>
                </p>
              )}

              <VoiceControls
                live={listening.live}
                hearing={listening.hearing}
                level={listening.level}
                busy={busy}
                holdRecording={recording}
                holdLabel="Hold to ask"
                onLiveStart={listening.start}
                onLiveStop={listening.stop}
                onHoldStart={begin}
                onHoldStop={end}
              />

              <p className="text-xs text-muted">
                Try “give me today’s report”, “any critical findings”, “check the payments”, or
                “what’s been happening this week”.
              </p>

              <p
                role="alert"
                className={cn(
                  'text-xs font-medium text-[var(--brand-red-ink)]',
                  !error && !failure && !listening.error && 'sr-only'
                )}
              >
                {error || failure || listening.error}
              </p>

              {turn && (
                <div className="space-y-2 rounded-xl border border-[var(--ink)]/10 bg-[var(--ink)]/[0.03] p-4">
                  <p className="text-xs text-muted">
                    You said: <span className="text-secondary">“{turn.transcript}”</span>
                  </p>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-primary">
                    {turn.reply}
                  </p>
                  <p className="text-[11px] text-muted">
                    {turn.verification.undetermined
                      ? `Voice not checked: ${turn.verification.undetermined}`
                      : `Voice matched at ${turn.verification.similarity.toFixed(2)} against ${turn.verification.threshold.toFixed(2)}.`}
                  </p>
                </div>
              )}

              {voice?.enrolled && (
                <p className="flex items-center gap-1 text-[11px] text-muted">
                  <Check size={10} className="text-[var(--brand-green-ink)]" aria-hidden="true" />
                  Voice registered. This decides whether the briefing is read aloud — your sign-in
                  is what protects the console.
                </p>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ---- findings ---- */}
      <section aria-labelledby="findings-heading" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="findings-heading" className="flex items-center gap-2 text-sm font-bold text-primary">
            <ShieldAlert size={15} className="text-[var(--brand-yellow-ink)]" aria-hidden="true" />
            Policy findings
          </h2>
          {report && (
            <p className="text-xs text-muted">
              {report.counts.critical} critical · {report.counts.warning} warning ·{' '}
              {report.counts.info} info
            </p>
          )}
        </div>

        {scanLoading ? (
          <ul className="space-y-2" aria-busy="true">
            {[0, 1, 2].map(i => (
              <li key={i} className="h-16 animate-pulse rounded-2xl bg-[var(--ink)]/[0.04]" />
            ))}
          </ul>
        ) : !report || report.findings.length === 0 ? (
          <div className="rounded-2xl border border-[#27C93F]/25 bg-[#27C93F]/[0.06] p-6 text-center">
            <Check size={20} className="mx-auto mb-2 text-[var(--brand-green-ink)]" aria-hidden="true" />
            <p className="text-sm font-semibold text-primary">No policy violations found.</p>
            {/* What was examined, so a clean report means something. */}
            {report && (
              <p className="mt-1 text-xs text-secondary">
                {report.scanned.checks} checks across {report.scanned.stores} store(s),{' '}
                {report.scanned.orders} order(s), {report.scanned.products} product(s) and{' '}
                {report.scanned.reviews} review(s).
              </p>
            )}
          </div>
        ) : (
          <ul className="space-y-2">
            {report.findings.map((finding, i) => (
              <li key={`${finding.kind}-${finding.subject.id}-${i}`}>
                <FindingCard finding={finding} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-base)] p-3">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 text-lg font-bold text-primary">{value}</dd>
    </div>
  );
}

const SEVERITY_STYLE: Record<PolicySeverity, { ring: string; chip: string; Icon: typeof AlertTriangle }> = {
  CRITICAL: {
    ring: 'border-[#FF5F56]/35 bg-[#FF5F56]/[0.06]',
    chip: 'bg-[#FF5F56]/15 text-[var(--brand-red-ink)]',
    Icon: ShieldAlert,
  },
  WARNING: {
    ring: 'border-[#FFBD2E]/35 bg-[#FFBD2E]/[0.06]',
    chip: 'bg-[#FFBD2E]/15 text-[var(--brand-yellow-ink)]',
    Icon: AlertTriangle,
  },
  INFO: {
    ring: 'border-[var(--ink)]/12',
    chip: 'bg-[var(--ink)]/8 text-secondary',
    Icon: Info,
  },
};

function FindingCard({ finding }: { finding: PolicyFinding }) {
  const [open, setOpen] = useState(false);
  const style = SEVERITY_STYLE[finding.severity];
  const { Icon } = style;

  return (
    <article className={cn('rounded-2xl border p-4', style.ring)}>
      <div className="flex items-start gap-3">
        <Icon size={16} className="mt-0.5 flex-shrink-0 text-current opacity-70" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-bold', style.chip)}>
              {finding.severity}
            </span>
            <span className="text-[11px] font-medium text-muted">
              {finding.kind.replace(/_/g, ' ').toLowerCase()}
            </span>
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-primary">{finding.summary}</p>

          <button
            type="button"
            onClick={() => setOpen(o => !o)}
            aria-expanded={open}
            className={cn(
              'mt-2 rounded text-[11px] font-semibold text-secondary underline hover:text-primary',
              focusRing
            )}
          >
            {open ? 'Hide evidence' : 'Show evidence'}
          </button>

          {open && (
            // The figures the summary was computed from. Shown rather than
            // summarised, because the decision this invites is a serious one.
            <dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 text-[11px] sm:grid-cols-2">
              {Object.entries(finding.evidence).map(([key, value]) => (
                <div key={key} className="flex justify-between gap-3 border-b border-[var(--ink)]/5 py-1">
                  <dt className="text-muted">{key.replace(/([A-Z])/g, ' $1').toLowerCase()}</dt>
                  <dd className="truncate font-medium text-strong">{String(value ?? '—')}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>
    </article>
  );
}
