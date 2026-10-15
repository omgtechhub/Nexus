import path from 'path';

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

type AsrPipeline = (
  audio: Float32Array,
  options?: Record<string, unknown>
) => Promise<{ text: string } | { text: string }[]>;

let pipelinePromise: Promise<AsrPipeline> | null = null;

/**
 * Load Whisper once, lazily.
 *
 * Lazily because the first call downloads the model, and a server that fetches
 * 42 MB during boot fails to start on a metered or offline machine for a
 * feature most requests never touch.
 */
async function getPipeline(): Promise<AsrPipeline> {
  if (pipelinePromise) return pipelinePromise;

  pipelinePromise = (async () => {
    const { pipeline, env } = await import('@huggingface/transformers');
    // Keep the download beside the speaker model rather than in a home
    // directory, so one `.models/` holds everything the voice path needs.
    env.cacheDir = process.env.VOICE_MODEL_DIR || path.join(process.cwd(), '.models');

    return (await pipeline('automatic-speech-recognition', modelId(), {
      dtype: { encoder_model: 'q8', decoder_model_merged: 'q8' },
    })) as unknown as AsrPipeline;
  })();

  try {
    return await pipelinePromise;
  } catch (err) {
    // Let the next request try again rather than caching the failure for the
    // lifetime of the process: the usual cause is a dropped download.
    pipelinePromise = null;
    throw err;
  }
}

/** Warm the model ahead of the first spoken command. */
export async function warmUpTranscriber(): Promise<boolean> {
  try {
    await getPipeline();
    return true;
  } catch {
    return false;
  }
}

/**
 * Transcribe mono 16 kHz float32 audio.
 *
 * Whisper hallucinates fluently on silence — it will happily return "you" or
 * "Thank you." for a clip with no speech in it — so near-empty results are
 * filtered by the caller against the clip's own amplitude rather than trusted.
 */
export async function transcribe(samples: Float32Array): Promise<string> {
  let asr: AsrPipeline;
  try {
    asr = await getPipeline();
  } catch (err: any) {
    throw new TranscriptionError(
      `Speech recognition is not available: ${err?.message ?? err}. The model ` +
        'downloads on first use, so this usually means no network on that first run.'
    );
  }

  /*
   * `language` and `task` are only legal on a multilingual checkpoint.
   *
   * The default model is `whisper-base.en`, which is English-only and rejects
   * both outright -- "Cannot specify `task` or `language` for an English-only
   * model" -- so passing them unconditionally made every spoken command fail
   * after the voice had already been matched. An English-only model needs no
   * language hint anyway: there is only one language it can produce.
   */
  const options = isEnglishOnly(modelId()) ? {} : { language: 'en', task: 'transcribe' };

  let result: Awaited<ReturnType<AsrPipeline>>;
  try {
    result = await asr(samples, options);
  } catch (err: any) {
    // Wrapped, so a decoding failure reaches the caller as a 503 it can
    // explain rather than a 500 that reads as the whole feature being broken.
    throw new TranscriptionError(
      `The recording could not be transcribed: ${err?.message ?? err}`
    );
  }

  const text = Array.isArray(result) ? result.map(r => r.text).join(' ') : result.text;
  return (text || '').trim();
}

/** What the UI shows about the recogniser. */
export function transcriberInfo() {
  return {
    engine: 'whisper',
    model: modelId(),
    local: true,
  };
}
