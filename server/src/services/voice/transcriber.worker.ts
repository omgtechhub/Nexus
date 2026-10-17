import { parentPort, workerData } from 'worker_threads';
import path from 'path';

/**
 * Whisper, running off the main thread.
 *
 * Transcription is ~1.3 s of solid CPU for a short command on the base.en
 * model. Run in the API process it blocked the event loop for that whole time
 * — so a single spoken command froze every other request on the server, and
 * ten concurrent voice users meant ten seconds during which nobody could load
 * a product page or complete a checkout. That is not a voice problem, it is a
 * whole-API outage triggered by a side feature.
 *
 * One model is loaded per worker and reused for the life of the thread. The
 * load is the expensive part (tens of MB from disk plus ONNX session setup),
 * so a worker-per-request would be far worse than the blocking it replaced.
 *
 * This file is a leaf on purpose: it imports the model runtime and nothing
 * from the application. Pulling in `prisma.js` or `config/index.js` here would
 * open a second database pool per worker and re-run env validation in a thread
 * that has no business doing either.
 */

interface TranscribeRequest {
  id: number;
  samples: Float32Array;
}

type AsrPipeline = (
  audio: Float32Array,
  options?: Record<string, unknown>
) => Promise<{ text: string } | { text: string }[]>;

const modelName: string = workerData?.model || 'onnx-community/whisper-base.en';
const cacheDir: string = workerData?.cacheDir || path.join(process.cwd(), '.models');

/** English-only checkpoints reject `language`/`task` outright. */
function isEnglishOnly(model: string): boolean {
  return /\.en$/i.test(model);
}

let pipelinePromise: Promise<AsrPipeline> | null = null;

async function getPipeline(): Promise<AsrPipeline> {
  if (pipelinePromise) return pipelinePromise;

  pipelinePromise = (async () => {
    const { pipeline, env } = await import('@huggingface/transformers');
    env.cacheDir = cacheDir;

    return (await pipeline('automatic-speech-recognition', modelName, {
      dtype: { encoder_model: 'q8', decoder_model_merged: 'q8' },
    })) as unknown as AsrPipeline;
  })();

  try {
    return await pipelinePromise;
  } catch (err) {
    // Let the next request retry rather than caching a failed download for
    // the life of the thread.
    pipelinePromise = null;
    throw err;
  }
}

function textOf(result: Awaited<ReturnType<AsrPipeline>>): string {
  const first = Array.isArray(result) ? result[0] : result;
  return (first?.text ?? '').trim();
}

parentPort?.on('message', async (message: TranscribeRequest | { id: number; warmUp: true }) => {
  const { id } = message;

  try {
    const asr = await getPipeline();

    if ('warmUp' in message) {
      parentPort?.postMessage({ id, ok: true, text: '' });
      return;
    }

    const options = isEnglishOnly(modelName) ? {} : { language: 'en', task: 'transcribe' };
    const result = await asr(message.samples, options);

    parentPort?.postMessage({ id, ok: true, text: textOf(result) });
  } catch (err: any) {
    parentPort?.postMessage({
      id,
      ok: false,
      error: err?.message ?? String(err),
    });
  }
});

// Tell the pool the thread is alive and ready to receive work. The model is
// still unloaded at this point; loading is deferred to the first job so boot
// stays cheap on an install where nobody uses voice.
parentPort?.postMessage({ ready: true });
