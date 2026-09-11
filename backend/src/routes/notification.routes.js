import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { loadUser } from '../middleware/loadUser.js';
import {
  listNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
  deleteNotification,
} from '../controllers/notification.controller.js';

const router = Router();

router.use(requireAuth, loadUser);

router.get('/', listNotifications);
router.get('/unread-count', getUnreadCount);
router.put('/read-all', markAllRead);
router.put('/:id/read', markRead);
router.delete('/:id', deleteNotification);

export default router;
