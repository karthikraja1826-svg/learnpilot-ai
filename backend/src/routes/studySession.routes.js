import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { loadUser } from '../middleware/loadUser.js';
import {
  createSession,
  listSessions,
  getActiveSession,
  getSession,
  updateSession,
  startSession,
  pauseSession,
  resumeSession,
  completeSession,
  cancelSession,
  abandonSession,
  completeCycle,
  deleteSession,
} from '../controllers/studySession.controller.js';

const router = Router();

router.use(requireAuth, loadUser);

router.post('/', createSession);
router.get('/', listSessions);
router.get('/active', getActiveSession);
router.get('/:id', getSession);
router.put('/:id', updateSession);
router.post('/:id/start', startSession);
router.post('/:id/pause', pauseSession);
router.post('/:id/resume', resumeSession);
router.post('/:id/complete', completeSession);
router.post('/:id/cancel', cancelSession);
router.post('/:id/abandon', abandonSession);
router.post('/:id/cycle', completeCycle);
router.delete('/:id', deleteSession);

export default router;
