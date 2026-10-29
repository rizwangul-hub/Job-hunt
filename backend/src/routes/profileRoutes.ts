import { Router } from 'express';
import { getProfile, updateProfile, uploadCV, deleteCV } from '../controllers/profileController';
import { requireAuth } from '../middleware/auth';
import { cvUpload } from '../middleware/upload';

const router = Router();

router.use(requireAuth);

router.get('/', getProfile);
router.put('/', updateProfile);
router.post('/cv', cvUpload.single('cvFile'), uploadCV);
router.delete('/cv/:id', deleteCV);

export default router;
