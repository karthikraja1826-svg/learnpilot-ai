import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { loadUser } from '../middleware/loadUser.js';
import {
  createSubject,
  listSubjects,
  getSubject,
  updateSubject,
  deleteSubject,
  getActiveSubject,
  setActiveSubject,
} from '../controllers/subject.controller.js';

const router = Router();

router.use(requireAuth, loadUser);

// NOTE: these two routes must be declared before the '/:id' routes below,
// otherwise Express would match the literal path "active" against the
// ':id' param route instead.
router.get('/active', getActiveSubject);
router.put('/active', setActiveSubject);

router.post('/', createSubject);
router.get('/', listSubjects);
router.get('/:id', getSubject);
router.put('/:id', updateSubject);
router.delete('/:id', deleteSubject);

export default router;
