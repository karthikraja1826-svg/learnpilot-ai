import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { loadUser } from '../middleware/loadUser.js';
import {
  getVapidPublicKey,
  subscribe,
  unsubscribe,
  getStatus,
  sendTestNotification,
} from '../controllers/push.controller.js';

const router = Router();

router.get('/vapid-public-key', getVapidPublicKey);

router.use(requireAuth, loadUser);

router.post('/subscribe', subscribe);
router.delete('/unsubscribe', unsubscribe);
router.get('/status', getStatus);
router.post('/test', sendTestNotification);

export default router;
