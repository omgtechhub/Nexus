import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export interface UploadResult {
  url: string;
  storageKey: string;
}

export async function uploadImageBuffer(
  buffer: Buffer,
  filename: string,
  mimeType: string,
  baseUrl: string
): Promise<UploadResult> {
  const fileExt = path.extname(filename) || '.jpg';
  const storageKey = `img_${Date.now()}_${crypto.randomBytes(8).toString('hex')}${fileExt}`;
  const filePath = path.join(UPLOADS_DIR, storageKey);

  await fs.promises.writeFile(filePath, buffer);

  const url = `${baseUrl}/uploads/${storageKey}`;
  return { url, storageKey };
}

export async function deleteImageByKey(storageKey: string): Promise<boolean> {
  try {
    const filePath = path.join(UPLOADS_DIR, storageKey);
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
      return true;
    }
  } catch (err) {
    console.error('Error deleting image file:', err);
  }
  return false;
}
