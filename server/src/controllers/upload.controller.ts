import { Request, Response, NextFunction } from 'express';
import { uploadImageBuffer, deleteImageByKey } from '../services/storage.service.js';

export async function uploadImage(req: Request, res: Response, next: NextFunction) {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ success: false, error: 'No image file uploaded' });
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
    next(err);
  }
}

export async function deleteUploadedImage(req: Request, res: Response, next: NextFunction) {
  try {
    const { key } = req.params;
    await deleteImageByKey(key);
    res.json({ success: true, message: 'Image deleted' });
  } catch (err) {
    next(err);
  }
}
