import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { loadUser } from '../middleware/loadUser.js';
import { getTodayEvaluation, generateTodayEvaluation } from '../controllers/evaluation.controller.js';

const router = Router();

router.use(requireAuth, loadUser);

router.get('/today', getTodayEvaluation);
router.post('/today/generate', generateTodayEvaluation);

export default router;
