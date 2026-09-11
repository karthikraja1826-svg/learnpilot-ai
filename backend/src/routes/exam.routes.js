import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { loadUser } from '../middleware/loadUser.js';
import {
  createExam,
  listExams,
  getExam,
  updateExam,
  deleteExam,
} from '../controllers/exam.controller.js';

const router = Router();

router.use(requireAuth, loadUser);

router.post('/', createExam);
router.get('/', listExams);
router.get('/:id', getExam);
router.put('/:id', updateExam);
router.delete('/:id', deleteExam);

export default router;
