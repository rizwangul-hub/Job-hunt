import { Router } from 'express';
import { getReplies, getReplyById, sendReply, simulateReply } from '../controllers/replyController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.get('/', getReplies);
router.post('/simulate', simulateReply);
router.get('/:id', getReplyById);
router.post('/:id/send', sendReply);

export default router;
