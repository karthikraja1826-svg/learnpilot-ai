import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { loadUser } from '../middleware/loadUser.js';
import {
  generateDailyPlan,
  generateWeeklyPlan,
  generateRoadmap,
  getRoadmapToday,
  listPlans,
  getPlan,
  getTodayPlan,
  getCurrentWeekPlan,
  regeneratePlan,
  updatePlan,
} from '../controllers/studyPlan.controller.js';
import {
  getOptimizationStatus,
  getNextDayPlan,
  optimizeNextDay,
} from '../controllers/nextDayOptimization.controller.js';

const router = Router();

router.use(requireAuth, loadUser);

router.post('/generate/daily', generateDailyPlan);
router.post('/generate/weekly', generateWeeklyPlan);
// Part 2 — AI Daily Roadmap: scoped to the user's active optimization
// subject. Must be declared before the generic '/:id' route below.
router.post('/roadmap/generate', generateRoadmap);
router.get('/roadmap/today', getRoadmapToday);
// Part 6 — Next-Day Optimization. Declared before the generic '/:id' route
// below, same as the roadmap routes above.
router.get('/optimize-next-day/status', getOptimizationStatus);
router.get('/optimize-next-day', getNextDayPlan);
router.post('/optimize-next-day', optimizeNextDay);
router.get('/today', getTodayPlan);
router.get('/current-week', getCurrentWeekPlan);
router.get('/', listPlans);
router.get('/:id', getPlan);
router.post('/:id/regenerate', regeneratePlan);
router.put('/:id', updatePlan);

export default router;
