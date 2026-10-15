/**
 * Kaldi-compatible log-mel filterbank features.
 *
 * Ported from Jarvis (`assistant/voice/fbank.py`), which wrote it against
 * `torchaudio.compliance.kaldi.fbank` with WeSpeaker's settings. The port is
 * deliberately literal, because speaker-embedding models are trained on
 * features rather than waveforms and are unforgiving about which features: a
 * front end that is *nearly* right produces embeddings that look plausible,
 * cluster badly, and make verification quietly useless.
 *
 * The details that are easy to get wrong, and are therefore the ones to leave
 * alone:
 *
 * - **Povey window**, not Hann. It is `hann ** 0.85`, built in the periodic
 *   form over `[0, N)`.
 * - **Pre-emphasis of 0.97**, applied per frame *after* DC removal, with the
 *   first sample using itself as its predecessor.
 * - **Per-frame DC removal before pre-emphasis.** Kaldi calls this
 *   `remove_dc_offset`; the order matters, because the filter must see a
 *   zero-mean frame.
 * - **`snip_edges=true`**, so the frame count is `1 + (n - 400) / 160` and any
 *   short tail is dropped rather than padded. Padding adds a frame of
 *   half-silence and shifts nothing else — just enough to degrade an embedding
 *   without looking wrong.
 * - **HTK mel scale** (`1127 * ln(1 + f/700)`), not Slaney's piecewise one.
 * - **No filter normalisation.** Kaldi normalises neither area nor peak, and
 *   adding either puts a constant offset through the log.
 * - **int16 scaling first.** The absolute scale sets the log-domain offset, so
 *   float32 input in [-1, 1] has to be multiplied by 32768 to land in the
 *   distribution the model was trained on.
 *
 * Written against a hand-rolled FFT rather than a dependency: the transform is
 * forty lines, and the alternative is a native build on top of the two the
 * voice path already carries.
 */

/** WeSpeaker's front end: 80 log-mel bins, 25 ms window, 10 ms hop, 16 kHz. */
export const NUM_MEL_BINS = 80;
export const FRAME_LENGTH_MS = 25;
export const FRAME_SHIFT_MS = 10;
export const SAMPLE_RATE = 16_000;

/** Kaldi defaults WeSpeaker does not override. */
const PRE_EMPHASIS = 0.97;
const POVEY_EXPONENT = 0.85;
const LOW_FREQ = 20;
const HIGH_FREQ_OFFSET = 400;

/** Smallest normal float32, matching Kaldi's `log(max(mel, eps))`. */
const LOG_FLOOR = 1.1754943508222875e-38;

export function hzToMel(hz: number): number {
  return 1127 * Math.log(1 + hz / 700);
}

/**
 * Kaldi's default window: a Hann window raised to 0.85, in the periodic form
 * (the `sym=False` equivalent) rather than the symmetric one.
 */
export function poveyWindow(length: number): Float64Array {
  const w = new Float64Array(length);
  for (let i = 0; i < length; i++) {
    const hann = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (length - 1));
    w[i] = Math.pow(hann, POVEY_EXPONENT);
  }
  return w;
}

/**
 * Triangular mel filters, `[numBins][fftSize / 2 + 1]`.
 *
 * The triangles are defined on the mel axis with equal spacing there, and are
 * not normalised.
 */
export function melFilterbank(
  numBins = NUM_MEL_BINS,
  fftSize = 512,
  sampleRate = SAMPLE_RATE
): Float64Array[] {
  const nyquist = sampleRate / 2;
  const highFreq = nyquist - HIGH_FREQ_OFFSET;

  const melLow = hzToMel(LOW_FREQ);
  const melHigh = hzToMel(highFreq);

  // numBins + 2 edges gives numBins triangles.
  const melPoints = new Float64Array(numBins + 2);
  for (let i = 0; i < numBins + 2; i++) {
    melPoints[i] = melLow + ((melHigh - melLow) * i) / (numBins + 1);
  }

  const numFftBins = fftSize / 2 + 1;
  const fftMels = new Float64Array(numFftBins);
  for (let i = 0; i < numFftBins; i++) {
    fftMels[i] = hzToMel((i * sampleRate) / fftSize);
  }

  const filters: Float64Array[] = [];
  for (let b = 0; b < numBins; b++) {
    const left = melPoints[b];
    const centre = melPoints[b + 1];
    const right = melPoints[b + 2];
    const row = new Float64Array(numFftBins);
    for (let i = 0; i < numFftBins; i++) {
      const rising = (fftMels[i] - left) / (centre - left);
      const falling = (right - fftMels[i]) / (right - centre);
      row[i] = Math.max(0, Math.min(rising, falling));
    }
    filters.push(row);
  }
  return filters;
}

/**
 * In-place iterative radix-2 Cooley-Tukey FFT.
 *
 * `re` and `im` are the same length, a power of two. Only the first half of
 * the result is read, which is the real-input symmetry `rfft` exploits.
 */
function fftInPlace(re: Float64Array, im: Float64Array): void {
  const n = re.length;

  // Bit-reversal permutation.
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }

  for (let len = 2; len <= n; len <<= 1) {
    const angle = (-2 * Math.PI) / len;
    const wRe = Math.cos(angle);
    const wIm = Math.sin(angle);
    for (let i = 0; i < n; i += len) {
      let curRe = 1;
      let curIm = 0;
      for (let k = 0; k < len / 2; k++) {
        const aRe = re[i + k];
        const aIm = im[i + k];
        const bRe = re[i + k + len / 2] * curRe - im[i + k + len / 2] * curIm;
        const bIm = re[i + k + len / 2] * curIm + im[i + k + len / 2] * curRe;
        re[i + k] = aRe + bRe;
        im[i + k] = aIm + bIm;
        re[i + k + len / 2] = aRe - bRe;
        im[i + k + len / 2] = aIm - bIm;
        const nextRe = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = nextRe;
      }
    }
  }
}

export interface Fbank {
  /** Row-major `frames * NUM_MEL_BINS`, which is the ONNX input layout. */
  data: Float32Array;
  frames: number;
  bins: number;
}

/**
 * Log-mel filterbank features for mono float32 samples in [-1, 1] at 16 kHz.
 *
 * Cepstral mean normalisation is on, as WeSpeaker does it. It matters more
 * than it looks: subtracting the per-utterance mean removes the channel and
 * microphone colouration, which is otherwise the loudest thing in the
 * embedding and would make verification a test of which microphone was used
 * rather than of who was speaking.
 *
 * Returns zero frames for audio shorter than one window, so the caller decides
 * rather than being handed a garbage embedding.
 */
export function computeFbank(
  samples: Float32Array,
  sampleRate = SAMPLE_RATE,
  numMelBins = NUM_MEL_BINS,
  cmn = true
): Fbank {
  const frameLength = Math.round((sampleRate * FRAME_LENGTH_MS) / 1000);
  const frameShift = Math.round((sampleRate * FRAME_SHIFT_MS) / 1000);

  if (samples.length < frameLength) {
    return { data: new Float32Array(0), frames: 0, bins: numMelBins };
  }

  const frameCount = 1 + Math.floor((samples.length - frameLength) / frameShift);

  // Kaldi rounds the FFT size up to the next power of two.
  let fftSize = 1;
  while (fftSize < frameLength) fftSize *= 2;
  const numFftBins = fftSize / 2 + 1;

  const window = poveyWindow(frameLength);
  const filters = melFilterbank(numMelBins, fftSize, sampleRate);

  const out = new Float64Array(frameCount * numMelBins);
  const re = new Float64Array(fftSize);
  const im = new Float64Array(fftSize);
  const frame = new Float64Array(frameLength);
  const power = new Float64Array(numFftBins);

  for (let f = 0; f < frameCount; f++) {
    const start = f * frameShift;

    // Scale to int16 range, then remove this frame's DC offset.
    let sum = 0;
    for (let i = 0; i < frameLength; i++) {
      const v = samples[start + i] * 32768;
      frame[i] = v;
      sum += v;
    }
    const mean = sum / frameLength;
    for (let i = 0; i < frameLength; i++) frame[i] -= mean;

    // Pre-emphasis, first sample against itself. Walk backwards so the
    // in-place update does not consume an already-filtered predecessor.
    for (let i = frameLength - 1; i > 0; i--) {
      frame[i] = frame[i] - PRE_EMPHASIS * frame[i - 1];
    }
    frame[0] = frame[0] - PRE_EMPHASIS * frame[0];

    re.fill(0);
    im.fill(0);
    for (let i = 0; i < frameLength; i++) re[i] = frame[i] * window[i];

    fftInPlace(re, im);

    for (let i = 0; i < numFftBins; i++) power[i] = re[i] * re[i] + im[i] * im[i];

    for (let b = 0; b < numMelBins; b++) {
      const filter = filters[b];
      let energy = 0;
      for (let i = 0; i < numFftBins; i++) energy += power[i] * filter[i];
      out[f * numMelBins + b] = Math.log(Math.max(energy, LOG_FLOOR));
    }
  }

  if (cmn) {
    for (let b = 0; b < numMelBins; b++) {
      let sum = 0;
      for (let f = 0; f < frameCount; f++) sum += out[f * numMelBins + b];
      const mean = sum / frameCount;
      for (let f = 0; f < frameCount; f++) out[f * numMelBins + b] -= mean;
    }
  }

  return { data: Float32Array.from(out), frames: frameCount, bins: numMelBins };
}

/** How many frames a duration yields. For sizing checks and messages. */
export function framesFor(seconds: number): number {
  return Math.max(0, Math.floor((seconds * 1000) / FRAME_SHIFT_MS) - 2);
}
