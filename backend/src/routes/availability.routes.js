import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { loadUser } from '../middleware/loadUser.js';
import {
  getAvailability,
  createAvailability,
  updateAvailability,
  deleteAvailability,
} from '../controllers/availability.controller.js';

const router = Router();

router.use(requireAuth, loadUser);

router.get('/', getAvailability);
router.post('/', createAvailability);
router.put('/', updateAvailability);
router.delete('/', deleteAvailability);

export default router;
