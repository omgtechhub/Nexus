import { Request, Response, NextFunction } from 'express';
import { VoicePortal } from '@prisma/client';
import { verifyVoice } from '../services/voice/speaker.service.js';
import { decodeToMono16k, durationOf, peakOf, AudioDecodeError } from '../services/voice/audio.js';
import { transcribe, TranscriptionError } from '../services/voice/stt.service.js';
import {
  runPolicyScan,
  getActivitySummary,
  spokenReport,
  type PolicyReport,
  type PolicySeverity,
} from '../services/admin/policy.service.js';

/**
 * The platform console's spoken side.
 *
 * An administrator holds a button and asks what has been happening; the
 * assistant runs the policy checks, counts the day's activity, and reads back
 * what it found.
 *
 * It only ever reads. There is no spoken path that suspends a store, hides a
 * review or refunds an order, and that is a deliberate limit rather than an
 * unfinished one: enforcement against a merchant is the one action on this
 * platform that should cost somebody a deliberate click, and voice
 * verification — which a recording defeats — is the wrong thing to stand
 * between a misheard sentence and a shut-down business.
 */

const SILENCE_PEAK = 0.012;
const MIN_SECONDS = 0.6;
const MAX_SECONDS = 30;

function clipFrom(req: Request): Float32Array {
  const file = req.file;
  if (!file) throw new AudioDecodeError('No audio was uploaded.');

  const samples = decodeToMono16k(file.buffer);
  const seconds = durationOf(samples);

  if (seconds < MIN_SECONDS) {
    throw new AudioDecodeError(
      `That recording was ${seconds.toFixed(1)}s. Hold the button and speak for at least a second.`
    );
  }
  if (seconds > MAX_SECONDS) {
    throw new AudioDecodeError(`That recording was ${Math.round(seconds)}s. Keep it under 30.`);
  }
  if (peakOf(samples) < SILENCE_PEAK) {
    throw new AudioDecodeError('That recording is silent. Check the microphone is not muted.');
  }
  return samples;
}

type AdminIntentKind =
  | 'FULL_REPORT'
  | 'VIOLATIONS_ONLY'
  | 'CRITICAL_ONLY'
  | 'ACTIVITY_ONLY'
  | 'PAYMENT_CHECKS'
  | 'HELP'
  | 'UNKNOWN';

/**
 * What the administrator asked for.
 *
 * Rules rather than a model, for the same reason as the shopping assistant:
 * the answer carries compliance findings about named merchants, and a model
 * that mishears "critical only" as "everything is fine" is a worse failure
 * than one that admits it did not understand.
 */
export function parseAdminIntent(transcript: string): AdminIntentKind {
  const text = transcript
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!text) return 'UNKNOWN';
  if (/\b(help|what can you do|what can i ask)\b/.test(text)) return 'HELP';

  const mentionsCritical = /\b(critical|urgent|serious|worst)\b/.test(text);
  const mentionsPayments = /\b(payment|payments|refund|refunds|charge|charged|money)\b/.test(text);
  const mentionsViolations = /\b(violation|violations|breach|breaches|policy|policies|problem|problems|issue|issues|flag|flags|wrong)\b/.test(text);
  const mentionsActivity = /\b(activity|activities|happening|happened|traffic|today|going on|summary|overview|orders|signups|sign ups)\b/.test(text);

  if (mentionsPayments) return 'PAYMENT_CHECKS';
  if (mentionsCritical) return 'CRITICAL_ONLY';
  if (mentionsViolations && mentionsActivity) return 'FULL_REPORT';
  if (mentionsViolations) return 'VIOLATIONS_ONLY';
  if (mentionsActivity) return 'ACTIVITY_ONLY';
  if (/\b(report|brief|briefing|status|scan|check)\b/.test(text)) return 'FULL_REPORT';

  return 'UNKNOWN';
}

/** Payment and refund integrity, which is what "check the payments" means. */
const PAYMENT_KINDS = new Set(['PAID_WITHOUT_PAYMENT', 'PAYMENT_AMOUNT_MISMATCH', 'OVER_REFUNDED']);

function filterReport(report: PolicyReport, keep: (severity: PolicySeverity, kind: string) => boolean): PolicyReport {
  const findings = report.findings.filter(f => keep(f.severity, f.kind));
  return {
    ...report,
    findings,
    counts: {
      critical: findings.filter(f => f.severity === 'CRITICAL').length,
      warning: findings.filter(f => f.severity === 'WARNING').length,
      info: findings.filter(f => f.severity === 'INFO').length,
      total: findings.length,
    },
  };
}

/**
 * GET /api/admin/voice/report
 * The same report the spoken path produces, for the console to render.
 */
export async function adminPolicyReport(req: Request, res: Response, next: NextFunction) {
  try {
    const windowHours = Math.min(Math.max(Number(req.query.hours) || 24, 1), 24 * 30);
    const [report, activity] = await Promise.all([runPolicyScan(), getActivitySummary(windowHours)]);
    res.json({ success: true, data: { report, activity, spoken: spokenReport(report, activity) } });
  } catch (err) {
    next(err);
  }
}

/** POST /api/admin/voice/command */
export async function adminVoiceCommand(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const samples = clipFrom(req);

    // Identity before transcription. This report names merchants and quotes
    // their revenue, so a voice that will not be answered never has its words
    // written down either.
    const verification = await verifyVoice(userId, VoicePortal.ADMIN, samples);
    if (!verification.accepted) {
      res.status(403).json({
        success: false,
        error: 'That did not sound like the registered administrator.',
        data: { verification, spoken: 'Sorry, I do not recognise that voice.' },
      });
      return;
    }

    const transcript = await transcribe(samples);
    if (!transcript || transcript.replace(/[^a-z0-9]/gi, '').length < 2) {
      res.status(422).json({
        success: false,
        error: 'Nothing could be made out in that recording.',
        data: { verification, transcript },
      });
      return;
    }

    const intent = parseAdminIntent(transcript);

    if (intent === 'HELP' || intent === 'UNKNOWN') {
      const reply =
        intent === 'HELP'
          ? 'Ask me for a report, for policy violations, for critical findings only, ' +
            'for payment checks, or for today’s activity.'
          : 'I did not catch that. Ask for a report, for violations, or for today’s activity.';
      res.json({
        success: true,
        data: { transcript, intent, reply, verification, report: null, activity: null },
      });
      return;
    }

    const windowHours = /\b(week|7 days|seven days)\b/i.test(transcript) ? 24 * 7 : 24;
    const [fullReport, activity] = await Promise.all([
      runPolicyScan(),
      getActivitySummary(windowHours),
    ]);

    let report = fullReport;
    let reply: string;

    switch (intent) {
      case 'CRITICAL_ONLY':
        report = filterReport(fullReport, severity => severity === 'CRITICAL');
        reply =
          report.counts.total === 0
            ? `No critical findings. I ran ${fullReport.scanned.checks} checks across ` +
              `${fullReport.scanned.merchants} merchant(s) and ${fullReport.scanned.orders} order(s).`
            : `${report.counts.total} critical finding(s). ` +
              report.findings.slice(0, 5).map(f => f.summary).join(' ');
        break;

      case 'PAYMENT_CHECKS':
        report = filterReport(fullReport, (_severity, kind) => PAYMENT_KINDS.has(kind));
        reply =
          report.counts.total === 0
            ? `Payments reconcile. Every paid order across ${fullReport.scanned.orders} order(s) ` +
              'has a matching payment record, and nothing is over-refunded.'
            : `${report.counts.total} payment finding(s). ` +
              report.findings.slice(0, 5).map(f => f.summary).join(' ');
        break;

      case 'VIOLATIONS_ONLY':
        reply =
          report.counts.total === 0
            ? `I ran ${report.scanned.checks} policy checks and found no violations.`
            : `${report.counts.total} finding(s): ${report.counts.critical} critical, ` +
              `${report.counts.warning} warning, ${report.counts.info} informational. ` +
              report.findings.slice(0, 5).map(f => f.summary).join(' ');
        break;

      case 'ACTIVITY_ONLY':
        reply =
          `In the last ${activity.windowHours} hours: ${activity.orders} order(s), ` +
          `${activity.paidOrders} paid, worth ${activity.revenue}. ` +
          `${activity.newCustomers} new customer(s), ${activity.newMerchants} new merchant(s), ` +
          `${activity.newProducts} new product(s), ${activity.newReviews} new review(s), ` +
          `${activity.refunds} refund(s).`;
        break;

      default:
        reply = spokenReport(fullReport, activity);
    }

    res.json({
      success: true,
      data: { transcript, intent, reply, verification, report, activity },
    });
  } catch (err) {
    if (err instanceof AudioDecodeError) {
      res.status(400).json({ success: false, error: err.message });
      return;
    }
    if (err instanceof TranscriptionError) {
      res.status(503).json({ success: false, error: err.message });
      return;
    }
    next(err);
  }
}
