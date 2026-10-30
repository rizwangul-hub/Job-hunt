import { Router } from 'express';
import {
  getJobs,
  submitManualJob,
  batchIngestGroupJobs,
  analyseJobOnly,
  getJobById,
  prepareApplication,
  approveJob,
  rejectJob,
  previewUrlSafety
} from '../controllers/jobController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.get('/', getJobs);
router.post('/manual', submitManualJob);
router.post('/batch', batchIngestGroupJobs);
router.post('/analyse', analyseJobOnly);
router.post('/preview-url', previewUrlSafety);
router.get('/:id', getJobById);
router.post('/:id/prepare-application', prepareApplication);
router.post('/:id/approve', approveJob);
router.post('/:id/reject', rejectJob);

export default router;
