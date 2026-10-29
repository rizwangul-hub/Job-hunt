import { Response } from 'express';
import { ActivityLog } from '../models/ActivityLog';

export async function getActivityLogs(req: any, res: Response): Promise<void> {
  const limit = parseInt(req.query.limit as string || '50', 10);
  const logs = await ActivityLog.find()
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('relatedJobId', 'title company');

  res.json({ success: true, count: logs.length, logs });
}
