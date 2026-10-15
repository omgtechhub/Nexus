import { Request, Response, NextFunction } from 'express';
import { answerPublicQuestion } from '../services/ai/concierge.service.js';
import { decodeToMono16k, durationOf, peakOf, AudioDecodeError } from '../services/voice/audio.js';
import { transcribe, TranscriptionError, transcriberInfo } from '../services/voice/stt.service.js';

/**
 * Nexus IQ on the public pages.
 *
 * The signed-in surfaces answer questions about an account and are protected
 * accordingly — a session cookie, and for spoken commands an enrolled voice.
 * Nothing reachable here touches an account, so neither applies: a visitor
 * reading the landing page can type or simply talk, in any voice, and get an
 * answer.
 *
 * What keeps that honest is scope. `answerPublicQuestion` reads the published
 * plans and the public catalogue and nothing else, so there is no account for
 * an unrecognised voice to reach into. The limits below are therefore about
 * cost rather than authority: a transcription run is CPU the server has to
 * spend, and an open endpoint that spends it is the one thing worth capping.
 */

const SILENCE_PEAK = 0.012;
const MIN_SECONDS = 0.6;
const MAX_SECONDS = 20;
const MAX_MESSAGE = 400;

/**
 * GET /api/assistant/status
 *
 * Whether the Talk tab can work at all. The recogniser runs locally and its
 * model downloads on first use, so a deployment can legitimately have the
 * typed assistant working and the spoken one not — the panel says which
 * rather than offering a button that fails when pressed.
 */
export async function publicAssistantStatus(_req: Request, res: Response) {
  res.json({
    success: true,
    data: {
      /** Always true: answers are computed, not generated. */
      typing: true,
      voice: {
        /**
         * No verification out here, and the panel says so in those words. It
         * is not a limitation to be fixed: there is no account behind a
         * public answer, so a voice check would gate nothing and would make
         * a visitor record four samples to ask what Nexus costs.
         */
        verified: false,
        transcriber: transcriberInfo(),
      },
    },
  });
}

/** Shared by both surfaces, so a typed and a spoken question cannot diverge. */
async function respond(res: Response, message: string, spoken: boolean) {
  const answer = await answerPublicQuestion(message);
  res.status(200).json({
    success: true,
    data: {
      transcript: message,
      spoken,
      ...answer,
    },
  });
}

/** POST /api/assistant/message */
export async function publicAssistantMessage(req: Request, res: Response, next: NextFunction) {
  try {
    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';

    if (!message) {
      res.status(400).json({ success: false, error: 'Type a question first.' });
      return;
    }
    if (message.length > MAX_MESSAGE) {
      res.status(400).json({
        success: false,
        error: 'That question is too long — keep it to a sentence or two.',
      });
      return;
    }

    await respond(res, message, false);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/assistant/voice
 *
 * One clip in, one answer out. The clip is decoded, checked for being actual
 * speech, transcribed and discarded — it is held in memory for the length of
 * the request and never written anywhere, which matters more here than on the
 * account surfaces precisely because we do not know whose voice it is.
 */
export async function publicAssistantVoice(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: 'No audio was uploaded.' });
      return;
    }

    const samples = decodeToMono16k(req.file.buffer);
    const seconds = durationOf(samples);

    if (seconds < MIN_SECONDS) {
      throw new AudioDecodeError(
        `That recording was ${seconds.toFixed(1)}s. Hold the button and speak for at least a second.`
      );
    }
    if (seconds > MAX_SECONDS) {
      throw new AudioDecodeError(
        `That recording was ${Math.round(seconds)}s. Keep a question under ${MAX_SECONDS}.`
      );
    }
    if (peakOf(samples) < SILENCE_PEAK) {
      throw new AudioDecodeError('That recording is silent. Check the microphone is not muted.');
    }

    const transcript = await transcribe(samples);

    // Whisper invents fluent text from silence, so a clip that transcribes to
    // almost nothing is reported as unheard rather than answered as a question.
    if (!transcript || transcript.replace(/[^a-z0-9]/gi, '').length < 2) {
      res.status(422).json({
        success: false,
        error: 'Nothing could be made out in that recording.',
        data: { transcript, spoken: 'Sorry, I did not catch that.' },
      });
      return;
    }

    await respond(res, transcript, true);
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
