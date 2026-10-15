/**
 * Microphone capture for Nexus IQ.
 *
 * Records mono 16 kHz 16-bit PCM and hands back a WAV. It deliberately does
 * **not** use `MediaRecorder`, which would give webm/opus: decoding Opus on
 * the server needs ffmpeg or a native codec, and a lossy psychoacoustic codec
 * sits badly in front of a speaker-embedding model that keys on exactly the
 * spectral detail such a codec throws away.
 *
 * The other reason is the one that actually breaks speaker verification:
 * **enrolment has to hear what a live command hears.** Jarvis measured a 0.13
 * similarity drop when the two paths differed — more than enough to cross a
 * threshold and lock the owner out of their own assistant. One capture
 * function, used by both, is the cheapest way to guarantee that.
 *
 * Two modes sit on that one path. `VoiceRecorder` records from press to
 * release. `ContinuousListener` keeps the device open and cuts the stream into
 * utterances at the pauses, which is what lets someone switch listening on
 * once and then simply talk.
 */

export const TARGET_SAMPLE_RATE = 16_000;

export class MicrophoneError extends Error {}

export interface Recording {
  wav: Blob;
  seconds: number;
  /** Peak amplitude in [0, 1], so the UI can say "we heard nothing". */
  peak: number;
}

/** Encode mono float32 as a 16-bit PCM WAV. */
function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  const ascii = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };

  ascii(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  ascii(8, 'WAVE');
  ascii(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  ascii(36, 'data');
  view.setUint32(40, samples.length * 2, true);

  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    // Asymmetric on purpose: 32767 positive, 32768 negative, which is what
    // the int16 range actually is.
    view.setInt16(44 + i * 2, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

/** Average consecutive samples down to the target rate. */
function downsample(samples: Float32Array, from: number, to: number): Float32Array {
  if (from === to) return samples;
  if (from < to) return samples; // Never upsample; the server copes.

  const ratio = from / to;
  const length = Math.floor(samples.length / ratio);
  const out = new Float32Array(length);

  for (let i = 0; i < length; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.min(Math.floor((i + 1) * ratio), samples.length);
    let sum = 0;
    for (let j = start; j < end; j++) sum += samples[j];
    // Averaging rather than picking one sample: it is a crude low-pass, which
    // is the difference between downsampling and aliasing.
    out[i] = end > start ? sum / (end - start) : 0;
  }
  return out;
}

/**
 * One open microphone, handed back as an audio context plus a release.
 *
 * Both modes go through here. That is not tidiness: enrolment has to hear what
 * a live command hears, and the quickest way for the two to drift apart would
 * be two copies of this function with different constraints or a different
 * sample rate.
 */
interface MicGraph {
  context: AudioContext;
  release(): void;
}

async function openMicrophone(
  bufferSize: number,
  onBlock: (block: Float32Array) => void
): Promise<MicGraph> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new MicrophoneError('This browser cannot reach the microphone.');
  }

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        // Echo cancellation and noise suppression are left on: they are what
        // a laptop microphone sounds like in normal use, and enrolling with
        // them off would build a profile of a voice the merchant never
        // actually speaks with. Echo cancellation earns its keep twice over
        // hands-free, where the speakers are playing a reply into the very
        // microphone that is still open.
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
  } catch (err: any) {
    throw new MicrophoneError(
      err?.name === 'NotAllowedError'
        ? 'Microphone access was declined. Allow it in the browser and try again.'
        : 'No microphone could be opened.'
    );
  }

  const Ctor = window.AudioContext || (window as any).webkitAudioContext;
  // Ask for 16 kHz directly; most browsers honour it and skip the resample.
  const context: AudioContext = new Ctor({ sampleRate: TARGET_SAMPLE_RATE });
  const source = context.createMediaStreamSource(stream);

  /*
   * `ScriptProcessorNode` is deprecated in favour of `AudioWorklet`, and is
   * used anyway: a worklet needs its processor served as a separate module
   * file, which means a build-system detour for forty lines of copying
   * samples into an array. It still works in every browser that can reach a
   * microphone, and the work per callback is a memcpy.
   */
  const processor = context.createScriptProcessor(bufferSize, 1, 1);
  processor.onaudioprocess = event => {
    onBlock(new Float32Array(event.inputBuffer.getChannelData(0)));
  };

  source.connect(processor);
  // Through a muted gain node: the processor only fires when connected to
  // the destination, and connecting it directly would play the microphone
  // back through the speakers.
  const silent = context.createGain();
  silent.gain.value = 0;
  processor.connect(silent);
  silent.connect(context.destination);

  return {
    context,
    release() {
      processor.onaudioprocess = null;
      processor.disconnect();
      source.disconnect();
      silent.disconnect();
      stream.getTracks().forEach(track => track.stop());
      void context.close().catch(() => {});
    },
  };
}

/** Root-mean-square level of one block, in [0, 1]. */
function rmsOf(block: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < block.length; i++) sum += block[i] * block[i];
  return Math.sqrt(sum / block.length);
}

/** Flatten buffered blocks into one contiguous run of samples. */
function concat(blocks: Float32Array[], total: number): Float32Array {
  const merged = new Float32Array(total);
  let offset = 0;
  for (const block of blocks) {
    merged.set(block, offset);
    offset += block.length;
  }
  return merged;
}

/** Downsample, measure and encode a run of samples the way both modes expect. */
function finishClip(samples: Float32Array, sampleRate: number): Recording {
  const resampled = downsample(samples, sampleRate, TARGET_SAMPLE_RATE);
  let peak = 0;
  for (const s of resampled) {
    const v = Math.abs(s);
    if (v > peak) peak = v;
  }
  return {
    wav: encodeWav(resampled, TARGET_SAMPLE_RATE),
    seconds: resampled.length / TARGET_SAMPLE_RATE,
    peak,
  };
}

/**
 * An open microphone that records until stopped.
 *
 * `start()` asks for permission, so it must be called from a user gesture.
 * `stop()` releases the device — a tab that holds the microphone open keeps
 * the browser's recording indicator lit, which is alarming and fair enough.
 */
export class VoiceRecorder {
  private graph: MicGraph | null = null;
  private chunks: Float32Array[] = [];
  private recording = false;

  get isRecording(): boolean {
    return this.recording;
  }

  async start(): Promise<void> {
    if (this.recording) return;

    this.chunks = [];
    this.graph = await openMicrophone(4096, block => {
      if (!this.recording) return;
      this.chunks.push(block);
    });

    this.recording = true;
  }

  /** Stop, release the microphone, and return the recording. */
  async stop(): Promise<Recording> {
    if (!this.recording || !this.graph) {
      throw new MicrophoneError('Nothing was being recorded.');
    }
    this.recording = false;

    const sampleRate = this.graph.context.sampleRate;
    const total = this.chunks.reduce((sum, c) => sum + c.length, 0);
    const merged = concat(this.chunks, total);

    this.chunks = [];
    this.graph.release();
    this.graph = null;

    return finishClip(merged, sampleRate);
  }

  /** Drop the recording and let the microphone go. Safe to call twice. */
  cancel(): void {
    this.recording = false;
    this.chunks = [];
    this.graph?.release();
    this.graph = null;
  }
}

/* ------------------------------------------------------------- hands-free */

/**
 * Where the cut points are.
 *
 * A clip handed to the server hands-free has to look like a clip from
 * press-and-hold, or speaker verification starts scoring the editing rather
 * than the voice. So an utterance keeps a run-up before the first word and the
 * whole pause that ended it, instead of being trimmed tight to the speech.
 */
const LISTEN_BLOCK = 2048;
/** Audio kept before speech is detected, so the first syllable is not clipped. */
const PRE_ROLL_MS = 500;
/** The pause that ends a sentence. Long enough to think mid-question. */
const SILENCE_MS = 1_000;
/** Shorter than this and it was a cough, a door or a chair. */
const MIN_VOICED_MS = 300;
/** A ceiling, so a stuck gate cannot buffer the afternoon. */
const MAX_UTTERANCE_MS = 25_000;
/** Below this nothing counts as speech however quiet the room is. */
const ABSOLUTE_GATE = 0.012;

export interface ListenerHandlers {
  /**
   * One utterance. The listener stops feeding the segmenter until this settles,
   * so an async handler can finish talking back before the microphone counts
   * again — otherwise the assistant hears its own reply and answers itself.
   */
  onUtterance: (clip: Recording) => void | Promise<void>;
  /** Input level in [0, 1] and whether speech is being captured right now. */
  onLevel?: (level: number, speaking: boolean) => void;
  onError?: (message: string) => void;
}

/**
 * A microphone that stays open and sends a clip each time you stop talking.
 *
 * The gate is adaptive rather than a fixed threshold: it tracks the room's
 * noise floor while nobody is speaking and opens at a multiple of it, so the
 * same code works in a quiet office and next to an air conditioner. It closes
 * on a lower threshold than it opens — without that hysteresis, a sentence
 * with a soft ending gets cut in half and sent as two questions.
 */
export class ContinuousListener {
  private graph: MicGraph | null = null;
  private listening = false;
  /** True while a reply is being produced or spoken: audio is ignored. */
  private gated = false;

  private rate = TARGET_SAMPLE_RATE;
  private preRoll: Float32Array[] = [];
  private preRollSamples = 0;
  private speech: Float32Array[] = [];
  private speechSamples = 0;
  private voicedSamples = 0;
  private silenceSamples = 0;
  private onsetBlocks = 0;
  private inSpeech = false;
  private noiseFloor = 0.008;

  constructor(private readonly handlers: ListenerHandlers) {}

  get isListening(): boolean {
    return this.listening;
  }

  /** Must be called from a user gesture — it asks for microphone permission. */
  async start(): Promise<void> {
    if (this.listening) return;

    this.graph = await openMicrophone(LISTEN_BLOCK, block => this.consume(block));
    this.rate = this.graph.context.sampleRate;
    this.reset();
    this.listening = true;
  }

  /** Release the device. Safe to call twice. */
  stop(): void {
    this.listening = false;
    this.gated = false;
    this.reset();
    this.graph?.release();
    this.graph = null;
  }

  private ms(count: number): number {
    return (count / this.rate) * 1000;
  }

  private samplesFor(milliseconds: number): number {
    return Math.round((milliseconds / 1000) * this.rate);
  }

  /** Forget the part-built utterance without touching the device. */
  private reset(): void {
    this.preRoll = [];
    this.preRollSamples = 0;
    this.speech = [];
    this.speechSamples = 0;
    this.voicedSamples = 0;
    this.silenceSamples = 0;
    this.onsetBlocks = 0;
    this.inSpeech = false;
  }

  private consume(block: Float32Array): void {
    if (!this.listening) return;
    if (this.gated) return;

    const level = rmsOf(block);

    // The floor only learns from silence; learning during speech would chase
    // the voice upward until the gate could never open again.
    if (!this.inSpeech) {
      this.noiseFloor = Math.min(0.05, Math.max(0.001, this.noiseFloor * 0.9 + level * 0.1));
    }

    const openGate = Math.max(ABSOLUTE_GATE, this.noiseFloor * 3.5);
    const closeGate = openGate * 0.55;
    const voiced = this.inSpeech ? level > closeGate : level > openGate;

    this.handlers.onLevel?.(Math.min(1, level * 8), this.inSpeech);

    if (!this.inSpeech) {
      // Keep a rolling run-up so the onset is never missing its first syllable.
      this.preRoll.push(block);
      this.preRollSamples += block.length;
      const keep = this.samplesFor(PRE_ROLL_MS);
      while (this.preRollSamples - (this.preRoll[0]?.length ?? 0) > keep && this.preRoll.length > 1) {
        this.preRollSamples -= this.preRoll.shift()!.length;
      }

      // Two blocks, not one: a single loud block is a knock or a keystroke.
      this.onsetBlocks = voiced ? this.onsetBlocks + 1 : 0;
      if (this.onsetBlocks < 2) return;

      this.inSpeech = true;
      this.speech = this.preRoll.slice();
      this.speechSamples = this.preRollSamples;
      this.voicedSamples = block.length * this.onsetBlocks;
      this.silenceSamples = 0;
      this.preRoll = [];
      this.preRollSamples = 0;
      return;
    }

    this.speech.push(block);
    this.speechSamples += block.length;

    if (voiced) {
      this.voicedSamples += block.length;
      this.silenceSamples = 0;
    } else {
      this.silenceSamples += block.length;
    }

    const ended = this.ms(this.silenceSamples) >= SILENCE_MS;
    const overrun = this.ms(this.speechSamples) >= MAX_UTTERANCE_MS;
    if (!ended && !overrun) return;

    const samples = concat(this.speech, this.speechSamples);
    const voicedMs = this.ms(this.voicedSamples);
    this.reset();

    // A cough, a chair or a slammed door. Dropped here rather than sent, so
    // the assistant does not answer the room.
    if (voicedMs < MIN_VOICED_MS) return;

    void this.deliver(samples);
  }

  private async deliver(samples: Float32Array): Promise<void> {
    this.gated = true;
    this.handlers.onLevel?.(0, false);

    try {
      await this.handlers.onUtterance(finishClip(samples, this.rate));
    } catch (err: any) {
      this.handlers.onError?.(err?.message || 'That recording could not be sent.');
    } finally {
      // Start the next utterance from a clean slate: whatever arrived while
      // the reply was being spoken is the reply, not a question.
      this.reset();
      this.gated = false;
    }
  }
}

/* ------------------------------------------------------------ the voice */

/**
 * Nexus IQ speaks with a female voice on every surface.
 *
 * Left unset, `SpeechSynthesisUtterance` takes whatever the platform defaults
 * to — Microsoft David on most Windows installs — so the voice was male by
 * accident rather than by choice, and differed per machine. Picking one makes
 * the assistant sound the same to a merchant, a shopper and an administrator.
 *
 * The web speech API exposes no gender field, so the only thing to go on is
 * the voice's name. Hence a roster of the female voices the major platforms
 * ship, matched on name tokens rather than substrings: "Microsoft Liam -
 * English (Canada)" contains "ana", and a substring test would have made Liam
 * the female voice.
 */
const FEMALE_VOICE_TOKENS = new Set([
  // Windows (SAPI, and the Edge natural voices)
  'zira', 'hazel', 'susan', 'linda', 'eva', 'aria', 'jenny', 'michelle',
  'ana', 'sonia', 'libby', 'natasha', 'clara', 'molly', 'maisie', 'aisha',
  'emily', 'amber', 'ashley', 'cora', 'elizabeth', 'monica', 'sara', 'yan',
  // Apple
  'samantha', 'victoria', 'karen', 'moira', 'tessa', 'fiona', 'allison',
  'ava', 'serena', 'nicky', 'zoe', 'joelle', 'nora', 'alice', 'amelie',
  'catherine', 'martha', 'kathy', 'princess', 'anna',
  // Android / Chrome OS
  'salli', 'joanna', 'kendra', 'kimberly', 'ivy',
]);

/** Voices whose whole name identifies them, where no single token would. */
const FEMALE_VOICE_NAMES = new Set([
  'google us english',
  'google uk english female',
  'english united states female',
]);

/**
 * The speaker's own name, without the platform prefix or the locale suffix.
 * "Microsoft Aria Online (Natural) - English (United States)" → "microsoft aria online".
 */
function speakerPart(name: string): string {
  return name.toLowerCase().split(' - ')[0].split('(')[0].trim();
}

/**
 * Score a voice as a candidate. A negative score means "never pick this one":
 * a voice that is not identifiably female is left alone rather than guessed
 * at, because guessing wrong is worse than the platform default.
 */
function scoreFemaleVoice(voice: SpeechSynthesisVoice, language: string): number {
  const full = voice.name.toLowerCase();
  const tokens = speakerPart(voice.name).split(/[^a-z]+/i).filter(Boolean);

  // `\bmale\b` does not match inside "female" — the 'e' blocks the boundary.
  if (/\bmale\b/.test(full)) return -1;

  let score = 0;
  if (/\bfemale\b/.test(full)) score += 50;
  else if (FEMALE_VOICE_NAMES.has(full)) score += 45;
  else if (tokens.some(token => FEMALE_VOICE_TOKENS.has(token))) score += 40;
  else return -1;

  const lang = voice.lang.toLowerCase().replace('_', '-');
  const wanted = language.toLowerCase().replace('_', '-');
  if (lang === wanted) score += 20;
  else if (lang.split('-')[0] === wanted.split('-')[0]) score += 12;

  // A local voice starts speaking immediately; a network one can stall, and
  // hands-free mode holds the microphone shut until the reply finishes.
  if (voice.localService) score += 5;

  return score;
}

/** The best female voice in a list, or null when none is identifiable. */
export function pickFemaleVoice(
  voices: SpeechSynthesisVoice[],
  language: string
): SpeechSynthesisVoice | null {
  let best: SpeechSynthesisVoice | null = null;
  let bestScore = 0;

  for (const voice of voices) {
    const score = scoreFemaleVoice(voice, language);
    if (score > bestScore) {
      best = voice;
      bestScore = score;
    }
  }

  return best;
}

let chosenVoice: SpeechSynthesisVoice | null = null;
let chosenFrom = '';

/**
 * Resolve the voice, re-resolving when the list changes.
 *
 * Chrome populates `getVoices()` asynchronously and fires `voiceschanged` when
 * it is ready, so the first call can legitimately come back empty. Keying the
 * cache on the list itself means a later call picks up the real roster without
 * needing an event listener to invalidate anything.
 */
function femaleVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  const signature = `${voices.length}|${voices[0].name}`;
  if (signature !== chosenFrom) {
    chosenFrom = signature;
    chosenVoice = pickFemaleVoice(voices, navigator.language || 'en-US');
  }
  return chosenVoice;
}

// Ask for the list early so the first reply is already in the right voice
// rather than defaulting to the platform's for one utterance.
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  femaleVoice();
  window.speechSynthesis.addEventListener?.('voiceschanged', () => femaleVoice());
}

/**
 * Speak a reply, and resolve when it has finished.
 *
 * `speechSynthesis` is local to the machine, so the answer — which is the part
 * carrying the merchant's revenue — is never sent anywhere to be read aloud.
 *
 * The promise is what keeps hands-free mode from answering itself: the
 * listener stays gated until this settles.
 */
export function speak(text: string): Promise<void> {
  if (!('speechSynthesis' in window)) return Promise.resolve();
  window.speechSynthesis.cancel();

  return new Promise<void>(resolve => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.02;
    utterance.pitch = 1;

    const voice = femaleVoice();
    if (voice) {
      utterance.voice = voice;
      // Some engines ignore `voice` unless the utterance agrees with it.
      utterance.lang = voice.lang;
    }

    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(ceiling);
      resolve();
    };

    // Some engines never fire either event — a backgrounded tab, or a voice
    // that failed to load. A ceiling generous enough for the whole reply keeps
    // an open microphone from staying gated for good.
    const ceiling = window.setTimeout(finish, 4_000 + text.length * 90);

    utterance.onend = finish;
    utterance.onerror = finish;
    window.speechSynthesis.speak(utterance);
  });
}

export function stopSpeaking(): void {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}

export function canRecord(): boolean {
  return Boolean(navigator.mediaDevices?.getUserMedia) && Boolean(window.AudioContext || (window as any).webkitAudioContext);
}
