import { Worker } from 'worker_threads';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../../utils/logger.js';

/**
 * A small pool of Whisper workers.
 *
 * Transcription used to run on the main thread, where ~1.3 s of ONNX
 * inference per command blocked every other request on the server. Voice is a
 * core feature of this platform, so it could not simply be gated off; it had
 * to stop being able to take the API down.
 *
 * ## Why a pool and not a worker per request
 *
 * Loading the model is the expensive part — tens of megabytes plus ONNX
 * session setup, several seconds. A worker per request would pay that every
 * time and be far worse than the blocking it replaced. Workers here are
 * long-lived and reused; the model loads once per thread, on its first job.
 *
 * ## Why the default is small
 *
 * Each worker holds its own copy of the model, so the pool's memory cost is
 * roughly `size × model size` (~76 MB for base.en) on top of the runtime.
 * Two is a sensible default for a single-instance deployment: enough that one
 * slow command does not stall the next, small enough not to double the
 * container's memory for a feature with bursty use. `VOICE_WORKERS` overrides
 * it.
 *
 * ## Backpressure
 *
 * The queue is bounded. An unbounded one would accept work faster than it can
 * ever be done and answer every caller with a timeout several minutes later,
 * having held all their audio in memory meanwhile. Past the limit a caller is
 * refused immediately and can be told to try again — which is a far better
 * experience than a request that hangs.
 */

interface Job {
  samples: Float32Array;
  resolve: (text: string) => void;
  reject: (err: Error) => void;
  enqueuedAt: number;
  timer: NodeJS.Timeout;
  settled: boolean;
}

interface PooledWorker {
  worker: Worker;
  busy: boolean;
  /** The job this worker is running, so a crash can reject it. */
  current: { id: number; job: Job } | null;
}

export class TranscriberBusyError extends Error {
  readonly statusCode = 503;
  constructor() {
    super('Speech recognition is busy. Please try again in a moment.');
    this.name = 'TranscriberBusyError';
  }
}

export class TranscriberTimeoutError extends Error {
  readonly statusCode = 504;
  constructor(seconds: number) {
    super(`Transcription did not finish within ${seconds}s.`);
    this.name = 'TranscriberTimeoutError';
  }
}

function poolSize(): number {
  const configured = Number.parseInt(process.env.VOICE_WORKERS || '', 10);
  if (Number.isFinite(configured) && configured > 0) return Math.min(configured, 8);

  // One worker under test: the suite transcribes a handful of clips in
  // sequence, and a second thread would load the model again for no gain.
  if (process.env.NODE_ENV === 'test') return 1;

  // Leave a core for the event loop itself — the whole point is that the API
  // stays responsive while these run.
  return Math.max(1, Math.min(2, os.cpus().length - 1));
}

/** How long a single clip may take before the caller is told it failed. */
const JOB_TIMEOUT_MS = Number.parseInt(process.env.VOICE_TIMEOUT_MS || '', 10) || 60_000;

/** Queued clips beyond this are refused rather than silently delayed. */
const MAX_QUEUE = Number.parseInt(process.env.VOICE_MAX_QUEUE || '', 10) || 12;

/**
 * Where the worker file lives, in dev and in the build.
 *
 * Under `tsx` (dev and the test suite) this module is `.ts` and tsx's loader
 * handles a `.ts` worker; after `tsc` it is `.js` in `dist/`. Deriving the
 * extension from this module's own URL keeps one code path for both instead
 * of a NODE_ENV guess that breaks whenever the two disagree.
 */
function workerPath(): string {
  const here = fileURLToPath(import.meta.url);
  const ext = here.endsWith('.ts') ? '.ts' : '.js';
  return path.join(path.dirname(here), `transcriber.worker${ext}`);
}

class TranscriberPool {
  private workers: PooledWorker[] = [];
  private queue: Job[] = [];
  private nextJobId = 1;
  private started = false;
  private shuttingDown = false;

  private start(): void {
    if (this.started) return;
    this.started = true;

    const size = poolSize();
    for (let i = 0; i < size; i++) this.spawn();

    logger.info({ msg: 'Transcriber pool started', workers: size, timeoutMs: JOB_TIMEOUT_MS });
  }

  private spawn(): void {
    if (this.shuttingDown) return;

    const worker = new Worker(workerPath(), {
      workerData: {
        model: process.env.WHISPER_MODEL || 'onnx-community/whisper-base.en',
        cacheDir: process.env.VOICE_MODEL_DIR || path.join(process.cwd(), '.models'),
      },
    });

    const pooled: PooledWorker = { worker, busy: false, current: null };

    worker.on('message', (msg: any) => {
      if (msg?.ready) return;

      const active = pooled.current;
      if (!active || active.id !== msg.id) return;

      pooled.current = null;
      pooled.busy = false;

      if (msg.ok) this.settle(active.job, null, msg.text);
      else this.settle(active.job, new Error(msg.error || 'Transcription failed'));

      this.drain();
    });

    worker.on('error', (err) => {
      logger.error({ err }, 'Transcriber worker errored');
      this.replace(pooled, err);
    });

    worker.on('exit', (code) => {
      if (this.shuttingDown) return;
      // A worker that dies mid-job takes the job with it, so the caller has
      // to be told rather than left waiting for its timeout.
      this.replace(pooled, new Error(`Transcriber worker exited with code ${code}`));
    });

    this.workers.push(pooled);
  }

  /** Reject whatever a dead worker was holding, then bring up a replacement. */
  private replace(pooled: PooledWorker, err: Error): void {
    const active = pooled.current;
    pooled.current = null;
    pooled.busy = false;

    if (active) this.settle(active.job, err);

    this.workers = this.workers.filter(w => w !== pooled);
    void pooled.worker.terminate().catch(() => {});

    if (!this.shuttingDown) {
      this.spawn();
      this.drain();
    }
  }

  /** Resolve or reject exactly once, whichever of timeout or reply arrives first. */
  private settle(job: Job, err: Error | null, text = ''): void {
    if (job.settled) return;
    job.settled = true;
    clearTimeout(job.timer);

    if (err) job.reject(err);
    else job.resolve(text);
  }

  private drain(): void {
    if (this.queue.length === 0) return;

    const free = this.workers.find(w => !w.busy);
    if (!free) return;

    const job = this.queue.shift();
    if (!job) return;

    // Dropped while queued (timed out waiting), so move on to the next.
    if (job.settled) {
      this.drain();
      return;
    }

    const id = this.nextJobId++;
    free.busy = true;
    free.current = { id, job };

    // Transferring the buffer would be cheaper, but the caller still holds a
    // reference to these samples (the speaker check runs on the same clip),
    // and detaching it out from under them is a crash waiting to happen.
    free.worker.postMessage({ id, samples: job.samples });
  }

  async run(samples: Float32Array): Promise<string> {
    this.start();

    if (this.queue.length >= MAX_QUEUE) {
      throw new TranscriberBusyError();
    }

    return new Promise<string>((resolve, reject) => {
      const job: Job = {
        samples,
        resolve,
        reject,
        enqueuedAt: Date.now(),
        settled: false,
        timer: setTimeout(() => {
          this.settle(job, new TranscriberTimeoutError(Math.round(JOB_TIMEOUT_MS / 1000)));
        }, JOB_TIMEOUT_MS),
      };

      this.queue.push(job);
      this.drain();
    });
  }

  /** Load the model ahead of the first spoken command. */
  async warmUp(): Promise<boolean> {
    this.start();

    const free = this.workers[0];
    if (!free) return false;

    return new Promise<boolean>((resolve) => {
      const id = this.nextJobId++;
      const timer = setTimeout(() => resolve(false), JOB_TIMEOUT_MS);

      const onMessage = (msg: any) => {
        if (msg?.id !== id) return;
        clearTimeout(timer);
        free.worker.off('message', onMessage);
        resolve(Boolean(msg.ok));
      };

      free.worker.on('message', onMessage);
      free.worker.postMessage({ id, warmUp: true });
    });
  }

  get depth(): number {
    return this.queue.length;
  }

  async shutdown(): Promise<void> {
    this.shuttingDown = true;

    for (const job of this.queue) {
      this.settle(job, new Error('Server is shutting down'));
    }
    this.queue = [];

    await Promise.all(this.workers.map(w => w.worker.terminate().catch(() => {})));
    this.workers = [];
    this.started = false;
  }
}

export const transcriberPool = new TranscriberPool();
