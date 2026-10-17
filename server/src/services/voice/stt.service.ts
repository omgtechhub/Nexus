import {
  transcriberPool,
  TranscriberBusyError,
  TranscriberTimeoutError,
} from './transcriberPool.js';

/**
 * Speech to text, on this server.
 *
 * Whisper runs here rather than in the browser so no merchant's spoken
 * question reaches a third party. Chrome's `SpeechRecognition` would have been
 * free and zero-infrastructure, but it streams the audio to Google — and the
 * questions this feature exists to answer are "what did I make this month"
 * and "am I selling at a loss", which is not something to hand to an ad
 * company in exchange for saving a dependency.
 *
 * The audio is on this server anyway: speaker verification needs the raw
 * samples, so transcribing the same clip in the same request costs one model
 * and no extra upload.
 *
 * `transformers.js` runs the ONNX build of Whisper through onnxruntime, which
 * is the same runtime the speaker model already uses — so this adds a model
 * rather than a second native toolchain.
 */

/**
 * Quantised base.en: ~76 MB, and about 1.3 s for a short command on CPU.
 *
 * It was tiny.en, which is 42 MB and roughly 0.7 s faster per command. The
 * extra second buys accuracy, and accuracy is not a nicety here: the
 * transcript is the whole input. A mishearing does not degrade the answer, it
 * replaces the question — "add it to my bag" heard as "add it to my bug" left
 * the word "bug" behind as a product to go looking for. Spending 700 ms to
 * mishear fewer words is the right trade for a feature that cannot ask "sorry,
 * what?" without costing the shopper the same second anyway.
 *
 * `WHISPER_MODEL` still overrides it, so a slow machine can drop back to
 * `onnx-community/whisper-tiny.en` and a server with room to spare can move up
 * to `onnx-community/whisper-small.en`.
 */
const DEFAULT_MODEL = 'onnx-community/whisper-base.en';

export class TranscriptionError extends Error {}

export function modelId(): string {
  return process.env.WHISPER_MODEL || DEFAULT_MODEL;
}

/**
 * Whisper's English-only checkpoints are the ones suffixed `.en`.
 *
 * Checked by suffix because that is how the upstream naming works for every
 * size (`tiny.en`, `base.en`, `small.en`, `medium.en`), so swapping the model
 * through `WHISPER_MODEL` keeps working without another edit here.
 */
export function isEnglishOnly(model: string): boolean {
  return /\.en$/i.test(model);
}

/**
 * Transcription runs in a worker pool, not here.
 *
 * This module used to load Whisper into the API process and run inference on
 * the main thread — ~1.3 s of solid CPU per command, during which the event
 * loop could not serve anything else. One spoken command froze every other
 * request on the server; a handful at once took the API down for seconds at a
 * time. Voice is core to this platform, so the answer was to move the work,
 * not to switch the feature off.
 *
 * `transcriberPool` owns the threads, the model loading, the queue and the
 * restarts. Everything below is the same public surface the controllers
 * already called, so nothing else changed.
 */

/** Warm the model ahead of the first spoken command. */
export async function warmUpTranscriber(): Promise<boolean> {
  return transcriberPool.warmUp();
}

/**
 * Transcribe mono 16 kHz float32 audio.
 *
 * Whisper hallucinates fluently on silence — it will happily return "you" or
 * "Thank you." for a clip with no speech in it — so near-empty results are
 * filtered by the caller against the clip's own amplitude rather than trusted.
 *
 * Busy and timeout conditions carry their own error types with a status code,
 * so a caller can tell "try again in a moment" apart from "this recording
 * cannot be transcribed".
 */
export async function transcribe(samples: Float32Array): Promise<string> {
  try {
    return await transcriberPool.run(samples);
  } catch (err: any) {
    if (err instanceof TranscriberBusyError || err instanceof TranscriberTimeoutError) {
      throw err;
    }

    // Wrapped, so a decoding failure or a missing model reaches the caller as
    // something it can explain rather than a 500 that reads as the whole
    // feature being broken. The model downloads on first use, so the usual
    // cause on a fresh install is no network during that first request.
    throw new TranscriptionError(
      `The recording could not be transcribed: ${err?.message ?? err}`
    );
  }
}

/** Queue depth, for the readiness probe and the voice status endpoint. */
export function transcriberQueueDepth(): number {
  return transcriberPool.depth;
}

/** Stop the worker threads. Called from the server's shutdown path. */
export async function shutdownTranscriber(): Promise<void> {
  await transcriberPool.shutdown();
}

/** What the UI shows about the recogniser. */
export function transcriberInfo() {
  return {
    engine: 'whisper',
    model: modelId(),
    local: true,
    // Visible so a slow response can be told apart from a stuck one.
    queued: transcriberPool.depth,
  };
}
