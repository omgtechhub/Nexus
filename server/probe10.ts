import fs from 'fs';
import { decodeToMono16k } from './src/services/voice/audio.js';
import { transcribe, modelId } from './src/services/voice/stt.service.js';

const buf = fs.readFileSync(process.env.TEMP + '/shopvoice/cmd_full.wav');
const samples = decodeToMono16k(buf);
console.log('model:', modelId());
const t0 = Date.now();
const text = await transcribe(samples);
console.log('heard:', JSON.stringify(text));
console.log('took :', Date.now() - t0, 'ms');
