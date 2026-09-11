import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { loadUser } from '../middleware/loadUser.js';
import {
  getOverallProgress,
  getSubjectProgress,
  getTopicProgress,
  getWeeklyProgress,
  getExamProgress,
} from '../controllers/progress.controller.js';

const router = Router();

router.use(requireAuth, loadUser);

router.get('/overview', getOverallProgress);
router.get('/weekly', getWeeklyProgress);
router.get('/subjects/:subjectId', getSubjectProgress);
router.get('/topics/:topicId', getTopicProgress);
router.get('/exams/:examId', getExamProgress);

export default router;
