import { Router } from 'express';
import { getActivityLogs } from '../controllers/activityController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.get('/', getActivityLogs);

export default router;
