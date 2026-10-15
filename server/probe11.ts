import fs from 'fs';
import { decodeToMono16k } from './src/services/voice/audio.js';
import { transcribe, modelId } from './src/services/voice/stt.service.js';

const buf = fs.readFileSync(process.env.TEMP + '/shopvoice/cmd_full.wav');
const samples = decodeToMono16k(buf);
const short = decodeToMono16k(fs.readFileSync(process.env.TEMP + '/shopvoice/cmd_yes.wav'));
console.log('model:', modelId());
await transcribe(short);                      // warm the pipeline
for (const [label, clip] of [['long', samples], ['short', short]]) {
  const t0 = Date.now();
  const text = await transcribe(clip);
  console.log(label.padEnd(6), (Date.now() - t0) + 'ms', JSON.stringify(text));
}
