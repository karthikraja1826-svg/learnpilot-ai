import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { loadUser } from '../middleware/loadUser.js';
import {
  createAssignment,
  listAssignments,
  getAssignment,
  updateAssignment,
  deleteAssignment,
} from '../controllers/assignment.controller.js';

const router = Router();

router.use(requireAuth, loadUser);

router.post('/', createAssignment);
router.get('/', listAssignments);
router.get('/:id', getAssignment);
router.put('/:id', updateAssignment);
router.delete('/:id', deleteAssignment);

export default router;
