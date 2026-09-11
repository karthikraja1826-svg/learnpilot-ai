import crypto from 'crypto';
import path from 'path';
import multer from 'multer';
import { ApiError } from '../utils/ApiError.js';
import { PROFILE_PHOTO_DIR, ensureProfilePhotoDir } from '../utils/profileImageStorage.js';

const ALLOWED_MIME_TYPES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

ensureProfilePhotoDir();

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    ensureProfilePhotoDir();
    callback(null, PROFILE_PHOTO_DIR);
  },
  filename: (req, file, callback) => {
    const extension = ALLOWED_MIME_TYPES[file.mimetype] || path.extname(file.originalname) || '';
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
    const safeUid = (req.firebaseUser?.uid || 'user').replace(/[^a-zA-Z0-9_-]/g, '');
    callback(null, `${safeUid}-${uniqueSuffix}${extension}`);
  },
});

const fileFilter = (req, file, callback) => {
  if (!ALLOWED_MIME_TYPES[file.mimetype]) {
    callback(new ApiError(400, 'Only JPEG, PNG, or WebP images are allowed'));
    return;
  }
  callback(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE_BYTES, files: 1 },
});

export const uploadProfilePhotoMiddleware = (req, res, next) => {
  upload.single('photo')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new ApiError(400, 'Image must be smaller than 5MB'));
      }
      return next(new ApiError(400, err.message));
    }

    if (err) {
      return next(err);
    }

    if (!req.file) {
      return next(new ApiError(400, 'A photo file is required'));
    }

    next();
  });
};
