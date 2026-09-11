import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { uploadProfilePhotoMiddleware } from '../middleware/uploadProfilePhoto.js';
import {
  syncUser,
  getCurrentUser,
  getProfile,
  updateProfile,
  uploadProfilePhoto,
  removeProfilePhoto,
} from '../controllers/auth.controller.js';

const router = Router();

router.post('/sync', requireAuth, syncUser);
router.get('/me', requireAuth, getCurrentUser);
router.get('/profile', requireAuth, getProfile);
router.put('/profile', requireAuth, updateProfile);
router.post('/profile/photo', requireAuth, uploadProfilePhotoMiddleware, uploadProfilePhoto);
router.delete('/profile/photo', requireAuth, removeProfilePhoto);

export default router;
