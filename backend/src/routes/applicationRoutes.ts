import { Router } from 'express';
import {
  getApplications,
  getApplicationById,
  updateApplicationStatus
} from '../controllers/applicationController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.get('/', getApplications);
router.get('/:id', getApplicationById);
router.patch('/:id/status', updateApplicationStatus);

export default router;
