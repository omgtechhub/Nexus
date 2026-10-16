import { Request, Response, NextFunction } from 'express';
import {
  uploadImageBuffer,
  deleteImageByKey,
  UnsupportedImageTypeError,
  InvalidStorageKeyError,
} from '../services/storage.service.js';

export async function uploadImage(req: Request, res: Response, next: NextFunction) {
  try {
    const file = req.file;
    if (!file) {
      // Also the multer fileFilter's rejection path: it drops the file rather
      // than erroring, so "no file" and "not an image" arrive here together.
      res.status(400).json({
        success: false,
        error: 'No image file uploaded. Accepted formats: JPEG, PNG, WebP, GIF, AVIF.',
      });
      return;
    }

    const host = req.get('host') || 'localhost:5000';
    const protocol = req.protocol || 'http';
    const baseUrl = `${protocol}://${host}`;

    const result = await uploadImageBuffer(file.buffer, file.originalname, file.mimetype, baseUrl);

    res.status(201).json({
      success: true,
      data: {
        url: result.url,
        storageKey: result.storageKey,
      },
    });
  } catch (err) {
    if (err instanceof UnsupportedImageTypeError) {
      res.status(err.statusCode).json({ success: false, error: err.message });
      return;
    }
    next(err);
  }
}

export async function deleteUploadedImage(req: Request, res: Response, next: NextFunction) {
  try {
    const { key } = req.params;
    const deleted = await deleteImageByKey(key);
    if (!deleted) {
      res.status(404).json({ success: false, error: 'Image not found' });
      return;
    }
    res.json({ success: true, message: 'Image deleted' });
  } catch (err) {
    if (err instanceof InvalidStorageKeyError) {
      res.status(err.statusCode).json({ success: false, error: err.message });
      return;
    }
    next(err);
  }
}
