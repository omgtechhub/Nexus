import { VoicePortal } from '@prisma/client';
import { prisma } from '../../prisma.js';
import { getSpeakerEmbedder, similarity, unit } from './embedder.js';

/**
 * Speaker verification: answer this person, ignore everyone else.
 *
 * Ported from Jarvis (`assistant/voice/speaker.py`), including the reasoning
 * its comments record, because the reasoning is the part that took measurement
 * to arrive at.
 *
 * **What this is not, and it matters.** It is **not a security boundary**. A
 * recording of the merchant defeats it, and so, eventually, will a good enough
 * synthesis. It gates *activation* — whether a spoken turn is acted on at all
 * — and never permissions. What stands between a request and a store's
 * figures is the session cookie and `requireStoreMembership`, exactly as for
 * every other route. Treating voice as an authentication factor is how an
 * assistant ends up reading someone's revenue out loud because a video played
 * in the background.
 */

/**
 * Hard floor and ceiling on a measured threshold.
 *
 * The ceiling came down from 0.9 because a bar that high was measurably
 * refusing the enrolled speaker. Measured end to end against this server, one
 * synthetic voice so the speaker is provably identical and the capture path
 * provably the same: four enrolment sentences gave consistency 0.8779 and a
 * weakest held-out of 0.9053, so the old rule set the bar at 0.8553 — and then
 * every real command from that same voice scored 0.8004 to 0.8196 and was
 * turned away. "Yes." is the shortest clip a shopper ever says and the one
 * most likely to be refused, which is exactly how this reads from the other
 * side: say yes, and nothing happens.
 */
const MIN_THRESHOLD = 0.4;
const MAX_THRESHOLD = 0.8;

/**
 * Headroom below the weakest held-out sample.
 *
 * 0.15 rather than 0.05, because of what the held-out scores are computed on.
 * Enrolment reads four *sentences*; a live command is "yes" or "check out" —
 * a fraction of a second of speech, carrying far less of what makes a voice
 * identifiable. So leave-one-out answers "how well does this profile
 * recognise another enrolment sentence", which systematically overestimates
 * how well it recognises a two-word command — by about 0.10 in the numbers
 * above. The margin has to absorb that difference or the feature only works
 * for people who speak in paragraphs.
 *
 * This still leaves a real gate: different speakers score far below this on
 * the voxceleb model, and the point of the check is to decide whether the
 * assistant activates, not to protect the account. The session cookie does
 * that.
 */
const LOO_MARGIN = 0.15;

/** Enrolment needs enough utterances for leave-one-out to mean anything. */
export const MIN_ENROLMENT_SAMPLES = 3;
export const WANTED_ENROLMENT_SAMPLES = 4;

export interface SpeakerDecision {
  accepted: boolean;
  similarity: number;
  threshold: number;
  /**
   * Set when no judgement could be made. An undetermined result is
   * **accepted** by convention and the caller decides what to do with it. The
   * alternative — treating "I could not tell" as "not you" — means a missing
   * model or a half-second utterance silently makes Nexus IQ deaf, which is
   * worse than occasionally answering someone else given this gates
   * activation and not access.
   */
  undetermined: string | null;
}

export interface EnrolmentResult {
  threshold: number;
  consistency: number;
  samples: number;
  weakestHeldOut: number | null;
  isNeural: boolean;
  embedder: string;
  model: string;
}

/**
 * Score each sample as if it were live: hold it out, rebuild the profile from
 * the rest, and compare.
 *
 * This is the part most implementations get wrong, and Jarvis's first version
 * got it wrong too. The old rule asked "how alike are these recordings?" and
 * set the bar just under that. Record four sentences sitting still and the
 * answer is "extremely alike", so the bar lands near 0.82 — and the owner
 * speaking from the doorway is then refused. This distribution is the answer
 * to the question a threshold actually has to be set against: how well does
 * this profile recognise a genuine utterance it has not already seen.
 */
function leaveOneOutScores(embeddings: number[][]): number[] {
  if (embeddings.length < 2) return [];

  const scores: number[] = [];
  const dim = embeddings[0].length;

  for (let held = 0; held < embeddings.length; held++) {
    const sum = new Array(dim).fill(0);
    for (let i = 0; i < embeddings.length; i++) {
      if (i === held) continue;
      for (let d = 0; d < dim; d++) sum[d] += embeddings[i][d];
    }
    const centroid = unit(sum.map(v => v / (embeddings.length - 1)));
    scores.push(similarity(embeddings[held], centroid));
  }
  return scores;
}

export interface EnrolSample {
  samples: Float32Array;
  /** Recording condition, e.g. "close" or "arm's length". Groups anchors. */
  condition?: string;
}

/**
 * Build and store a voice profile for one user on one portal.
 *
 * Enrolment must hear what a turn hears: the audio arriving here is captured
 * by the same browser path, at the same rate, as a live command. Jarvis
 * measured a 0.13 similarity drop when that was not true — more than enough to
 * cross a threshold and lock the owner out — and it is the least obvious
 * requirement in the whole feature.
 */
export async function enrolVoice(
  userId: string,
  portal: VoicePortal,
  clips: EnrolSample[]
): Promise<EnrolmentResult> {
  const embedder = getSpeakerEmbedder();
  const unavailable = embedder.unavailableReason();
  if (unavailable) throw new VoiceUnavailableError(unavailable);

  if (clips.length < MIN_ENROLMENT_SAMPLES) {
    throw new EnrolmentError(
      `Record at least ${MIN_ENROLMENT_SAMPLES} samples so a threshold can be measured.`
    );
  }

  const embeddings: number[][] = [];
  const conditions: string[] = [];

  for (const clip of clips) {
    const vector = await embedder.embed(clip.samples);
    if (!vector) continue;
    embeddings.push(Array.from(vector));
    conditions.push(clip.condition || 'default');
  }

  if (embeddings.length < MIN_ENROLMENT_SAMPLES) {
    throw new EnrolmentError(
      'Too few of those recordings were usable. Each one needs about a second ' +
        'of speech — try again somewhere quieter.'
    );
  }

  const dim = embeddings[0].length;
  const sum = new Array(dim).fill(0);
  for (const e of embeddings) for (let d = 0; d < dim; d++) sum[d] += e[d];
  const centroid = unit(sum.map(v => v / embeddings.length));

  // One anchor per recording condition, so an utterance from across the room
  // is compared against how this voice sounds from across the room.
  const anchors: number[][] = [];
  for (const label of [...new Set(conditions)]) {
    const group = embeddings.filter((_, i) => conditions[i] === label);
    const groupSum = new Array(dim).fill(0);
    for (const e of group) for (let d = 0; d < dim; d++) groupSum[d] += e[d];
    anchors.push(unit(groupSum.map(v => v / group.length)));
  }

  // Pairwise similarity: how consistent this voice was with itself.
  const pairs: number[] = [];
  for (let i = 0; i < embeddings.length; i++) {
    for (let j = i + 1; j < embeddings.length; j++) {
      pairs.push(similarity(embeddings[i], embeddings[j]));
    }
  }
  const consistency = pairs.reduce((a, b) => a + b, 0) / pairs.length;

  const heldOut = leaveOneOutScores(embeddings);
  let measured = consistency;
  let weakest: number | null = null;

  if (heldOut.length) {
    const mean = heldOut.reduce((a, b) => a + b, 0) / heldOut.length;
    const variance = heldOut.reduce((a, b) => a + (b - mean) ** 2, 0) / heldOut.length;
    measured = mean - 2 * Math.sqrt(variance);
    weakest = Math.min(...heldOut);
    // Never set a bar that would have rejected one of the enrolment samples
    // themselves. If "quiet, at arm's length" scored 0.58, then 0.58 is a
    // thing this voice genuinely does.
    measured = Math.min(measured, weakest - LOO_MARGIN);
  }

  const threshold = Math.max(MIN_THRESHOLD, Math.min(MAX_THRESHOLD, measured));

  await prisma.voiceProfile.upsert({
    where: { userId_portal: { userId, portal } },
    create: {
      userId,
      portal,
      centroid,
      anchors,
      threshold: round4(threshold),
      consistency: round4(consistency),
      sampleCount: embeddings.length,
      embedder: embedder.name,
      model: embedder.model,
      isNeural: embedder.isNeural,
    },
    update: {
      centroid,
      anchors,
      threshold: round4(threshold),
      consistency: round4(consistency),
      sampleCount: embeddings.length,
      embedder: embedder.name,
      model: embedder.model,
      isNeural: embedder.isNeural,
      lastVerifiedAt: null,
    },
  });

  return {
    threshold: round4(threshold),
    consistency: round4(consistency),
    samples: embeddings.length,
    weakestHeldOut: weakest === null ? null : round4(weakest),
    isNeural: embedder.isNeural,
    embedder: embedder.name,
    model: embedder.model,
  };
}

/**
 * Compare an utterance against the enrolled profile.
 *
 * Scores against the nearest reference — the centroid or any condition anchor
 * — rather than the centroid alone.
 */
export async function verifyVoice(
  userId: string,
  portal: VoicePortal,
  samples: Float32Array
): Promise<SpeakerDecision> {
  const embedder = getSpeakerEmbedder();
  const unavailable = embedder.unavailableReason();
  if (unavailable) {
    return { accepted: true, similarity: 0, threshold: MIN_THRESHOLD, undetermined: unavailable };
  }

  const profile = await prisma.voiceProfile.findUnique({
    where: { userId_portal: { userId, portal } },
  });
  if (!profile) {
    return {
      accepted: true,
      similarity: 0,
      threshold: MIN_THRESHOLD,
      undetermined: 'no voice enrolled',
    };
  }

  const vector = await embedder.embed(samples);
  if (!vector) {
    return {
      accepted: true,
      similarity: 0,
      threshold: profile.threshold,
      undetermined: 'the utterance was too short to identify',
    };
  }

  const references = [
    profile.centroid as unknown as number[],
    ...((profile.anchors as unknown as number[][]) || []),
  ].filter(r => Array.isArray(r) && r.length === vector.length);

  if (references.length === 0) {
    return {
      accepted: true,
      similarity: 0,
      threshold: profile.threshold,
      undetermined: 'the stored profile does not match this embedder',
    };
  }

  const score = Math.max(...references.map(r => similarity(vector, r)));
  const accepted = score >= profile.threshold;

  if (accepted) {
    await prisma.voiceProfile.update({
      where: { id: profile.id },
      data: { lastVerifiedAt: new Date() },
    });
  }

  return {
    accepted,
    similarity: round4(score),
    threshold: profile.threshold,
    undetermined: null,
  };
}

export async function getVoiceProfileStatus(userId: string, portal: VoicePortal) {
  const embedder = getSpeakerEmbedder();
  const profile = await prisma.voiceProfile.findUnique({
    where: { userId_portal: { userId, portal } },
    select: {
      threshold: true,
      consistency: true,
      sampleCount: true,
      isNeural: true,
      embedder: true,
      model: true,
      createdAt: true,
      lastVerifiedAt: true,
    },
  });

  return {
    enrolled: Boolean(profile),
    profile,
    engine: {
      name: embedder.name,
      model: embedder.model,
      isNeural: embedder.isNeural,
      available: embedder.unavailableReason() === null,
      unavailableReason: embedder.unavailableReason(),
    },
    requiredSamples: WANTED_ENROLMENT_SAMPLES,
    minimumSamples: MIN_ENROLMENT_SAMPLES,
  };
}

export async function forgetVoice(userId: string, portal: VoicePortal): Promise<boolean> {
  const deleted = await prisma.voiceProfile.deleteMany({ where: { userId, portal } });
  return deleted.count > 0;
}

export class EnrolmentError extends Error {}
export class VoiceUnavailableError extends Error {}

function round4(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}
