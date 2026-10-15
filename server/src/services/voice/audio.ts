/**
 * Decoding the audio the browser sends.
 *
 * The browser records with the Web Audio API and sends a 16-bit PCM WAV at
 * 16 kHz mono, which is the one format both consumers here want: WeSpeaker is
 * fixed at 16 kHz by its training, and Whisper resamples to the same rate.
 *
 * It is deliberately *not* `MediaRecorder`'s webm/opus. Decoding Opus on the
 * server means ffmpeg or a native codec — a third binary dependency — and it
 * would also put a lossy psychoacoustic codec between the microphone and a
 * speaker-embedding model that is sensitive to exactly the spectral detail
 * such a codec discards. Capturing raw PCM in the page removes the dependency
 * and the distortion in one move, and it lets enrolment and a live command go
 * through byte-identical paths, which is the thing speaker verification is
 * most easily broken by.
 *
 * A WAV parser is forty lines, so there is no library here either.
 */

export const TARGET_SAMPLE_RATE = 16_000;

export class AudioDecodeError extends Error {}

interface WavData {
  samples: Float32Array;
  sampleRate: number;
  channels: number;
}

/**
 * Parse a 16-bit PCM WAV into mono float32 in [-1, 1].
 *
 * Chunks are walked rather than assumed to sit at fixed offsets: a WAV written
 * by a browser often carries a `LIST`/`INFO` chunk before `data`, and reading
 * from a hardcoded offset silently treats metadata as audio.
 */
export function decodeWav(buffer: Buffer): WavData {
  if (buffer.length < 44) throw new AudioDecodeError('The recording is too short to be audio.');
  if (buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WAVE') {
    throw new AudioDecodeError('That is not a WAV recording.');
  }

  let format = -1;
  let channels = 0;
  let sampleRate = 0;
  let bitsPerSample = 0;
  let dataStart = -1;
  let dataLength = 0;

  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const id = buffer.toString('ascii', offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    const body = offset + 8;

    if (id === 'fmt ') {
      format = buffer.readUInt16LE(body);
      channels = buffer.readUInt16LE(body + 2);
      sampleRate = buffer.readUInt32LE(body + 4);
      bitsPerSample = buffer.readUInt16LE(body + 14);
    } else if (id === 'data') {
      dataStart = body;
      // Trust the smaller of the declared size and what actually arrived, so a
      // truncated upload reads the bytes it has instead of running off the end.
      dataLength = Math.min(size, buffer.length - body);
    }

    // Chunks are word-aligned: an odd size is followed by a pad byte.
    offset = body + size + (size % 2);
  }

  if (dataStart < 0 || dataLength <= 0) throw new AudioDecodeError('The recording has no audio.');
  if (format !== 1) throw new AudioDecodeError('Only uncompressed PCM audio is accepted.');
  if (bitsPerSample !== 16) throw new AudioDecodeError('Only 16-bit audio is accepted.');
  if (channels < 1) throw new AudioDecodeError('The recording has no channels.');

  const frameCount = Math.floor(dataLength / 2 / channels);
  const mono = new Float32Array(frameCount);

  for (let i = 0; i < frameCount; i++) {
    let sum = 0;
    for (let c = 0; c < channels; c++) {
      sum += buffer.readInt16LE(dataStart + (i * channels + c) * 2);
    }
    // 32768 for the negative extreme, matching how the capture side scaled it.
    mono[i] = sum / channels / 32768;
  }

  return { samples: mono, sampleRate, channels };
}

/**
 * Linear resampling to 16 kHz.
 *
 * The capture path already asks for 16 kHz, so this is a guard for a browser
 * that ignores the request rather than the normal path. Linear interpolation
 * is crude — it does not band-limit, so it will alias — but a wrong-rate
 * signal is far worse than a slightly aliased one, and the alternative is a
 * polyphase resampler nobody here needs.
 */
export function resampleTo16k(samples: Float32Array, sourceRate: number): Float32Array {
  if (sourceRate === TARGET_SAMPLE_RATE) return samples;
  if (sourceRate <= 0) throw new AudioDecodeError('The recording has no sample rate.');

  const ratio = sourceRate / TARGET_SAMPLE_RATE;
  const length = Math.floor(samples.length / ratio);
  const out = new Float32Array(length);

  for (let i = 0; i < length; i++) {
    const position = i * ratio;
    const index = Math.floor(position);
    const frac = position - index;
    const a = samples[index] ?? 0;
    const b = samples[index + 1] ?? a;
    out[i] = a + (b - a) * frac;
  }
  return out;
}

/** Decode an upload to the mono 16 kHz float32 both models expect. */
export function decodeToMono16k(buffer: Buffer): Float32Array {
  const { samples, sampleRate } = decodeWav(buffer);
  return resampleTo16k(samples, sampleRate);
}

/** Seconds of audio, for duration checks and messages. */
export function durationOf(samples: Float32Array, rate = TARGET_SAMPLE_RATE): number {
  return samples.length / rate;
}

/**
 * Peak amplitude, used to reject silence before spending a model on it.
 *
 * Peak rather than RMS: a clip that is mostly silence with one word in it has
 * a low RMS but is perfectly usable, and rejecting it would tell the merchant
 * to speak up when they already did.
 */
export function peakOf(samples: Float32Array): number {
  let peak = 0;
  for (const s of samples) {
    const v = Math.abs(s);
    if (v > peak) peak = v;
  }
  return peak;
}
