/**
 * Download the WeSpeaker speaker-embedding model.
 *
 * Explicit, never implicit. A server that silently pulls 26MB the first time
 * someone speaks is a server that fails on a metered connection and in CI, so
 * nothing downloads until a person asks — Jarvis's rule, and the reason this
 * is a script rather than a lazy fetch inside the request path.
 *
 * Whisper is deliberately not here: transformers.js manages its own cache and
 * fetches on first transcription.
 */
import fs from 'fs';
import path from 'path';

const URL =
  'https://huggingface.co/Wespeaker/wespeaker-voxceleb-resnet34-LM/' +
  'resolve/main/voxceleb_resnet34_LM.onnx';
const MIN_BYTES = 20_000_000;
const dir = path.join(process.cwd(), '.models');
const target = path.join(dir, 'speaker_resnet34.onnx');

if (fs.existsSync(target) && fs.statSync(target).size >= MIN_BYTES) {
  console.log(`Already present: ${target}`);
  process.exit(0);
}

fs.mkdirSync(dir, { recursive: true });
console.log(`Downloading WeSpeaker ResNet34 (~26MB)\n  from ${URL}\n  to   ${target}`);

const response = await fetch(URL, { redirect: 'follow' });
if (!response.ok) {
  console.error(`Download failed: ${response.status} ${response.statusText}`);
  process.exit(1);
}

const buffer = Buffer.from(await response.arrayBuffer());
// Size rather than a hash: these files are republished upstream, and a stale
// pinned hash turns a working download into a failure nobody can act on. A
// truncated download is the realistic failure, and size catches it.
if (buffer.length < MIN_BYTES) {
  console.error(`Download truncated: got ${buffer.length} bytes, expected at least ${MIN_BYTES}.`);
  process.exit(1);
}

fs.writeFileSync(target, buffer);
console.log(`Done. ${(buffer.length / 1_048_576).toFixed(1)}MB written.`);
