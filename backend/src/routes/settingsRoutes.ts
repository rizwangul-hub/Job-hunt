import { Router } from 'express';
import { getSettings, updateSettings, toggleAgent } from '../controllers/settingsController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.get('/', getSettings);
router.put('/', updateSettings);
router.post('/toggle-agent', toggleAgent);

export default router;
