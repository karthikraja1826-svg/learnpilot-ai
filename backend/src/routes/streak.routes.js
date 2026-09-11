import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { loadUser } from '../middleware/loadUser.js';
import { getStreak } from '../controllers/streak.controller.js';

const router = Router();

router.use(requireAuth, loadUser);

router.get('/', getStreak);

export default router;
