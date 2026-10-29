import { Response } from 'express';
import { JobOpportunity } from '../models/JobOpportunity';
import { Application } from '../models/Application';
import { RecruiterConversation } from '../models/RecruiterConversation';

export async function getDashboardStats(req: any, res: Response): Promise<void> {
  const isDemo = req.query.demo === 'true';
  const query = isDemo ? { isDemo: true } : { isDemo: false };

  // Calculate stats from MongoDB
  const scannedToday = await JobOpportunity.countDocuments(query);
  const analyzedTotal = scannedToday;
  const fullStackMatches = await JobOpportunity.countDocuments({
    ...query,
    matchScore: { $gte: 80 }
  });
  const awaitingApproval = await JobOpportunity.countDocuments({
    ...query,
    status: 'pending'
  });
  const submittedSuccessfully = await JobOpportunity.countDocuments({
    ...query,
    applicationStatus: 'Submitted'
  });
  const requiringAttention = await JobOpportunity.countDocuments({
    ...query,
    applicationStatus: { $in: ['Review Required', 'Awaiting Human Verification', 'Submission Unconfirmed'] }
  });
  const failedAttempts = await JobOpportunity.countDocuments({
    ...query,
    applicationStatus: 'Failed'
  });
  const recruiterRepliesCount = await RecruiterConversation.countDocuments(query);
  const unreadRepliesCount = await RecruiterConversation.countDocuments({
    ...query,
    read: false
  });

  res.json({
    success: true,
    stats: {
      scannedToday,
      analyzedTotal,
      fullStackMatches,
      awaitingApproval,
      submittedSuccessfully,
      requiringAttention,
      failedAttempts,
      recruiterRepliesCount,
      unreadRepliesCount
    }
  });
}
