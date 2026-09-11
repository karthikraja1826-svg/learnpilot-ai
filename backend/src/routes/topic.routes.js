import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { loadUser } from '../middleware/loadUser.js';
import {
  createTopic,
  listTopics,
  getTopic,
  updateTopic,
  deleteTopic,
} from '../controllers/topic.controller.js';

const router = Router();

router.use(requireAuth, loadUser);

router.post('/', createTopic);
router.get('/', listTopics);
router.get('/:id', getTopic);
router.put('/:id', updateTopic);
router.delete('/:id', deleteTopic);

export default router;
