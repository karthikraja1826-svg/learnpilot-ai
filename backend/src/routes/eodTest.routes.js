import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { loadUser } from '../middleware/loadUser.js';
import { getPreview, getToday, generateToday, startToday, submitToday, getResult } from '../controllers/eodTest.controller.js';

const router = Router();

router.use(requireAuth, loadUser);

router.get('/today/preview', getPreview);
router.get('/today', getToday);
router.post('/today/generate', generateToday);
router.post('/today/start', startToday);
router.post('/today/submit', submitToday);
router.get('/today/result', getResult);

export default router;
