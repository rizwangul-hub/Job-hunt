import { Router } from 'express';
import {
  getIntegrations,
  testAndConnectIntegration,
  disconnectIntegration
} from '../controllers/integrationController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.get('/', getIntegrations);
router.post('/:provider/connect', testAndConnectIntegration);
router.post('/:provider/disconnect', disconnectIntegration);

export default router;
