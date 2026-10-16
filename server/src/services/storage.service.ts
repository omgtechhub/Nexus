import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

/**
 * Image storage.
 *
 * Two things here are security boundaries rather than conveniences, and both
 * replaced code that trusted the caller:
 *
 *  1. **The extension comes from the verified content type, never the
 *     filename.** `path.extname(file.originalname)` was taken verbatim, so a
 *     seller could upload `payload.html` or a scripted `.svg` and have it
 *     written to disk under that extension. `/uploads` is served by
 *     `express.static` from the API's own origin under a CSP that allows
 *     `'unsafe-inline'`, so an uploaded HTML file was stored XSS on the API
 *     origin — with a live session cookie attached to every request to it.
 *
 *  2. **A storage key is validated against the shape this module generates,
 *     and the resolved path is proved to stay inside `uploads/`.** The delete
 *     path joined `req.params.key` straight onto the uploads directory.
 *     Express matches a `:key` segment *before* percent-decoding it, so
 *     `..%2F..%2Fpackage.json` arrives as a single segment and decodes to
 *     `../../package.json` — arbitrary file deletion for any authenticated
 *     seller.
 *
 * SVG is deliberately absent from the allowlist. It is an XML document that
 * can carry `<script>` and external references, and serving one from our own
 * origin is the same exposure as serving HTML. Raster formats only.
 */

/** Content types accepted, mapped to the extension we store them under. */
const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/avif': '.avif',
};

/**
 * The magic bytes each accepted format starts with.
 *
 * The declared `Content-Type` of a multipart part is supplied by the client,
 * so the allowlist above is a statement of intent, not proof. Checking the
 * actual leading bytes is what stops `Content-Type: image/png` on an HTML
 * body — which would otherwise be written as `.png` and then sniffed and
 * rendered as markup by anything that ignores the stored extension.
 */
const MAGIC_BYTES: { type: string; test: (b: Buffer) => boolean }[] = [
  { type: 'image/jpeg', test: b => b.length > 2 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    type: 'image/png',
    test: b => b.length > 7 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  {
    type: 'image/webp',
    test: b => b.length > 11 && b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP',
  },
  { type: 'image/gif', test: b => b.length > 5 && b.subarray(0, 6).toString('latin1').startsWith('GIF8') },
  {
    type: 'image/avif',
    test: b => b.length > 11 && b.subarray(4, 8).toString('latin1') === 'ftyp' && b.subarray(8, 12).toString('latin1').startsWith('avi'),
  },
];

/** The exact shape `uploadImageBuffer` produces. Anything else is not ours. */
const STORAGE_KEY_PATTERN = /^img_\d{10,}_[0-9a-f]{16}\.(jpg|png|webp|gif|avif)$/;

export class UnsupportedImageTypeError extends Error {
  readonly statusCode = 415;
  constructor(detail: string) {
    super(detail);
    this.name = 'UnsupportedImageTypeError';
  }
}

export class InvalidStorageKeyError extends Error {
  readonly statusCode = 400;
  constructor() {
    super('Not a valid image reference.');
    this.name = 'InvalidStorageKeyError';
  }
}

export interface UploadResult {
  url: string;
  storageKey: string;
}

/** The extension we will store this buffer under, or throw. */
function resolveExtension(buffer: Buffer, declaredMimeType: string): string {
  const declared = (declaredMimeType || '').toLowerCase().split(';')[0].trim();

  if (!ALLOWED_IMAGE_TYPES[declared]) {
    throw new UnsupportedImageTypeError(
      `"${declared || 'unknown'}" is not an accepted image type. Upload a JPEG, PNG, WebP, GIF or AVIF.`
    );
  }

  const actual = MAGIC_BYTES.find(candidate => candidate.test(buffer));
  if (!actual) {
    throw new UnsupportedImageTypeError('That file is not a readable image.');
  }

  // The bytes win. A mismatch means the declared type was wrong — whether by
  // mistake or deliberately — so store it as what it demonstrably is, and only
  // if that is something we accept.
  const ext = ALLOWED_IMAGE_TYPES[actual.type];
  if (!ext) {
    throw new UnsupportedImageTypeError('That image format is not accepted.');
  }
  return ext;
}

export async function uploadImageBuffer(
  buffer: Buffer,
  _filename: string,
  mimeType: string,
  baseUrl: string
): Promise<UploadResult> {
  // `_filename` is deliberately unused. It is attacker-controlled and the only
  // thing it was ever read for was the extension, which now comes from the
  // bytes. Keeping the parameter avoids churn at every call site.
  const fileExt = resolveExtension(buffer, mimeType);

  const storageKey = `img_${Date.now()}_${crypto.randomBytes(8).toString('hex')}${fileExt}`;
  const filePath = resolveInsideUploads(storageKey);

  await fs.promises.writeFile(filePath, buffer);

  const url = `${baseUrl}/uploads/${storageKey}`;
  return { url, storageKey };
}

/**
 * Resolve a storage key to its path, proving it cannot escape `uploads/`.
 *
 * Both the shape check and the prefix check are kept. The pattern alone would
 * be enough today, but it is the kind of thing a later "let's also accept
 * legacy keys" change loosens, and the resolved-path assertion keeps the
 * boundary intact if that happens.
 */
function resolveInsideUploads(storageKey: string): string {
  if (typeof storageKey !== 'string' || !STORAGE_KEY_PATTERN.test(storageKey)) {
    throw new InvalidStorageKeyError();
  }

  const resolved = path.resolve(UPLOADS_DIR, storageKey);
  const root = path.resolve(UPLOADS_DIR) + path.sep;
  if (!resolved.startsWith(root)) {
    throw new InvalidStorageKeyError();
  }
  return resolved;
}

export async function deleteImageByKey(storageKey: string): Promise<boolean> {
  // Throws for anything that is not a key this module minted, so a traversal
  // attempt is a 400 rather than a deletion somewhere else on the filesystem.
  const filePath = resolveInsideUploads(storageKey);

  try {
    await fs.promises.unlink(filePath);
    return true;
  } catch (err: any) {
    if (err?.code === 'ENOENT') return false;
    throw err;
  }
}
