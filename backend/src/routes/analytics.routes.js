import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { loadUser } from '../middleware/loadUser.js';
import {
  getOverview,
  getDaily,
  getWeekly,
  getSubjects,
  getTopics,
  getProductivity,
} from '../controllers/analytics.controller.js';

const router = Router();

router.use(requireAuth, loadUser);

router.get('/overview', getOverview);
router.get('/daily', getDaily);
router.get('/weekly', getWeekly);
router.get('/subjects', getSubjects);
router.get('/topics', getTopics);
router.get('/productivity', getProductivity);

export default router;
