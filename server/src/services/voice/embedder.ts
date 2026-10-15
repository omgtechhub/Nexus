import fs from 'fs';
import path from 'path';
import type { InferenceSession, Tensor as OrtTensor } from 'onnxruntime-node';
import { computeFbank, NUM_MEL_BINS, SAMPLE_RATE } from './fbank.js';

/**
 * The seam between voice identity and whatever turns an utterance into a
 * vector.
 *
 * Mirrors `services/ai/provider.ts`: one interface, a real implementation
 * selected by environment, and an honest `isNeural` flag so the UI can say
 * what produced a decision rather than implying an accuracy the deployment
 * does not have.
 */
export interface SpeakerEmbedder {
  readonly name: string;
  readonly model: string;
  /** False for any non-neural fallback, so callers can label output honestly. */
  readonly isNeural: boolean;
  /** Why the embedder cannot run, or null when it can. */
  unavailableReason(): string | null;
  /** Unit-normalised embedding, or null when the audio is unusable. */
  embed(samples: Float32Array): Promise<Float32Array | null>;
}

/**
 * Frames of features needed for a usable embedding.
 *
 * 50 frames at a 10 ms hop is half a second. Shorter than that and the
 * embedding is dominated by whichever phonemes happened to be in it rather
 * than by the voice — Jarvis's number, kept.
 */
export const MIN_FRAMES = 50;

export const MODEL_FILENAME = 'speaker_resnet34.onnx';
export const MODEL_URL =
  'https://huggingface.co/Wespeaker/wespeaker-voxceleb-resnet34-LM/' +
  'resolve/main/voxceleb_resnet34_LM.onnx';
/** Truncation check. The real file is ~26 MB. */
const MIN_MODEL_BYTES = 20_000_000;

/**
 * Where the speaker model lives, in order of preference.
 *
 * The local Jarvis cache is consulted because this machine already has the
 * file: an operator who has run Jarvis should not download 26 MB again to try
 * Nexus IQ. It is a convenience, not a dependency — the path is checked for
 * existence and size like any other candidate, and `npm run voice:fetch-model`
 * fills the project-local directory when none of these exist.
 */
export function resolveModelPath(): string | null {
  const candidates = [
    process.env.VOICE_MODEL_PATH,
    path.join(process.cwd(), '.models', MODEL_FILENAME),
    path.join(
      process.env.LOCALAPPDATA || path.join(process.env.HOME || '', '.local', 'share'),
      'jarvis-assistant',
      'Cache',
      'models',
      MODEL_FILENAME
    ),
  ].filter((p): p is string => Boolean(p));

  for (const candidate of candidates) {
    try {
      const stat = fs.statSync(candidate);
      if (stat.isFile() && stat.size >= MIN_MODEL_BYTES) return candidate;
    } catch {
      /* Not there. Try the next one. */
    }
  }
  return null;
}

/**
 * WeSpeaker ResNet34 (VoxCeleb, LM), via onnxruntime.
 *
 * Takes `feats` of shape `[1, frames, 80]` and returns `embs` of shape
 * `[1, 256]`. The vector is unit-normalised here so every later comparison is
 * a plain dot product and a stored centroid stays directly comparable to a
 * fresh embedding.
 */
export class WeSpeakerEmbedder implements SpeakerEmbedder {
  readonly name = 'wespeaker';
  readonly model = 'voxceleb_resnet34_LM';
  readonly isNeural = true;

  private session: InferenceSession | null = null;
  private loading: Promise<InferenceSession> | null = null;
  private failure: string | null = null;
  private readonly modelPath: string | null;

  constructor(modelPath: string | null = resolveModelPath()) {
    this.modelPath = modelPath;
  }

  unavailableReason(): string | null {
    if (this.failure) return this.failure;
    if (!this.modelPath) {
      return (
        'the speaker model is not installed. Run `npm run voice:fetch-model` in ' +
        'the server directory to download it.'
      );
    }
    return null;
  }

  /**
   * Open the ONNX session once.
   *
   * Single-threaded on purpose, as in Jarvis: this runs inside a request
   * handler on a server that is also serving a storefront, and letting
   * onnxruntime take every core for a 40 ms inference starves everything else.
   */
  private async load(): Promise<InferenceSession> {
    if (this.session) return this.session;
    if (this.loading) return this.loading;

    this.loading = (async () => {
      const ort = await import('onnxruntime-node');
      const session = await ort.InferenceSession.create(this.modelPath!, {
        executionProviders: ['cpu'],
        interOpNumThreads: 1,
        intraOpNumThreads: 1,
        logSeverityLevel: 3,
      });
      this.session = session;
      return session;
    })();

    try {
      return await this.loading;
    } catch (err: any) {
      this.failure = `could not load the speaker model: ${err?.message ?? err}`;
      throw err;
    } finally {
      this.loading = null;
    }
  }

  /** Load the model ahead of the first request that needs it. */
  async warmUp(): Promise<boolean> {
    if (this.unavailableReason()) return false;
    try {
      await this.load();
      return true;
    } catch {
      return false;
    }
  }

  async embed(samples: Float32Array): Promise<Float32Array | null> {
    if (this.unavailableReason()) return null;

    const features = computeFbank(samples, SAMPLE_RATE, NUM_MEL_BINS);
    if (features.frames < MIN_FRAMES) return null;
    if (features.bins !== NUM_MEL_BINS) {
      // A front-end bug, not a bad recording: fail loudly rather than feed the
      // model something the wrong shape and get a plausible-looking vector.
      throw new Error(
        `the front end produced ${features.bins} bins, the model wants ${NUM_MEL_BINS}`
      );
    }

    const session = await this.load();
    const ort = await import('onnxruntime-node');
    const feats = new ort.Tensor('float32', features.data, [1, features.frames, features.bins]);
    const output = await session.run({ feats });
    const raw = output[session.outputNames[0]] as OrtTensor;
    const vector = Float32Array.from(raw.data as Float32Array);

    let norm = 0;
    for (const v of vector) norm += v * v;
    norm = Math.sqrt(norm);
    if (norm === 0) return null;
    for (let i = 0; i < vector.length; i++) vector[i] /= norm;
    return vector;
  }
}

let cached: SpeakerEmbedder | null = null;

/** The configured embedder. `VOICE_EMBEDDER` exists for future alternatives. */
export function getSpeakerEmbedder(): SpeakerEmbedder {
  if (!cached) cached = new WeSpeakerEmbedder();
  return cached;
}

/** Tests swap the embedder so they do not depend on a 26 MB download. */
export function setSpeakerEmbedder(embedder: SpeakerEmbedder | null): void {
  cached = embedder;
}

/** Cosine similarity of two unit vectors, i.e. their dot product. */
export function similarity(a: Float32Array | number[], b: Float32Array | number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}

/** Unit-normalise in place and return, for building centroids and anchors. */
export function unit(vector: number[]): number[] {
  let norm = 0;
  for (const v of vector) norm += v * v;
  norm = Math.sqrt(norm);
  if (norm === 0) return vector;
  return vector.map(v => v / norm);
}
