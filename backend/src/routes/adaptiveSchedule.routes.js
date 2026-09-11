import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { loadUser } from '../middleware/loadUser.js';
import { getRecommendations, applyAdjustments } from '../controllers/adaptiveSchedule.controller.js';

const router = Router();

router.use(requireAuth, loadUser);

router.get('/recommendations', getRecommendations);
router.post('/:planId/apply', applyAdjustments);

export default router;
