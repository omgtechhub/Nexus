import { Router } from 'express';
import multer from 'multer';
import { uploadImage, deleteUploadedImage } from '../controllers/upload.controller.js';
import { authMiddleware, requireStoreMembership } from '../middleware/auth.middleware.js';
import { uploadRateLimiter } from '../middleware/rateLimit.middleware.js';

/**
 * `fileFilter` rejects the obvious cases before 10 MB is buffered in memory.
 *
 * It is not the security boundary — the declared content type comes from the
 * client, so `storage.service.ts` re-checks the actual magic bytes and derives
 * the stored extension from those. This is here so an ordinary wrong-file
 * mistake fails fast instead of after the upload.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const declared = (file.mimetype || '').toLowerCase().split(';')[0].trim();
    if (declared.startsWith('image/') && declared !== 'image/svg+xml') {
      cb(null, true);
      return;
    }
    cb(null, false);
  },
});

export const uploadRouter = Router();

uploadRouter.use(authMiddleware);
uploadRouter.use(requireStoreMembership);

// The limiter runs before multer, so a flood is rejected before 10 MB per
// request is buffered into memory.
uploadRouter.post('/image', uploadRateLimiter, upload.single('image'), uploadImage);
uploadRouter.delete('/image/:key', deleteUploadedImage);
