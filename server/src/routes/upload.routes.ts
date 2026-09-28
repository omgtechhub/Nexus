import { Router } from 'express';
import multer from 'multer';
import { uploadImage, deleteUploadedImage } from '../controllers/upload.controller.js';
import { authMiddleware, requireStoreMembership } from '../middleware/auth.middleware.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

export const uploadRouter = Router();

uploadRouter.use(authMiddleware);
uploadRouter.use(requireStoreMembership);

uploadRouter.post('/image', upload.single('image'), uploadImage);
uploadRouter.delete('/image/:key', deleteUploadedImage);
