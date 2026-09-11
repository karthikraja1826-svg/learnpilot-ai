import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { loadUser } from '../middleware/loadUser.js';
import {
  getDaily,
  getWeekly,
  getTopicPerformance,
  getSubjectPerformance,
} from '../controllers/studyPerformance.controller.js';

const router = Router();

router.use(requireAuth, loadUser);

router.get('/daily', getDaily);
router.get('/weekly', getWeekly);
router.get('/topics/:topicId', getTopicPerformance);
router.get('/subjects/:subjectId', getSubjectPerformance);

export default router;
