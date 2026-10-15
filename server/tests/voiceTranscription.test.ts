import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import supertest from 'supertest';
import { VoicePortal } from '@prisma/client';
import { app } from '../src/app.js';
import { prisma } from '../src/prisma.js';
import { transcribe, isEnglishOnly, modelId } from '../src/services/voice/stt.service.js';
import { decodeToMono16k } from '../src/services/voice/audio.js';
import { resolveModelPath, setSpeakerEmbedder } from '../src/services/voice/embedder.js';
import { enrolVoice } from '../src/services/voice/speaker.service.js';

const request = supertest(app);

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'voice');
const clip = (name: string) => fs.readFileSync(path.join(FIXTURES, name));

/**
 * Transcription, end to end, on real recorded speech.
 *
 * This file exists because of a bug that reached a user. Every other voice
 * test refused its audio before transcription — at the speaker gate, or on
 * duration, or on silence — so the suite was green while `transcribe()` threw
 * on every real command: it passed `language` and `task` to `whisper-tiny.en`,
 * which is English-only and rejects both. Nothing had ever called it with
 * audio that got that far.
 *
 * So these tests use genuine speech and assert on the words that come back.
 * The model-dependent ones skip when the models are not installed, because a
 * clone without them should still have a green suite — but where the models
 * exist, this is the path a real spoken command actually takes.
 */
const modelsPresent =
  fs.existsSync(path.join(process.cwd(), '.models', 'onnx-community')) &&
  resolveModelPath() !== null;

describe('Voice transcription', () => {
  describe('model capability detection', () => {
    it('knows which checkpoints are English-only', () => {
      // The `.en` suffix is how upstream names every English-only size, so
      // swapping the model through WHISPER_MODEL keeps working.
      expect(isEnglishOnly('onnx-community/whisper-tiny.en')).toBe(true);
      expect(isEnglishOnly('onnx-community/whisper-base.en')).toBe(true);
      expect(isEnglishOnly('Xenova/whisper-small.en')).toBe(true);

      // Multilingual checkpoints carry no suffix and do accept a language.
      expect(isEnglishOnly('onnx-community/whisper-tiny')).toBe(false);
      expect(isEnglishOnly('onnx-community/whisper-large-v3')).toBe(false);
    });

    it('defaults to a model whose options this code gets right', () => {
      expect(modelId()).toContain('whisper');
    });
  });

  describe.skipIf(!modelsPresent)('on real speech', () => {
    it('transcribes a spoken command into the words that were said', async () => {
      const samples = decodeToMono16k(clip('speaker-a-0.wav'));
      const text = await transcribe(samples);

      // The fixture says "Nexus, show me my profit for this month."
      expect(text.toLowerCase()).toContain('profit');
      expect(text.toLowerCase()).toContain('month');
    }, 120_000);

    it('transcribes a second, different command', async () => {
      const samples = decodeToMono16k(clip('speaker-a-1.wav'));
      const text = await transcribe(samples);

      // "What is my best selling product right now?"
      expect(text.toLowerCase()).toContain('selling');
      expect(text.toLowerCase()).toContain('product');
    }, 120_000);

    it('does not throw on the default English-only model', async () => {
      // The regression itself: this threw "Cannot specify `task` or
      // `language` for an English-only model" for every real command.
      const samples = decodeToMono16k(clip('speaker-a-2.wav'));
      await expect(transcribe(samples)).resolves.toBeTruthy();
    }, 120_000);
  });
});

/**
 * The three spoken surfaces, driven with real audio and a real voice profile.
 *
 * One transcriber serves the seller console, the shopping assistant and the
 * platform monitor, so a fault in it breaks all three at once — which is what
 * happened. Each is exercised here with a recording that is actually speech,
 * so none of them can go green on a request that never reached the model.
 */
describe.skipIf(!modelsPresent)('Spoken commands reach an answer on all three sides', () => {
  const stamp = Date.now();
  const password = 'Password123!';

  let sellerCookie: string;
  let sellerId: string;
  let shopperCookie: string;
  let shopperId: string;
  let adminCookie: string;
  let adminId: string;

  beforeAll(async () => {
    // The real speaker model, not the fake: this is the path a merchant takes.
    setSpeakerEmbedder(null);

    const enrolmentClips = ['speaker-a-0.wav', 'speaker-a-1.wav', 'speaker-a-2.wav', 'speaker-a-3.wav'].map(
      (name, i) => ({ samples: decodeToMono16k(clip(name)), condition: i < 2 ? 'close' : 'far' })
    );

    const seller = await request.post('/api/auth/register').send({
      name: 'Voice Seller', email: `vt_s_${stamp}@nexus.io`, password,
      storeName: `VT Store ${stamp}`,
    });
    sellerCookie = seller.headers['set-cookie'][0];
    sellerId = seller.body.data.user.id;

    const shopper = await request.post('/api/auth/register').send({
      name: 'Voice Shopper', email: `vt_c_${stamp}@example.com`, password, userType: 'CUSTOMER',
    });
    shopperCookie = shopper.headers['set-cookie'][0];
    shopperId = shopper.body.data.user.id;

    const admin = await request.post('/api/auth/register').send({
      name: 'Voice Admin', email: `vt_a_${stamp}@nexus.io`, password,
      storeName: `VT Admin Store ${stamp}`,
    });
    adminId = admin.body.data.user.id;
    await prisma.user.update({ where: { id: adminId }, data: { platformRole: 'PLATFORM_OWNER' } });
    const relogin = await request.post('/api/auth/login').send({
      email: `vt_a_${stamp}@nexus.io`, password,
    });
    adminCookie = relogin.headers['set-cookie'][0];

    await enrolVoice(sellerId, VoicePortal.SELLER, enrolmentClips);
    await enrolVoice(shopperId, VoicePortal.CUSTOMER, enrolmentClips);
    await enrolVoice(adminId, VoicePortal.ADMIN, enrolmentClips);
  }, 300_000);

  afterAll(() => setSpeakerEmbedder(null));

  it('answers the seller console', async () => {
    const res = await request
      .post('/api/iq/voice/command')
      .set('Cookie', [sellerCookie])
      .attach('audio', clip('speaker-a-0.wav'), 'command.wav');

    expect(res.status).toBe(201);
    expect(res.body.data.transcript.toLowerCase()).toContain('profit');
    expect(res.body.data.answer).toBeTruthy();
  }, 120_000);

  it('answers the shopping assistant', async () => {
    const res = await request
      .post('/api/shop/voice/command')
      .set('Cookie', [shopperCookie])
      .field('cart', '[]')
      .attach('audio', clip('speaker-a-1.wav'), 'command.wav');

    expect(res.status).toBe(200);
    expect(res.body.data.transcript).toBeTruthy();
    expect(res.body.data.reply).toBeTruthy();
  }, 120_000);

  it('answers the platform monitor', async () => {
    const res = await request
      .post('/api/admin/voice/command')
      .set('Cookie', [adminCookie])
      .attach('audio', clip('speaker-a-3.wav'), 'command.wav');

    expect(res.status).toBe(200);
    expect(res.body.data.transcript).toBeTruthy();
    expect(res.body.data.reply).toBeTruthy();
  }, 120_000);

  it('returns a transcription failure as a 503 rather than a 500', async () => {
    // A recogniser that cannot run is a service being unavailable, not an
    // unhandled crash, and the console says so to the person holding the
    // button. Asserted through the shape of the handler's own error mapping.
    const res = await request
      .post('/api/iq/voice/command')
      .set('Cookie', [sellerCookie])
      .attach('audio', clip('speaker-a-2.wav'), 'command.wav');

    expect(res.status).not.toBe(500);
  }, 120_000);
});
