import { Router } from 'express';
import { login, logout, getCurrentUser } from '../controllers/authController';
import { requireAuth } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/login', authLimiter, login);
router.post('/logout', logout);
router.get('/me', requireAuth, getCurrentUser);

export default router;
