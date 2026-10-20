import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { VoicePortal, AiMessageRole, AiUsageKind } from '@prisma/client';
import { prisma } from '../prisma.js';
import {
  enrolVoice,
  verifyVoice,
  getVoiceProfileStatus,
  forgetVoice,
  EnrolmentError,
  VoiceUnavailableError,
  MIN_ENROLMENT_SAMPLES,
} from '../services/voice/speaker.service.js';
import { decodeToMono16k, durationOf, peakOf, AudioDecodeError } from '../services/voice/audio.js';
import { transcribe, transcriberInfo, TranscriptionError } from '../services/voice/stt.service.js';
import { getAiProvider } from '../services/ai/index.js';
import { buildMerchantContext } from '../services/ai/insights.service.js';
import { recordUsage } from '../services/ai/usage.service.js';

/**
 * The spoken side of Nexus IQ.
 *
 * A turn is: upload one WAV clip, transcribe it here, check the voice against
 * the enrolled profile, answer from the store's own figures, and hand back
 * text for the page to speak.
 *
 * The verification result **gates the answer, not the data**. A rejected voice
 * gets no reply, but a merchant whose session cookie is valid could have asked
 * the same question by typing it — because they are, in fact, the merchant.
 * Voice is a filter on who is talking to the microphone, not a credential, and
 * every route below still sits behind `requireStoreMembership` for the part
 * that actually matters.
 */

/** Below this peak the clip is silence; Whisper would hallucinate words into it. */
const SILENCE_PEAK = 0.012;
/** Shorter than this and a speaker embedding is phoneme luck, not identity. */
const MIN_SECONDS = 0.6;
const MAX_SECONDS = 30;

/**
 * Which profile this request is about.
 *
 * Set by the router that mounted these handlers, so the seller console and the
 * shopping assistant share one enrolment implementation without sharing a
 * profile: one person may hold both accounts, and a voice registered to buy
 * things must not also unlock a store's revenue.
 */
function portalFor(req: Request): VoicePortal {
  return req.voicePortal ?? VoicePortal.SELLER;
}

/** Mounted ahead of the voice routes to name the portal they serve. */
export function useVoicePortal(portal: VoicePortal) {
  return (req: Request, _res: Response, next: NextFunction) => {
    req.voicePortal = portal;
    next();
  };
}

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

/** GET /api/iq/voice/status */
export async function voiceStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const status = await getVoiceProfileStatus(req.user!.id, portalFor(req));
    res.json({ success: true, data: { ...status, transcriber: transcriberInfo() } });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/iq/voice/enrol
 *
 * One clip per call, accumulated in a short-lived server-side draft. Clips
 * arrive one at a time rather than as one multi-file upload so the page can
 * tell the merchant how each recording scored as they go, and so a bad one can
 * be redone without starting over.
 */
const enrolDrafts = new Map<string, { samples: Float32Array; condition: string }[]>();
/** Drafts are abandoned far more often than they are finished. */
const DRAFT_TTL_MS = 15 * 60 * 1000;
const draftTimers = new Map<string, NodeJS.Timeout>();

function draftKey(userId: string, portal: VoicePortal): string {
  return `${userId}:${portal}`;
}

function touchDraft(key: string): void {
  clearTimeout(draftTimers.get(key));
  const timer = setTimeout(() => {
    enrolDrafts.delete(key);
    draftTimers.delete(key);
  }, DRAFT_TTL_MS);
  // Do not hold the process open for an abandoned enrolment.
  timer.unref?.();
  draftTimers.set(key, timer);
}

const enrolSchema = z.object({
  condition: z.string().trim().max(40).optional(),
  /** Set on the last clip to build the profile from everything collected. */
  finish: z.enum(['true', 'false']).optional(),
});

export async function enrolVoiceSample(req: Request, res: Response, next: NextFunction) {
  const key = draftKey(req.user!.id, portalFor(req));
  try {
    const { condition, finish } = enrolSchema.parse(req.body ?? {});
    const samples = clipFrom(req);

    const draft = enrolDrafts.get(key) ?? [];
    draft.push({ samples, condition: condition || 'default' });
    enrolDrafts.set(key, draft);
    touchDraft(key);

    if (finish !== 'true') {
      res.json({
        success: true,
        data: { collected: draft.length, needed: Math.max(0, MIN_ENROLMENT_SAMPLES - draft.length) },
      });
      return;
    }

    const result = await enrolVoice(req.user!.id, portalFor(req), draft);
    enrolDrafts.delete(key);
    clearTimeout(draftTimers.get(key));
    draftTimers.delete(key);

    res.status(201).json({ success: true, data: result });
  } catch (err) {
    if (err instanceof EnrolmentError || err instanceof AudioDecodeError) {
      res.status(400).json({ success: false, error: err.message });
      return;
    }
    if (err instanceof VoiceUnavailableError) {
      res.status(503).json({ success: false, error: err.message });
      return;
    }
    next(err);
  }
}

/** DELETE /api/iq/voice/enrol — start again, or opt out of voice entirely. */
export async function deleteVoiceProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const key = draftKey(req.user!.id, portalFor(req));
    enrolDrafts.delete(key);
    clearTimeout(draftTimers.get(key));
    draftTimers.delete(key);

    const removed = await forgetVoice(req.user!.id, portalFor(req));
    res.json({ success: true, data: { removed } });
  } catch (err) {
    next(err);
  }
}

/** POST /api/iq/voice/command */
export async function voiceCommand(req: Request, res: Response, next: NextFunction) {
  try {
    const merchantId = req.merchant!.id;
    const userId = req.user!.id;
    const portal = portalFor(req);

    const samples = clipFrom(req);

    // Identity first. Transcribing audio from someone the assistant is not
    // going to answer wastes a model run and, worse, writes a stranger's words
    // into the merchant's conversation history.
    const decision = await verifyVoice(userId, portal, samples);
    if (!decision.accepted) {
      res.status(403).json({
        success: false,
        error: 'That did not sound like the voice registered for this merchant.',
        data: {
          verification: decision,
          spoken: 'Sorry, I do not recognise that voice.',
        },
      });
      return;
    }

    const transcript = await transcribe(samples);
    if (!transcript || transcript.replace(/[^a-z0-9]/gi, '').length < 2) {
      res.status(422).json({
        success: false,
        error: 'Nothing could be made out in that recording.',
        data: { verification: decision, transcript },
      });
      return;
    }

    // The spoken turn joins the same conversation the typed one uses, so the
    // history is one thread rather than two that cannot see each other.
    const conversationId = typeof req.body?.conversationId === 'string' ? req.body.conversationId : null;
    let conversation = conversationId
      ? await prisma.aiConversation.findFirst({
          where: { id: conversationId, merchantId },
          include: { messages: { orderBy: { createdAt: 'asc' } } },
        })
      : null;

    if (!conversation) {
      const created = await prisma.aiConversation.create({
        data: { merchantId, userId, title: transcript.slice(0, 60) },
      });
      conversation = { ...created, messages: [] };
    }

    const provider = getAiProvider();
    const system = await buildMerchantContext(merchantId);
    const turns = [
      ...conversation.messages.map(m => ({
        role: m.role === AiMessageRole.USER ? ('user' as const) : ('assistant' as const),
        content: m.content,
      })),
      { role: 'user' as const, content: transcript },
    ];

    const answer = await provider.complete({ system, turns });

    const [, assistantMessage] = await prisma.$transaction([
      prisma.aiMessage.create({
        data: { conversationId: conversation.id, role: AiMessageRole.USER, content: transcript },
      }),
      prisma.aiMessage.create({
        data: {
          conversationId: conversation.id,
          role: AiMessageRole.ASSISTANT,
          content: answer.text,
          provider: answer.provider,
          model: answer.model,
          tokensIn: answer.tokensIn,
          tokensOut: answer.tokensOut,
        },
      }),
      prisma.aiConversation.update({
        where: { id: conversation.id },
        data: { updatedAt: new Date() },
      }),
    ]);

    await recordUsage({
      merchantId,
      kind: AiUsageKind.CHAT,
      provider: answer.provider,
      model: answer.model,
      tokensIn: answer.tokensIn,
      tokensOut: answer.tokensOut,
    });

    res.status(201).json({
      success: true,
      data: {
        conversationId: conversation.id,
        transcript,
        answer: assistantMessage.content,
        verification: decision,
      },
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
